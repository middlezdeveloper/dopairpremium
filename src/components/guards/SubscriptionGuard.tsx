'use client';

import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requiredTier?: 'free' | 'recovery' | 'alumni' | 'family';
}

export function SubscriptionGuard({ children, requiredTier = 'free' }: SubscriptionGuardProps) {
  const { subscription, loading, user } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login - for now just show a message
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to access Dopair Premium.</p>
          <button className="btn-primary">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Check tier access (placeholder - will implement proper tier checking)
  if (subscription && subscription.tier !== requiredTier && requiredTier !== 'free') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Upgrade Required</h1>
          <p className="text-gray-600 mb-6">
            This feature requires a {requiredTier} subscription.
          </p>
          <button className="btn-primary">
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}