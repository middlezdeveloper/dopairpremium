'use client';

import { useState } from 'react';
import { ApprovalRequest, UserProfile } from '@/lib/firebase-shared/collections';

interface ApprovalQueueProps {
  approvals: ApprovalRequest[];
  onApprove: (userId: string, notes?: string) => Promise<void>;
  onReject: (userId: string, notes?: string) => Promise<void>;
  selectedUsers: string[];
  onSelectUser: (userIds: string[]) => void;
  bulkAction: 'approve' | 'reject' | '';
  onBulkAction: (action: 'approve' | 'reject' | '') => void;
  onExecuteBulk: () => Promise<void>;
}

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  title: string;
  action: string;
}

function NotesModal({ isOpen, onClose, onConfirm, title, action }: NotesModalProps) {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(notes);
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Add any relevant notes about this decision..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              >
                {action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalQueue({
  approvals,
  onApprove,
  onReject,
  selectedUsers,
  onSelectUser,
  bulkAction,
  onBulkAction,
  onExecuteBulk
}: ApprovalQueueProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: 'approve' | 'reject' | null;
    userId?: string;
    isBulk?: boolean;
  }>({
    isOpen: false,
    action: null
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectUser(approvals.map(a => a.userId));
    } else {
      onSelectUser([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      onSelectUser([...selectedUsers, userId]);
    } else {
      onSelectUser(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleIndividualAction = async (userId: string, action: 'approve' | 'reject', notes?: string) => {
    setLoading(userId);
    try {
      if (action === 'approve') {
        await onApprove(userId, notes);
      } else {
        await onReject(userId, notes);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleBulkAction = async (notes?: string) => {
    if (!bulkAction) return;

    setLoading('bulk');
    try {
      await onExecuteBulk();
    } finally {
      setLoading(null);
      onBulkAction('');
    }
  };

  const openModal = (action: 'approve' | 'reject', userId?: string, isBulk = false) => {
    setModalState({
      isOpen: true,
      action,
      userId,
      isBulk
    });
  };

  const handleModalConfirm = (notes: string) => {
    if (modalState.isBulk) {
      handleBulkAction(notes);
    } else if (modalState.userId && modalState.action) {
      handleIndividualAction(modalState.userId, modalState.action, notes);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  };

  if (approvals.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
        <p className="text-gray-600">There are no pending approval requests at the moment.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-indigo-900">
                {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  onBulkAction('approve');
                  openModal('approve', undefined, true);
                }}
                disabled={loading === 'bulk'}
                className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                Approve All
              </button>
              <button
                onClick={() => {
                  onBulkAction('reject');
                  openModal('reject', undefined, true);
                }}
                disabled={loading === 'bulk'}
                className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                Reject All
              </button>
              <button
                onClick={() => onSelectUser([])}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Header */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === approvals.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Request Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assessment Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requested
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {approvals.map((approval) => (
              <tr key={approval.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(approval.userId)}
                    onChange={(e) => handleSelectUser(approval.userId, e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {(approval.userDisplayName || approval.userEmail).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {approval.userDisplayName || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500">{approval.userEmail}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    approval.requestType === 'manual_approval'
                      ? 'bg-blue-100 text-blue-800'
                      : approval.requestType === 'subscription_issue'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {approval.requestType.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {approval.metadata?.assessmentScore ? (
                    <span className={`font-medium ${
                      approval.metadata.assessmentScore >= 75
                        ? 'text-red-600'
                        : approval.metadata.assessmentScore >= 50
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {approval.metadata.assessmentScore}
                    </span>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(approval.requestedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => openModal('approve', approval.userId)}
                      disabled={loading === approval.userId || loading === 'bulk'}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {loading === approval.userId ? (
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-green-700" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      Approve
                    </button>
                    <button
                      onClick={() => openModal('reject', approval.userId)}
                      disabled={loading === approval.userId || loading === 'bulk'}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {loading === approval.userId ? (
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-red-700" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes Modal */}
      <NotesModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, action: null })}
        onConfirm={handleModalConfirm}
        title={`${modalState.action === 'approve' ? 'Approve' : 'Reject'} ${modalState.isBulk ? 'Selected Users' : 'User'}`}
        action={modalState.action || 'approve'}
      />
    </div>
  );
}