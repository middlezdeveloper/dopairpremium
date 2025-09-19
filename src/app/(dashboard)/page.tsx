'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { useAssessment } from '@/hooks/useAssessment';
import { DashboardStats } from '@/components/features/dashboard/DashboardStats';
import { WelcomeCard } from '@/components/features/dashboard/WelcomeCard';
import { QuickActions } from '@/components/features/dashboard/QuickActions';
import { RecentActivity } from '@/components/features/dashboard/RecentActivity';

export default function DashboardPage() {
  const { subscription, currentTier, loading: subLoading } = useSubscription();
  const { assessment, needsAssessment, loading: assessmentLoading } = useAssessment();

  if (subLoading || assessmentLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <WelcomeCard
        subscription={subscription}
        currentTier={currentTier}
        needsAssessment={needsAssessment}
      />

      {/* Dashboard Stats */}
      <DashboardStats
        subscription={subscription}
        assessment={assessment}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <QuickActions
            subscription={subscription}
            needsAssessment={needsAssessment}
          />
        </div>

        {/* Recent Activity */}
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}