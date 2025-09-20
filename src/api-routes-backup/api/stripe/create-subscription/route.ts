import { NextRequest, NextResponse } from 'next/server';
import { createOrGetCustomer, createSubscription, getPriceIdFromTier } from '@/lib/stripe/subscription';
import { auth } from '@/lib/firebase-shared/config';
import { getAuth } from 'firebase-admin/auth';

export async function POST(request: NextRequest) {
  try {
    const { tier, email } = await request.json();

    // Get user from Firebase Auth (you'll need to implement proper auth verification)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, we'll use a placeholder user ID
    // In production, verify the Firebase ID token
    const userId = 'placeholder-user-id';

    if (!tier || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: tier, email' },
        { status: 400 }
      );
    }

    const priceId = getPriceIdFromTier(tier);
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Create or get Stripe customer
    const customerId = await createOrGetCustomer(userId, email);

    // Create subscription
    const subscription = await createSubscription(customerId, priceId, userId);

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}