'use client';

export function RecentActivity() {
  const activities = [
    {
      id: 1,
      type: 'coach',
      message: 'Completed AI coaching session on impulse control',
      timestamp: '2 hours ago',
      icon: '🤖',
    },
    {
      id: 2,
      type: 'blocking',
      message: 'Added Instagram to blocked apps',
      timestamp: '4 hours ago',
      icon: '🛡️',
    },
    {
      id: 3,
      type: 'progress',
      message: 'Achieved 7-day streak milestone',
      timestamp: '1 day ago',
      icon: '🏆',
    },
    {
      id: 4,
      type: 'assessment',
      message: 'Completed DDAS assessment update',
      timestamp: '3 days ago',
      icon: '📋',
    },
    {
      id: 5,
      type: 'challenge',
      message: 'Joined "30-Day Digital Detox" challenge',
      timestamp: '1 week ago',
      icon: '🎯',
    },
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
      </div>
      <div className="p-6">
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, activityIdx) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {activityIdx !== activities.length - 1 ? (
                    <span
                      className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex items-start space-x-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                        {activity.icon}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="mt-1 text-sm text-gray-500">{activity.timestamp}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <a
            href="/dashboard/activity"
            className="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            View all activity →
          </a>
        </div>
      </div>
    </div>
  );
}