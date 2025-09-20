import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { COLLECTIONS, ACCESS_LEVELS, UserStatus, UsageTracking } from './collections';

// Initialize Firestore
const db = admin.firestore();

/**
 * Get the current date in YYYY-MM-DD format for the user's timezone
 * @param userTimezone - User's timezone (default: UTC)
 * @returns Date string in YYYY-MM-DD format
 */
export function getCurrentDateForUser(userTimezone: string = 'UTC'): string {
  const now = new Date();
  const userDate = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
  return userDate.toISOString().split('T')[0];
}

/**
 * Get the next midnight timestamp for the user's timezone
 * @param userTimezone - User's timezone (default: UTC)
 * @returns Timestamp for next midnight in user's timezone
 */
export function getNextMidnightTimestamp(userTimezone: string = 'UTC'): Timestamp {
  const today = getCurrentDateForUser(userTimezone);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Create midnight timestamp in user's timezone
  const midnightDate = new Date(tomorrow.toLocaleString('en-US', { timeZone: userTimezone }));
  return Timestamp.fromDate(midnightDate);
}

/**
 * Get or create usage tracking document for a user and date
 * @param userId - User ID
 * @param date - Date in YYYY-MM-DD format
 * @param userTimezone - User's timezone
 * @returns UsageTracking document
 */
export async function getOrCreateUsageTracking(
  userId: string,
  date: string,
  userTimezone: string = 'UTC'
): Promise<UsageTracking> {
  const docId = `${userId}_${date}`;
  const usageRef = db.collection(COLLECTIONS.USAGE_TRACKING).doc(docId);

  const doc = await usageRef.get();

  if (doc.exists) {
    return doc.data() as UsageTracking;
  }

  // Create new usage tracking document
  const newUsage: UsageTracking = {
    userId,
    date,
    chatMessages: 0,
    resetAt: getNextMidnightTimestamp(userTimezone),
    lastMessageAt: null,
    warnings: 0,
    blocked: false,
  };

  await usageRef.set(newUsage);
  return newUsage;
}

/**
 * Check if user can send a chat message based on their daily limits
 * @param userId - User ID
 * @param userStatus - User's subscription status
 * @param userTimezone - User's timezone
 * @returns Object with canSend boolean and usage info
 */
export async function checkChatLimit(
  userId: string,
  userStatus: UserStatus,
  userTimezone: string = 'UTC'
): Promise<{
  canSend: boolean;
  currentUsage: number;
  dailyLimit: number;
  remainingMessages: number;
  resetAt: Timestamp;
  isBlocked: boolean;
  reason?: string;
}> {
  const today = getCurrentDateForUser(userTimezone);
  const usage = await getOrCreateUsageTracking(userId, today, userTimezone);

  // Get daily limit based on user status
  const accessLevel = ACCESS_LEVELS[userStatus] || ACCESS_LEVELS.free;
  const dailyLimit = accessLevel.chatLimit;

  // Check if user is blocked for abuse
  if (usage.blocked) {
    return {
      canSend: false,
      currentUsage: usage.chatMessages,
      dailyLimit,
      remainingMessages: 0,
      resetAt: usage.resetAt,
      isBlocked: true,
      reason: 'Account temporarily blocked for abuse. Please contact support.',
    };
  }

  // Check if chat is allowed for this status
  if (!accessLevel.chat) {
    return {
      canSend: false,
      currentUsage: usage.chatMessages,
      dailyLimit,
      remainingMessages: 0,
      resetAt: usage.resetAt,
      isBlocked: false,
      reason: `Chat access not available for ${userStatus} users.`,
    };
  }

  // Check daily limit
  const remainingMessages = Math.max(0, dailyLimit - usage.chatMessages);
  const canSend = usage.chatMessages < dailyLimit;

  return {
    canSend,
    currentUsage: usage.chatMessages,
    dailyLimit,
    remainingMessages,
    resetAt: usage.resetAt,
    isBlocked: false,
    reason: canSend ? undefined : 'Daily message limit reached.',
  };
}

/**
 * Increment the chat message count for a user
 * @param userId - User ID
 * @param userTimezone - User's timezone
 * @returns Updated usage tracking document
 */
export async function incrementChatUsage(
  userId: string,
  userTimezone: string = 'UTC'
): Promise<UsageTracking> {
  const today = getCurrentDateForUser(userTimezone);
  const docId = `${userId}_${today}`;
  const usageRef = db.collection(COLLECTIONS.USAGE_TRACKING).doc(docId);

  // Use transaction to ensure atomic update
  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(usageRef);

    let usage: UsageTracking;
    if (doc.exists) {
      usage = doc.data() as UsageTracking;
    } else {
      // Create new document if it doesn't exist
      usage = {
        userId,
        date: today,
        chatMessages: 0,
        resetAt: getNextMidnightTimestamp(userTimezone),
        lastMessageAt: null,
        warnings: 0,
        blocked: false,
      };
    }

    // Update usage
    const updatedUsage: UsageTracking = {
      ...usage,
      chatMessages: usage.chatMessages + 1,
      lastMessageAt: Timestamp.now(),
    };

    transaction.set(usageRef, updatedUsage);
    return updatedUsage;
  });

  return result;
}

/**
 * Detect potential abuse patterns and update warnings
 * @param userId - User ID
 * @param userTimezone - User's timezone
 * @returns Object with abuse detection results
 */
export async function detectAbuse(
  userId: string,
  userTimezone: string = 'UTC'
): Promise<{
  isAbusive: boolean;
  warningsAdded: number;
  isBlocked: boolean;
  reason?: string;
}> {
  const today = getCurrentDateForUser(userTimezone);
  const usage = await getOrCreateUsageTracking(userId, today, userTimezone);

  let warningsAdded = 0;
  let isAbusive = false;
  let reason: string | undefined;

  // Check for rapid-fire messaging (more than 10 messages in last minute)
  if (usage.lastMessageAt) {
    const oneMinuteAgo = Timestamp.fromMillis(Date.now() - 60000);

    // Query recent messages for this user
    const recentMessages = await db
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(userId)
      .collection('messages')
      .where('timestamp', '>=', oneMinuteAgo)
      .get();

    if (recentMessages.size > 10) {
      isAbusive = true;
      warningsAdded = 1;
      reason = 'Rapid messaging detected';
    }
  }

  // Check for excessive daily usage (more than 150% of limit)
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
  const userData = userDoc.data();
  const userStatus = userData?.status || 'free';
  const accessLevel = ACCESS_LEVELS[userStatus] || ACCESS_LEVELS.free;

  if (usage.chatMessages > accessLevel.chatLimit * 1.5) {
    isAbusive = true;
    warningsAdded = Math.max(warningsAdded, 1);
    reason = reason || 'Excessive usage detected';
  }

  // Update warnings and potentially block user
  if (isAbusive) {
    const docId = `${userId}_${today}`;
    const usageRef = db.collection(COLLECTIONS.USAGE_TRACKING).doc(docId);

    const newWarnings = (usage.warnings || 0) + warningsAdded;
    const shouldBlock = newWarnings >= 3; // Block after 3 warnings

    await usageRef.update({
      warnings: newWarnings,
      blocked: shouldBlock,
    });

    return {
      isAbusive: true,
      warningsAdded,
      isBlocked: shouldBlock,
      reason,
    };
  }

  return {
    isAbusive: false,
    warningsAdded: 0,
    isBlocked: false,
  };
}

/**
 * Reset usage counters for all users (called by scheduled function)
 * @param targetDate - Date to reset (default: yesterday)
 * @returns Number of documents reset
 */
export async function resetDailyUsage(targetDate?: string): Promise<number> {
  const yesterday = targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Query all usage tracking documents for the target date
  const snapshot = await db
    .collection(COLLECTIONS.USAGE_TRACKING)
    .where('date', '==', yesterday)
    .get();

  // Reset counters in batches
  const batch = db.batch();
  let resetCount = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as UsageTracking;

    // Reset daily counters but keep warnings for abuse tracking
    batch.update(doc.ref, {
      chatMessages: 0,
      lastMessageAt: null,
      blocked: false, // Unblock users daily (they can get re-blocked if abuse continues)
    });

    resetCount++;
  });

  if (resetCount > 0) {
    await batch.commit();
  }

  return resetCount;
}

/**
 * Get usage analytics for admin dashboard
 * @param startDate - Start date for analytics (YYYY-MM-DD)
 * @param endDate - End date for analytics (YYYY-MM-DD)
 * @returns Usage analytics data
 */
export async function getUsageAnalytics(
  startDate: string,
  endDate: string
): Promise<{
  totalUsers: number;
  totalMessages: number;
  averageMessagesPerUser: number;
  usageByStatus: Record<UserStatus, { users: number; messages: number }>;
  dailyBreakdown: Array<{
    date: string;
    users: number;
    messages: number;
  }>;
}> {
  // Query usage tracking documents in date range
  const snapshot = await db
    .collection(COLLECTIONS.USAGE_TRACKING)
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .get();

  const analytics = {
    totalUsers: 0,
    totalMessages: 0,
    averageMessagesPerUser: 0,
    usageByStatus: {
      free: { users: 0, messages: 0 },
      premium: { users: 0, messages: 0 },
      past_due: { users: 0, messages: 0 },
      grace_period: { users: 0, messages: 0 },
      suspended: { users: 0, messages: 0 },
    } as Record<UserStatus, { users: number; messages: number }>,
    dailyBreakdown: [] as Array<{ date: string; users: number; messages: number }>,
  };

  const userIds = new Set<string>();
  const dailyData: Record<string, { users: Set<string>; messages: number }> = {};

  // Process usage documents
  for (const doc of snapshot.docs) {
    const data = doc.data() as UsageTracking;
    userIds.add(data.userId);
    analytics.totalMessages += data.chatMessages;

    // Track daily breakdown
    if (!dailyData[data.date]) {
      dailyData[data.date] = { users: new Set(), messages: 0 };
    }
    dailyData[data.date].users.add(data.userId);
    dailyData[data.date].messages += data.chatMessages;
  }

  analytics.totalUsers = userIds.size;
  analytics.averageMessagesPerUser = analytics.totalUsers > 0
    ? analytics.totalMessages / analytics.totalUsers
    : 0;

  // Get user statuses for breakdown
  const userPromises = Array.from(userIds).map(async (userId) => {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    const userData = userDoc.data();
    return {
      userId,
      status: (userData?.status || 'free') as UserStatus,
    };
  });

  const userStatuses = await Promise.all(userPromises);

  // Calculate usage by status
  for (const doc of snapshot.docs) {
    const data = doc.data() as UsageTracking;
    const userStatus = userStatuses.find(u => u.userId === data.userId);

    if (userStatus) {
      analytics.usageByStatus[userStatus.status].users++;
      analytics.usageByStatus[userStatus.status].messages += data.chatMessages;
    }
  }

  // Build daily breakdown
  analytics.dailyBreakdown = Object.entries(dailyData)
    .map(([date, data]) => ({
      date,
      users: data.users.size,
      messages: data.messages,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return analytics;
}

/**
 * Get user's current usage status
 * @param userId - User ID
 * @param userTimezone - User's timezone
 * @returns Current usage status
 */
export async function getUserUsageStatus(
  userId: string,
  userTimezone: string = 'UTC'
): Promise<{
  currentUsage: number;
  dailyLimit: number;
  remainingMessages: number;
  resetAt: Timestamp;
  warningsCount: number;
  isBlocked: boolean;
  userStatus: UserStatus;
}> {
  const today = getCurrentDateForUser(userTimezone);
  const usage = await getOrCreateUsageTracking(userId, today, userTimezone);

  // Get user status
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
  const userData = userDoc.data();
  const userStatus = (userData?.status || 'free') as UserStatus;

  const accessLevel = ACCESS_LEVELS[userStatus] || ACCESS_LEVELS.free;
  const remainingMessages = Math.max(0, accessLevel.chatLimit - usage.chatMessages);

  return {
    currentUsage: usage.chatMessages,
    dailyLimit: accessLevel.chatLimit,
    remainingMessages,
    resetAt: usage.resetAt,
    warningsCount: usage.warnings || 0,
    isBlocked: usage.blocked || false,
    userStatus,
  };
}