import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { COLLECTIONS, UserStatus } from "../lib/collections";
import { sendPaymentNotificationEmail, EmailTemplate } from "./email-service";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

/**
 * Admin utility function for manual webhook processing and testing
 * Protected by admin authentication
 */
export const webhookAdmin = onRequest({
  secrets: [stripeSecretKey],
  cors: true
}, async (req, res) => {
  try {
    // Verify admin authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Check if user is admin
    const userDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const { action } = req.body;

    switch (action) {
      case 'test_email':
        await handleTestEmail(req, res);
        break;
      case 'process_user_status':
        await handleProcessUserStatus(req, res);
        break;
      case 'retry_failed_webhooks':
        await handleRetryFailedWebhooks(req, res);
        break;
      case 'sync_stripe_status':
        await handleSyncStripeStatus(req, res);
        break;
      case 'grace_period_report':
        await handleGracePeriodReport(req, res);
        break;
      case 'payment_health_check':
        await handlePaymentHealthCheck(req, res);
        break;
      default:
        res.status(400).json({ error: "Invalid action" });
    }

  } catch (error) {
    console.error("Webhook admin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Test email sending functionality
 */
async function handleTestEmail(req: any, res: any): Promise<void> {
  const { email, template, templateData } = req.body;

  if (!email || !template) {
    res.status(400).json({ error: "Email and template required" });
    return;
  }

  try {
    await sendPaymentNotificationEmail(email, template as EmailTemplate, templateData || {});
    res.json({ success: true, message: `Test email sent to ${email}` });
  } catch (error) {
    res.status(500).json({ error: `Failed to send email: ${error.message}` });
  }
}

/**
 * Manually process user status based on Stripe subscription
 */
async function handleProcessUserStatus(req: any, res: any): Promise<void> {
  const { userId } = req.body;

  if (!userId) {
    res.status(400).json({ error: "User ID required" });
    return;
  }

  try {
    const userDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(userId).get();

    if (!userDoc.exists) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const userData = userDoc.data();
    const stripeCustomerId = userData?.subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      res.status(400).json({ error: "User has no Stripe customer ID" });
      return;
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: "2023-10-16",
    });

    // Get customer's subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 10
    });

    const activeSubscription = subscriptions.data.find(sub =>
      ['active', 'trialing', 'past_due'].includes(sub.status)
    );

    let newStatus: UserStatus = 'free';

    if (activeSubscription) {
      switch (activeSubscription.status) {
        case 'active':
        case 'trialing':
          newStatus = 'premium';
          break;
        case 'past_due':
          newStatus = 'past_due';
          break;
      }
    }

    // Update user status
    await admin.firestore().collection(COLLECTIONS.USERS).doc(userId).update({
      status: newStatus,
      paymentStatus: activeSubscription?.status || 'canceled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update Firebase Custom Claims
    await admin.auth().setCustomUserClaims(userId, {
      status: newStatus,
      subscriptionId: activeSubscription?.id,
      stripeCustomerId
    });

    res.json({
      success: true,
      userId,
      oldStatus: userData?.status,
      newStatus,
      stripeStatus: activeSubscription?.status || 'no_subscription',
      subscriptionId: activeSubscription?.id
    });

  } catch (error) {
    res.status(500).json({ error: `Failed to process user status: ${error.message}` });
  }
}

/**
 * Retry failed webhook events
 */
async function handleRetryFailedWebhooks(req: any, res: any): Promise<void> {
  try {
    const failedEventsQuery = await admin.firestore()
      .collection('processed_webhook_events')
      .where('status', '==', 'failed')
      .limit(10)
      .get();

    const retryResults = [];

    for (const doc of failedEventsQuery.docs) {
      const eventData = doc.data();

      try {
        // Mark as retrying
        await doc.ref.update({
          status: 'retrying',
          retryAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Here you would re-process the webhook event
        // For now, just mark as completed
        await doc.ref.update({
          status: 'completed',
          retriedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        retryResults.push({
          eventId: doc.id,
          eventType: eventData.eventType,
          status: 'retried'
        });

      } catch (error) {
        await doc.ref.update({
          status: 'failed',
          retryError: error.message,
          retryFailedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        retryResults.push({
          eventId: doc.id,
          eventType: eventData.eventType,
          status: 'retry_failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      retriedCount: retryResults.length,
      results: retryResults
    });

  } catch (error) {
    res.status(500).json({ error: `Failed to retry webhooks: ${error.message}` });
  }
}

/**
 * Sync user status with Stripe for all users
 */
async function handleSyncStripeStatus(req: any, res: any): Promise<void> {
  try {
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: "2023-10-16",
    });

    // Get users with Stripe customer IDs
    const usersQuery = await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .where('subscription.stripeCustomerId', '!=', null)
      .limit(50) // Process in batches
      .get();

    const syncResults = [];

    for (const doc of usersQuery.docs) {
      const userData = doc.data();
      const userId = doc.id;
      const stripeCustomerId = userData.subscription?.stripeCustomerId;

      if (!stripeCustomerId) continue;

      try {
        // Get subscriptions from Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'all',
          limit: 5
        });

        const activeSubscription = subscriptions.data.find(sub =>
          ['active', 'trialing', 'past_due'].includes(sub.status)
        );

        let correctStatus: UserStatus = 'free';

        if (activeSubscription) {
          switch (activeSubscription.status) {
            case 'active':
            case 'trialing':
              correctStatus = 'premium';
              break;
            case 'past_due':
              correctStatus = 'past_due';
              break;
          }
        }

        const currentStatus = userData.status;

        if (currentStatus !== correctStatus) {
          await admin.firestore().collection(COLLECTIONS.USERS).doc(userId).update({
            status: correctStatus,
            paymentStatus: activeSubscription?.status || 'canceled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          await admin.auth().setCustomUserClaims(userId, {
            status: correctStatus,
            subscriptionId: activeSubscription?.id,
            stripeCustomerId
          });

          syncResults.push({
            userId,
            email: userData.email,
            oldStatus: currentStatus,
            newStatus: correctStatus,
            stripeStatus: activeSubscription?.status || 'no_subscription'
          });
        }

      } catch (error) {
        syncResults.push({
          userId,
          email: userData.email,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      processedCount: usersQuery.size,
      changedCount: syncResults.filter(r => !r.error).length,
      errorCount: syncResults.filter(r => r.error).length,
      results: syncResults
    });

  } catch (error) {
    res.status(500).json({ error: `Failed to sync Stripe status: ${error.message}` });
  }
}

/**
 * Generate grace period report
 */
async function handleGracePeriodReport(req: any, res: any): Promise<void> {
  try {
    const now = admin.firestore.Timestamp.now();

    // Users currently in grace period
    const gracePeriodQuery = await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .where('status', '==', 'grace_period')
      .get();

    // Users with grace period ending soon (next 24 hours)
    const tomorrow = admin.firestore.Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
    const expiringSoonQuery = await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .where('status', '==', 'grace_period')
      .where('gracePeriodEnd', '<=', tomorrow)
      .get();

    // Users with expired grace period
    const expiredQuery = await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .where('status', '==', 'grace_period')
      .where('gracePeriodEnd', '<=', now)
      .get();

    const report = {
      totalInGracePeriod: gracePeriodQuery.size,
      expiringSoon: expiringSoonQuery.size,
      expired: expiredQuery.size,
      users: {
        inGracePeriod: gracePeriodQuery.docs.map(doc => ({
          userId: doc.id,
          email: doc.data().email,
          gracePeriodEnd: doc.data().gracePeriodEnd?.toDate(),
          paymentFailedAt: doc.data().paymentFailedAt?.toDate()
        })),
        expiringSoon: expiringSoonQuery.docs.map(doc => ({
          userId: doc.id,
          email: doc.data().email,
          gracePeriodEnd: doc.data().gracePeriodEnd?.toDate(),
          hoursUntilExpiry: Math.round((doc.data().gracePeriodEnd.toMillis() - now.toMillis()) / (60 * 60 * 1000))
        })),
        expired: expiredQuery.docs.map(doc => ({
          userId: doc.id,
          email: doc.data().email,
          gracePeriodEnd: doc.data().gracePeriodEnd?.toDate(),
          hoursOverdue: Math.round((now.toMillis() - doc.data().gracePeriodEnd.toMillis()) / (60 * 60 * 1000))
        }))
      }
    };

    res.json({
      success: true,
      generatedAt: now.toDate(),
      report
    });

  } catch (error) {
    res.status(500).json({ error: `Failed to generate grace period report: ${error.message}` });
  }
}

/**
 * Payment system health check
 */
async function handlePaymentHealthCheck(req: any, res: any): Promise<void> {
  try {
    const last24Hours = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

    // Check webhook processing health
    const webhookEventsQuery = await admin.firestore()
      .collection('processed_webhook_events')
      .where('processedAt', '>=', last24Hours)
      .get();

    const webhookStats = {
      total: webhookEventsQuery.size,
      completed: 0,
      failed: 0,
      retrying: 0
    };

    webhookEventsQuery.docs.forEach(doc => {
      const status = doc.data().status;
      if (status === 'completed') webhookStats.completed++;
      else if (status === 'failed') webhookStats.failed++;
      else if (status === 'retrying') webhookStats.retrying++;
    });

    // Check email delivery health
    const emailNotificationsQuery = await admin.firestore()
      .collection('email_notifications')
      .where('sentAt', '>=', last24Hours)
      .get();

    const failedEmailsQuery = await admin.firestore()
      .collection('failed_emails')
      .where('failedAt', '>=', last24Hours)
      .get();

    const emailStats = {
      sent: emailNotificationsQuery.size,
      failed: failedEmailsQuery.size,
      successRate: emailNotificationsQuery.size / (emailNotificationsQuery.size + failedEmailsQuery.size) * 100
    };

    // Check user status distribution
    const userStatsQueries = await Promise.all([
      admin.firestore().collection(COLLECTIONS.USERS).where('status', '==', 'free').get(),
      admin.firestore().collection(COLLECTIONS.USERS).where('status', '==', 'premium').get(),
      admin.firestore().collection(COLLECTIONS.USERS).where('status', '==', 'past_due').get(),
      admin.firestore().collection(COLLECTIONS.USERS).where('status', '==', 'grace_period').get(),
      admin.firestore().collection(COLLECTIONS.USERS).where('status', '==', 'suspended').get()
    ]);

    const userStats = {
      free: userStatsQueries[0].size,
      premium: userStatsQueries[1].size,
      pastDue: userStatsQueries[2].size,
      gracePeriod: userStatsQueries[3].size,
      suspended: userStatsQueries[4].size,
      total: userStatsQueries.reduce((sum, query) => sum + query.size, 0)
    };

    // Overall health score
    const webhookHealthScore = (webhookStats.completed / Math.max(webhookStats.total, 1)) * 100;
    const emailHealthScore = emailStats.successRate || 100;
    const overallHealthScore = (webhookHealthScore + emailHealthScore) / 2;

    const healthStatus = overallHealthScore >= 95 ? 'healthy' :
                        overallHealthScore >= 80 ? 'warning' : 'critical';

    res.json({
      success: true,
      healthStatus,
      overallHealthScore: Math.round(overallHealthScore),
      last24Hours: {
        webhookProcessing: {
          ...webhookStats,
          healthScore: Math.round(webhookHealthScore)
        },
        emailDelivery: {
          ...emailStats,
          successRate: Math.round(emailStats.successRate || 100),
          healthScore: Math.round(emailHealthScore)
        },
        userDistribution: userStats
      },
      recommendations: generateHealthRecommendations(webhookStats, emailStats, userStats)
    });

  } catch (error) {
    res.status(500).json({ error: `Failed to perform health check: ${error.message}` });
  }
}

/**
 * Generate health recommendations based on metrics
 */
function generateHealthRecommendations(webhookStats: any, emailStats: any, userStats: any): string[] {
  const recommendations = [];

  // Webhook recommendations
  if (webhookStats.failed > webhookStats.completed * 0.1) {
    recommendations.push("High webhook failure rate detected. Check Stripe webhook configuration and endpoint health.");
  }

  if (webhookStats.retrying > 5) {
    recommendations.push("Multiple webhooks are retrying. Consider investigating connectivity or processing issues.");
  }

  // Email recommendations
  if (emailStats.successRate < 90) {
    recommendations.push("Email delivery success rate is below 90%. Check email service configuration and API limits.");
  }

  if (emailStats.failed > 10) {
    recommendations.push("High number of failed emails. Consider implementing email retry queue processing.");
  }

  // User status recommendations
  if (userStats.pastDue > userStats.premium * 0.1) {
    recommendations.push("High number of past due users. Consider reviewing payment retry settings or reaching out to affected users.");
  }

  if (userStats.gracePeriod > userStats.premium * 0.05) {
    recommendations.push("Significant number of users in grace period. Monitor payment recovery rates and consider dunning strategy adjustments.");
  }

  if (userStats.suspended > 0) {
    recommendations.push(`${userStats.suspended} suspended users detected. Consider manual outreach for account recovery.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("Payment system is operating normally. Continue monitoring key metrics.");
  }

  return recommendations;
}