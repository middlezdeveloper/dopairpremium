'use client';

import { UserSubscription } from '@/lib/firebase-shared/collections';
import { SubscriptionTier } from '@/lib/subscription/tiers';

interface WelcomeCardProps {
  subscription: UserSubscription | null;
  currentTier: SubscriptionTier | null;
  needsAssessment: boolean;
}

export function WelcomeCard({ subscription, currentTier, needsAssessment }: WelcomeCardProps) {
  const getWelcomeMessage = () => {
    if (needsAssessment) {
      return {
        title: 'Welcome to Dopair Premium! 🎉',
        subtitle: 'Start your recovery journey by taking our assessment',
        action: 'Take Assessment',
        actionUrl: process.env.NEXT_PUBLIC_QUIZ_URL || 'https://quiz.dopair.com',
      };
    }

    if (subscription?.tier === 'free') {
      return {
        title: 'Ready to unlock your full potential? 🚀',
        subtitle: 'Upgrade to Recovery or Alumni to access AI coaching and advanced features',
        action: 'View Plans',
        actionUrl: '/dashboard/settings',
      };
    }

    return {
      title: `Welcome back! 👋`,
      subtitle: `You're on the ${currentTier?.name} plan with full access to premium features`,
      action: 'Continue Recovery',
      actionUrl: '/dashboard/coach',
    };
  };

  const { title, subtitle, action, actionUrl } = getWelcomeMessage();

  return (
    <div className="bg-gradient-to-r from-primary-500 to-recovery-500 rounded-lg shadow-sm p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          <p className="text-primary-100 text-lg mb-4">{subtitle}</p>

          {subscription && (
            <div className="flex items-center space-x-4 text-sm">
              <span className="bg-white/20 rounded-full px-3 py-1">
                {currentTier?.name} Plan
              </span>
              {subscription.status === 'active' && (
                <span className="bg-recovery-400 rounded-full px-3 py-1">
                  ✓ Active
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <a
            href={actionUrl}
            className="bg-white text-primary-600 font-medium py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors inline-block"
          >
            {action}
          </a>
        </div>
      </div>
    </div>
  );
}