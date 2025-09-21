'use client';

import { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '@/lib/firebase-shared/collections';
import { updatePassword, sendEmailVerification, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

interface SecuritySettingsProps {
  user: User;
  userProfile: UserProfile;
  onUpdate: () => void;
}

export default function SecuritySettings({ user, userProfile, onUpdate }: SecuritySettingsProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isEmailAuth = userProfile.signUpMethod === 'email';
  const isEmailVerified = user.emailVerified;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setMessage({ type: 'success', text: 'Password updated successfully' });
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.code === 'auth/wrong-password'
          ? 'Current password is incorrect'
          : 'Failed to update password'
      });
    }

    setLoading(false);
  };

  const handleVerifyEmail = async () => {
    setLoading(true);
    try {
      await sendEmailVerification(user);
      setMessage({ type: 'success', text: 'Verification email sent' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send verification email' });
    }
    setLoading(false);
  };

  const getAuthMethodDisplay = (method: string) => {
    const methods = {
      email: 'Email & Password',
      google: 'Google',
      microsoft: 'Microsoft',
      apple: 'Apple',
    };
    return methods[method as keyof typeof methods] || method;
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Current Security Status */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500 mb-1">Sign-in Method</div>
              <div className="text-gray-900">{getAuthMethodDisplay(userProfile.signUpMethod)}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-gray-500 mb-1">Email Verification</div>
              <div className="flex items-center">
                {isEmailVerified ? (
                  <span className="text-green-600 flex items-center">
                    <span className="mr-1">✓</span> Verified
                  </span>
                ) : (
                  <span className="text-yellow-600 flex items-center">
                    <span className="mr-1">⚠</span> Not Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Email Verification */}
        {!isEmailVerified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-yellow-400 mr-3">⚠️</div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">Email Not Verified</h3>
                <p className="text-sm text-yellow-700 mt-1 mb-3">
                  Please verify your email address to secure your account and receive important notifications.
                </p>
                <button
                  onClick={handleVerifyEmail}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Verification Email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Management */}
        {isEmailAuth && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Password</h2>
            {!showChangePassword ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Password</div>
                    <div className="text-gray-900">••••••••</div>
                  </div>
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                  >
                    Change Password
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setMessage(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* OAuth Account Info */}
        {!isEmailAuth && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Security</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-blue-400 mr-3">ℹ️</div>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">OAuth Authentication</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Your account is secured through {getAuthMethodDisplay(userProfile.signUpMethod)}.
                    Password changes and some security settings are managed through your {getAuthMethodDisplay(userProfile.signUpMethod)} account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Activity */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Activity</h2>
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Last Login</div>
                  <div className="text-gray-900">
                    {userProfile.lastActive?.toDate?.()?.toLocaleString() || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Account Created</div>
                  <div className="text-gray-900">
                    {userProfile.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data & Privacy</h2>
          <div className="space-y-3">
            <button className="w-full text-left bg-gray-50 p-4 rounded-lg hover:bg-gray-100">
              <div className="text-sm font-medium text-gray-900 mb-1">Download Your Data</div>
              <div className="text-sm text-gray-600">
                Get a copy of all your data including conversations and assessments
              </div>
            </button>

            <button className="w-full text-left bg-red-50 p-4 rounded-lg hover:bg-red-100 border border-red-200">
              <div className="text-sm font-medium text-red-900 mb-1">Delete Account</div>
              <div className="text-sm text-red-700">
                Permanently delete your account and all associated data
              </div>
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}