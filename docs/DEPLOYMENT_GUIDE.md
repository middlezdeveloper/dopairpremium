# Dopair Premium - Clean Deployment Guide

## 🎯 Deployment Overview

This guide provides clean, step-by-step deployment instructions for the Dopair Premium platform with Stripe integration and automatic user status management.

## 📋 Pre-Deployment Checklist

### ✅ Code & Configuration Ready
- [x] Self-service account portal implemented
- [x] User status system with grace periods
- [x] Dashboard authentication guards
- [x] Logout functionality
- [x] Comprehensive terms & conditions
- [x] Stripe webhook implementation documented

### ✅ Stripe Configuration
- [x] Product: "Dopair Premium"
- [x] Price: `price_1S9P9NB0md0hKsVZMF665sGk` ($29/month)
- [x] Metadata on price level (access_level: premium, platform: dopair_premium, user_status: premium)
- [x] Payment link created and tested

### ✅ Legal & Compliance
- [x] Terms & conditions updated with subscription terms
- [x] Privacy policy considerations
- [x] Grace period policy defined (7 days, reduced access)

## 🚀 Deployment Steps

### Step 1: Firebase Secrets Configuration

```bash
# Navigate to functions directory
cd functions

# Set required Stripe secrets
firebase functions:secrets:set STRIPE_SECRET_KEY
# Enter your live Stripe secret key: sk_live_...

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Enter webhook secret (from Step 3): whsec_...
```

### Step 2: Deploy Webhook Function

```bash
# Deploy the Stripe webhook function
firebase deploy --only functions:stripeWebhook

# Note the deployed function URL (example):
# https://us-central1-your-project.cloudfunctions.net/stripeWebhook
```

### Step 3: Configure Stripe Webhook Endpoint

1. **Go to Stripe Dashboard > Developers > Webhooks**
2. **Click "Add endpoint"**
3. **Enter endpoint URL**: `https://us-central1-YOUR-PROJECT.cloudfunctions.net/stripeWebhook`
4. **Select these events**:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. **Copy the signing secret** (starts with `whsec_`)
6. **Update Firebase secret**:
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   # Paste the signing secret from step 5
   ```

### Step 4: Deploy Frontend Updates

```bash
# Build and deploy the frontend with account portal
npm run build
firebase deploy --only hosting
```

### Step 5: Update Stripe Business Settings

**Switch to Live Mode** in Stripe Dashboard, then:

1. **Go to Settings > Business settings**
2. **Add Terms of Service URL**: `https://dopair.app/terms-conditions.html`
3. **Update Payment Link** with terms requirement:
   - Edit your payment link
   - Enable "Require customers to accept your terms of service"
   - Save changes

### Step 6: Test Production Flow

```bash
# Test with small real payment ($29)
# 1. Create test account in your app
# 2. Use payment link with real card
# 3. Verify webhook events fire
# 4. Check user status updates to "premium"
# 5. Test grace period with failed payment
```

## 🔧 Environment Configuration

### Firebase Project Settings

```bash
# Verify project configuration
firebase projects:list
firebase use YOUR-PROJECT-ID

# Check hosting sites
firebase hosting:sites:list
```

### Required Environment Variables

```bash
# In your .env.local (if using)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# In Firebase Functions (via secrets)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📊 Monitoring & Validation

### Webhook Testing

```bash
# Monitor webhook function logs
firebase functions:log --only stripeWebhook

# Check for successful processing
firebase functions:log --only stripeWebhook | grep "User.*upgraded to premium"
```

### Database Validation

Check Firestore for proper user status updates:

1. **Users Collection**: Verify status changes from webhooks
2. **Admin Logs**: Check automatic status change logging
3. **Stripe Customers**: Confirm customer ID mapping

### User Flow Testing

1. **Free User Signup** → Manual admin approval
2. **Premium Subscription** → Automatic approval via webhook
3. **Payment Failure** → Grace period activation
4. **Subscription Cancel** → Downgrade to free

## 🛡️ Security Considerations

### Webhook Security
- ✅ Signature verification implemented
- ✅ HTTPS endpoint only
- ✅ Proper error handling and logging

### User Data Protection
- ✅ Firestore security rules with admin permissions
- ✅ User isolation (users can only access own data)
- ✅ Encrypted data storage

### Payment Security
- ✅ Stripe handles all payment processing
- ✅ No card data stored locally
- ✅ PCI compliance through Stripe

## 🚨 Rollback Plan

If issues occur during deployment:

```bash
# Rollback Firebase Functions
firebase functions:delete stripeWebhook
# Redeploy previous version

# Rollback Hosting
firebase hosting:clone YOUR-SITE:PREVIOUS-VERSION YOUR-SITE:CURRENT

# Disable webhook in Stripe
# Go to Stripe Dashboard > Webhooks > Disable endpoint
```

## 📈 Post-Deployment Monitoring

### Week 1: Critical Monitoring
- Monitor webhook delivery success rate
- Check user status update accuracy
- Verify grace period functionality
- Track payment failure handling

### Week 2-4: Performance Monitoring
- Monitor subscription conversion rates
- Track user retention during grace periods
- Analyze support ticket volume changes
- Review automatic approval success rate

## 🔄 Maintenance Tasks

### Monthly
- Review webhook logs for errors
- Check user status consistency
- Update Stripe price IDs if needed
- Monitor grace period expiry handling

### Quarterly
- Review and update terms & conditions
- Analyze subscription metrics
- Update documentation
- Security audit of user data handling

## 📞 Support & Troubleshooting

### Common Issues

**Webhook not firing:**
- Check endpoint URL is correct
- Verify webhook secret matches
- Check Firebase function deployment

**User status not updating:**
- Check webhook signature verification
- Verify customer email matching
- Check Firestore permissions

**Payment processing issues:**
- Verify Stripe keys are live (not test)
- Check payment method configuration
- Verify price ID mapping

### Emergency Contacts
- **Firebase Support**: Firebase Console > Support
- **Stripe Support**: dashboard.stripe.com/support
- **DNS Issues**: Your domain registrar support

## ✅ Deployment Success Criteria

- [ ] Webhook function deployed and responding
- [ ] Stripe webhook endpoint configured and testing
- [ ] Payment link working with terms acceptance
- [ ] User status updates automatically from payments
- [ ] Grace period functionality working
- [ ] Account portal accessible and functional
- [ ] Terms & conditions accessible at public URL
- [ ] Error logging and monitoring active

## 📚 Related Documentation

- [`STRIPE_WEBHOOK_IMPLEMENTATION.md`](./STRIPE_WEBHOOK_IMPLEMENTATION.md) - Detailed webhook code
- [`IMPLEMENTATION_SUMMARY.md`](./IMPLEMENTATION_SUMMARY.md) - Complete feature overview
- [`USER_STATUS_DESIGN.md`](./USER_STATUS_DESIGN.md) - Status system architecture
- [`NEXT_STEPS_STRIPE_SETUP.md`](./NEXT_STEPS_STRIPE_SETUP.md) - Stripe configuration details

---

**🎯 Ready for Production**: This deployment guide provides everything needed to launch Dopair Premium with automatic subscription management, secure payment processing, and comprehensive user status handling.