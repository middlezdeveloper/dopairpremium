# Next Steps for Stripe Integration

## ✅ Already Configured

1. **Stripe Product Created**: "Dopair Premium"
2. **Price Created**: `price_1S9P9NB0md0hKsVZMF665sGk` ($29/month)
3. **Metadata Set**:
   - `access_level: premium`
   - `platform: dopair_premium`
   - `user_status: premium`

## 🔄 Immediate Next Steps

### 1. Set Up Firebase Secrets

```bash
# Navigate to your functions directory
cd functions

# Set your Stripe secrets (replace with actual values)
firebase functions:secrets:set STRIPE_SECRET_KEY
# Enter: sk_test_... or sk_live_...

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Enter: whsec_... (you'll get this after setting up webhook endpoint)
```

### 2. Deploy Webhook Function

```bash
# Deploy the webhook function
firebase deploy --only functions:stripeWebhook
```

This will output a URL like:
`https://us-central1-YOUR-PROJECT.cloudfunctions.net/stripeWebhook`

### 3. Configure Stripe Webhook Endpoint

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your function URL: `https://us-central1-YOUR-PROJECT.cloudfunctions.net/stripeWebhook`
4. Select these events:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Update Firebase secret: `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`

### 4. Test the Integration

Create a test subscription:

```bash
# Using Stripe CLI (optional)
stripe listen --forward-to localhost:5001/YOUR-PROJECT/us-central1/stripeWebhook
stripe trigger customer.subscription.created
```

Or manually create a test customer in Stripe Dashboard.

## 🔄 Additional Implementation Needed

### 1. Create Checkout Session API

Create `/functions/src/create-checkout.ts`:

```typescript
import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

export const createCheckoutSession = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    const stripe = new Stripe(stripeSecretKey.value());
    const { userId, email } = request.data;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: 'price_1S9P9NB0md0hKsVZMF665sGk', // Your monthly price
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: 'https://premium.dopair.app/dashboard?success=true',
        cancel_url: 'https://premium.dopair.app/account?canceled=true',
        customer_email: email,
        metadata: {
          userId: userId,
        },
      });

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }
);
```

### 2. Add Upgrade Button to UI

In your account portal, add:

```typescript
const handleUpgrade = async () => {
  try {
    const createCheckout = httpsCallable(functions, 'createCheckoutSession');
    const result = await createCheckout({
      userId: user.uid,
      email: user.email,
    });

    // Redirect to Stripe Checkout
    window.location.href = result.data.url;
  } catch (error) {
    console.error('Upgrade failed:', error);
  }
};
```

### 3. Create Customer Portal Session

For billing management, create `/functions/src/customer-portal.ts`:

```typescript
import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

export const createPortalSession = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    const stripe = new Stripe(stripeSecretKey.value());
    const { customerId } = request.data;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://premium.dopair.app/account',
    });

    return { url: session.url };
  }
);
```

## 🧪 Testing Checklist

### Manual Testing Flow

1. **Free User Signup** → Status: `free`, Approval: `pending`
2. **Admin Approval** → Status: `premium`, Approval: `admin`
3. **Stripe Subscription** → Status: `premium`, Approval: `stripe`
4. **Payment Success** → Maintain `premium` status
5. **Payment Failure** → Status: `grace_period` (7 days)
6. **Grace Expiry** → Status: `free`
7. **Subscription Cancel** → Status: `free`

### Webhook Testing

```bash
# Test webhook events
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated
```

Check Firebase logs:
```bash
firebase functions:log --only stripeWebhook
```

## 📋 Production Checklist

- [ ] Switch to live Stripe keys (`sk_live_...`)
- [ ] Update webhook endpoint to production URL
- [ ] Test with real payment methods
- [ ] Set up monitoring/alerting for webhook failures
- [ ] Create scheduled function for grace period expiry
- [ ] Implement email notifications for status changes
- [ ] Add error handling for failed webhook processing

## 🚨 Important Notes

1. **Price ID**: Your current price is `price_1S9P9NB0md0hKsVZMF665sGk`
2. **Amount**: $29.00/month (2900 cents)
3. **Metadata**: Already configured correctly
4. **Grace Period**: 7 days after first payment failure
5. **Auto-Approval**: Users with active Stripe subscriptions get automatic `premium` status

Your Stripe setup is well-configured! The main work now is implementing the webhook functions and connecting the frontend upgrade flow.