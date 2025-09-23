'use client';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dopair Premium</h1>
          <p className="text-gray-600 mb-6">
            Fresh checkout implementation starting point
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Premium Subscription</h3>
            <div className="text-2xl font-bold text-blue-900 mb-1">
              $29.00<span className="text-sm font-normal">/month</span>
            </div>
            <p className="text-sm text-gray-600">Ready for clean rebuild</p>
          </div>

          <button
            disabled
            className="w-full bg-gray-400 text-white py-3 px-4 rounded-lg font-medium cursor-not-allowed"
          >
            Coming Soon - Clean Implementation
          </button>

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