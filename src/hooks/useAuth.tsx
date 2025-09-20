'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, getUserApprovalStatus, hasActiveSubscription } from '@/lib/auth/firebase-auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isApproved: boolean;
  hasSubscription: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isApproved: false,
  hasSubscription: false,
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      try {
        setUser(user);
        setError(null);

        if (user) {
          // Check user approval status
          const approved = await getUserApprovalStatus(user.uid);
          setIsApproved(approved);

          // Check subscription status
          const subscription = await hasActiveSubscription(user.uid);
          setHasSubscription(subscription);
        } else {
          setIsApproved(false);
          setHasSubscription(false);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isApproved,
        hasSubscription,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}