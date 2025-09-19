import { stripe } from './config';
import { db } from '@/lib/firebase-shared/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { COLLECTIONS, UserSubscription } from '@/lib/firebase-shared/collections';
import { SUBSCRIPTION_TIERS } from '@/lib/subscription/tiers';

export async function createOrGetCustomer(userId: string, email: string) {
  try {
    // Check if user already has a customer ID
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.subscription?.stripeCustomerId) {
        return userData.subscription.stripeCustomerId;
      }
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        firebaseUID: userId,
      },
    });

    // Update user document with customer ID
    await setDoc(doc(db, COLLECTIONS.USERS, userId), {
      subscription: {
        tier: 'free',
        status: 'active',
        stripeCustomerId: customer.id,
      }
    }, { merge: true });

    return customer.id;
  } catch (error) {
    console.error('Error creating/getting customer:', error);
    throw new Error('Failed to create customer');
  }
}

export async function createSubscription(
  customerId: string,
  priceId: string,
  userId: string
) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        firebaseUID: userId,
      },
    });

    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new Error('Failed to create subscription');
  }
}

export async function updateUserSubscription(
  userId: string,
  subscription: any,
  customer?: any
) {
  try {
    const tier = getTierFromPriceId(subscription.items.data[0].price.id);

    const userSubscription: UserSubscription = {
      tier,
      status: subscription.status,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    await setDoc(doc(db, COLLECTIONS.USERS, userId), {
      subscription: userSubscription,
    }, { merge: true });

    return userSubscription;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw new Error('Failed to update subscription');
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

export async function resumeSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    return subscription;
  } catch (error) {
    console.error('Error resuming subscription:', error);
    throw new Error('Failed to resume subscription');
  }
}

function getTierFromPriceId(priceId: string): 'free' | 'recovery' | 'alumni' | 'family' {
  if (priceId === process.env.STRIPE_RECOVERY_PRICE_ID) return 'recovery';
  if (priceId === process.env.STRIPE_ALUMNI_PRICE_ID) return 'alumni';
  if (priceId === process.env.STRIPE_FAMILY_PRICE_ID) return 'family';
  return 'free';
}

export function getPriceIdFromTier(tier: string): string | null {
  switch (tier) {
    case 'recovery':
      return process.env.STRIPE_RECOVERY_PRICE_ID || null;
    case 'alumni':
      return process.env.STRIPE_ALUMNI_PRICE_ID || null;
    case 'family':
      return process.env.STRIPE_FAMILY_PRICE_ID || null;
    default:
      return null;
  }
}