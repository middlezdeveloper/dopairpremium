import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { COLLECTIONS, UserStatus, PaymentStatus, UserProfile } from "../lib/collections";
import { sendPaymentNotificationEmail } from "./email-service";

// Define secrets for Stripe
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Initialize Stripe instance (will be initialized in webhook handler)
let stripe: Stripe | null = null;

// Dunning timeline configuration (in days)
const DUNNING_TIMELINE = {
  SILENT_RETRY: 0,      // Stripe Smart Retries handle this automatically
  GENTLE_REMINDER: 1,   // Day 1: Gentle reminder
  URGENT_REMINDER: 3,   // Day 3: More urgent reminder
  FINAL_NOTICE: 7,      // Day 7: Final notice with service restriction
  GRACE_PERIOD_DAYS: 7, // 7 days grace period with limited access
};

// Email template types
export type EmailTemplate =
  | 'payment_failed_gentle'
  | 'payment_failed_urgent'
  | 'payment_failed_final'
  | 'grace_period_started'
  | 'account_suspended'
  | 'payment_succeeded'
  | 'subscription_created'
  | 'subscription_cancelled';

/**
 * Main Stripe webhook handler
 * Processes all Stripe webhook events with signature verification
 */
export const stripeWebhooks = onRequest({
  secrets: [stripeSecretKey, stripeWebhookSecret],
  cors: false, // Disable CORS for webhook security
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Initialize Stripe if not already done
    if (!stripe) {
      stripe = new Stripe(stripeSecretKey.value(), {
        apiVersion: "2023-10-16",
      });
    }

    // Verify webhook signature
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      console.error("Missing Stripe signature");
      res.status(400).json({ error: "Missing signature" });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    // Handle the event with idempotency
    const eventId = event.id;
    const processedEventRef = admin.firestore()
      .collection('processed_webhook_events')
      .doc(eventId);

    // Check if event already processed
    const processedEvent = await processedEventRef.get();
    if (processedEvent.exists) {
      console.log(`Event ${eventId} already processed, skipping`);
      res.json({ received: true, status: "already_processed" });
      return;
    }

    // Mark event as being processed
    await processedEventRef.set({
      eventId,
      eventType: event.type,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'processing'
    });

    let result: any = { received: true };

    // Route to appropriate handler
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          result = await handleSubscriptionCreated(event);
          break;
        case 'customer.subscription.updated':
          result = await handleSubscriptionUpdated(event);
          break;
        case 'customer.subscription.deleted':
          result = await handleSubscriptionDeleted(event);
          break;
        case 'invoice.payment_succeeded':
          result = await handlePaymentSucceeded(event);
          break;
        case 'invoice.payment_failed':
          result = await handlePaymentFailed(event);
          break;
        case 'customer.created':
          result = await handleCustomerCreated(event);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
          result = { received: true, status: "unhandled" };
      }

      // Mark event as successfully processed
      await processedEventRef.update({
        status: 'completed',
        result,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (handlerError) {
      console.error(`Error handling ${event.type}:`, handlerError);

      // Mark event as failed
      await processedEventRef.update({
        status: 'failed',
        error: handlerError.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      throw handlerError;
    }

    res.json(result);

  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Handle subscription created - Auto-approve user to premium status
 */
async function handleSubscriptionCreated(event: Stripe.Event): Promise<any> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  console.log(`Processing subscription created: ${subscription.id} for customer: ${customerId}`);

  // Find user by Stripe customer ID
  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return { status: "user_not_found" };
  }

  // Check for discount information
  let signupPromotion = undefined;
  if (subscription.discount) {
    const coupon = (subscription.discount as any).coupon;
    const price = subscription.items.data[0]?.price;
    const originalPrice = price?.unit_amount || 0;

    let discountAmount = 0;
    let discountedPrice = originalPrice;

    if (coupon.amount_off) {
      discountAmount = coupon.amount_off;
      discountedPrice = Math.max(0, originalPrice - discountAmount);
    } else if (coupon.percent_off) {
      discountAmount = coupon.percent_off;
      discountedPrice = Math.round(originalPrice * (100 - coupon.percent_off) / 100);
    }

    signupPromotion = {
      couponCode: coupon.id || '',
      discountAmount,
      discountType: coupon.amount_off ? 'amount_off' : 'percent_off',
      appliedAt: admin.firestore.FieldValue.serverTimestamp(),
      originalPrice,
      discountedPrice,
      isPilotUser: coupon.id === '4NDdQSl5' || coupon.name?.includes('DOPAIR98VIP') || false
    };

    console.log(`Discount applied for user ${user.uid}: ${JSON.stringify(signupPromotion)}`);
  }

  // Update user to premium status
  await updateUserSubscriptionStatus(user.uid, {
    status: 'premium',
    paymentStatus: 'active',
    approvalType: 'stripe',
    subscription: {
      tier: 'premium',
      stripeCustomerId: customerId,
      subscriptionId: subscription.id,
      priceId: subscription.items.data[0]?.price.id,
      signupPromotion
    }
  });

  // Set Firebase Custom Claims for instant access control
  await admin.auth().setCustomUserClaims(user.uid, {
    status: 'premium',
    subscriptionId: subscription.id,
    stripeCustomerId: customerId
  });

  // Send welcome email
  await sendPaymentNotificationEmail(user.email, 'subscription_created', {
    userName: user.displayName || user.email,
    subscriptionId: subscription.id
  });

  // Log to admin logs
  await logAdminAction('system', 'approve_user', user.uid, user.email,
    'Auto-approved via Stripe subscription creation', {
      subscriptionId: subscription.id,
      customerId,
      priceId: subscription.items.data[0]?.price.id,
      signupPromotion
    });

  // Log promotional signup separately for analytics
  if (signupPromotion) {
    await admin.firestore().collection(COLLECTIONS.ADMIN_LOGS).add({
      adminId: 'system',
      adminEmail: 'system@dopair.app',
      action: 'promotional_signup',
      targetUserId: user.uid,
      targetUserEmail: user.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      notes: `User signed up with promotional code: ${signupPromotion.couponCode}`,
      metadata: {
        subscriptionId: subscription.id,
        ...signupPromotion,
        isPilotUser: signupPromotion.isPilotUser
      }
    });
  }

  return { status: "success", userId: user.uid, subscriptionId: subscription.id };
}

/**
 * Handle subscription updated - Handle status changes
 */
async function handleSubscriptionUpdated(event: Stripe.Event): Promise<any> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  console.log(`Processing subscription updated: ${subscription.id} for customer: ${customerId}`);

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return { status: "user_not_found" };
  }

  let newStatus: UserStatus;
  let newPaymentStatus: PaymentStatus;

  // Map Stripe subscription status to our user status
  switch (subscription.status) {
    case 'active':
      newStatus = 'premium';
      newPaymentStatus = 'active';
      break;
    case 'past_due':
      newStatus = 'past_due';
      newPaymentStatus = 'past_due';
      break;
    case 'canceled':
    case 'incomplete_expired':
      newStatus = 'free';
      newPaymentStatus = 'canceled';
      break;
    case 'trialing':
      newStatus = 'premium';
      newPaymentStatus = 'active';
      break;
    default:
      newStatus = 'free';
      newPaymentStatus = 'incomplete';
  }

  // Update user status
  await updateUserSubscriptionStatus(user.uid, {
    status: newStatus,
    paymentStatus: newPaymentStatus,
    subscription: {
      tier: newStatus === 'premium' ? 'premium' : 'free',
      stripeCustomerId: customerId,
      subscriptionId: subscription.id,
      priceId: subscription.items.data[0]?.price.id
    }
  });

  // Update Firebase Custom Claims
  await admin.auth().setCustomUserClaims(user.uid, {
    status: newStatus,
    subscriptionId: subscription.id,
    stripeCustomerId: customerId
  });

  // Log the change
  await logAdminAction('system', 'approve_user', user.uid, user.email,
    `Subscription status updated to ${subscription.status}`, {
      subscriptionId: subscription.id,
      newStatus,
      stripeStatus: subscription.status
    });

  return { status: "success", userId: user.uid, newStatus, stripeStatus: subscription.status };
}

/**
 * Handle subscription deleted - Revert to free status
 */
async function handleSubscriptionDeleted(event: Stripe.Event): Promise<any> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  console.log(`Processing subscription deleted: ${subscription.id} for customer: ${customerId}`);

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return { status: "user_not_found" };
  }

  // Revert to free status
  await updateUserSubscriptionStatus(user.uid, {
    status: 'free',
    paymentStatus: 'canceled',
    subscription: {
      tier: 'free',
      stripeCustomerId: customerId
    }
  });

  // Clear Firebase Custom Claims
  await admin.auth().setCustomUserClaims(user.uid, {
    status: 'free',
    stripeCustomerId: customerId
  });

  // Send cancellation email
  await sendPaymentNotificationEmail(user.email, 'subscription_cancelled', {
    userName: user.displayName || user.email,
    subscriptionId: subscription.id
  });

  // Log the cancellation
  await logAdminAction('system', 'suspend_user', user.uid, user.email,
    'Subscription cancelled via Stripe', {
      subscriptionId: subscription.id,
      cancelledAt: new Date().toISOString()
    });

  return { status: "success", userId: user.uid, action: "cancelled" };
}

/**
 * Handle successful payment - Restore access after payment
 */
async function handlePaymentSucceeded(event: Stripe.Event): Promise<any> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  console.log(`Processing payment succeeded for customer: ${customerId}, subscription: ${subscriptionId}`);

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return { status: "user_not_found" };
  }

  // Check if user was in grace period or past due
  const currentUserDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(user.uid).get();
  const currentUserData = currentUserDoc.data() as UserProfile;

  const wasInGracePeriod = currentUserData?.status === 'grace_period' ||
                          currentUserData?.status === 'past_due';

  // Restore to premium status
  await updateUserSubscriptionStatus(user.uid, {
    status: 'premium',
    paymentStatus: 'active',
    // Clear grace period fields
    gracePeriodEnd: admin.firestore.FieldValue.delete(),
    paymentFailedAt: admin.firestore.FieldValue.delete()
  });

  // Update Firebase Custom Claims
  await admin.auth().setCustomUserClaims(user.uid, {
    status: 'premium',
    subscriptionId,
    stripeCustomerId: customerId
  });

  // Send payment success email if recovering from failure
  if (wasInGracePeriod) {
    await sendPaymentNotificationEmail(user.email, 'payment_succeeded', {
      userName: user.displayName || user.email,
      invoiceId: invoice.id,
      amount: (invoice.amount_paid / 100).toFixed(2),
      currency: invoice.currency.toUpperCase()
    });
  }

  // Log the restoration
  await logAdminAction('system', 'approve_user', user.uid, user.email,
    wasInGracePeriod ? 'Access restored after payment recovery' : 'Payment processed successfully', {
      invoiceId: invoice.id,
      subscriptionId,
      amount: invoice.amount_paid,
      wasInGracePeriod
    });

  return {
    status: "success",
    userId: user.uid,
    action: wasInGracePeriod ? "restored" : "renewed",
    invoiceId: invoice.id
  };
}

/**
 * Handle failed payment - Implement dunning strategy
 */
async function handlePaymentFailed(event: Stripe.Event): Promise<any> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  console.log(`Processing payment failed for customer: ${customerId}, subscription: ${subscriptionId}`);

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return { status: "user_not_found" };
  }

  // Get current user data
  const userDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(user.uid).get();
  const userData = userDoc.data() as UserProfile;

  const now = admin.firestore.Timestamp.now();
  const paymentFailedAt = userData?.paymentFailedAt || now;
  const daysSinceFailure = Math.floor((now.toMillis() - paymentFailedAt.toMillis()) / (24 * 60 * 60 * 1000));

  // Implement dunning strategy based on days since first failure
  let newStatus: UserStatus = 'past_due';
  let emailTemplate: EmailTemplate | null = null;
  let gracePeriodEnd: admin.firestore.Timestamp | null = null;

  if (daysSinceFailure >= DUNNING_TIMELINE.FINAL_NOTICE) {
    // Day 7+: Final notice and enter grace period
    newStatus = 'grace_period';
    emailTemplate = 'payment_failed_final';
    gracePeriodEnd = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + (DUNNING_TIMELINE.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    );
  } else if (daysSinceFailure >= DUNNING_TIMELINE.URGENT_REMINDER) {
    // Day 3+: Urgent reminder
    newStatus = 'past_due';
    emailTemplate = 'payment_failed_urgent';
  } else if (daysSinceFailure >= DUNNING_TIMELINE.GENTLE_REMINDER) {
    // Day 1+: Gentle reminder
    newStatus = 'past_due';
    emailTemplate = 'payment_failed_gentle';
  }
  // Day 0: Silent retry (handled by Stripe Smart Retries)

  // Update user status
  const updateData: Partial<UserProfile> = {
    status: newStatus,
    paymentStatus: 'past_due',
    paymentFailedAt: userData?.paymentFailedAt || now
  };

  if (gracePeriodEnd) {
    updateData.gracePeriodEnd = gracePeriodEnd;
  }

  await updateUserSubscriptionStatus(user.uid, updateData);

  // Update Firebase Custom Claims
  await admin.auth().setCustomUserClaims(user.uid, {
    status: newStatus,
    subscriptionId,
    stripeCustomerId: customerId
  });

  // Send appropriate email notification
  if (emailTemplate) {
    await sendPaymentNotificationEmail(user.email, emailTemplate, {
      userName: user.displayName || user.email,
      invoiceId: invoice.id,
      amount: (invoice.amount_due / 100).toFixed(2),
      currency: invoice.currency.toUpperCase(),
      daysSinceFailure,
      gracePeriodEndDate: gracePeriodEnd?.toDate().toLocaleDateString()
    });
  }

  // Log the payment failure
  await logAdminAction('system', 'suspend_user', user.uid, user.email,
    `Payment failed - Day ${daysSinceFailure} of dunning process`, {
      invoiceId: invoice.id,
      subscriptionId,
      daysSinceFailure,
      newStatus,
      emailTemplate,
      gracePeriodEnd: gracePeriodEnd?.toDate().toISOString()
    });

  return {
    status: "success",
    userId: user.uid,
    newStatus,
    daysSinceFailure,
    emailTemplate,
    invoiceId: invoice.id
  };
}

/**
 * Handle customer created - Link Stripe customer to Firebase user
 */
async function handleCustomerCreated(event: Stripe.Event): Promise<any> {
  const customer = event.data.object as Stripe.Customer;

  console.log(`Processing customer created: ${customer.id}`);

  // Store Stripe customer data
  await admin.firestore().collection(COLLECTIONS.STRIPE_CUSTOMERS).doc(customer.id).set({
    customerId: customer.id,
    email: customer.email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    metadata: customer.metadata || {}
  });

  // If customer has metadata with Firebase UID, link them
  if (customer.metadata?.firebaseUID) {
    const userId = customer.metadata.firebaseUID;

    // Update user document with Stripe customer ID
    await admin.firestore().collection(COLLECTIONS.USERS).doc(userId).update({
      'subscription.stripeCustomerId': customer.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Linked Stripe customer ${customer.id} to Firebase user ${userId}`);

    return { status: "success", customerId: customer.id, userId };
  }

  return { status: "success", customerId: customer.id };
}

/**
 * Utility function to find user by Stripe customer ID
 */
async function findUserByStripeCustomerId(customerId: string): Promise<UserProfile | null> {
  // First try to find in users collection by subscription.stripeCustomerId
  const usersQuery = await admin.firestore()
    .collection(COLLECTIONS.USERS)
    .where('subscription.stripeCustomerId', '==', customerId)
    .limit(1)
    .get();

  if (!usersQuery.empty) {
    const userDoc = usersQuery.docs[0];
    return { uid: userDoc.id, ...userDoc.data() } as UserProfile;
  }

  // Fallback: check stripe_customers collection
  const customerDoc = await admin.firestore()
    .collection(COLLECTIONS.STRIPE_CUSTOMERS)
    .doc(customerId)
    .get();

  if (customerDoc.exists) {
    const customerData = customerDoc.data();
    if (customerData?.userId) {
      const userDoc = await admin.firestore()
        .collection(COLLECTIONS.USERS)
        .doc(customerData.userId)
        .get();

      if (userDoc.exists) {
        return { uid: userDoc.id, ...userDoc.data() } as UserProfile;
      }
    }
  }

  return null;
}

/**
 * Update user subscription status and related fields
 */
async function updateUserSubscriptionStatus(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const userRef = admin.firestore().collection(COLLECTIONS.USERS).doc(userId);

  await userRef.update({
    ...updates,
    isApproved: updates.status !== 'free', // Legacy compatibility
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Log admin action for audit trail
 */
async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId: string,
  targetUserEmail: string,
  notes: string,
  metadata?: Record<string, any>
): Promise<void> {
  await admin.firestore().collection(COLLECTIONS.ADMIN_LOGS).add({
    adminId,
    adminEmail: adminId === 'system' ? 'system@dopair.app' : 'unknown',
    action,
    targetUserId,
    targetUserEmail,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    notes,
    metadata: metadata || {}
  });
}

/**
 * Scheduled function to check and process grace period expirations
 */
export const processGracePeriodExpirations = onRequest({}, async (req, res) => {
  try {
    const now = admin.firestore.Timestamp.now();

    // Find users whose grace period has expired
    const expiredUsersQuery = await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .where('status', '==', 'grace_period')
      .where('gracePeriodEnd', '<=', now)
      .get();

    const processedUsers = [];

    for (const doc of expiredUsersQuery.docs) {
      const userId = doc.id;
      const userData = doc.data() as UserProfile;

      try {
        // Suspend the user
        await updateUserSubscriptionStatus(userId, {
          status: 'suspended',
          paymentStatus: 'canceled'
        });

        // Update Firebase Custom Claims
        await admin.auth().setCustomUserClaims(userId, {
          status: 'suspended',
          stripeCustomerId: userData.subscription?.stripeCustomerId
        });

        // Send suspension email
        await sendPaymentNotificationEmail(userData.email, 'account_suspended', {
          userName: userData.displayName || userData.email
        });

        // Log the suspension
        await logAdminAction('system', 'suspend_user', userId, userData.email,
          'Account suspended after grace period expiration', {
            gracePeriodEnd: userData.gracePeriodEnd?.toDate().toISOString(),
            suspendedAt: now.toDate().toISOString()
          });

        processedUsers.push({
          userId,
          email: userData.email,
          status: 'suspended'
        });

      } catch (error) {
        console.error(`Error processing grace period expiration for user ${userId}:`, error);
      }
    }

    console.log(`Processed ${processedUsers.length} grace period expirations`);

    res.json({
      success: true,
      processedCount: processedUsers.length,
      processedUsers
    });

  } catch (error) {
    console.error("Error processing grace period expirations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});