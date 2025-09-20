'use client';

import { useState, useMemo } from 'react';
import { AdminLog } from '@/lib/firebase-shared/collections';

interface AdminLogsProps {
  logs: AdminLog[];
}

export default function AdminLogs({ logs }: AdminLogsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterAdmin, setFilterAdmin] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Get unique admins and actions for filters
  const uniqueAdmins = useMemo(() => {
    const admins = new Set(logs.map(log => log.adminEmail));
    return Array.from(admins).sort();
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action));
    return Array.from(actions).sort();
  }, [logs]);

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      switch (dateRange) {
        case '7d':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoffDate.setDate(now.getDate() - 90);
          break;
      }

      filtered = filtered.filter(log => {
        const logDate = log.timestamp?.toDate?.() || new Date(log.timestamp);
        return logDate >= cutoffDate;
      });
    }

    // Apply action filter
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    // Apply admin filter
    if (filterAdmin !== 'all') {
      filtered = filtered.filter(log => log.adminEmail === filterAdmin);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.targetUserEmail.toLowerCase().includes(term) ||
        log.adminEmail.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        (log.notes && log.notes.toLowerCase().includes(term))
      );
    }

    return filtered.sort((a, b) => {
      const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
      const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
      return bTime.getTime() - aTime.getTime();
    });
  }, [logs, searchTerm, filterAction, filterAdmin, dateRange]);

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Admin', 'Action', 'Target User', 'Notes'],
      ...filteredLogs.map(log => [
        formatTimestamp(log.timestamp),
        log.adminEmail,
        log.action,
        log.targetUserEmail,
        log.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      approve_user: 'bg-green-100 text-green-800',
      reject_user: 'bg-red-100 text-red-800',
      suspend_user: 'bg-red-100 text-red-800',
      extend_grace_period: 'bg-blue-100 text-blue-800',
      reset_usage_limits: 'bg-yellow-100 text-yellow-800',
      update_user_status: 'bg-purple-100 text-purple-800'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
        styles[action] || 'bg-gray-100 text-gray-800'
      }`}>
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMins = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMins < 1) return 'Just now';
      if (diffInMins < 60) return `${diffInMins}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays < 30) return `${diffInDays}d ago`;
      return formatTimestamp(timestamp);
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search logs by admin, user, action, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Date Range Filter */}
        <div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        {/* Action Filter */}
        <div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>
                {action.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Admin Filter */}
        <div>
          <select
            value={filterAdmin}
            onChange={(e) => setFilterAdmin(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Admins</option>
            {uniqueAdmins.map(admin => (
              <option key={admin} value={admin}>
                {admin}
              </option>
            ))}
          </select>
        </div>

        {/* Export */}
        <button
          onClick={exportLogs}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 whitespace-nowrap"
        >
          Export CSV
        </button>
      </div>

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredLogs.length} of {logs.length} log entries
        </p>
      </div>

      {/* Logs List */}
      {filteredLogs.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getActionBadge(log.action)}
                    <span className="text-sm text-gray-500">
                      {getRelativeTime(log.timestamp)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-900 mb-1">
                    <span className="font-medium">{log.adminEmail}</span>
                    <span className="text-gray-600 mx-1">performed</span>
                    <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                    <span className="text-gray-600 mx-1">on</span>
                    <span className="font-medium">{log.targetUserEmail}</span>
                  </div>

                  {log.notes && (
                    <div className="text-sm text-gray-600 mt-2 bg-gray-50 rounded p-2">
                      <span className="font-medium">Notes:</span> {log.notes}
                    </div>
                  )}

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      <span className="font-medium">Metadata:</span>
                      <div className="bg-gray-50 rounded p-2 mt-1 font-mono">
                        {JSON.stringify(log.metadata, null, 2)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-right text-xs text-gray-500 ml-4">
                  <div>{formatTimestamp(log.timestamp)}</div>
                  <div className="mt-1">ID: {log.id.slice(0, 8)}...</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
          <p className="text-gray-600">
            {searchTerm || filterAction !== 'all' || filterAdmin !== 'all' || dateRange !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'No admin actions have been logged yet.'}
          </p>
        </div>
      )}

      {/* Load more button for large datasets */}
      {logs.length > 100 && filteredLogs.length === 100 && (
        <div className="text-center mt-6">
          <button className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-300 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            Load More Logs
          </button>
        </div>
      )}
    </div>
  );
}