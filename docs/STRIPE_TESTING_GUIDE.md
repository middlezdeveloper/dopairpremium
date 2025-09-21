# Stripe Subscription Testing Guide

## 🚀 Quick Test Setup (No Code Required)

### Method 1: Stripe Payment Links

1. Go to [Stripe Dashboard > Payment Links](https://dashboard.stripe.com/payment-links)
2. Click "Create payment link"
3. Configure:
   - **Product**: Select "Dopair Premium"
   - **Price**: `price_1S9P9NB0md0hKsVZMF665sGk` ($29/month)
   - **Mode**: Subscription
   - **Success URL**: `https://premium.dopair.app/dashboard?success=true`
   - **Cancel URL**: `https://premium.dopair.app/account?canceled=true`

4. **Test the payment link** with these test cards:

## 🧪 Test Payment Methods

### Apple Pay Testing
- **Test Card**: Add `4242 4242 4242 4242` to your Apple Wallet
- **Expiry**: Any future date (12/34)
- **CVC**: Any 3 digits (123)

### Test Card Numbers
```
✅ Successful Payment:     4242 4242 4242 4242
❌ Declined Payment:       4000 0000 0000 0002
⚠️  Requires 3D Secure:    4000 0025 0000 3155
💳 Insufficient Funds:     4000 0000 0000 9995
```

## 📱 Apple Pay Billing Flow

### Initial Subscription
1. User selects Apple Pay at checkout
2. Apple Pay processes first $29 payment
3. Stripe stores payment method token
4. Subscription created in Stripe
5. **Webhook fired**: `customer.subscription.created`
6. **Your system**: User upgraded to premium status

### Recurring Payments (Monthly)
1. **Stripe automatically bills** the stored payment method
2. **No Apple Pay popup** - bills card on file silently
3. **Success**: `invoice.paid` webhook → maintain premium
4. **Failure**: `invoice.payment_failed` webhook → grace period

### Payment Method Updates
- Users must update via Stripe Customer Portal
- Cannot update through Apple Pay after initial setup
- Card expiry/replacement requires manual update

## 🔄 Test Scenarios

### 1. Successful Subscription Flow
```bash
# Create test subscription
User pays with Apple Pay →
invoice.paid webhook →
User status: premium, approval: stripe
```

### 2. Payment Failure Flow
```bash
# Simulate payment failure
First failure →
invoice.payment_failed (attempt 1) →
User status: grace_period (7 days)

Third failure →
invoice.payment_failed (attempt 3) →
User status: free, approval: pending
```

### 3. Subscription Updates
```bash
# User cancels subscription
customer.subscription.deleted →
User status: free, approval: pending
```

## 🛠️ Test Webhook Events

### Using Stripe CLI
```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:5001/YOUR-PROJECT/us-central1/stripeWebhook

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

### Using Stripe Dashboard
1. Go to Developers > Webhooks
2. Click on your webhook endpoint
3. Click "Send test webhook"
4. Select event type and send

## 📊 Monitoring Test Results

### Check Firebase Logs
```bash
firebase functions:log --only stripeWebhook
```

### Check User Status in Firestore
1. Go to Firebase Console > Firestore
2. Navigate to `users` collection
3. Find your test user document
4. Verify status changes:
   - `status`: Should change based on events
   - `approvalType`: Should be `stripe` for paid users
   - `gracePeriodEnd`: Should be set during payment failures

### Check Stripe Dashboard
1. **Customers**: View created customer records
2. **Subscriptions**: Monitor subscription status
3. **Invoices**: Track payment attempts
4. **Events**: See all webhook events fired

## 🎯 Expected Test Results

### Successful Payment Test
- ✅ User status changes to `premium`
- ✅ Approval type set to `stripe`
- ✅ Grace period cleared
- ✅ Access level upgraded (100 chat/day)

### Failed Payment Test
- ✅ User status changes to `grace_period`
- ✅ Grace period end date set (+7 days)
- ✅ Access level reduced (20 chat/day)
- ✅ Premium content disabled

### Subscription Cancellation Test
- ✅ User status changes to `free`
- ✅ Approval type reset to `pending`
- ✅ All premium features disabled

## 🔍 Troubleshooting

### Common Issues

**Webhook Not Firing**
- Check webhook URL is correct
- Verify endpoint is deployed
- Check Firebase logs for errors

**User Not Found**
- Ensure customer email matches user email
- Check Firestore user collection
- Verify customer ID mapping

**Status Not Updating**
- Check webhook signature verification
- Verify Firestore permissions
- Check admin logs collection

### Debug Steps
1. **Check Stripe Events**: Verify events are being sent
2. **Check Firebase Logs**: Look for webhook processing errors
3. **Check Firestore**: Verify user document updates
4. **Check Network**: Ensure webhook endpoint is reachable

## 🚀 Production Testing Checklist

Before going live:
- [ ] Test all payment methods (Apple Pay, cards, Google Pay)
- [ ] Verify webhook signature validation works
- [ ] Test payment failure scenarios
- [ ] Confirm grace period expiry handling
- [ ] Test subscription cancellation flow
- [ ] Verify email notifications work
- [ ] Check error handling and logging
- [ ] Test with real (small) amounts

## 📞 Next Steps After Testing

1. **Deploy webhook function** with production secrets
2. **Update webhook endpoint** to production URL
3. **Switch to live Stripe keys** when ready
4. **Set up monitoring** for webhook failures
5. **Create customer support workflows** for payment issues

Remember: All testing should be done with Stripe test mode first!