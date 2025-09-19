export const COLLECTIONS = {
  USERS: 'users',
  ASSESSMENTS: 'assessments',
  CONVERSATIONS: 'conversations',
  BLOCKING_RULES: 'blockingRules',
  WEB_CONTENT: 'webContent',
} as const;

export const SUBCOLLECTIONS = {
  MESSAGES: 'messages',
  RULES: 'rules',
  BLOG_POSTS: 'blogPosts',
} as const;

// Firestore document interfaces matching the shared schema
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  assessmentId?: string;
  subscription: UserSubscription;
  deviceTokens?: string[];
  createdAt: Date;
  lastActive: Date;
}

export interface UserSubscription {
  tier: 'free' | 'recovery' | 'alumni' | 'family';
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  familyAccountId?: string; // For family members
  isOwner?: boolean; // For family owners
}

export interface Assessment {
  id: string;
  userId?: string; // Can be anonymous
  ddasScores: {
    impulsive: number;
    compulsive: number;
    total: number;
  };
  addictionPathway: 'impulsive' | 'compulsive' | 'mixed';
  responses: Record<string, any>;
  timestamp: Date;
  completedAnonymously: boolean;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
  model?: string;
}

export interface BlockingRule {
  id: string;
  userId: string;
  type: 'app' | 'website' | 'keyword';
  target: string;
  isActive: boolean;
  schedule?: {
    days: number[]; // 0-6 (Sunday-Saturday)
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  };
  createdAt: Date;
}