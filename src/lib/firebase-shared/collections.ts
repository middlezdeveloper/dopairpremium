export const COLLECTIONS = {
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  ASSESSMENTS: 'assessments',
  SUBSCRIPTIONS: 'subscriptions',
  ADMIN_LOGS: 'adminLogs',
  USAGE_TRACKING: 'usageTracking',
  APPROVAL_REQUESTS: 'approvalRequests',
  STRIPE_CUSTOMERS: 'stripe_customers',
} as const;

export const SUBCOLLECTIONS = {
  MESSAGES: 'messages',
  SESSIONS: 'sessions',
} as const;

// Type definitions
export type UserStatus = 'free' | 'premium' | 'past_due' | 'grace_period' | 'suspended';
export type ApprovalType = 'pending' | 'stripe' | 'admin';
export type PaymentStatus = 'active' | 'past_due' | 'canceled' | 'incomplete';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;

  // New status system
  status: UserStatus;
  paymentStatus: PaymentStatus;
  approvalType: ApprovalType;
  approvedBy?: string; // admin uid who approved
  approvedAt?: any; // timestamp

  // Subscription info
  subscription?: {
    tier: 'free' | 'premium';
    stripeCustomerId?: string;
    subscriptionId?: string;
    priceId?: string;
  };

  // Grace period management
  gracePeriodEnd?: any; // timestamp
  paymentFailedAt?: any; // timestamp

  // Legacy compatibility
  isApproved: boolean;
  signUpMethod: string;
  createdAt: any;
  lastActive: any;
  assessmentId: string | null;
}

export interface Assessment {
  id: string;
  userId: string;
  scores: {
    total: number;
    categories: Record<string, number>;
  };
  ddasScores: {
    compulsive: number;
    impulsive: number;
    behavioral: number;
    emotional: number;
  };
  responses: Record<string, any>;
  pathway: 'awareness' | 'reduction' | 'abstinence';
  addictionPathway: 'awareness' | 'reduction' | 'abstinence';
  recommendations: string[];
  completedAt: any;
}

// Usage tracking for chat limits and abuse prevention
export interface UsageTracking {
  userId: string;
  date: string; // YYYY-MM-DD format
  chatMessages: number;
  resetAt: any; // midnight timestamp
  lastMessageAt?: any; // timestamp of last message
  warnings?: number; // abuse warning count
  blocked?: boolean; // temporarily blocked for abuse
}

// Admin approval queue
export interface ApprovalRequest {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName?: string;
  requestType: 'manual_approval' | 'subscription_issue' | 'grace_period_extension';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: any; // timestamp
  processedAt?: any; // timestamp
  processedBy?: string; // admin uid
  notes?: string; // admin notes
  metadata?: {
    assessmentScore?: number;
    signUpMethod?: string;
    currentUsage?: number;
  };
}

// Admin action logging
export interface AdminLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: 'approve_user' | 'reject_user' | 'suspend_user' | 'extend_grace_period' | 'reset_usage_limits';
  targetUserId: string;
  targetUserEmail: string;
  timestamp: any;
  notes?: string;
  metadata?: Record<string, any>;
}

// Stripe customer data
export interface StripeCustomer {
  userId: string;
  customerId: string;
  email: string;
  subscriptions?: StripeSubscription[];
  defaultPaymentMethod?: string;
  createdAt: any;
  updatedAt: any;
}

export interface StripeSubscription {
  id: string;
  customerId: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
  priceId: string;
  currentPeriodStart: any;
  currentPeriodEnd: any;
  cancelAtPeriodEnd: boolean;
  createdAt: any;
  updatedAt: any;
}

// Access level configuration
export const ACCESS_LEVELS = {
  free: {
    ddas: true,
    chat: false,
    premiumContent: false,
    chatLimit: 0,
  },
  premium: {
    ddas: true,
    chat: true,
    premiumContent: true,
    chatLimit: 100, // daily limit
  },
  past_due: {
    ddas: true,
    chat: false, // First restriction
    premiumContent: false,
    chatLimit: 0,
  },
  grace_period: {
    ddas: true,
    chat: true,
    premiumContent: false, // Partial restriction
    chatLimit: 20, // Reduced limit
  },
  suspended: {
    ddas: true, // Keep wellness basics
    chat: false,
    premiumContent: false,
    chatLimit: 0,
  },
} as const;