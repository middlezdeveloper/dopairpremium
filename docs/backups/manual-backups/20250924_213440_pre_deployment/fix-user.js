// Quick script to fix gmiddlez@gmail.com user status
// Run from functions directory: node fix-user.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (using existing functions setup)
if (!admin.apps.length) {
  admin.initializeApp();
}

async function fixUser() {
  try {
    const db = admin.firestore();

    // Find user by email
    console.log('🔍 Looking for user: gmiddlez@gmail.com');
    const usersQuery = await db.collection('users')
      .where('email', '==', 'gmiddlez@gmail.com')
      .limit(1)
      .get();

    if (usersQuery.empty) {
      console.log('❌ User not found!');
      return;
    }

    const userDoc = usersQuery.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    console.log('📧 Found user:', userData.email);
    console.log('📊 Current status:', userData.status || 'free');
    console.log('🔐 Current approval:', userData.approvalType || 'pending');
    console.log('👤 User ID:', userId);

    // Update user status
    console.log('\n🔄 Updating user status...');
    await userDoc.ref.update({
      status: 'premium',
      paymentStatus: 'active',
      approvalType: 'stripe',
      isApproved: true, // Legacy compatibility
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update Firebase Custom Claims
    console.log('🔄 Updating custom claims...');
    await admin.auth().setCustomUserClaims(userId, {
      status: 'premium',
      subscriptionTier: 'premium'
    });

    console.log('\n✅ User updated successfully!');
    console.log('🎉 Status: free → premium');
    console.log('🎉 Approval: pending → stripe');
    console.log('🎉 Custom claims updated');

    // Verify the update
    console.log('\n📋 Verification:');
    const updatedDoc = await userDoc.ref.get();
    const updatedData = updatedDoc.data();

    console.log('Status:', updatedData.status);
    console.log('Payment Status:', updatedData.paymentStatus);
    console.log('Approval Type:', updatedData.approvalType);
    console.log('Is Approved:', updatedData.isApproved);

    console.log('\n🚀 User should now have premium access!');
    console.log('👉 Tell them to refresh their account page');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

fixUser();