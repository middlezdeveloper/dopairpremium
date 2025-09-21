'use client';

import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth/firebase-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
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
    return null; // Will redirect via useEffect
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dopair Premium Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">Welcome to your dashboard!</h2>
        <p className="text-gray-600 mb-4">Your AI coach and premium features are ready.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">🤖 AI Coach</h3>
            <p className="text-sm text-gray-600 mb-3">Chat with your personalized recovery coach</p>
            <a href="/dashboard/coach/test" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              Test AI Coach
            </a>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">📊 Your Progress</h3>
            <p className="text-sm text-gray-600 mb-3">Track your digital wellness journey</p>
            <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm">
              View Stats
            </button>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-2">🧪 Development Mode</h3>
        <p className="text-yellow-700 text-sm">
          You're in development mode. The AI coach is ready for testing with your OpenAI API key.
        </p>
      </div>
    </div>
  );
}