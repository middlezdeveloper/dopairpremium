'use client';

import { useState, useMemo } from 'react';
import { UserProfile, UserStatus } from '@/lib/firebase-shared/collections';
import { doc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase-shared/config';
import { COLLECTIONS } from '@/lib/firebase-shared/collections';
import { useAuth } from '@/hooks/useAuth';

interface UserManagementProps {
  users: UserProfile[];
  filterStatus: string;
  onFilterChange: (status: string) => void;
}

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  action: string;
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, action }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement({ users, filterStatus, onFilterChange }: UserManagementProps) {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastActive' | 'email'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: () => void;
    title: string;
    message: string;
    actionText: string;
  }>({
    isOpen: false,
    action: () => {},
    title: '',
    message: '',
    actionText: ''
  });

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => user.status === filterStatus);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(term) ||
        (user.displayName?.toLowerCase().includes(term)) ||
        user.uid.toLowerCase().includes(term)
      );
    }

    // Sort users
    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'createdAt':
          aValue = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          bValue = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          break;
        case 'lastActive':
          aValue = a.lastActive?.toDate?.() || new Date(a.lastActive || 0);
          bValue = b.lastActive?.toDate?.() || new Date(b.lastActive || 0);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [users, filterStatus, searchTerm, sortBy, sortOrder]);

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    if (!currentUser) return;

    setLoading(userId);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Log admin action
      await addDoc(collection(db, COLLECTIONS.ADMIN_LOGS), {
        adminId: currentUser.uid,
        adminEmail: currentUser.email,
        action: newStatus === 'suspended' ? 'suspend_user' : 'update_user_status',
        targetUserId: userId,
        targetUserEmail: users.find(u => u.uid === userId)?.email || '',
        timestamp: serverTimestamp(),
        metadata: { newStatus }
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleExtendGracePeriod = async (userId: string) => {
    if (!currentUser) return;

    setLoading(userId);
    try {
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // Extend by 7 days

      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        status: 'grace_period',
        gracePeriodEnd: gracePeriodEnd,
        updatedAt: serverTimestamp()
      });

      // Log admin action
      await addDoc(collection(db, COLLECTIONS.ADMIN_LOGS), {
        adminId: currentUser.uid,
        adminEmail: currentUser.email,
        action: 'extend_grace_period',
        targetUserId: userId,
        targetUserEmail: users.find(u => u.uid === userId)?.email || '',
        timestamp: serverTimestamp(),
        metadata: { gracePeriodEnd: gracePeriodEnd.toISOString() }
      });
    } catch (error) {
      console.error('Error extending grace period:', error);
    } finally {
      setLoading(null);
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Email', 'Display Name', 'Status', 'Payment Status', 'Approval Type', 'Created At', 'Last Active'],
      ...filteredAndSortedUsers.map(user => [
        user.email,
        user.displayName || '',
        user.status,
        user.paymentStatus,
        user.approvalType,
        user.createdAt?.toDate?.()?.toISOString() || '',
        user.lastActive?.toDate?.()?.toISOString() || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Never';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: UserStatus) => {
    const styles = {
      free: 'bg-gray-100 text-gray-800',
      premium: 'bg-green-100 text-green-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      grace_period: 'bg-blue-100 text-blue-800',
      suspended: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const openConfirmModal = (action: () => void, title: string, message: string, actionText: string) => {
    setConfirmModal({
      isOpen: true,
      action,
      title,
      message,
      actionText
    });
  };

  return (
    <div className="p-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by email, name, or user ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => onFilterChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="past_due">Past Due</option>
            <option value="grace_period">Grace Period</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
            }}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="lastActive-desc">Recently Active</option>
            <option value="lastActive-asc">Least Active</option>
            <option value="email-asc">Email A-Z</option>
            <option value="email-desc">Email Z-A</option>
          </select>
        </div>

        {/* Export */}
        <button
          onClick={exportUsers}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Export CSV
        </button>
      </div>

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredAndSortedUsers.length} of {users.length} users
        </p>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Active
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedUsers.map((user) => (
              <tr key={user.uid} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {(user.displayName || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.displayName || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.subscription?.tier || 'free'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {user.paymentStatus}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(user.lastActive)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {user.status === 'past_due' && (
                      <button
                        onClick={() => openConfirmModal(
                          () => handleExtendGracePeriod(user.uid),
                          'Extend Grace Period',
                          `Extend grace period for ${user.email} by 7 days?`,
                          'Extend'
                        )}
                        disabled={loading === user.uid}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Extend Grace
                      </button>
                    )}

                    {user.status !== 'suspended' && (
                      <button
                        onClick={() => openConfirmModal(
                          () => handleStatusChange(user.uid, 'suspended'),
                          'Suspend User',
                          `Are you sure you want to suspend ${user.email}? This will revoke their access to premium features.`,
                          'Suspend'
                        )}
                        disabled={loading === user.uid}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        Suspend
                      </button>
                    )}

                    {user.status === 'suspended' && (
                      <button
                        onClick={() => openConfirmModal(
                          () => handleStatusChange(user.uid, 'free'),
                          'Reactivate User',
                          `Are you sure you want to reactivate ${user.email}?`,
                          'Reactivate'
                        )}
                        disabled={loading === user.uid}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        Reactivate
                      </button>
                    )}

                    {loading === user.uid && (
                      <div className="inline-flex items-center px-2 py-1">
                        <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredAndSortedUsers.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        action={confirmModal.actionText}
      />
    </div>
  );
}