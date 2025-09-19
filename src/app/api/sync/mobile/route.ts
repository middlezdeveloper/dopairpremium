import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-shared/config';
import { COLLECTIONS, UserProfile } from '@/lib/firebase-shared/collections';
import { getMobileFeaturesForTier } from '@/lib/subscription/tiers';

export async function POST(request: NextRequest) {
  try {
    const { userId, deviceToken, platform } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Get user's subscription from Firestore
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() as UserProfile;
    const subscription = userData.subscription || { tier: 'free', status: 'active' };

    // Get mobile features for user's tier
    const mobileFeatures = getMobileFeaturesForTier(subscription.tier);

    // Optionally save device token for push notifications
    if (deviceToken) {
      // Update user document with device token
      // This would be implemented with proper device token management
    }

    return NextResponse.json({
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        active: subscription.status === 'active',
      },
      features: mobileFeatures,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mobile sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}

// GET endpoint for checking sync status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing userId parameter' },
      { status: 400 }
    );
  }

  try {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() as UserProfile;
    const subscription = userData.subscription || { tier: 'free', status: 'active' };

    return NextResponse.json({
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        active: subscription.status === 'active',
      },
      features: getMobileFeaturesForTier(subscription.tier),
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mobile sync check error:', error);
    return NextResponse.json(
      { error: 'Sync check failed' },
      { status: 500 }
    );
  }
}