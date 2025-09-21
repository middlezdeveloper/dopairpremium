# Stripe Webhook Implementation Guide

## Overview

This guide details how to implement Stripe webhooks for automatic user status management in Dopair Premium, including grace periods, automatic approval for paid members, and graduated access control.

## Required Stripe Products Configuration

### 1. Create Stripe Products

First, configure your products in the Stripe Dashboard:

```bash
# Example Stripe CLI commands for product creation
stripe products create \
  --name "Dopair Premium Monthly" \
  --description "Monthly subscription to Dopair Premium platform"

stripe prices create \
  --product prod_XXXXXXXXXX \
  --unit-amount 2999 \
  --currency usd \
  --recurring interval=month \
  --lookup-key dopair_premium_monthly

stripe products create \
  --name "Dopair Premium Annual" \
  --description "Annual subscription to Dopair Premium platform"

stripe prices create \
  --product prod_YYYYYYYYYY \
  --unit-amount 29999 \
  --currency usd \
  --recurring interval=year \
  --lookup-key dopair_premium_annual
```

### 2. Required Metadata Configuration

Add these metadata fields to your Stripe products/prices:

```json
{
  "platform": "dopair_premium",
  "access_level": "premium",
  "features": "ai_chat,premium_content,unlimited_assessments",
  "user_status": "premium"
}
```

## Webhook Events Implementation

### 1. Required Webhook Events

Configure these webhook events in your Stripe Dashboard:

- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_action_required`

### 2. Firebase Functions Implementation

Create `/functions/src/stripe-webhooks.ts`:

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Define secrets
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

export const stripeWebhook = onRequest(
  {
    secrets: [stripeSecretKey, stripeWebhookSecret],
    memory: '256MiB',
    timeoutSeconds: 60
  },
  async (req, res) => {
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2023-10-16',
    });

    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    try {
      await handleStripeEvent(event, stripe);
      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).send('Webhook processing failed');
    }
  }
);

async function handleStripeEvent(event: Stripe.Event, stripe: Stripe) {
  console.log('Processing event:', event.type, event.id);

  switch (event.type) {
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice, stripe);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, stripe);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, stripe);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, stripe);
      break;

    case 'invoice.payment_action_required':
      await handlePaymentActionRequired(event.data.object as Stripe.Invoice, stripe);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

// Handle successful payment
async function handleInvoicePaid(invoice: Stripe.Invoice, stripe: Stripe) {
  if (!invoice.subscription) return;

  const userId = await getUserIdFromCustomer(invoice.customer as string, stripe);
  if (!userId) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

  await updateUserStatus(userId, {
    status: 'premium',
    paymentStatus: 'active',
    approvalType: 'stripe',
    approvedAt: Timestamp.now(),
    gracePeriodEnd: null,
    paymentFailedAt: null,
    subscription: {
      tier: 'premium',
      stripeCustomerId: invoice.customer as string,
      subscriptionId: subscription.id,
      priceId: subscription.items.data[0]?.price.id,
    }
  });

  console.log(`User ${userId} upgraded to premium via successful payment`);
}

// Handle failed payment with grace period logic
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, stripe: Stripe) {
  if (!invoice.subscription) return;

  const userId = await getUserIdFromCustomer(invoice.customer as string, stripe);
  if (!userId) return;

  const attemptCount = invoice.attempt_count || 1;

  if (attemptCount === 1) {
    // First failure - Start 7-day grace period
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

    await updateUserStatus(userId, {
      status: 'grace_period',
      paymentStatus: 'past_due',
      gracePeriodEnd: Timestamp.fromDate(gracePeriodEnd),
      paymentFailedAt: Timestamp.now(),
    });

    console.log(`User ${userId} entered grace period after first payment failure`);

    // TODO: Send grace period notification email

  } else if (attemptCount >= 3) {
    // Final failure - Downgrade to free
    await updateUserStatus(userId, {
      status: 'free',
      paymentStatus: 'canceled',
      approvalType: 'pending',
      gracePeriodEnd: null,
    });

    console.log(`User ${userId} downgraded to free after final payment failure`);

    // TODO: Send subscription cancellation email
  }
}

// Handle subscription status changes
async function handleSubscriptionUpdated(subscription: Stripe.Subscription, stripe: Stripe) {
  const userId = await getUserIdFromCustomer(subscription.customer as string, stripe);
  if (!userId) return;

  const statusUpdate = await mapStripeStatusToUserStatus(subscription, stripe);

  await updateUserStatus(userId, {
    ...statusUpdate,
    subscription: {
      tier: 'premium',
      stripeCustomerId: subscription.customer as string,
      subscriptionId: subscription.id,
      priceId: subscription.items.data[0]?.price.id,
    }
  });

  console.log(`User ${userId} subscription updated to ${subscription.status}`);
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, stripe: Stripe) {
  const userId = await getUserIdFromCustomer(subscription.customer as string, stripe);
  if (!userId) return;

  await updateUserStatus(userId, {
    status: 'free',
    paymentStatus: 'canceled',
    approvalType: 'pending',
    gracePeriodEnd: null,
    subscription: {
      tier: 'free',
      stripeCustomerId: subscription.customer as string,
      subscriptionId: null,
      priceId: null,
    }
  });

  console.log(`User ${userId} subscription deleted - downgraded to free`);
}

// Handle payment action required (3D Secure, etc.)
async function handlePaymentActionRequired(invoice: Stripe.Invoice, stripe: Stripe) {
  if (!invoice.subscription) return;

  const userId = await getUserIdFromCustomer(invoice.customer as string, stripe);
  if (!userId) return;

  // TODO: Send email notification about required payment action
  console.log(`Payment action required for user ${userId}`);
}

// Helper function to map Stripe subscription status to user status
async function mapStripeStatusToUserStatus(subscription: Stripe.Subscription, stripe: Stripe) {
  // Get price metadata to determine user status
  const priceId = subscription.items.data[0]?.price.id;
  let userTier = 'free';

  if (priceId) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      userTier = price.metadata?.user_status || 'free';
    } catch (error) {
      console.error('Error retrieving price metadata:', error);
    }
  }

  switch (subscription.status) {
    case 'active':
      return {
        status: userTier as const,
        paymentStatus: 'active' as const,
        approvalType: 'stripe' as const,
        approvedAt: Timestamp.now(),
        gracePeriodEnd: null,
        paymentFailedAt: null,
      };

    case 'past_due':
      return {
        status: 'past_due' as const,
        paymentStatus: 'past_due' as const,
      };

    case 'canceled':
    case 'unpaid':
      return {
        status: 'free' as const,
        paymentStatus: 'canceled' as const,
        approvalType: 'pending' as const,
        gracePeriodEnd: null,
      };

    case 'incomplete':
      return {
        status: 'free' as const,
        paymentStatus: 'incomplete' as const,
      };

    case 'trialing':
      return {
        status: 'premium' as const,
        paymentStatus: 'active' as const,
        approvalType: 'stripe' as const,
        approvedAt: Timestamp.now(),
      };

    default:
      return {};
  }
}

// Helper function to get Firebase user ID from Stripe customer
async function getUserIdFromCustomer(customerId: string, stripe: Stripe): Promise<string | null> {
  try {
    // First check if we have the mapping in Firestore
    const customerDoc = await db.collection('stripe_customers').doc(customerId).get();
    if (customerDoc.exists) {
      return customerDoc.data()?.userId || null;
    }

    // Fallback: Get customer email from Stripe and find user
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    if (!customer.email) return null;

    const userQuery = await db.collection('users')
      .where('email', '==', customer.email)
      .limit(1)
      .get();

    if (userQuery.empty) return null;

    const userId = userQuery.docs[0].id;

    // Save the mapping for future use
    await db.collection('stripe_customers').doc(customerId).set({
      userId,
      customerId,
      email: customer.email,
      createdAt: Timestamp.now(),
    });

    return userId;
  } catch (error) {
    console.error('Error getting user ID from customer:', error);
    return null;
  }
}

// Helper function to update user status in Firestore
async function updateUserStatus(userId: string, updates: any) {
  try {
    await db.collection('users').doc(userId).update({
      ...updates,
      updatedAt: Timestamp.now(),
    });

    // Log the status change for admin tracking
    await db.collection('admin_logs').add({
      adminId: 'system',
      adminEmail: 'stripe-webhook@dopair.app',
      action: 'stripe_status_update',
      targetUserId: userId,
      targetUserEmail: updates.email || 'unknown',
      timestamp: Timestamp.now(),
      metadata: updates,
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
}
```

## Firebase Functions Deployment

### 1. Set Required Secrets

```bash
# Set Stripe secrets
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# Deploy functions
firebase deploy --only functions
```

### 2. Configure Webhook Endpoint

In your Stripe Dashboard:
1. Go to Developers > Webhooks
2. Add endpoint: `https://your-project.cloudfunctions.net/stripeWebhook`
3. Select the events listed above
4. Copy the webhook signing secret to Firebase secrets

## Grace Period Implementation

### Access Level Configuration

Update `/src/lib/firebase-shared/collections.ts`:

```typescript
export const ACCESS_LEVELS = {
  free: {
    ddas: true,
    chat: false,
    premiumContent: false,
    chatLimit: 0,
  },
  premium: {
    ddas: true,
    chat: true,
    premiumContent: true,
    chatLimit: 100, // daily limit
  },
  past_due: {
    ddas: true,
    chat: false, // Immediate restriction
    premiumContent: false,
    chatLimit: 0,
  },
  grace_period: {
    ddas: true,
    chat: true, // Keep access during grace period
    premiumContent: false, // Partial restriction
    chatLimit: 20, // Reduced limit
  },
  suspended: {
    ddas: true, // Keep wellness basics
    chat: false,
    premiumContent: false,
    chatLimit: 0,
  },
} as const;
```

### Grace Period Validation Function

```typescript
export function getUserAccessLevel(user: UserProfile): AccessLevel {
  const baseAccess = ACCESS_LEVELS[user.status];

  // Check for expired grace period
  if (user.status === 'grace_period' && user.gracePeriodEnd) {
    const now = new Date();
    const graceEnd = user.gracePeriodEnd.toDate();

    if (now > graceEnd) {
      // Grace period expired - return free access
      // Note: Status should be updated by a scheduled function
      return ACCESS_LEVELS.free;
    }
  }

  return baseAccess;
}
```

## Product-Specific Configuration

### 1. Environment Variables

Set these in your Firebase project:

```bash
# Stripe Product IDs
STRIPE_MONTHLY_PRICE_ID=price_1234567890
STRIPE_ANNUAL_PRICE_ID=price_0987654321

# Webhook configuration
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SECRET_KEY=sk_live_... # or sk_test_...
```

### 2. Product Mapping in Code

```typescript
// Map specific price IDs to features - UPDATE WITH YOUR ACTUAL PRICE IDS
const PRICE_ID_MAPPING = {
  'price_1S9P9NB0md0hKsVZMF665sGk': { // Dopair Premium Monthly - $29/month
    tier: 'premium',
    features: ['ai_chat', 'premium_content', 'unlimited_assessments'],
    chatLimit: 100,
    access_level: 'premium',
    user_status: 'premium',
  },
  // Add annual plan when created
  // 'price_ANNUAL_ID': {
  //   tier: 'premium',
  //   features: ['ai_chat', 'premium_content', 'unlimited_assessments'],
  //   chatLimit: 100,
  // },
};

function getFeaturesByPriceId(priceId: string) {
  return PRICE_ID_MAPPING[priceId] || {
    tier: 'free',
    features: ['ddas_only'],
    chatLimit: 0,
  };
}
```

## Testing Webhooks

### 1. Stripe CLI Testing

```bash
# Install Stripe CLI
# Forward webhooks to local development
stripe listen --forward-to localhost:5001/your-project/us-central1/stripeWebhook

# Trigger test events
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated
```

### 2. Test Customer Journey

1. **New Subscription**: `customer.subscription.created` → User status: `premium`
2. **Payment Success**: `invoice.paid` → Maintain `premium` status
3. **Payment Failure**: `invoice.payment_failed` → Status: `grace_period` (7 days)
4. **Grace Period Expiry**: Scheduled function → Status: `free`
5. **Subscription Cancel**: `customer.subscription.deleted` → Status: `free`

## Monitoring and Logs

### 1. Firebase Functions Logs

```bash
# View webhook logs
firebase functions:log --only stripeWebhook

# Filter for errors
firebase functions:log --only stripeWebhook | grep ERROR
```

### 2. Stripe Dashboard

Monitor webhook delivery in Stripe Dashboard:
- Webhooks > View logs
- Check for failed deliveries and retry attempts
- Verify event signatures

## Security Considerations

1. **Webhook Signature Verification**: Always verify Stripe signatures
2. **Idempotency**: Handle duplicate webhook events gracefully
3. **Error Handling**: Implement proper error handling and retries
4. **Rate Limiting**: Monitor for webhook replay attacks
5. **Data Validation**: Validate all webhook data before processing

## Required Next Steps

1. ✅ Webhook implementation completed
2. 🔄 Deploy Firebase functions with secrets
3. 🔄 Configure Stripe webhook endpoint
4. 🔄 Set up Stripe products and prices
5. 🔄 Test webhook events in development
6. 🔄 Create scheduled function for grace period expiry
7. 🔄 Implement email notifications for status changes
8. 🔄 Set up monitoring and alerting