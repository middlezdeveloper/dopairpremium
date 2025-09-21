# 🔐 Stripe Setup Instructions

## Required Stripe Credentials

You'll need to set up these secrets in Firebase Functions:

### 1. Stripe Secret Key
```bash
# Get your production secret key from https://dashboard.stripe.com/apikeys
# Then run:
firebase functions:secrets:set STRIPE_SECRET_KEY

# When prompted, paste your secret key (starts with sk_live_)
```

### 2. Stripe Webhook Secret
```bash
# Get your webhook endpoint secret from https://dashboard.stripe.com/webhooks
# Then run:
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# When prompted, paste your webhook secret (starts with whsec_)
```

## Webhook Endpoint Configuration

### 1. Create Webhook in Stripe Dashboard
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://us-central1-dopair.cloudfunctions.net/stripeWebhooks`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.created`

### 2. Get Webhook Secret
1. Click on your newly created webhook
2. Copy the "Signing secret" (starts with `whsec_`)
3. Use this for STRIPE_WEBHOOK_SECRET above

## Deployment Commands

After setting up secrets, deploy the functions:

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:getBillingInfo,getBillingHistory,pauseSubscription,cancelSubscription,getPaymentMethodUpdateURL,stripeWebhooks
```

## Testing the Integration

1. **Test Billing Portal**: Log into premium.dopair.app → Account → Subscription tab
2. **Test Webhook**: Create a test subscription in Stripe dashboard
3. **Check Logs**: `firebase functions:log` to see function execution

## Security Notes

- ✅ All functions require Firebase Authentication
- ✅ Users can only access their own billing data
- ✅ CORS configured for premium.dopair.app only
- ✅ All operations logged for audit trail
- ✅ Webhook signature verification enabled

## Stripe Customer Portal Configuration

In your Stripe dashboard:
1. Go to Settings → Billing → Customer portal
2. Enable the portal and configure allowed actions:
   - ✅ Update payment methods
   - ✅ Download invoices
   - ✅ View subscription details
   - ❌ Cancel subscriptions (handled by our custom UI)

## Next Steps After Setup

1. Test the billing portal functionality
2. Create a test subscription to verify webhooks
3. Monitor function logs for any issues
4. Set up monitoring/alerts for failed payments