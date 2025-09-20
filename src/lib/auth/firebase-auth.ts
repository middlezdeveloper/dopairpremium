import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-shared/config';
import { COLLECTIONS } from '@/lib/firebase-shared/collections';

// Auth providers
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');

// Microsoft provider
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.addScope('openid');
microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');

// Apple provider
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  isApproved: boolean;
  subscriptionTier: 'free' | 'recovery' | 'alumni' | 'family';
  createdAt: Date;
  lastActive: Date;
}

// Email/Password Authentication
export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with display name
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Create user document in Firestore
    await createUserDocument(user, {
      signUpMethod: 'email',
      isApproved: false, // Requires admin approval
    });

    return user;
  } catch (error) {
    console.error('Email signup error:', error);
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Update last active timestamp
    await updateUserActivity(userCredential.user.uid);

    return userCredential.user;
  } catch (error) {
    console.error('Email signin error:', error);
    throw error;
  }
}

// Google Authentication
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));

    if (!userDoc.exists()) {
      await createUserDocument(user, {
        signUpMethod: 'google',
        isApproved: false, // Requires admin approval
      });
    } else {
      await updateUserActivity(user.uid);
    }

    return user;
  } catch (error) {
    console.error('Google signin error:', error);
    throw error;
  }
}

// Microsoft Authentication
export async function signInWithMicrosoft() {
  try {
    const result = await signInWithPopup(auth, microsoftProvider);
    const user = result.user;

    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));

    if (!userDoc.exists()) {
      await createUserDocument(user, {
        signUpMethod: 'microsoft',
        isApproved: false, // Requires admin approval
      });
    } else {
      await updateUserActivity(user.uid);
    }

    return user;
  } catch (error) {
    console.error('Microsoft signin error:', error);
    throw error;
  }
}

// Apple Authentication
export async function signInWithApple() {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    const user = result.user;

    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));

    if (!userDoc.exists()) {
      await createUserDocument(user, {
        signUpMethod: 'apple',
        isApproved: false, // Requires admin approval
      });
    } else {
      await updateUserActivity(user.uid);
    }

    return user;
  } catch (error) {
    console.error('Apple signin error:', error);
    throw error;
  }
}

// Facebook Authentication (kept for future use)
export async function signInWithFacebook() {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    const user = result.user;

    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));

    if (!userDoc.exists()) {
      await createUserDocument(user, {
        signUpMethod: 'facebook',
        isApproved: false, // Requires admin approval
      });
    } else {
      await updateUserActivity(user.uid);
    }

    return user;
  } catch (error) {
    console.error('Facebook signin error:', error);
    throw error;
  }
}

// Sign out
export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

// Password reset
export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
}

// Create user document in Firestore
async function createUserDocument(user: User, additionalData: any = {}) {
  try {
    const userDoc = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      subscription: {
        tier: 'free',
        status: 'active',
      },
      isApproved: additionalData.isApproved || false,
      signUpMethod: additionalData.signUpMethod || 'unknown',
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      assessmentId: null,
    };

    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), userDoc);
    return userDoc;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
}

// Update user activity timestamp
async function updateUserActivity(uid: string) {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      lastActive: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
}

// Get user approval status
export async function getUserApprovalStatus(uid: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.isApproved || false;
    }

    return false;
  } catch (error) {
    console.error('Error checking user approval status:', error);
    return false;
  }
}

// Admin function to approve user
export async function approveUser(uid: string) {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      isApproved: true,
      approvedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error approving user:', error);
    throw error;
  }
}

// Check if user has active subscription (placeholder for Stripe integration)
export async function hasActiveSubscription(uid: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const subscription = userData.subscription;

      // Check subscription status
      return subscription?.status === 'active' && subscription?.tier !== 'free';
    }

    return false;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

// Auth state observer
export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}