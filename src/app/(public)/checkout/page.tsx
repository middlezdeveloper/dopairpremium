'use client';

import { useState, useEffect } from 'react';

interface CurrencyData {
  symbol: string;
  price: string;
  currency: string;
  country: string;
}

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const [currencyData, setCurrencyData] = useState<CurrencyData>({
    symbol: '$',
    price: '24.00',
    currency: 'USD',
    country: 'US'
  });

  // Stripe Payment Link (pre-configured with price and success/cancel URLs)
  const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/28E9ASfyw8VB3GIgV863K02';

  // Fetch currency data using client-side IP detection
  useEffect(() => {
    const fetchCurrencyData = async () => {
      try {
        // Currency mapping based on Stripe pricing (will sync manually when Stripe prices change)
        const currencyMap: Record<string, { symbol: string; price: string; currency: string }> = {
          'AU': { symbol: 'A$', price: '36.40', currency: 'AUD' },
          'CA': { symbol: 'CA$', price: '33.07', currency: 'CAD' },
          'GB': { symbol: '£', price: '17.81', currency: 'GBP' },
          'NZ': { symbol: 'NZ$', price: '40.98', currency: 'NZD' },
          'US': { symbol: '$', price: '24.00', currency: 'USD' }
        };

        // Get user's country from IP
        const ipResponse = await fetch('https://ipapi.co/json/', {
          headers: { 'Accept': 'application/json' }
        });

        let country = 'US'; // Fallback
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          country = ipData.country_code || 'US';
        }

        // Get currency data for this country
        const currencyData = currencyMap[country] || currencyMap['US'];

        setCurrencyData({
          ...currencyData,
          country
        });

      } catch (error) {
        console.log('Using default USD pricing:', error);
        // Keep default USD values
      } finally {
        setCurrencyLoading(false);
      }
    };

    fetchCurrencyData();
  }, []);

  const handleCheckout = () => {
    setLoading(true);
    // Redirect to Stripe payment link
    window.location.href = STRIPE_PAYMENT_LINK;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dopair Premium</h1>
          <p className="text-gray-600 mb-6">
            Transform your digital wellness with AI-powered coaching
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Premium Subscription</h3>
            {currencyLoading ? (
              <div className="text-lg text-blue-900 mb-3">
                <div className="animate-pulse bg-blue-200 h-8 w-32 rounded mb-2"></div>
                <div className="animate-pulse bg-blue-200 h-4 w-24 rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  {currencyData.symbol}{currencyData.price}<span className="text-sm font-normal">/month</span>
                </div>
                <div className="text-xs text-gray-600 mb-3">Pricing shown in {currencyData.currency}</div>
              </>
            )}
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Unlimited AI Coach conversations</li>
              <li>✓ Personalized recovery programs</li>
              <li>✓ Progress tracking & analytics</li>
              <li>✓ Premium content library</li>
            </ul>
          </div>

          <div className="space-y-4">

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Redirecting...' : 'Get Premium Access'}
            </button>

            <div className="text-xs text-gray-500">
              Secure payment processing by Stripe. Cancel anytime.
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Secure Payment Options</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>💳 Credit Cards</div>
              <div>🍎 Apple Pay</div>
              <div>🟢 Google Pay</div>
              <div>💙 PayPal</div>
            </div>
          </div>

          <div className="mt-6">
            <a
              href="/"
              className="text-indigo-600 hover:text-indigo-700 text-sm"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}