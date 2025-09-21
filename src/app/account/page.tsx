'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firebase-shared/collections';
import type { UserProfile } from '@/lib/firebase-shared/collections';
import AccountOverview from './components/AccountOverview';
import SubscriptionManagement from './components/SubscriptionManagement';
import SecuritySettings from './components/SecuritySettings';
import SupportSection from './components/SupportSection';

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadUserProfile();
    }
  }, [user, loading, router]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Please wait while we load your account information.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'subscription', name: 'Subscription', icon: '💳' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'support', name: 'Support', icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">Manage your Dopair Premium account and subscription</p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'overview' && (
            <AccountOverview user={user} userProfile={userProfile} onUpdate={loadUserProfile} />
          )}
          {activeTab === 'subscription' && (
            <SubscriptionManagement user={user} userProfile={userProfile} onUpdate={loadUserProfile} />
          )}
          {activeTab === 'security' && (
            <SecuritySettings user={user} userProfile={userProfile} onUpdate={loadUserProfile} />
          )}
          {activeTab === 'support' && (
            <SupportSection user={user} userProfile={userProfile} />
          )}
        </div>
      </div>
    </div>
  );
}