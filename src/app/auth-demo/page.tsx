'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AuthDemoPage() {
  const [authState, setAuthState] = useState<'logged-out' | 'pending-approval' | 'approved' | 'no-subscription' | 'loading'>('logged-out');
  const [mockUser, setMockUser] = useState({
    email: 'user@example.com',
    displayName: 'John Doe',
  });

  const simulateStates = {
    'logged-out': () => setAuthState('logged-out'),
    'loading': () => setAuthState('loading'),
    'pending-approval': () => setAuthState('pending-approval'),
    'approved': () => setAuthState('approved'),
    'no-subscription': () => setAuthState('no-subscription'),
  };

  const renderAuthState = () => {
    switch (authState) {
      case 'loading':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your account...</p>
            </div>
          </div>
        );

      case 'logged-out':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
              <p className="text-gray-600 mb-6">Please log in to access Dopair Premium.</p>
              <div className="space-x-4">
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        );

      case 'pending-approval':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Pending Approval</h1>
              <p className="text-gray-600 mb-4">
                Your account has been created successfully, but you need admin approval to access the platform.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                We'll notify you via email once your account is approved. This typically takes 1-2 business days.
              </p>
              <button
                onClick={() => setAuthState('logged-out')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Back to Login
              </button>
            </div>
          </div>
        );

      case 'no-subscription':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center max-w-md">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Subscription Required</h1>
              <p className="text-gray-600 mb-6">
                This feature requires an active subscription. Please upgrade to access premium features.
              </p>
              <div className="space-x-4">
                <Link
                  href="/pricing"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  View Plans
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        );

      case 'approved':
        return (
          <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Dopair Premium! 🎉</h1>
                <p className="text-gray-600 mb-4">
                  Logged in as: <strong>{mockUser.displayName}</strong> ({mockUser.email})
                </p>
                <p className="text-green-600 mb-4">✅ Account Approved</p>
                <p className="text-green-600">✅ Active Subscription</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link
                  href="/dashboard/coach"
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Coach</h3>
                  <p className="text-gray-600">Start a conversation with your personalized AI coach</p>
                </Link>

                <Link
                  href="/dashboard/progress"
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Progress Tracking</h3>
                  <p className="text-gray-600">View your recovery journey and milestones</p>
                </Link>

                <Link
                  href="/dashboard/resources"
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Resources</h3>
                  <p className="text-gray-600">Access recovery tools and educational content</p>
                </Link>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {/* Demo Controls */}
      <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50 border">
        <h3 className="font-semibold text-gray-900 mb-3">Auth Demo Controls</h3>
        <div className="space-y-2">
          {Object.keys(simulateStates).map((state) => (
            <button
              key={state}
              onClick={simulateStates[state as keyof typeof simulateStates]}
              className={`block w-full text-left px-3 py-1 rounded text-sm transition-colors ${
                authState === state
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              {state.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-gray-500">
            Current state: <strong>{authState}</strong>
          </p>
        </div>
      </div>

      {/* Auth State Display */}
      {renderAuthState()}
    </div>
  );
}