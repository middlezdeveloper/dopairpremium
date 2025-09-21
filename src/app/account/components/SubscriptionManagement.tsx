'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '@/lib/firebase-shared/collections';
import { BillingAPI, BillingInfo, BillingHistory, BillingAPIError } from '@/lib/stripe/billing-api';

interface SubscriptionManagementProps {
  user: User;
  userProfile: UserProfile;
  onUpdate: () => void;
}

export default function SubscriptionManagement({ user, userProfile, onUpdate }: SubscriptionManagementProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPauseOptions, setShowPauseOptions] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [pauseDuration, setPauseDuration] = useState('1month');
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPremium = userProfile.status === 'premium' || userProfile.status === 'grace_period';
  const hasStripeSubscription = userProfile.subscription?.subscriptionId;
  const isPilotUser = userProfile.subscription?.signupPromotion?.isPilotUser || false;

  // Load billing data on component mount
  useEffect(() => {
    if (hasStripeSubscription) {
      loadBillingData();
    }
  }, [hasStripeSubscription]);

  const loadBillingData = async () => {
    if (!hasStripeSubscription) return;

    try {
      setLoading(true);
      setError(null);

      // Load real billing data from Stripe
      console.log('Loading billing data for user:', user.email);

      const [billing, history] = await Promise.all([
        BillingAPI.getBillingInfo(user),
        BillingAPI.getBillingHistory(user, 6)
      ]);
      setBillingInfo(billing);
      setBillingHistory(history);

    } catch (error) {
      console.error('Error loading billing data:', error);
      setError(error instanceof BillingAPIError ? error.message : 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await BillingAPI.pauseSubscription(user, pauseDuration as '1month');

      if (result.success) {
        await loadBillingData(); // Refresh data
        onUpdate(); // Update user profile
        setShowPauseOptions(false);
      }
    } catch (error) {
      console.error('Error pausing subscription:', error);
      setError(error instanceof BillingAPIError ? error.message : 'Failed to pause subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await BillingAPI.cancelSubscription(user, cancelReason || undefined);

      if (result.success) {
        await loadBillingData(); // Refresh data
        onUpdate(); // Update user profile
        setShowCancelConfirm(false);
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setError(error instanceof BillingAPIError ? error.message : 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setLoading(true);
      setError(null);

      const { url } = await BillingAPI.getPaymentMethodUpdateURL(user);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error getting payment update URL:', error);
      setError(error instanceof BillingAPIError ? error.message : 'Failed to open payment management');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionStatus = () => {
    switch (userProfile.status) {
      case 'premium':
        return { text: 'Active', color: 'text-green-600', bg: 'bg-green-100' };
      case 'grace_period':
        return { text: 'Grace Period', color: 'text-orange-600', bg: 'bg-orange-100' };
      case 'past_due':
        return { text: 'Past Due', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'suspended':
        return { text: 'Suspended', color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { text: 'Free', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const status = getSubscriptionStatus();

  return (
    <div className="p-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="text-red-400 mr-3">⚠️</div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Billing Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm text-red-600 hover:text-red-700 mt-2 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Current Subscription */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>

          {!isPremium ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="text-center">
                <div className="text-4xl mb-4">🆓</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Free Plan</h3>
                <p className="text-gray-600 mb-4">
                  You're currently on the free plan with access to the DDAS assessment.
                </p>
                <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                  Upgrade to Premium
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Premium Plan</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
                  {status.text}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Next Billing Date</div>
                  <div className="text-gray-900">
                    {loading ? 'Loading...' :
                     billingInfo?.subscription?.currentPeriodEnd
                       ? new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString()
                       : userProfile.subscription?.subscriptionId ? 'Next billing cycle' : 'Not available'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Payment Method</div>
                  <div className="text-gray-900">
                    {loading ? 'Loading...' :
                     billingInfo?.customer?.defaultPaymentMethod?.card
                       ? `•••• ${billingInfo.customer.defaultPaymentMethod.card.last4} (${(billingInfo.customer.defaultPaymentMethod.card.brand || '').toUpperCase()})`
                       : userProfile.subscription?.subscriptionId ? 'Payment method on file' : 'No payment method'
                    }
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">What's included:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Unlimited AI coach conversations
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Personalized recovery programs
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Progress tracking and analytics
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Premium content library
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Subscription Actions */}
        {isPremium && hasStripeSubscription && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Manage Subscription</h2>
            <div className="space-y-4">
              {/* Billing Management */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Billing & Payment</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Update your payment method, view invoices, and manage billing details.
                </p>
                <button
                  onClick={handleManageBilling}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Manage Billing
                </button>
              </div>

              {/* Pause Option */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Pause Subscription</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Take a break for 1 month while keeping your account active.
                </p>
                {!showPauseOptions ? (
                  <button
                    onClick={() => setShowPauseOptions(true)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                  >
                    Pause for 1 Month
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pause Duration
                      </label>
                      <select
                        value={pauseDuration}
                        onChange={(e) => setPauseDuration(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="1month">1 Month</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePauseSubscription}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                      >
                        Confirm Pause
                      </button>
                      <button
                        onClick={() => setShowPauseOptions(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cancel Option */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <h3 className="font-medium text-gray-900 mb-2">Cancel Subscription</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Your subscription will remain active until the end of your billing period.
                </p>
                {!showCancelConfirm ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-100"
                  >
                    Cancel Subscription
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Why are you canceling? (Optional)
                      </label>
                      <select
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select a reason...</option>
                        <option value="too_expensive">Too expensive</option>
                        <option value="not_using">Not using enough</option>
                        <option value="technical_issues">Technical issues</option>
                        <option value="found_alternative">Found an alternative</option>
                        <option value="temporary_break">Taking a temporary break</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    {isPilotUser && (
                      <div className="bg-orange-50 p-3 rounded border border-orange-200">
                        <p className="text-sm text-orange-800">
                          <strong>⚠️ Pilot User Notice:</strong> You signed up as part of our pilot program with special pricing.
                          If you cancel, you may not be able to get this discount again when you return.
                          Consider pausing instead to keep your promotional pricing.
                        </p>
                      </div>
                    )}
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        <strong>Before you go:</strong> Would you like to pause your subscription for a month instead?
                        This way you can come back without losing your progress.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelSubscription}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Confirm Cancellation
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                      >
                        Keep Subscription
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing History */}
        {isPremium && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading billing history...
                      </td>
                    </tr>
                  ) : billingHistory?.invoices.length ? (
                    billingHistory.invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(invoice.created).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${(invoice.amountPaid / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'open'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.status === 'paid' ? 'Paid' :
                             invoice.status === 'open' ? 'Pending' :
                             'Failed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 hover:text-indigo-900">
                          <button
                            onClick={() => window.open(invoice.hostedInvoiceUrl, '_blank')}
                            className="hover:underline"
                          >
                            View
                          </button>
                          {invoice.invoicePdf && (
                            <>
                              {' | '}
                              <button
                                onClick={() => window.open(invoice.invoicePdf, '_blank')}
                                className="hover:underline"
                              >
                                Download
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        No billing history available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}