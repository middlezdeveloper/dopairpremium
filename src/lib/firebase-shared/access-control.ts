import { UserProfile, UserStatus, ACCESS_LEVELS } from './collections';

// Access control utilities
export function getUserAccess(userStatus: UserStatus) {
  return ACCESS_LEVELS[userStatus];
}

export function canAccessChat(user: UserProfile): boolean {
  const access = getUserAccess(user.status);
  return access.chat;
}

export function canAccessPremiumContent(user: UserProfile): boolean {
  const access = getUserAccess(user.status);
  return access.premiumContent;
}

export function getDailyChatLimit(user: UserProfile): number {
  const access = getUserAccess(user.status);
  return access.chatLimit;
}

export function canAccessDDAS(user: UserProfile): boolean {
  const access = getUserAccess(user.status);
  return access.ddas;
}

// Status transition logic
export function shouldEnterGracePeriod(user: UserProfile): boolean {
  return user.status === 'premium' && user.paymentStatus === 'past_due';
}

export function shouldSuspendUser(user: UserProfile): boolean {
  if (user.gracePeriodEnd && new Date() > user.gracePeriodEnd.toDate()) {
    return true;
  }
  return false;
}

export function isUserInGoodStanding(user: UserProfile): boolean {
  return ['free', 'premium'].includes(user.status) && user.isApproved;
}

// Usage tracking helpers
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

export function getMidnightTimestamp(): Date {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  return midnight;
}

// Admin permission checks
export function isAdmin(user: UserProfile): boolean {
  // Check if user has admin role in custom claims or database
  return user.subscription?.tier === 'admin' || false; // Will be enhanced with custom claims
}

export function canApproveUsers(user: UserProfile): boolean {
  return isAdmin(user);
}

export function canViewUsageAnalytics(user: UserProfile): boolean {
  return isAdmin(user);
}

// Approval workflow logic
export function needsManualApproval(user: UserProfile): boolean {
  return user.approvalType === 'pending' && user.status === 'free';
}

export function isAutoApproved(user: UserProfile): boolean {
  return user.approvalType === 'stripe' && user.status === 'premium';
}

// Grace period calculations
export function calculateGracePeriodEnd(paymentFailedAt: Date, graceDays: number = 7): Date {
  const gracePeriodEnd = new Date(paymentFailedAt);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + graceDays);
  return gracePeriodEnd;
}

export function getGracePeriodDaysRemaining(gracePeriodEnd: Date): number {
  const now = new Date();
  const diffTime = gracePeriodEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Feature flags for gradual rollout
export const FEATURE_FLAGS = {
  USAGE_LIMITS_ENABLED: true,
  ADMIN_DASHBOARD_ENABLED: true,
  GRACE_PERIOD_ENABLED: true,
  STRIPE_WEBHOOKS_ENABLED: true,
  EMAIL_NOTIFICATIONS_ENABLED: true,
} as const;

export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}