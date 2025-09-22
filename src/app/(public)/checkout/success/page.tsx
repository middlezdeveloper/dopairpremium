'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [customerEmail, setCustomerEmail] = useState<string>('');

  useEffect(() => {
    // You could fetch checkout session details here if needed
    if (sessionId) {
      console.log('Checkout session completed:', sessionId);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h1>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700 text-sm">
              Thank you for subscribing to Dopair Premium! Your subscription is now active.
            </p>
          </div>

          <div className="space-y-4 text-sm text-gray-600">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">What's Next?</h3>
              <ul className="text-left space-y-1 text-blue-800">
                <li>✓ Check your email for a receipt and welcome message</li>
                <li>✓ Your subscription will appear in your account within 5 minutes</li>
                <li>✓ You can manage your subscription anytime in your account</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700">
                <strong>Session ID:</strong> {sessionId || 'Processing...'}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <a
              href="/login"
              className="block w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 font-medium"
            >
              Sign In to Your Account
            </a>

            <a
              href="/"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 font-medium"
            >
              Back to Home
            </a>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            Need help? Contact support at support@dopair.app
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}