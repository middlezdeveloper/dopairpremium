# Stripe Webhook Setup Guide

This guide walks you through setting up comprehensive Stripe webhooks for automatic user approval and payment management in your Dopair Premium application.

## Overview

The webhook system implements:
- ✅ Automatic user approval on subscription creation
- ✅ 7-day dunning strategy for failed payments
- ✅ Grace period management with limited access
- ✅ Email notifications for all payment events
- ✅ Webhook signature verification and security
- ✅ Idempotency handling to prevent duplicate processing

## Prerequisites

1. **Firebase Project** with Functions enabled
2. **Stripe Account** with webhook capability
3. **Email Service** (SendGrid, AWS SES, or similar)
4. **Domain** for webhook endpoints

## Setup Steps

### 1. Install Dependencies

```bash
cd functions
npm install stripe@^14.15.0
```

### 2. Configure Firebase Secrets

Set up the required secrets for your Firebase project:

```bash
# Stripe API key (from Stripe Dashboard > Developers > API keys)
firebase functions:secrets:set STRIPE_SECRET_KEY

# Stripe webhook signing secret (from Stripe Dashboard > Webhooks)
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# SendGrid API key (or your email service API key)
firebase functions:secrets:set SENDGRID_API_KEY

# OpenAI API key (if not already set)
firebase functions:secrets:set OPENAI_API_KEY
```

### 3. Deploy Functions

Deploy the webhook functions to Firebase:

```bash
npm run build
firebase deploy --only functions
```

This will deploy:
- `stripeWebhooks` - Main webhook handler
- `processGracePeriodExpirations` - Scheduled function for grace period management

### 4. Configure Stripe Webhooks

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Click "Add endpoint"**
3. **Set endpoint URL**: `https://[region]-[project-id].cloudfunctions.net/stripeWebhooks`
4. **Select events to send**:
   ```
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   invoice.payment_succeeded
   invoice.payment_failed
   customer.created
   ```
5. **Save the webhook**
6. **Copy the signing secret** and update your Firebase secret:
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

### 5. Configure Grace Period Processing

Set up a scheduled function to process grace period expirations:

```bash
# Deploy the scheduled function
firebase deploy --only functions:processGracePeriodExpirations
```

Or set up a manual trigger via HTTP:
```
https://[region]-[project-id].cloudfunctions.net/processGracePeriodExpirations
```

### 6. Configure Email Service

#### Option A: SendGrid Integration

1. Sign up for SendGrid and get API key
2. Verify your sending domain
3. Update the email service to use SendGrid:

```typescript
// In email-service.ts, uncomment and configure:
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(emailApiKey.value());

const msg = {
  to,
  from: { email: fromEmail, name: fromName },
  subject: emailContent.subject,
  html: emailContent.html,
  text: emailContent.text,
};

await sgMail.send(msg);
```

#### Option B: Firebase Extensions

Install the "Trigger Email" extension:
```bash
firebase ext:install firebase/firestore-send-email
```

### 7. Set Up Monitoring

#### Cloud Functions Logs
Monitor webhook processing:
```bash
firebase functions:log --only stripeWebhooks
```

#### Firestore Collections
The system creates these collections for monitoring:
- `processed_webhook_events` - Webhook processing history
- `email_notifications` - Email delivery tracking
- `failed_emails` - Failed email queue for retry
- `adminLogs` - System actions and changes

#### Alerts and Monitoring
Set up Cloud Monitoring alerts for:
- Webhook failures
- Email delivery failures
- Grace period expirations
- High payment failure rates

## Testing

### 1. Test Webhook Endpoint

Use Stripe CLI to forward webhooks locally:
```bash
stripe listen --forward-to localhost:5001/[project-id]/us-central1/stripeWebhooks
```

### 2. Simulate Events

```bash
# Test subscription creation
stripe trigger customer.subscription.created

# Test payment failure
stripe trigger invoice.payment_failed

# Test payment success
stripe trigger invoice.payment_succeeded
```

### 3. Verify User Status Updates

Check Firestore to ensure users are updated correctly:
- User status changes (free → premium → past_due → grace_period → suspended)
- Firebase Custom Claims updates
- Admin logs creation

## Dunning Strategy Timeline

### Day 0: Payment Fails
- ✅ Stripe Smart Retries handle automatic retry
- ✅ User status: `past_due`
- ✅ Access: Restricted (no chat, no premium content)

### Day 1: Gentle Reminder
- ✅ Email: "Payment Update" (gentle tone)
- ✅ User status: `past_due`
- ✅ Access: Still restricted

### Day 3: Urgent Reminder
- ✅ Email: "Action Required" (urgent tone)
- ✅ User status: `past_due`
- ✅ Access: Still restricted

### Day 7: Final Notice & Grace Period
- ✅ Email: "Final Notice" (critical tone)
- ✅ User status: `grace_period`
- ✅ Access: Limited (20 messages/day, no premium content)
- ✅ Grace period: 7 days

### Day 14: Account Suspension
- ✅ Email: "Account Suspended"
- ✅ User status: `suspended`
- ✅ Access: Minimal (DDAS only)

## Access Control During Payment Issues

### Past Due Status
```typescript
{
  ddas: true,              // ✅ Keep wellness basics
  chat: false,             // ❌ No chat access
  premiumContent: false,   // ❌ No premium content
  chatLimit: 0            // ❌ No messages
}
```

### Grace Period Status
```typescript
{
  ddas: true,              // ✅ Keep wellness basics
  chat: true,              // ✅ Limited chat access
  premiumContent: false,   // ❌ No premium content
  chatLimit: 20           // ⚠️ 20 messages per day
}
```

### Suspended Status
```typescript
{
  ddas: true,              // ✅ Keep wellness basics only
  chat: false,             // ❌ No chat access
  premiumContent: false,   // ❌ No premium content
  chatLimit: 0            // ❌ No messages
}
```

## Security Features

### Webhook Signature Verification
- ✅ Verifies Stripe signature on all webhook requests
- ✅ Prevents unauthorized webhook calls
- ✅ 5-minute signature tolerance window

### Idempotency Protection
- ✅ Prevents duplicate processing of the same webhook event
- ✅ Stores processed event IDs in Firestore
- ✅ 24-hour retention for processed events

### Rate Limiting
- ✅ Protects against webhook flooding
- ✅ Configurable rate limits per environment
- ✅ Automatic request throttling

### Error Handling
- ✅ Comprehensive error logging
- ✅ Failed webhook retry mechanism
- ✅ Email delivery retry queue
- ✅ Admin notification for critical failures

## Troubleshooting

### Common Issues

1. **Webhook signature verification fails**
   - Check that `STRIPE_WEBHOOK_SECRET` is set correctly
   - Ensure the secret matches the one in Stripe Dashboard
   - Verify webhook endpoint URL is correct

2. **User not found for Stripe customer**
   - Ensure users have `subscription.stripeCustomerId` field
   - Check that customer metadata includes `firebaseUID`
   - Verify customer creation webhook is processed first

3. **Emails not sending**
   - Check `SENDGRID_API_KEY` secret is set
   - Verify SendGrid domain authentication
   - Check failed emails in `failed_emails` collection

4. **Grace periods not expiring**
   - Ensure `processGracePeriodExpirations` function is deployed
   - Set up scheduled execution or manual triggers
   - Check function logs for processing errors

### Monitoring Queries

Check webhook processing:
```javascript
// In Firestore console
db.collection('processed_webhook_events')
  .where('status', '==', 'failed')
  .orderBy('createdAt', 'desc')
  .limit(10)
```

Check failed emails:
```javascript
db.collection('failed_emails')
  .where('retryCount', '<', 3)
  .orderBy('failedAt', 'desc')
```

Check users in grace period:
```javascript
db.collection('users')
  .where('status', '==', 'grace_period')
  .where('gracePeriodEnd', '<=', new Date())
```

## Customization

### Modifying Dunning Timeline
Edit the timeline in `webhook-config.ts`:
```typescript
DUNNING: {
  GENTLE_REMINDER: 2,    // Change to 2 days
  URGENT_REMINDER: 5,    // Change to 5 days
  FINAL_NOTICE: 10,      // Change to 10 days
  GRACE_PERIOD_DAYS: 5   // Change to 5 days grace
}
```

### Custom Email Templates
Modify templates in `email-service.ts`:
- Update HTML/text content
- Add new template types
- Customize styling and branding

### Additional Webhook Events
Add new events in `stripe-webhooks.ts`:
```typescript
case 'customer.updated':
  result = await handleCustomerUpdated(event);
  break;
```

## Support

For issues with the webhook system:
1. Check Firebase Functions logs
2. Review Stripe webhook logs in dashboard
3. Monitor Firestore collections for errors
4. Contact support with specific error messages and timestamps

---

**Note**: Always test the complete flow in a staging environment before deploying to production. The dunning strategy affects real user access and payments.