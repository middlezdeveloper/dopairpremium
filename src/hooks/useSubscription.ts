'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-shared/config';
import { COLLECTIONS, UserSubscription } from '@/lib/firebase-shared/collections';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/lib/subscription/tiers';

export function useSubscription() {
  const [user] = useAuthState(auth);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.USERS, user.uid),
      (doc) => {
        try {
          if (doc.exists()) {
            const userData = doc.data();
            setSubscription(userData.subscription || {
              tier: 'free',
              status: 'active',
            });
          } else {
            // User document doesn't exist, create default free subscription
            setSubscription({
              tier: 'free',
              status: 'active',
            });
          }
          setError(null);
        } catch (err) {
          console.error('Error fetching subscription:', err);
          setError('Failed to load subscription data');
          setSubscription({
            tier: 'free',
            status: 'active',
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Subscription listener error:', err);
        setError('Connection error');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const currentTier: SubscriptionTier | null = subscription
    ? SUBSCRIPTION_TIERS[subscription.tier]
    : null;

  const hasActiveSubscription = subscription?.status === 'active';
  const isPaidSubscription = subscription?.tier !== 'free';
  const canUpgrade = subscription?.tier === 'free' || subscription?.tier === 'alumni';
  const canDowngrade = isPaidSubscription;

  return {
    subscription,
    currentTier,
    loading,
    error,
    hasActiveSubscription,
    isPaidSubscription,
    canUpgrade,
    canDowngrade,
    user,
  };
}