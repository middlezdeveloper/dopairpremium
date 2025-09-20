'use client';

import { useState, useMemo } from 'react';
import { UsageTracking, UserProfile } from '@/lib/firebase-shared/collections';

interface UsageAnalyticsProps {
  usageData: UsageTracking[];
  users: UserProfile[];
}

interface ChartData {
  date: string;
  messages: number;
  users: number;
}

interface UserTypeUsage {
  userType: string;
  messages: number;
  users: number;
  averagePerUser: number;
}

export default function UsageAnalytics({ usageData, users }: UsageAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [chartType, setChartType] = useState<'messages' | 'users'>('messages');
  const [alertThreshold, setAlertThreshold] = useState(50);

  // Calculate analytics data
  const analytics = useMemo(() => {
    const today = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(today.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(today.getDate() - 90);
        break;
    }

    // Filter usage data by time range
    const filteredUsage = usageData.filter(usage => {
      const usageDate = new Date(usage.date);
      return usageDate >= startDate && usageDate <= today;
    });

    // Group by date for chart
    const chartData: Record<string, ChartData> = {};

    // Initialize all dates in range
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      chartData[dateStr] = {
        date: dateStr,
        messages: 0,
        users: 0
      };
    }

    // Aggregate data by date
    filteredUsage.forEach(usage => {
      if (chartData[usage.date]) {
        chartData[usage.date].messages += usage.chatMessages;
        chartData[usage.date].users += 1;
      }
    });

    // Convert to array and sort
    const chartArray = Object.values(chartData).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate usage by user type
    const userTypeUsage: Record<string, UserTypeUsage> = {
      free: { userType: 'Free', messages: 0, users: 0, averagePerUser: 0 },
      premium: { userType: 'Premium', messages: 0, users: 0, averagePerUser: 0 },
      grace_period: { userType: 'Grace Period', messages: 0, users: 0, averagePerUser: 0 },
      past_due: { userType: 'Past Due', messages: 0, users: 0, averagePerUser: 0 }
    };

    filteredUsage.forEach(usage => {
      const user = users.find(u => u.uid === usage.userId);
      if (user && userTypeUsage[user.status]) {
        userTypeUsage[user.status].messages += usage.chatMessages;
        userTypeUsage[user.status].users += 1;
      }
    });

    // Calculate averages
    Object.values(userTypeUsage).forEach(type => {
      if (type.users > 0) {
        type.averagePerUser = Math.round(type.messages / type.users * 100) / 100;
      }
    });

    // Detect potential abuse (users with high message counts)
    const abuseAlerts = filteredUsage
      .filter(usage => usage.chatMessages > alertThreshold)
      .map(usage => {
        const user = users.find(u => u.uid === usage.userId);
        return {
          userId: usage.userId,
          userEmail: user?.email || 'Unknown',
          date: usage.date,
          messages: usage.chatMessages,
          warnings: usage.warnings || 0,
          blocked: usage.blocked || false
        };
      })
      .sort((a, b) => b.messages - a.messages);

    // Summary stats
    const totalMessages = filteredUsage.reduce((sum, usage) => sum + usage.chatMessages, 0);
    const totalActiveUsers = new Set(filteredUsage.map(usage => usage.userId)).size;
    const averageMessagesPerUser = totalActiveUsers > 0 ? Math.round(totalMessages / totalActiveUsers * 100) / 100 : 0;
    const peakDay = chartArray.reduce((peak, day) =>
      day.messages > peak.messages ? day : peak, chartArray[0] || { date: '', messages: 0, users: 0 }
    );

    return {
      chartData: chartArray,
      userTypeUsage: Object.values(userTypeUsage),
      abuseAlerts,
      summary: {
        totalMessages,
        totalActiveUsers,
        averageMessagesPerUser,
        peakDay
      }
    };
  }, [usageData, users, timeRange, alertThreshold]);

  const exportData = () => {
    const csvContent = [
      ['Date', 'User Type', 'User Email', 'Messages', 'Warnings', 'Blocked'],
      ...usageData.map(usage => {
        const user = users.find(u => u.uid === usage.userId);
        return [
          usage.date,
          user?.status || 'unknown',
          user?.email || 'unknown',
          usage.chatMessages.toString(),
          (usage.warnings || 0).toString(),
          (usage.blocked || false).toString()
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const maxValue = Math.max(...analytics.chartData.map(d =>
    chartType === 'messages' ? d.messages : d.users
  ));

  return (
    <div className="p-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              timeRange === '7d'
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } border focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              timeRange === '30d'
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } border focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              timeRange === '90d'
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } border focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          >
            90 Days
          </button>
        </div>

        <div className="flex gap-2">
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'messages' | 'users')}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="messages">Daily Messages</option>
            <option value="users">Active Users</option>
          </select>
        </div>

        <div className="ml-auto">
          <button
            onClick={exportData}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Export Data
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm font-medium text-gray-600">Total Messages</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.summary.totalMessages.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm font-medium text-gray-600">Active Users</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.summary.totalActiveUsers}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm font-medium text-gray-600">Avg per User</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.summary.averageMessagesPerUser}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm font-medium text-gray-600">Peak Day</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.summary.peakDay.messages}</div>
          <div className="text-xs text-gray-500">{formatDate(analytics.summary.peakDay.date)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {chartType === 'messages' ? 'Daily Messages' : 'Daily Active Users'}
          </h3>
          <div className="h-64">
            {analytics.chartData.length > 0 ? (
              <div className="h-full flex items-end space-x-1">
                {analytics.chartData.map((data, index) => {
                  const value = chartType === 'messages' ? data.messages : data.users;
                  const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

                  return (
                    <div key={data.date} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex justify-center mb-2">
                        <div
                          className="bg-indigo-500 rounded-t w-8 transition-all duration-300 hover:bg-indigo-600"
                          style={{ height: `${height}%`, minHeight: value > 0 ? '4px' : '0' }}
                          title={`${formatDate(data.date)}: ${value} ${chartType}`}
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-center transform -rotate-45 origin-center">
                        {formatDate(data.date)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available for the selected time range
              </div>
            )}
          </div>
        </div>

        {/* Usage by User Type */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Usage by User Type</h3>
          <div className="space-y-4">
            {analytics.userTypeUsage.map((type) => (
              <div key={type.userType} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">{type.userType}</span>
                  <span className="text-sm text-gray-600">{type.users} users</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>{type.messages.toLocaleString()} messages</span>
                  <span>{type.averagePerUser} avg/user</span>
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${analytics.summary.totalMessages > 0
                        ? (type.messages / analytics.summary.totalMessages) * 100
                        : 0}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Abuse Detection */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Abuse Detection</h3>
          <div className="flex items-center space-x-2">
            <label htmlFor="threshold" className="text-sm text-gray-600">Threshold:</label>
            <input
              id="threshold"
              type="number"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="1"
            />
            <span className="text-sm text-gray-600">messages/day</span>
          </div>
        </div>

        {analytics.abuseAlerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.abuseAlerts.map((alert, index) => (
                  <tr key={`${alert.userId}-${alert.date}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {alert.userEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(alert.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        alert.messages > alertThreshold * 2 ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {alert.messages}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {alert.warnings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        alert.blocked
                          ? 'bg-red-100 text-red-800'
                          : alert.warnings > 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {alert.blocked ? 'Blocked' : alert.warnings > 0 ? 'Warned' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No abuse detected</h3>
            <p className="text-gray-600">All users are within normal usage patterns.</p>
          </div>
        )}
      </div>
    </div>
  );
}