import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { COLLECTIONS } from '../lib/collections';

// Define secrets
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

// Initialize Stripe
let stripe: Stripe | null = null;

/**
 * Clean checkout session function with proper CORS
 */
export const createCheckoutSession = onRequest({
  secrets: [stripeSecretKey],
}, async (req, res) => {
    console.log('🚀 FUNCTION START - Method:', req.method, 'Origin:', req.headers.origin);

    // Set CORS headers FIRST THING - before any other logic
    const allowedOrigins = [
      'https://dopair.app',
      'https://premium.dopair.app',
      'https://dopair.web.app',
      'https://premium.dopair.web.app',
      'http://localhost:3000',
      'http://localhost:3001'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin || '')) {
      res.set('Access-Control-Allow-Origin', origin);
    }

    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests BEFORE any other logic
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      console.log('❌ Method not allowed:', req.method);
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      console.log('🔄 Processing POST request...');

      // Initialize Stripe
      if (!stripe) {
        const secretValue = stripeSecretKey.value();
        console.log('🔑 Initializing Stripe with key length:', secretValue?.length);

        if (!secretValue || secretValue.trim().length === 0) {
          throw new Error('Stripe secret key is empty or invalid');
        }

        stripe = new Stripe(secretValue.trim(), {
          apiVersion: '2023-10-16',
        });
      }

      const { priceId, mode = 'subscription', publicCheckout = false } = req.body;
      console.log('📝 Request data:', { priceId, mode, publicCheckout });

      // Check if this is a public checkout (no auth required)
      const isPublicCheckout = publicCheckout === true || publicCheckout === 'true';
      console.log('🔍 Is public checkout:', isPublicCheckout);

      let user = null;
      let stripeCustomerId = null;

      if (!isPublicCheckout) {
        console.log('🔒 Verifying authentication...');
        user = await verifyAuthentication(req);
        if (!user) {
          console.log('❌ Authentication failed');
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
        console.log('✅ User authenticated:', user.uid);
        stripeCustomerId = await getOrCreateStripeCustomer(user.uid, user.email || '');
      } else {
        console.log('✅ Public checkout - skipping authentication');
      }

      if (!priceId) {
        console.log('❌ Price ID missing');
        res.status(400).json({ error: 'Price ID is required' });
        return;
      }

      console.log('💳 Creating Stripe checkout session...');

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
        success_url: `${process.env.NODE_ENV === 'production' ? (isPublicCheckout ? 'https://dopair.app' : 'https://premium.dopair.app') : 'http://localhost:3001'}${isPublicCheckout ? '/checkout/success' : '/account'}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NODE_ENV === 'production' ? (isPublicCheckout ? 'https://dopair.app' : 'https://premium.dopair.app') : 'http://localhost:3001'}${isPublicCheckout ? '/checkout' : '/test-checkout'}`,
        metadata: {
          userId: user?.uid || 'public',
          userEmail: user?.email || '',
          publicCheckout: isPublicCheckout.toString(),
        },
        subscription_data: mode === 'subscription' ? {
          metadata: {
            userId: user?.uid || 'public',
            userEmail: user?.email || '',
            publicCheckout: isPublicCheckout.toString(),
          },
        } : undefined,
      };

      const session = await stripe.checkout.sessions.create(sessionParams);
      console.log('✅ Checkout session created:', session.id);

      res.json({
        sessionId: session.id,
        url: session.url,
        clientSecret: session.client_secret,
      });

    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

/**
 * Helper function to verify Firebase authentication
 */
async function verifyAuthentication(req: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const idToken = authHeader.split('Bearer ')[1];
    return await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return null;
  }
}

/**
 * Helper function to get or create Stripe customer
 */
async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const userDoc = await admin.firestore().collection(COLLECTIONS.USERS).doc(userId).get();
  const userData = userDoc.data();

  if (userData?.subscription?.stripeCustomerId) {
    return userData.subscription.stripeCustomerId;
  }

  const customer = await stripe!.customers.create({
    email: email,
    metadata: {
      userId: userId,
    },
  });

  await admin.firestore().collection(COLLECTIONS.USERS).doc(userId).update({
    'subscription.stripeCustomerId': customer.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return customer.id;
}