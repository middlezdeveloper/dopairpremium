# Improved User Status System with Stripe Integration

## Current Status Architecture

The system already has a well-designed status structure with:

- **UserStatus**: `'free' | 'premium' | 'past_due' | 'grace_period' | 'suspended'`
- **PaymentStatus**: `'active' | 'past_due' | 'canceled' | 'incomplete'`
- **ApprovalType**: `'pending' | 'stripe' | 'admin'`

## Automatic Approval Logic

### Stripe Webhook Integration

Based on Stripe best practices, implement these webhook events for automatic status management:

#### 1. `invoice.paid` Event
```typescript
// When recurring payment succeeds
if (event.type === 'invoice.paid') {
  const invoice = event.data.object;
  if (invoice.subscription) {
    // Update user status to premium with stripe approval
    await updateUserStatus(userId, {
      status: 'premium',
      paymentStatus: 'active',
      approvalType: 'stripe',
      approvedAt: serverTimestamp(),
      gracePeriodEnd: null, // Clear any grace period
    });
  }
}
```

#### 2. `invoice.payment_failed` Event
```typescript
// When payment fails - implement grace period
if (event.type === 'invoice.payment_failed') {
  const invoice = event.data.object;
  const attemptCount = invoice.attempt_count;

  if (attemptCount === 1) {
    // First failure - 7 day grace period
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

    await updateUserStatus(userId, {
      status: 'grace_period',
      paymentStatus: 'past_due',
      gracePeriodEnd: Timestamp.fromDate(gracePeriodEnd),
      paymentFailedAt: serverTimestamp(),
    });
  } else if (attemptCount >= 3) {
    // Final failure - downgrade to free
    await updateUserStatus(userId, {
      status: 'free',
      paymentStatus: 'canceled',
      approvalType: 'pending', // Requires manual re-approval
    });
  }
}
```

#### 3. `customer.subscription.updated` Event
```typescript
// Handle subscription status changes
if (event.type === 'customer.subscription.updated') {
  const subscription = event.data.object;

  switch (subscription.status) {
    case 'active':
      await updateUserStatus(userId, {
        status: 'premium',
        paymentStatus: 'active',
        approvalType: 'stripe',
      });
      break;

    case 'past_due':
      await updateUserStatus(userId, {
        status: 'past_due',
        paymentStatus: 'past_due',
      });
      break;

    case 'canceled':
      await updateUserStatus(userId, {
        status: 'free',
        paymentStatus: 'canceled',
        approvalType: 'pending',
      });
      break;
  }
}
```

## Enhanced User Access Control

### Status-Based Access Matrix

| Status | DDAS Access | AI Chat | Premium Content | Chat Limit | Auto-Renewal |
|--------|-------------|---------|-----------------|------------|--------------|
| `free` | ✅ | ❌ | ❌ | 0 | N/A |
| `premium` | ✅ | ✅ | ✅ | 100/day | ✅ |
| `past_due` | ✅ | ❌ | ❌ | 0 | ⚠️ Retry |
| `grace_period` | ✅ | ✅ | ❌ | 20/day | ⚠️ 7 days |
| `suspended` | ✅ | ❌ | ❌ | 0 | ❌ |

### Improved Access Check Function

```typescript
export function getUserAccessLevel(user: UserProfile): AccessLevel {
  const baseAccess = ACCESS_LEVELS[user.status];

  // Check for expired grace period
  if (user.status === 'grace_period' && user.gracePeriodEnd) {
    const now = new Date();
    const graceEnd = user.gracePeriodEnd.toDate();

    if (now > graceEnd) {
      // Grace period expired - should be downgraded
      return ACCESS_LEVELS.free;
    }
  }

  return baseAccess;
}
```

## Implementation Steps

### 1. Firebase Functions for Webhooks

Create `/functions/src/stripe-webhooks.ts`:

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const stripeWebhook = onRequest(
  { secrets: ['STRIPE_WEBHOOK_SECRET', 'STRIPE_SECRET_KEY'] },
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send('Webhook Error');
    }

    await handleStripeEvent(event);
    res.json({ received: true });
  }
);
```

### 2. Status Management Service

Create `/src/lib/services/user-status.ts`:

```typescript
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase-shared/collections';

export async function updateUserSubscriptionStatus(
  userId: string,
  stripeSubscription: Stripe.Subscription
) {
  const userRef = doc(db, COLLECTIONS.USERS, userId);

  const statusUpdate = mapStripeStatusToUserStatus(stripeSubscription);

  await updateDoc(userRef, {
    ...statusUpdate,
    'subscription.subscriptionId': stripeSubscription.id,
    'subscription.stripeCustomerId': stripeSubscription.customer,
    updatedAt: serverTimestamp(),
  });
}

function mapStripeStatusToUserStatus(subscription: Stripe.Subscription) {
  switch (subscription.status) {
    case 'active':
      return {
        status: 'premium' as const,
        paymentStatus: 'active' as const,
        approvalType: 'stripe' as const,
        approvedAt: serverTimestamp(),
        gracePeriodEnd: null,
      };

    case 'past_due':
      return {
        status: 'past_due' as const,
        paymentStatus: 'past_due' as const,
      };

    case 'canceled':
      return {
        status: 'free' as const,
        paymentStatus: 'canceled' as const,
        approvalType: 'pending' as const,
      };

    default:
      return {};
  }
}
```

### 3. Migration Strategy

For existing users with `isApproved: true`:

```typescript
// Migration function to run once
export async function migrateExistingUsers() {
  const usersQuery = query(
    collection(db, COLLECTIONS.USERS),
    where('isApproved', '==', true)
  );

  const snapshot = await getDocs(usersQuery);

  for (const userDoc of snapshot.docs) {
    const user = userDoc.data();

    await updateDoc(userDoc.ref, {
      status: 'premium', // Assume existing approved users are premium
      paymentStatus: 'active',
      approvalType: 'admin', // Grandfathered admin approval
      approvedAt: user.createdAt || serverTimestamp(),
    });
  }
}
```

## Benefits of This System

1. **Automatic Approval**: Paid Stripe customers get instant access
2. **Grace Period**: 7-day buffer for payment failures
3. **Graduated Restrictions**: Clear access levels for each status
4. **Admin Override**: Manual approval still available for special cases
5. **Audit Trail**: Complete history of status changes
6. **Stripe Integration**: Real-time updates from payment events

## Next Steps

1. ✅ Status system is already well-designed
2. 🔄 Implement Stripe webhook functions
3. 🔄 Add status management service
4. 🔄 Update admin portal to show new status fields
5. 🔄 Build self-service customer portal
6. 🔄 Test webhook integration in Stripe dashboard