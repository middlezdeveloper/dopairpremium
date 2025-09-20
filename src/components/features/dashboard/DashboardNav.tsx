'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'AI Coach', href: '/dashboard/coach', icon: '🤖', requiresTier: 'recovery' },
  { name: 'Blocking', href: '/dashboard/blocking', icon: '🛡️' },
  { name: 'Challenges', href: '/dashboard/challenges', icon: '🎯', requiresTier: 'alumni' },
  { name: 'Family', href: '/dashboard/family', icon: '👨‍👩‍👧‍👦', requiresTier: 'family' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
];

// Add test link in development
if (process.env.NODE_ENV === 'development') {
  navigation.splice(2, 0, { name: 'Test Coach', href: '/dashboard/coach/test', icon: '🧪' });
}

export function DashboardNav() {
  const pathname = usePathname();
  const { subscription, currentTier } = useSubscription();

  const canAccessFeature = (requiredTier?: string) => {
    if (!requiredTier) return true;
    if (!subscription) return false;

    const tierHierarchy = ['free', 'alumni', 'recovery', 'family'];
    const userTierIndex = tierHierarchy.indexOf(subscription.tier);
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

    return userTierIndex >= requiredTierIndex;
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">
              Dopair Premium
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const canAccess = canAccessFeature(item.requiresTier);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-indigo-500 text-gray-900'
                      : canAccess
                      ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      : 'border-transparent text-gray-300 cursor-not-allowed'
                  }`}
                  title={!canAccess ? `Requires ${item.requiresTier} subscription` : undefined}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                  {!canAccess && (
                    <span className="ml-1 text-xs text-amber-500">🔒</span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Info */}
          <div className="flex items-center">
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {currentTier?.name || 'Free'} Plan
              </div>
              <div className="text-gray-500">
                {subscription?.status === 'active' ? '✓ Active' : 'Inactive'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}