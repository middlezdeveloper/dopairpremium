'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

// Load Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

declare global {
  interface Window {
    Stripe: any;
  }
}

export default function TestCheckoutPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // Real Stripe Price ID for subscription ($29 USD)
  const SUBSCRIPTION_PRICE_ID = 'price_1S9P9NB0md0hKsVZMF665sGk';

  const fetchClientSecret = useCallback(async () => {
    if (!user) return '';

    try {
      console.log('Creating embedded checkout session for:', user.email);

      // Get Firebase auth token
      const token = await user.getIdToken();

      // Call our Cloud Function to create checkout session
      const response = await fetch('https://us-central1-dopair.cloudfunctions.net/createCheckoutSession', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: SUBSCRIPTION_PRICE_ID,
          mode: 'subscription',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const responseData = await response.json();
      console.log('Full response data:', responseData);
      const { clientSecret, sessionId } = responseData;
      const finalSecret = clientSecret || sessionId;
      console.log('Using clientSecret:', finalSecret);
      return finalSecret;

    } catch (error) {
      console.error('Checkout creation failed:', error);
      setCheckoutError(error instanceof Error ? error.message : 'Failed to create checkout');
      return '';
    }
  }, [user]);

  const handleCreateCheckout = async () => {
    if (!user) return;

    setCheckoutError(null);

    try {
      console.log('Creating hosted checkout session for:', user.email);

      // Get Firebase auth token
      const token = await user.getIdToken();

      // Call our Cloud Function to create checkout session
      const response = await fetch('https://us-central1-dopair.cloudfunctions.net/createCheckoutSession', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: SUBSCRIPTION_PRICE_ID,
          mode: 'subscription',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      console.log('Checkout session created:', sessionId);

      // Initialize Stripe and redirect to hosted checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Redirect to Stripe's hosted checkout
      const result = await stripe.redirectToCheckout({
        sessionId: sessionId,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

    } catch (error) {
      console.error('Checkout creation failed:', error);
      setCheckoutError(error instanceof Error ? error.message : 'Failed to create checkout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dopair Premium</h1>
          <p className="text-gray-600 mb-6">
            Join thousands improving their mental health with AI-powered coaching
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Premium Subscription</h3>
            <div className="text-2xl font-bold text-blue-900 mb-1">
              $29.00<span className="text-sm font-normal">/month</span>
            </div>
            <div className="text-xs text-gray-600 mb-3">Enter promotional codes directly in checkout</div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Unlimited AI Coach conversations</li>
              <li>✓ Personalized recovery programs</li>
              <li>✓ Progress tracking & analytics</li>
              <li>✓ Premium content library</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <strong>Account:</strong> {user.email}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm text-green-700">
                <strong>💰 Promotional codes available!</strong><br/>
                Enter your promotional code directly in the Stripe checkout for special pricing.
              </div>
            </div>

            {checkoutError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm text-red-700">{checkoutError}</div>
              </div>
            )}

            <button
              onClick={handleCreateCheckout}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 font-medium"
            >
              Subscribe Now
            </button>

            <div className="text-xs text-gray-500">
              Secure payment processing by Stripe. Test mode enabled.
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Secure Payment Options</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>💳 Credit Cards</div>
              <div>🍎 Apple Pay</div>
              <div>🟢 Google Pay</div>
              <div>🏦 Bank Transfers</div>
            </div>
          </div>

          <div className="mt-6">
            <a
              href="/account"
              className="text-indigo-600 hover:text-indigo-700 text-sm"
            >
              ← Back to Account
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}