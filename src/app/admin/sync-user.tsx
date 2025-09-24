'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function SyncUserTool() {
  const { user } = useAuth();
  const [email, setEmail] = useState('gmiddlez@gmail.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const syncUser = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = await user.getIdToken();

      const response = await fetch('/api/sync-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to sync user');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Sync User Status</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="user@example.com"
          />
        </div>

        <button
          onClick={syncUser}
          disabled={loading || !email}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Syncing...' : 'Sync User Status'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-sm font-medium text-green-800">Sync Successful</h3>
          <div className="text-sm text-gray-700 mt-2 space-y-1">
            <p><strong>User:</strong> {result.user?.email}</p>
            <p><strong>Status Changed:</strong> {result.user?.oldStatus} → {result.user?.newStatus}</p>
            <p><strong>Payment Status:</strong> {result.user?.paymentStatus}</p>
            <p><strong>Approval Type:</strong> {result.user?.approvalType}</p>
            {result.stripe?.subscriptionId && (
              <p><strong>Subscription:</strong> {result.stripe.subscriptionId} ({result.stripe.subscriptionStatus})</p>
            )}
            <p><strong>Stripe Customer:</strong> {result.stripe?.customerId}</p>
            <p><strong>Total Subscriptions:</strong> {result.stripe?.totalSubscriptions}</p>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-medium text-blue-800">How it works</h3>
        <ul className="text-sm text-blue-700 mt-2 space-y-1">
          <li>• Looks up the user by email in Firebase</li>
          <li>• Finds their Stripe customer record</li>
          <li>• Checks for active subscriptions</li>
          <li>• Updates Firebase user status to match Stripe</li>
          <li>• Updates Firebase Custom Claims for instant access</li>
        </ul>
      </div>
    </div>
  );
}