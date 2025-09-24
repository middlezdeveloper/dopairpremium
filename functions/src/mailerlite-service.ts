import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { COLLECTIONS } from "../lib/collections";

// Define MailerLite API secret
const mailerLiteApiKey = defineSecret("MAILERLITE_API_KEY");

// MailerLite API configuration
const MAILERLITE_API_BASE = 'https://connect.mailerlite.com/api';
const MAILERLITE_GROUP_ID = 'non_subscribers'; // Group for non-subscribers

interface MailerLiteSubscriber {
  email: string;
  name?: string;
  fields?: {
    signup_source?: string;
    signup_date?: string;
    last_activity?: string;
    user_status?: 'free' | 'interested' | 'churned';
    ddas_completed?: boolean;
  };
}

interface MailerLiteResponse {
  success: boolean;
  subscriber?: any;
  error?: string;
}

/**
 * Add non-subscriber to MailerLite for marketing campaigns
 */
export const addToMarketingList = onRequest({
  secrets: [mailerLiteApiKey],
}, async (req, res) => {
  try {
    // Verify this is a system call or authenticated admin
    const { email, name, source, userStatus } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Add to MailerLite
    const result = await addSubscriberToMailerLite({
      email,
      name,
      fields: {
        signup_source: source || 'website',
        signup_date: new Date().toISOString(),
        user_status: userStatus || 'free',
        ddas_completed: false
      }
    });

    if (result.success) {
      // Log marketing subscription
      await admin.firestore().collection('marketing_subscribers').add({
        email,
        name: name || '',
        source: source || 'website',
        status: 'subscribed',
        mailerLiteId: result.subscriber?.id,
        subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        userStatus: userStatus || 'free'
      });

      res.json({ success: true, message: "Added to marketing list" });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error("Error adding to marketing list:", error);
    res.status(500).json({ error: "Failed to add to marketing list" });
  }
});

/**
 * Update subscriber status when user behavior changes
 */
export const updateMarketingSubscriber = onRequest({
  secrets: [mailerLiteApiKey],
}, async (req, res) => {
  try {
    const { email, userStatus, ddasCompleted, lastActivity } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Update in MailerLite
    const result = await updateSubscriberInMailerLite(email, {
      user_status: userStatus,
      ddas_completed: ddasCompleted || false,
      last_activity: lastActivity || new Date().toISOString()
    });

    if (result.success) {
      // Update local record
      const subscriberQuery = await admin.firestore()
        .collection('marketing_subscribers')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!subscriberQuery.empty) {
        await subscriberQuery.docs[0].ref.update({
          userStatus,
          ddasCompleted: ddasCompleted || false,
          lastActivity: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.json({ success: true, message: "Subscriber updated" });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error("Error updating marketing subscriber:", error);
    res.status(500).json({ error: "Failed to update subscriber" });
  }
});

/**
 * Remove from marketing list when user subscribes to premium
 */
export const removeFromMarketingList = onRequest({
  secrets: [mailerLiteApiKey],
}, async (req, res) => {
  try {
    const { email, reason } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Unsubscribe from MailerLite
    const result = await unsubscribeFromMailerLite(email);

    if (result.success) {
      // Update local record
      const subscriberQuery = await admin.firestore()
        .collection('marketing_subscribers')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!subscriberQuery.empty) {
        await subscriberQuery.docs[0].ref.update({
          status: 'unsubscribed',
          unsubscribedAt: admin.firestore.FieldValue.serverTimestamp(),
          unsubscribeReason: reason || 'premium_conversion',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.json({ success: true, message: "Removed from marketing list" });
    } else {
      res.status(500).json({ error: result.error });
    }

  } catch (error) {
    console.error("Error removing from marketing list:", error);
    res.status(500).json({ error: "Failed to remove from marketing list" });
  }
});

/**
 * Sync user status changes to MailerLite
 * Call this when:
 * - User completes DDAS assessment
 * - User shows interest but doesn't subscribe
 * - User churns after trial
 */
export async function syncUserToMarketing(
  email: string,
  userData: {
    status?: string;
    ddasCompleted?: boolean;
    lastActivity?: Date;
    source?: string;
  }
): Promise<void> {
  try {
    // Only sync free/non-premium users to marketing
    if (userData.status === 'premium') {
      await removeFromMarketingList(email, 'premium_conversion');
      return;
    }

    // Check if already in marketing list
    const subscriberQuery = await admin.firestore()
      .collection('marketing_subscribers')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (subscriberQuery.empty) {
      // Add new subscriber
      await addSubscriberToMailerLite({
        email,
        fields: {
          signup_source: userData.source || 'app',
          signup_date: new Date().toISOString(),
          user_status: userData.status || 'free',
          ddas_completed: userData.ddasCompleted || false,
          last_activity: userData.lastActivity?.toISOString() || new Date().toISOString()
        }
      });
    } else {
      // Update existing subscriber
      await updateSubscriberInMailerLite(email, {
        user_status: userData.status || 'free',
        ddas_completed: userData.ddasCompleted || false,
        last_activity: userData.lastActivity?.toISOString() || new Date().toISOString()
      });
    }

  } catch (error) {
    console.error("Error syncing user to marketing:", error);
    // Don't throw - this is a background operation
  }
}

/**
 * MailerLite API Functions
 */
async function addSubscriberToMailerLite(subscriber: MailerLiteSubscriber): Promise<MailerLiteResponse> {
  try {
    const response = await fetch(`${MAILERLITE_API_BASE}/subscribers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailerLiteApiKey.value()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: subscriber.email,
        name: subscriber.name,
        fields: subscriber.fields,
        groups: [MAILERLITE_GROUP_ID],
        status: 'active'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, subscriber: data.data };
    } else {
      const error = await response.json();
      return { success: false, error: error.message || 'MailerLite API error' };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateSubscriberInMailerLite(email: string, fields: any): Promise<MailerLiteResponse> {
  try {
    const response = await fetch(`${MAILERLITE_API_BASE}/subscribers/${email}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${mailerLiteApiKey.value()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ fields })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, subscriber: data.data };
    } else {
      const error = await response.json();
      return { success: false, error: error.message || 'MailerLite API error' };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function unsubscribeFromMailerLite(email: string): Promise<MailerLiteResponse> {
  try {
    const response = await fetch(`${MAILERLITE_API_BASE}/subscribers/${email}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${mailerLiteApiKey.value()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ status: 'unsubscribed' })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, error: error.message || 'MailerLite API error' };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Marketing Segments Configuration
 */
export const MARKETING_SEGMENTS = {
  // Users who signed up but never completed DDAS
  INCOMPLETE_ASSESSMENT: 'incomplete_ddas',

  // Users who completed DDAS but didn't subscribe
  ASSESSMENT_COMPLETED: 'ddas_completed_no_subscription',

  // Users who were premium but churned
  CHURNED_USERS: 'churned_premium',

  // Users showing high engagement but no subscription
  ENGAGED_FREE_USERS: 'engaged_free',

  // Users who haven't been active recently
  INACTIVE_USERS: 'inactive_free'
} as const;

/**
 * Marketing Campaign Ideas for Each Segment:
 *
 * INCOMPLETE_ASSESSMENT:
 * - "Complete Your Digital Wellness Assessment" reminder sequence
 * - Benefits of understanding your digital habits
 *
 * ASSESSMENT_COMPLETED:
 * - "Unlock Your Full Potential" premium upgrade sequence
 * - Success stories from premium users
 * - Limited-time discount offers
 *
 * CHURNED_USERS:
 * - Win-back campaigns with special offers
 * - "What's new since you left" feature updates
 * - Feedback requests to improve service
 *
 * ENGAGED_FREE_USERS:
 * - Exclusive content previews
 * - Community invitations
 * - Upgrade incentives based on usage
 *
 * INACTIVE_USERS:
 * - Re-engagement campaigns
 * - New feature announcements
 * - Digital wellness tips and content
 */