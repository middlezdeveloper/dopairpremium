import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
const cors = require('cors');
import { COLLECTIONS } from '../lib/collections';

// Define secrets
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

// Initialize Stripe (will be initialized in handler)
let stripe: Stripe | null = null;

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
 * Create Stripe checkout session for subscription
 */
export const createCheckoutSession = onRequest({
  secrets: [stripeSecretKey],
}, async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // Initialize Stripe
      if (!stripe) {
        const secretValue = stripeSecretKey.value();
        console.log('Initializing Stripe with secret key length:', secretValue?.length);

        if (!secretValue || secretValue.trim().length === 0) {
          throw new Error('Stripe secret key is empty or invalid');
        }

        stripe = new Stripe(secretValue.trim(), {
          apiVersion: "2023-10-16",
        });
      }

      const { priceId, mode = 'subscription', publicCheckout = false } = req.body;

      // For public checkout, we don't require authentication
      let user = null;
      let stripeCustomerId = null;

      if (!publicCheckout) {
        // Verify authentication for authenticated checkouts
        user = await verifyAuthentication(req);
        if (!user) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
        // Get or create Stripe customer for authenticated users
        stripeCustomerId = await getOrCreateStripeCustomer(user.uid, user.email || '');
      }

      if (!priceId) {
        res.status(400).json({ error: "Price ID is required" });
        return;
      }

      // Create checkout session
      console.log('Creating checkout session', publicCheckout ? '(public)' : `for user: ${user?.uid}`, 'with price:', priceId);

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: stripeCustomerId,
        mode: mode as 'subscription' | 'payment',
        payment_method_types: ['card', 'link'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        success_url: `${process.env.NODE_ENV === 'production' ? (publicCheckout ? 'https://dopair.app' : 'https://premium.dopair.app') : 'http://localhost:3001'}${publicCheckout ? '/checkout/success' : '/account'}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NODE_ENV === 'production' ? (publicCheckout ? 'https://dopair.app' : 'https://premium.dopair.app') : 'http://localhost:3001'}${publicCheckout ? '/checkout' : '/test-checkout'}`,
        metadata: {
          userId: user?.uid || 'public',
          userEmail: user?.email || '',
          publicCheckout: publicCheckout.toString(),
        },
        subscription_data: mode === 'subscription' ? {
          metadata: {
            userId: user?.uid || 'public',
            userEmail: user?.email || '',
            publicCheckout: publicCheckout.toString(),
          },
        } : undefined,
      };

      console.log('Session params created, calling Stripe API...');
      console.log('allow_promotion_codes:', sessionParams.allow_promotion_codes);
      const session = await stripe.checkout.sessions.create(sessionParams);
      console.log('Checkout session created successfully:', session.id);
      console.log('Session allow_promotion_codes:', session.allow_promotion_codes);
      console.log('Session object keys:', Object.keys(session));
      console.log('Session client_secret:', session.client_secret);

      // For embedded checkout, retrieve the session to get client_secret
      let clientSecret = session.client_secret;
      if (!clientSecret && sessionParams.ui_mode === 'embedded') {
        console.log('Retrieving session to get client_secret for embedded mode');
        const retrievedSession = await stripe.checkout.sessions.retrieve(session.id);
        console.log('Retrieved session client_secret:', retrievedSession.client_secret);
        clientSecret = retrievedSession.client_secret;
      }

      res.json({
        sessionId: session.id,
        url: session.url,
        clientSecret: clientSecret,
      });

    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });
});

/**
 * Helper function to verify Firebase authentication
 */
async function verifyAuthentication(req: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const idToken = authHeader.split("Bearer ")[1];
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error("Authentication verification failed:", error);
    return null;
  }
}

/**
 * Helper function to get or create Stripe customer
 */
async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const userDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(userId).get();
  const userData = userDoc.data();

  // Check if user already has a Stripe customer ID
  if (userData?.subscription?.stripeCustomerId) {
    return userData.subscription.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe!.customers.create({
    email: email,
    metadata: {
      userId: userId,
    },
  });

  // Save customer ID to user document
  await admin.firestore().collection(COLLECTIONS.USERS).doc(userId).update({
    'subscription.stripeCustomerId': customer.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return customer.id;
}