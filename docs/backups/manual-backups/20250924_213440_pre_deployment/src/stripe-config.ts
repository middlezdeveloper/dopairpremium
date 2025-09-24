// Stripe Configuration for Dopair Premium
// This file contains your specific Stripe product configuration

export const STRIPE_CONFIG = {
  // Your actual price IDs from Stripe Dashboard
  PRICES: {
    MONTHLY: 'price_1S9P9NB0md0hKsVZMF665sGk', // $29/month
    // Add annual when created: 'price_ANNUAL_ID_HERE'
  },

  // Product metadata mapping
  PRODUCT_FEATURES: {
    'price_1S9P9NB0md0hKsVZMF665sGk': {
      tier: 'premium',
      access_level: 'premium',
      user_status: 'premium',
      features: [
        'ai_chat',
        'premium_content',
        'unlimited_assessments',
        'progress_tracking'
      ],
      chatLimit: 100, // daily limit
      billing_interval: 'month',
      amount: 2900, // $29.00 in cents
    }
  },

  // Grace period configuration
  GRACE_PERIOD_DAYS: 7,

  // Retry attempts before final cancellation
  MAX_PAYMENT_ATTEMPTS: 3,
};

// Helper function to get features by price ID
export function getProductFeatures(priceId: string) {
  return STRIPE_CONFIG.PRODUCT_FEATURES[priceId] || {
    tier: 'free',
    access_level: 'free',
    user_status: 'free',
    features: ['ddas_assessment'],
    chatLimit: 0,
  };
}

// Validate if price ID is for premium product
export function isPremiumPrice(priceId: string): boolean {
  const features = getProductFeatures(priceId);
  return features.tier === 'premium';
}

// Get user status from Stripe subscription
export function getUserStatusFromSubscription(
  subscription: any,
  paymentAttempt?: number
): 'premium' | 'grace_period' | 'past_due' | 'free' {

  if (!subscription) return 'free';

  const priceId = subscription.items?.data?.[0]?.price?.id;

  if (!isPremiumPrice(priceId)) {
    return 'free';
  }

  switch (subscription.status) {
    case 'active':
    case 'trialing':
      return 'premium';

    case 'past_due':
      // First payment failure = grace period
      if (paymentAttempt === 1) {
        return 'grace_period';
      }
      return 'past_due';

    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'free';

    default:
      return 'free';
  }
}