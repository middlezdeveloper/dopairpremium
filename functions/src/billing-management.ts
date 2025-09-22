import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import * as cors from "cors";
import { COLLECTIONS, UserProfile } from "../lib/collections";

// Define secrets
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// Initialize Stripe (will be initialized in handlers)
let stripe: Stripe | null = null;

// CORS configuration
const corsHandler = cors({
  origin: [
    'https://dopair.app',
    'https://premium.dopair.app',
    'https://dopair.web.app',
    'https://premium.dopair.web.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
});

/**
 * Get comprehensive billing information for the authenticated user
 */
export const getBillingInfo = onRequest({
  secrets: [stripeSecretKey],
}, async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Initialize Stripe
      if (!stripe) {
        stripe = new Stripe(stripeSecretKey.value(), {
          apiVersion: "2023-10-16",
        });
      }

      // Verify authentication
      const user = await verifyAuthentication(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Get user's Stripe customer ID
      const { stripeCustomerId, subscriptionId } = await getUserStripeInfo(user.uid);
      if (!stripeCustomerId || !subscriptionId) {
        res.status(404).json({ error: "No subscription found" });
        return;
      }

      // Fetch subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method', 'customer', 'discount.coupon']
      });

      // Get customer details
      const customer = await stripe.customers.retrieve(stripeCustomerId);

      // Get upcoming invoice
      let upcomingInvoice = null;
      try {
        const upcoming = await stripe.invoices.retrieveUpcoming({
          customer: stripeCustomerId,
        });
        upcomingInvoice = {
          id: upcoming.id,
          amountDue: upcoming.amount_due,
          currency: upcoming.currency,
          periodStart: new Date(upcoming.period_start * 1000).toISOString(),
          periodEnd: new Date(upcoming.period_end * 1000).toISOString(),
        };
      } catch (error) {
        // No upcoming invoice
      }

      // Format response
      const billingInfo = {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          pauseCollection: subscription.pause_collection ? {
            behavior: subscription.pause_collection.behavior,
            resumesAt: new Date(subscription.pause_collection.resumes_at! * 1000).toISOString(),
          } : undefined,
          discount: subscription.discount ? {
            id: subscription.discount.id,
            coupon: {
              id: (subscription.discount as any).coupon?.id,
              name: (subscription.discount as any).coupon?.name,
              amountOff: (subscription.discount as any).coupon?.amount_off,
              percentOff: (subscription.discount as any).coupon?.percent_off,
              currency: (subscription.discount as any).coupon?.currency,
              duration: (subscription.discount as any).coupon?.duration,
              durationInMonths: (subscription.discount as any).coupon?.duration_in_months,
            },
            start: new Date((subscription.discount as any).start * 1000).toISOString(),
            end: (subscription.discount as any).end ? new Date((subscription.discount as any).end * 1000).toISOString() : undefined,
          } : undefined,
          items: subscription.items.data.map(item => ({
            id: item.id,
            price: {
              id: item.price.id,
              unitAmount: item.price.unit_amount || 0,
              currency: item.price.currency,
              recurring: {
                interval: item.price.recurring?.interval || 'month',
              },
            },
          })),
        },
        customer: {
          id: customer.id,
          email: (customer as any).email || '',
          defaultPaymentMethod: subscription.default_payment_method && typeof subscription.default_payment_method === 'object' ? {
            id: subscription.default_payment_method.id,
            type: subscription.default_payment_method.type as 'card',
            card: subscription.default_payment_method.type === 'card' ? {
              brand: (subscription.default_payment_method as any).card.brand,
              last4: (subscription.default_payment_method as any).card.last4,
              expMonth: (subscription.default_payment_method as any).card.exp_month,
              expYear: (subscription.default_payment_method as any).card.exp_year,
            } : undefined,
          } : undefined,
        },
        upcomingInvoice,
      };

      res.json(billingInfo);

    } catch (error) {
      console.error("Error getting billing info:", error);
      res.status(500).json({ error: "Failed to get billing information" });
    }
  });
});

/**
 * Get billing history for the authenticated user
 */
export const getBillingHistory = onRequest({
  secrets: [stripeSecretKey],
}, async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Initialize Stripe
      if (!stripe) {
        stripe = new Stripe(stripeSecretKey.value(), {
          apiVersion: "2023-10-16",
        });
      }

      // Verify authentication
      const user = await verifyAuthentication(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Get user's Stripe customer ID
      const { stripeCustomerId } = await getUserStripeInfo(user.uid);
      if (!stripeCustomerId) {
        res.status(404).json({ error: "No customer found" });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 12;

      // Fetch invoices
      const invoices = await stripe.invoices.list({
        customer: stripeCustomerId,
        limit,
        status: 'paid', // Only show paid invoices for history
      });

      const billingHistory = {
        invoices: invoices.data.map(invoice => ({
          id: invoice.id,
          number: invoice.number || '',
          status: invoice.status || 'open',
          amountPaid: invoice.amount_paid,
          amountDue: invoice.amount_due,
          currency: invoice.currency,
          created: new Date(invoice.created * 1000).toISOString(),
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : undefined,
          hostedInvoiceUrl: invoice.hosted_invoice_url || '',
          invoicePdf: invoice.invoice_pdf || '',
          description: invoice.description || undefined,
        })),
        hasMore: invoices.has_more,
      };

      res.json(billingHistory);

    } catch (error) {
      console.error("Error getting billing history:", error);
      res.status(500).json({ error: "Failed to get billing history" });
    }
  });
});

/**
 * Pause subscription for authenticated user
 */
export const pauseSubscription = onRequest({
  secrets: [stripeSecretKey],
}, async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Initialize Stripe
      if (!stripe) {
        stripe = new Stripe(stripeSecretKey.value(), {
          apiVersion: "2023-10-16",
        });
      }

      // Verify authentication
      const user = await verifyAuthentication(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { pauseDuration } = req.body;

      // Get user's subscription ID
      const { subscriptionId } = await getUserStripeInfo(user.uid);
      if (!subscriptionId) {
        res.status(404).json({ error: "No subscription found" });
        return;
      }

      // Calculate resume date (1 month from now)
      const resumeAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days

      // Pause the subscription
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: 'keep_as_draft',
          resumes_at: resumeAt,
        },
      });

      // Update user status in Firebase
      await admin.firestore().collection(COLLECTIONS.USERS).doc(user.uid).update({
        status: 'grace_period',
        gracePeriodEnd: admin.firestore.Timestamp.fromMillis(resumeAt * 1000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          pauseCollection: {
            behavior: subscription.pause_collection?.behavior || '',
            resumesAt: new Date(resumeAt * 1000).toISOString(),
          },
        },
        message: "Subscription paused successfully",
      });

    } catch (error) {
      console.error("Error pausing subscription:", error);
      res.status(500).json({ error: "Failed to pause subscription" });
    }
  });
});

/**
 * Cancel subscription for authenticated user
 */
export const cancelSubscription = onRequest({
  secrets: [stripeSecretKey],
}, async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Initialize Stripe
      if (!stripe) {
        stripe = new Stripe(stripeSecretKey.value(), {
          apiVersion: "2023-10-16",
        });
      }

      // Verify authentication
      const user = await verifyAuthentication(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { reason } = req.body;

      // Get user's subscription ID
      const { subscriptionId } = await getUserStripeInfo(user.uid);
      if (!subscriptionId) {
        res.status(404).json({ error: "No subscription found" });
        return;
      }

      // Cancel the subscription at period end
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        cancellation_details: reason ? {
          comment: reason,
        } : undefined,
      });

      // Log cancellation reason if provided
      if (reason) {
        await admin.firestore().collection(COLLECTIONS.ADMIN_LOGS).add({
          adminId: 'system',
          adminEmail: 'system@dopair.app',
          action: 'subscription_cancellation_reason',
          targetUserId: user.uid,
          targetUserEmail: user.email || '',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          notes: `User cancelled subscription. Reason: ${reason}`,
          metadata: {
            subscriptionId,
            reason,
            cancelledAt: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          canceledAt: new Date().toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        },
        message: "Subscription will cancel at the end of the billing period",
      });

    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });
});

/**
 * Get payment method update URL (redirects to Stripe-hosted page)
 */
export const getPaymentMethodUpdateURL = onRequest({
  secrets: [stripeSecretKey],
}, async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Initialize Stripe
      if (!stripe) {
        stripe = new Stripe(stripeSecretKey.value(), {
          apiVersion: "2023-10-16",
        });
      }

      // Verify authentication
      const user = await verifyAuthentication(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Get user's Stripe customer ID
      const { stripeCustomerId } = await getUserStripeInfo(user.uid);
      if (!stripeCustomerId) {
        res.status(404).json({ error: "No customer found" });
        return;
      }

      // Create billing portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.NODE_ENV === 'production' ? 'https://premium.dopair.app' : 'http://localhost:3000'}/account`,
      });

      res.json({
        url: session.url,
      });

    } catch (error) {
      console.error("Error creating billing portal session:", error);
      res.status(500).json({ error: "Failed to create billing portal session" });
    }
  });
});

/**
 * Helper function to verify Firebase authentication
 */
async function verifyAuthentication(req: any): Promise<admin.auth.DecodedIdToken | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const idToken = authHeader.split("Bearer ")[1];
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Authentication verification failed:", error);
    return null;
  }
}

/**
 * Helper function to get user's Stripe information
 */
async function getUserStripeInfo(userId: string): Promise<{
  stripeCustomerId?: string;
  subscriptionId?: string;
}> {
  const userDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(userId).get();
  const userData = userDoc.data() as UserProfile;

  return {
    stripeCustomerId: userData?.subscription?.stripeCustomerId,
    subscriptionId: userData?.subscription?.subscriptionId,
  };
}