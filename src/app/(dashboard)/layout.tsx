import { DashboardNav } from '@/components/features/dashboard/DashboardNav'
import { SubscriptionGuard } from '@/components/guards/SubscriptionGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-gray-50">
        <DashboardNav />
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </SubscriptionGuard>
  );
}