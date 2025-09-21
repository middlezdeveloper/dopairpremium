import {onRequest} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as cors from "cors";
import OpenAI from "openai";
import {
  checkChatLimit,
  incrementChatUsage,
  detectAbuse,
  resetDailyUsage,
  getUsageAnalytics,
  getUserUsageStatus
} from "../lib/usage-tracking";
import { COLLECTIONS, ACCESS_LEVELS, UserStatus } from "../lib/collections";

admin.initializeApp();

const corsHandler = cors({origin: true});
const openaiApiKey = defineSecret("OPENAI_API_KEY");
let openai: OpenAI | null = null;

// Coach personas
const COACH_PERSONAS = {
  "dr-chen": {
    name: "Dr. Chen",
    style: "clinical",
    approach: "evidence-based",
    personality: "Professional therapist with a warm, understanding approach",
  },
  luna: {
    name: "Luna",
    style: "gentle",
    approach: "mindfulness-based",
    personality: "Gentle, supportive friend who focuses on mindfulness and self-compassion",
  },
  marcus: {
    name: "Marcus",
    style: "motivational",
    approach: "action-oriented",
    personality: "Energetic life coach who provides practical strategies and motivation",
  },
};

export const chatWithCoach = onRequest({
  secrets: [openaiApiKey],
}, async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    // Initialize OpenAI with the secret
    if (!openai) {
      openai = new OpenAI({
        apiKey: openaiApiKey.value(),
      });
    }

    try {
      // Get the authenticated user
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({error: "Unauthorized"});
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Get request data
      const {message, conversationHistory = []} = req.body;

      if (!message) {
        res.status(400).json({error: "Message is required"});
        return;
      }

      // Get user data from Firestore
      const userDoc = await admin.firestore().collection("users").doc(userId).get();

      if (!userDoc.exists) {
        res.status(404).json({error: "User not found"});
        return;
      }

      const userData = userDoc.data();

      // Check if user is approved
      if (!userData?.isApproved) {
        res.status(403).json({error: "Account pending approval"});
        return;
      }

      // Get user's timezone (default to UTC if not set)
      const userTimezone = userData?.timezone || 'UTC';
      const userStatus = userData?.status as UserStatus || 'free';

      // Check daily chat limits
      const limitCheck = await checkChatLimit(userId, userStatus, userTimezone);

      if (!limitCheck.canSend) {
        res.status(429).json({
          error: limitCheck.reason || "Daily message limit exceeded",
          usage: {
            currentUsage: limitCheck.currentUsage,
            dailyLimit: limitCheck.dailyLimit,
            remainingMessages: limitCheck.remainingMessages,
            resetAt: limitCheck.resetAt,
            isBlocked: limitCheck.isBlocked,
          },
          upgradeRequired: userStatus === 'free',
        });
        return;
      }

      // Build system prompt
      const systemPrompt = buildSystemPrompt("dr-chen", userData);

      // Prepare messages for OpenAI
      const messages = [
        {role: "system", content: systemPrompt},
        ...conversationHistory.slice(-10), // Last 10 messages for context
        {role: "user", content: message},
      ];

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages as any,
        max_tokens: 500,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || "I'm having trouble responding right now.";

      // Save conversation to Firestore
      const conversationRef = admin.firestore()
        .collection("conversations")
        .doc(userId)
        .collection("messages")
        .doc();

      await conversationRef.set({
        userMessage: message,
        assistantResponse: response,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        model: "gpt-3.5-turbo",
        persona: "dr-chen",
      });

      // Update usage tracking
      const updatedUsage = await incrementChatUsage(userId, userTimezone);

      // Check for abuse patterns
      const abuseCheck = await detectAbuse(userId, userTimezone);

      // Get updated usage status
      const usageStatus = await getUserUsageStatus(userId, userTimezone);

      res.json({
        response,
        conversationId: conversationRef.id,
        usage: {
          currentUsage: usageStatus.currentUsage,
          dailyLimit: usageStatus.dailyLimit,
          remainingMessages: usageStatus.remainingMessages,
          resetAt: usageStatus.resetAt,
        },
        warnings: abuseCheck.isAbusive ? {
          detected: true,
          reason: abuseCheck.reason,
          isBlocked: abuseCheck.isBlocked,
        } : undefined,
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({error: "Internal server error"});
    }
  });
});

function buildSystemPrompt(persona: string, userData: any): string {
  const coach = COACH_PERSONAS[persona as keyof typeof COACH_PERSONAS] || COACH_PERSONAS["dr-chen"];

  return `You are ${coach.name}, a ${coach.personality}.

Your approach is ${coach.approach} and your style is ${coach.style}.

Key guidelines:
- Keep responses under 3 paragraphs
- Be supportive and non-judgmental
- Focus on practical, actionable advice
- If the user mentions crisis/self-harm, respond with compassion and suggest professional help
- Stay in character as ${coach.name}

User context:
- Subscription: ${userData?.subscription?.tier || "free"}
- Account created: ${userData?.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString() : "recently"}

Respond to the user's message with empathy and helpful guidance.`;
}

// Scheduled function to reset daily usage counters at midnight
export const resetDailyUsageCounters = onSchedule({
  schedule: "0 0 * * *", // Run daily at midnight UTC
  timeZone: "UTC",
}, async (event) => {
  try {
    console.log("Starting daily usage reset...");

    const resetCount = await resetDailyUsage();

    console.log(`Daily usage reset completed. Reset ${resetCount} user records.`);

    // Log to admin logs
    await admin.firestore().collection(COLLECTIONS.ADMIN_LOGS).add({
      adminId: "system",
      adminEmail: "system@dopair.app",
      action: "reset_usage_limits",
      targetUserId: "all",
      targetUserEmail: "all",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      notes: `Daily usage reset completed. Reset ${resetCount} user records.`,
      metadata: {
        resetCount,
        executedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error("Error resetting daily usage:", error);

    // Log error to admin logs
    await admin.firestore().collection(COLLECTIONS.ADMIN_LOGS).add({
      adminId: "system",
      adminEmail: "system@dopair.app",
      action: "reset_usage_limits",
      targetUserId: "error",
      targetUserEmail: "error",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      notes: `Daily usage reset failed: ${error.message}`,
      metadata: {
        error: error.message,
        executedAt: new Date().toISOString(),
      },
    });
  }
});

// Function to get usage analytics for admin dashboard
export const getUsageAnalyticsData = onRequest({}, async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "GET") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      // Verify admin authorization
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({error: "Unauthorized"});
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Check if user is admin
      const userDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(userId).get();
      const userData = userDoc.data();

      if (!userData?.isAdmin) {
        res.status(403).json({error: "Admin access required"});
        return;
      }

      // Get date range from query params
      const startDate = req.query.startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = req.query.endDate as string || new Date().toISOString().split('T')[0];

      const analytics = await getUsageAnalytics(startDate, endDate);

      res.json({
        analytics,
        dateRange: {
          startDate,
          endDate,
        },
      });

    } catch (error) {
      console.error("Error getting usage analytics:", error);
      res.status(500).json({error: "Internal server error"});
    }
  });
});

// Function to get user usage status (for admin or user themselves)
export const getUserUsageData = onRequest({}, async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "GET") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    try {
      // Get authenticated user
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({error: "Unauthorized"});
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const requestingUserId = decodedToken.uid;

      // Get target user ID (defaults to requesting user)
      const targetUserId = req.query.userId as string || requestingUserId;

      // If requesting data for another user, verify admin access
      if (targetUserId !== requestingUserId) {
        const userDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(requestingUserId).get();
        const userData = userDoc.data();

        if (!userData?.isAdmin) {
          res.status(403).json({error: "Admin access required to view other users' data"});
          return;
        }
      }

      // Get user's timezone
      const targetUserDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(targetUserId).get();
      const targetUserData = targetUserDoc.data();
      const userTimezone = targetUserData?.timezone || 'UTC';

      const usageStatus = await getUserUsageStatus(targetUserId, userTimezone);

      res.json({
        usage: usageStatus,
      });

    } catch (error) {
      console.error("Error getting user usage data:", error);
      res.status(500).json({error: "Internal server error"});
    }
  });
});

// Export Stripe webhook handlers
export { stripeWebhooks, processGracePeriodExpirations } from "./stripe-webhooks";

// Export admin utilities
export { webhookAdmin } from "./webhook-admin";

// Export billing management functions
export {
  getBillingInfo,
  getBillingHistory,
  pauseSubscription,
  cancelSubscription,
  getPaymentMethodUpdateURL
} from "./billing-management";

// Export checkout session creation
export { createCheckoutSession } from "./create-checkout-session";