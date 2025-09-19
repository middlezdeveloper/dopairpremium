'use client';

import Link from 'next/link';
import { UserSubscription } from '@/lib/firebase-shared/collections';

interface QuickActionsProps {
  subscription: UserSubscription | null;
  needsAssessment: boolean;
}

export function QuickActions({ subscription, needsAssessment }: QuickActionsProps) {
  const actions = [
    {
      name: 'Chat with AI Coach',
      description: 'Get personalized guidance and support',
      href: '/dashboard/coach',
      icon: '🤖',
      available: subscription?.tier !== 'free',
      tier: 'Recovery+',
    },
    {
      name: 'Block Apps & Sites',
      description: 'Set up blocking rules for distractions',
      href: '/dashboard/blocking',
      icon: '🛡️',
      available: true,
      tier: 'All plans',
    },
    {
      name: 'View Progress',
      description: 'Track your recovery journey',
      href: '/dashboard/progress',
      icon: '📊',
      available: true,
      tier: 'All plans',
    },
    {
      name: 'Take Assessment',
      description: 'Update your DDAS profile',
      href: process.env.NEXT_PUBLIC_QUIZ_URL || 'https://quiz.dopair.com',
      icon: '📋',
      available: true,
      tier: 'All plans',
      highlight: needsAssessment,
    },
    {
      name: 'Join Challenge',
      description: 'Participate in community challenges',
      href: '/dashboard/challenges',
      icon: '🎯',
      available: subscription?.tier === 'alumni' || subscription?.tier === 'family',
      tier: 'Alumni+',
    },
    {
      name: 'Family Dashboard',
      description: 'Manage family accounts and insights',
      href: '/dashboard/family',
      icon: '👨‍👩‍👧‍👦',
      available: subscription?.tier === 'family',
      tier: 'Family only',
    },
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className={`relative rounded-lg border-2 p-4 transition-all ${
                action.available
                  ? action.highlight
                    ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex items-start">
                <div className="text-2xl mr-3">{action.icon}</div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {action.name}
                    {!action.available && (
                      <span className="ml-2 text-xs text-amber-600">🔒</span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">{action.description}</p>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {action.tier}
                  </span>
                  {action.highlight && (
                    <div className="absolute -top-2 -right-2">
                      <span className="bg-amber-400 text-amber-900 text-xs font-medium px-2 py-1 rounded-full">
                        Required
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}