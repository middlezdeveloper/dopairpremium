'use client';

import { useState } from 'react';
import { User } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, UserProfile, ACCESS_LEVELS } from '@/lib/firebase-shared/collections';

interface AccountOverviewProps {
  user: User;
  userProfile: UserProfile;
  onUpdate: () => void;
}

export default function AccountOverview({ user, userProfile, onUpdate }: AccountOverviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile.displayName || '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        displayName: displayName.trim(),
        updatedAt: serverTimestamp(),
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
    setSaving(false);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      free: 'bg-gray-100 text-gray-800',
      premium: 'bg-green-100 text-green-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      grace_period: 'bg-orange-100 text-orange-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || badges.free;
  };

  const getApprovalBadge = (approvalType: string) => {
    const badges = {
      pending: 'bg-gray-100 text-gray-800',
      admin: 'bg-blue-100 text-blue-800',
      stripe: 'bg-purple-100 text-purple-800',
    };
    return badges[approvalType as keyof typeof badges] || badges.pending;
  };

  const accessLevel = ACCESS_LEVELS[userProfile.status] || ACCESS_LEVELS['free'];

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Profile Information */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter your display name"
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(userProfile.displayName || '');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">
                    {userProfile.displayName || 'Not set'}
                  </span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <span className="text-gray-900">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500 mb-1">Status</div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(userProfile.status)}`}>
                {(userProfile.status || 'free').replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500 mb-1">Approval Type</div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getApprovalBadge(userProfile.approvalType)}`}>
                {(userProfile.approvalType || 'pending').toUpperCase()}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500 mb-1">Member Since</div>
              <div className="text-gray-900">
                {userProfile.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* Access Permissions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl mb-2">
                {accessLevel?.ddas ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium text-gray-700">DDAS Assessment</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl mb-2">
                {accessLevel?.chat ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium text-gray-700">AI Coach Chat</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl mb-2">
                {accessLevel?.premiumContent ? '✅' : '❌'}
              </div>
              <div className="text-sm font-medium text-gray-700">Premium Content</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl mb-2">
                {(accessLevel?.chatLimit || 0) > 0 ? accessLevel.chatLimit : '0'}
              </div>
              <div className="text-sm font-medium text-gray-700">Daily Chat Limit</div>
            </div>
          </div>
        </div>

        {/* Grace Period Warning */}
        {userProfile.status === 'grace_period' && userProfile.gracePeriodEnd && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-orange-400 mr-3">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-orange-800">Grace Period Active</h3>
                <p className="text-sm text-orange-700 mt-1">
                  Your subscription payment failed, but you still have access until{' '}
                  {userProfile.gracePeriodEnd.toDate().toLocaleDateString()}.
                  Please update your payment method to continue your premium access.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Account Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Download Data
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              Contact Support
            </button>
            {userProfile.status === 'free' && (
              <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}