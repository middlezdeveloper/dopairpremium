# MailerLite Marketing Email Setup

This guide explains how to configure MailerLite for non-subscriber marketing campaigns.

## Overview

MailerLite is used for marketing emails to users who are not premium subscribers. This includes:
- Lead nurturing sequences
- Re-engagement campaigns
- Feature announcements
- Upgrade promotions

## Setup Steps

### 1. MailerLite Account Configuration

1. **Create MailerLite Account**
   - Sign up at https://mailerlite.com
   - Choose appropriate plan based on subscriber count

2. **Get API Key**
   - Go to Integrations → API
   - Generate new API token
   - Copy the token for Firebase configuration

3. **Create Groups**
   - Create group: "Non-Subscribers" (ID: `non_subscribers`)
   - Create additional segments as needed

### 2. Firebase Configuration

1. **Set API Secret**
   ```bash
   firebase functions:secrets:set MAILERLITE_API_KEY="your_api_key_here"
   ```

2. **Deploy Functions**
   ```bash
   firebase deploy --only functions:addToMarketingList,functions:updateMarketingSubscriber,functions:removeFromMarketingList
   ```

### 3. Integration Points

#### When to Add Users to MailerLite

```typescript
// After user signs up but doesn't subscribe
await syncUserToMarketing(userEmail, {
  status: 'free',
  source: 'signup',
  ddasCompleted: false
});

// After DDAS completion (no subscription)
await syncUserToMarketing(userEmail, {
  status: 'free',
  ddasCompleted: true,
  lastActivity: new Date()
});

// When premium user churns
await syncUserToMarketing(userEmail, {
  status: 'churned',
  lastActivity: new Date()
});
```

#### When to Remove Users from MailerLite

```typescript
// User subscribes to premium
await removeFromMarketingList(userEmail, 'premium_conversion');

// User requests to unsubscribe from marketing
await removeFromMarketingList(userEmail, 'user_request');
```

### 4. Marketing Segments

Configure these segments in MailerLite based on custom fields:

#### Segment: Incomplete Assessment
- **Condition**: `ddas_completed = false`
- **Campaign**: "Complete Your Digital Wellness Assessment"
- **Frequency**: 3-email sequence over 1 week

#### Segment: Assessment Completed
- **Condition**: `ddas_completed = true AND user_status = free`
- **Campaign**: "Unlock Your Full Potential" upgrade sequence
- **Frequency**: 5-email sequence over 2 weeks

#### Segment: Churned Users
- **Condition**: `user_status = churned`
- **Campaign**: Win-back sequence with special offers
- **Frequency**: 4-email sequence over 3 weeks

#### Segment: Engaged Free Users
- **Condition**: `user_status = free AND last_activity < 7 days ago`
- **Campaign**: Exclusive content and upgrade incentives
- **Frequency**: Weekly newsletter + targeted promotions

#### Segment: Inactive Users
- **Condition**: `last_activity > 30 days ago`
- **Campaign**: Re-engagement sequence
- **Frequency**: 2-email sequence, then monthly check-ins

### 5. Email Campaign Templates

#### Welcome Series (for new signups)
1. **Email 1**: Welcome + next steps
2. **Email 2**: Complete DDAS assessment (if not done)
3. **Email 3**: Digital wellness tips
4. **Email 4**: Community features intro
5. **Email 5**: Premium feature preview

#### Upgrade Campaign (for DDAS completers)
1. **Email 1**: "Your assessment results unlock more"
2. **Email 2**: Success stories from premium users
3. **Email 3**: Premium feature deep-dive
4. **Email 4**: Limited-time discount offer
5. **Email 5**: Final call to action

#### Win-back Campaign (for churned users)
1. **Email 1**: "We miss you" with special offer
2. **Email 2**: "What's new since you left"
3. **Email 3**: Feedback request survey
4. **Email 4**: Final win-back offer

### 6. Automation Triggers

Set up these automations in MailerLite:

#### New Subscriber Trigger
- **Trigger**: User added to "Non-Subscribers" group
- **Action**: Start welcome email series
- **Delay**: Immediate first email, then 2-day intervals

#### DDAS Completion Trigger
- **Trigger**: Custom field `ddas_completed` changes to `true`
- **Action**: Move to upgrade campaign sequence
- **Delay**: 1 day after completion

#### Inactivity Trigger
- **Trigger**: Custom field `last_activity` > 30 days old
- **Action**: Start re-engagement sequence
- **Delay**: Weekly check until re-engaged

### 7. Performance Tracking

Track these metrics in MailerLite dashboard:

#### Key Metrics
- **Open Rate**: Target >25%
- **Click Rate**: Target >3%
- **Conversion Rate**: Target >2% (to premium)
- **Unsubscribe Rate**: Keep <0.5%

#### Segment Performance
- Monitor conversion rates by segment
- A/B test subject lines and content
- Track user journey from marketing email to premium subscription

### 8. Integration with Stripe Webhooks

Update the Stripe webhook handlers to sync with MailerLite:

```typescript
// In stripe-webhooks.ts - handleSubscriptionCreated
await removeFromMarketingList(user.email, 'premium_conversion');

// In stripe-webhooks.ts - handleSubscriptionDeleted
await syncUserToMarketing(user.email, {
  status: 'churned',
  lastActivity: new Date()
});
```

### 9. Privacy and Compliance

#### GDPR Compliance
- Include clear unsubscribe links in all emails
- Honor unsubscribe requests immediately
- Maintain consent records in `marketing_subscribers` collection

#### Data Retention
- Remove marketing data for users who request deletion
- Regular cleanup of inactive subscribers (>1 year)

### 10. Testing

#### Development Testing
1. Use MailerLite sandbox/test environment
2. Test all webhook integrations
3. Verify segmentation logic
4. Test unsubscribe flows

#### Production Checklist
- [ ] API key configured in Firebase secrets
- [ ] Functions deployed successfully
- [ ] Groups created in MailerLite
- [ ] Automation sequences set up
- [ ] Test emails sent and received
- [ ] Tracking pixels and analytics working
- [ ] Unsubscribe links functional
- [ ] GDPR compliance verified

## Monitoring and Maintenance

### Weekly Tasks
- Review campaign performance metrics
- Check for failed API calls in Firebase logs
- Monitor subscription growth and churn

### Monthly Tasks
- Analyze segment performance
- Update email templates based on performance
- Clean up inactive subscribers
- Review automation sequences for optimization

### Emergency Procedures
- If API rate limits hit: implement exponential backoff
- If high unsubscribe rate: pause campaigns and investigate
- If deliverability issues: check sender reputation and authentication

## Cost Estimation

MailerLite pricing (as of 2024):
- **Free**: Up to 1,000 subscribers
- **Growing Business**: $9/month for up to 2,500 subscribers
- **Advanced**: $19/month for up to 5,000 subscribers

Plan for approximately 20-30% of your free users to be in marketing campaigns.

## Support Resources

- MailerLite Documentation: https://help.mailerlite.com
- API Reference: https://developers.mailerlite.com
- Firebase Functions Logs: Check for integration errors
- Internal monitoring: `marketing_subscribers` collection in Firestore