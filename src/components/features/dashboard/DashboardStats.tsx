'use client';

import { UserSubscription, Assessment } from '@/lib/firebase-shared/collections';

interface DashboardStatsProps {
  subscription: UserSubscription | null;
  assessment: Assessment | null;
}

export function DashboardStats({ subscription, assessment }: DashboardStatsProps) {
  const stats = [
    {
      name: 'Recovery Progress',
      value: assessment ? '12 days' : '—',
      change: '+2 days this week',
      changeType: 'positive',
    },
    {
      name: 'AI Coach Sessions',
      value: subscription?.tier !== 'free' ? '24' : '0',
      change: '+3 this week',
      changeType: 'positive',
    },
    {
      name: 'Apps Blocked',
      value: '8',
      change: '+2 this week',
      changeType: 'positive',
    },
    {
      name: 'Screen Time Saved',
      value: '2.5h',
      change: '+30min this week',
      changeType: 'positive',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.name}
          className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
        >
          <dt>
            <p className="text-sm font-medium text-gray-500 truncate">{item.name}</p>
          </dt>
          <dd className="pb-6 flex items-baseline sm:pb-7">
            <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
            <p
              className={`ml-2 flex items-baseline text-sm font-semibold ${
                item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {item.change}
            </p>
          </dd>
        </div>
      ))}
    </div>
  );
}