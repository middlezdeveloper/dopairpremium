export interface SubscriptionTier {
  id: 'free' | 'recovery' | 'alumni' | 'family';
  name: string;
  price: number; // in cents
  interval: 'month';
  description: string;
  features: string[];
  limitations: {
    aiMessages: number | 'unlimited';
    blockingApps: number | 'unlimited';
    familyAccounts?: number;
  };
  requirements?: string[];
  stripePriceId?: string;
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    description: 'Basic features to get started',
    features: [
      'Basic app blocking',
      'Daily usage stats',
      'Community forum access',
      'Basic progress tracking',
    ],
    limitations: {
      aiMessages: 0,
      blockingApps: 5,
    },
  },
  recovery: {
    id: 'recovery',
    name: 'Recovery',
    price: 3900, // $39.00
    interval: 'month',
    description: 'Full recovery program with AI coach',
    features: [
      'Unlimited AI coach conversations',
      'Personalized recovery program',
      'Unlimited app blocking',
      'Screenshot analysis',
      'Accountability partner matching',
      'Advanced progress tracking',
      'Priority support',
    ],
    limitations: {
      aiMessages: 'unlimited',
      blockingApps: 'unlimited',
    },
    stripePriceId: process.env.STRIPE_RECOVERY_PRICE_ID,
  },
  alumni: {
    id: 'alumni',
    name: 'Alumni',
    price: 1400, // $14.00
    interval: 'month',
    description: 'Maintenance and mentorship for graduates',
    features: [
      'Maintenance AI coach (100 messages/month)',
      'Challenge creator tools',
      'Mentor access and matching',
      'Advanced blocking rules',
      'Lifetime progress tracking',
      'Alumni community access',
    ],
    limitations: {
      aiMessages: 100,
      blockingApps: 'unlimited',
    },
    requirements: ['Must complete 8+ weeks in Recovery program'],
    stripePriceId: process.env.STRIPE_ALUMNI_PRICE_ID,
  },
  family: {
    id: 'family',
    name: 'Family',
    price: 9900, // $99.00
    interval: 'month',
    description: 'Everything for up to 5 family members',
    features: [
      'All Recovery features for 5 accounts',
      'Family dashboard and insights',
      'Group challenges and goals',
      'Parental controls and monitoring',
      'Family therapy session booking',
      'Shared accountability tools',
    ],
    limitations: {
      aiMessages: 'unlimited',
      blockingApps: 'unlimited',
      familyAccounts: 5,
    },
    stripePriceId: process.env.STRIPE_FAMILY_PRICE_ID,
  },
};

export function getTierById(tierId: string): SubscriptionTier | null {
  return SUBSCRIPTION_TIERS[tierId] || null;
}

export function getTierFeatures(tierId: string): string[] {
  const tier = getTierById(tierId);
  return tier ? tier.features : [];
}

export function canAccessFeature(userTier: string, requiredTier: string): boolean {
  const tierHierarchy = ['free', 'alumni', 'recovery', 'family'];
  const userTierIndex = tierHierarchy.indexOf(userTier);
  const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

  return userTierIndex >= requiredTierIndex;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getMobileFeaturesForTier(tier: string) {
  const tierData = getTierById(tier);
  if (!tierData) return { hasAICoach: false, blockingLimit: 5 };

  return {
    hasAICoach: tier !== 'free',
    blockingLimit: tierData.limitations.blockingApps === 'unlimited' ? 999 : tierData.limitations.blockingApps,
    hasAdvancedBlocking: ['recovery', 'alumni', 'family'].includes(tier),
    hasAccountabilityPartner: ['recovery', 'family'].includes(tier),
    hasFamilyFeatures: tier === 'family',
  };
}