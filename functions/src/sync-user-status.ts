import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as cors from "cors";
import Stripe from "stripe";
import { COLLECTIONS } from "../lib/collections";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

// CORS configuration
const corsHandler = cors({
  origin: [
    'https://dopair.app',
    'https://premium.dopair.app',
    'https://dopair.web.app',
    'https://premium.dopair.web.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
});

/**
 * Sync specific user's status with Stripe subscription
 * Usage: POST with { "email": "user@example.com" }
 */
export const syncUserStatus = onRequest({
  secrets: [stripeSecretKey],
}, async (req, res) => {
  return corsHandler(req, res, async () => {

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const adminUserId = decodedToken.uid;

    // Check if user is admin
    const adminDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(adminUserId).get();
    const adminData = adminDoc.data();

    if (!adminData?.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: "2023-10-16",
    });

    // Find user by email in Firebase
    const usersQuery = await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      res.status(404).json({ error: "User not found in Firebase" });
      return;
    }

    const userDoc = usersQuery.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    console.log(`Found user: ${email} (${userId})`);

    // Search for Stripe customer by email
    const customers = await stripe.customers.list({
      email,
      limit: 1
    });

    if (customers.data.length === 0) {
      res.status(404).json({ error: "No Stripe customer found with this email" });
      return;
    }

    const customer = customers.data[0];
    console.log(`Found Stripe customer: ${customer.id}`);

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10
    });

    console.log(`Found ${subscriptions.data.length} subscriptions`);

    const activeSubscription = subscriptions.data.find(sub =>
      ['active', 'trialing'].includes(sub.status)
    );

    let newStatus = 'free';
    let paymentStatus = 'canceled';
    let approvalType = 'pending';

    if (activeSubscription) {
      newStatus = 'premium';
      paymentStatus = 'active';
      approvalType = 'stripe';
      console.log(`Active subscription found: ${activeSubscription.id} (${activeSubscription.status})`);
    } else {
      // Check for past_due or other statuses
      const pastDueSubscription = subscriptions.data.find(sub => sub.status === 'past_due');
      if (pastDueSubscription) {
        newStatus = 'past_due';
        paymentStatus = 'past_due';
        approvalType = 'stripe';
      }
    }

    // Update user in Firebase
    const updateData = {
      status: newStatus,
      paymentStatus,
      approvalType,
      isApproved: newStatus !== 'free', // Legacy compatibility
      subscription: {
        ...userData.subscription,
        stripeCustomerId: customer.id,
        subscriptionId: activeSubscription?.id || userData.subscription?.subscriptionId,
        tier: newStatus === 'premium' ? 'premium' : 'free'
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await userDoc.ref.update(updateData);

    // Update Firebase Custom Claims
    await admin.auth().setCustomUserClaims(userId, {
      status: newStatus,
      subscriptionId: activeSubscription?.id,
      stripeCustomerId: customer.id
    });

    // Log the sync action
    await admin.firestore().collection(COLLECTIONS.ADMIN_LOGS).add({
      adminId: adminUserId,
      adminEmail: decodedToken.email,
      action: 'sync_user_status',
      targetUserId: userId,
      targetUserEmail: email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      notes: `Synced user status from Stripe: ${userData.status} → ${newStatus}`,
      metadata: {
        oldStatus: userData.status,
        newStatus,
        stripeCustomerId: customer.id,
        subscriptionId: activeSubscription?.id,
        subscriptionStatus: activeSubscription?.status,
        totalSubscriptions: subscriptions.data.length
      }
    });

    res.json({
      success: true,
      user: {
        email,
        userId,
        oldStatus: userData.status,
        newStatus,
        paymentStatus,
        approvalType
      },
      stripe: {
        customerId: customer.id,
        subscriptionId: activeSubscription?.id,
        subscriptionStatus: activeSubscription?.status,
        totalSubscriptions: subscriptions.data.length
      }
    });

  } catch (error) {
    console.error("Error syncing user status:", error);
    res.status(500).json({ error: "Failed to sync user status", details: error.message });
  }
  });
});

/**
 * Batch sync all users with Stripe customers
 * For mass fixes if needed
 */
export const batchSyncUsers = onRequest({
  secrets: [stripeSecretKey],
}, async (req, res) => {
  return corsHandler(req, res, async () => {
  try {
    // Verify admin authorization (same as above)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const adminUserId = decodedToken.uid;

    const adminDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(adminUserId).get();
    const adminData = adminDoc.data();

    if (!adminData?.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: "2023-10-16",
    });

    // Get all users with subscription data
    const usersQuery = await admin.firestore()
      .collection(COLLECTIONS.USERS)
      .where('subscription.stripeCustomerId', '!=', null)
      .get();

    const results = [];

    for (const userDoc of usersQuery.docs) {
      const userData = userDoc.data();
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
          ['active', 'trialing'].includes(sub.status)
        );

        let correctStatus = 'free';
        let correctPaymentStatus = 'canceled';

        if (activeSubscription) {
          correctStatus = 'premium';
          correctPaymentStatus = 'active';
        } else {
          const pastDueSubscription = subscriptions.data.find(sub => sub.status === 'past_due');
          if (pastDueSubscription) {
            correctStatus = 'past_due';
            correctPaymentStatus = 'past_due';
          }
        }

        const currentStatus = userData.status;

        if (currentStatus !== correctStatus) {
          await userDoc.ref.update({
            status: correctStatus,
            paymentStatus: correctPaymentStatus,
            approvalType: 'stripe',
            isApproved: correctStatus !== 'free',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          await admin.auth().setCustomUserClaims(userDoc.id, {
            status: correctStatus,
            subscriptionId: activeSubscription?.id,
            stripeCustomerId
          });

          results.push({
            userId: userDoc.id,
            email: userData.email,
            oldStatus: currentStatus,
            newStatus: correctStatus,
            subscriptionId: activeSubscription?.id
          });
        }

      } catch (error) {
        results.push({
          userId: userDoc.id,
          email: userData.email,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      processedCount: usersQuery.size,
      updatedCount: results.filter(r => !r.error).length,
      errorCount: results.filter(r => r.error).length,
      results
    });

  } catch (error) {
    console.error("Error batch syncing users:", error);
    res.status(500).json({ error: "Failed to batch sync users", details: error.message });
  }
  });
});