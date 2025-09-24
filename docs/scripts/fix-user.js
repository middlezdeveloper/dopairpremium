// Quick script to fix gmiddlez@gmail.com user status
// Run with: node fix-user.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  // You'll need to add your service account key here
  // Or use the Firebase CLI authentication
};

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'dopair'
});

async function fixUser() {
  try {
    const db = admin.firestore();

    // Find user by email
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

    // Update user status
    await userDoc.ref.update({
      status: 'premium',
      paymentStatus: 'active',
      approvalType: 'stripe',
      isApproved: true, // Legacy compatibility
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update Firebase Custom Claims
    await admin.auth().setCustomUserClaims(userId, {
      status: 'premium',
      subscriptionTier: 'premium'
    });

    console.log('✅ User updated successfully!');
    console.log('🎉 Status: free → premium');
    console.log('🎉 Approval: pending → stripe');
    console.log('🎉 Custom claims updated');

    // Verify the update
    const updatedDoc = await userDoc.ref.get();
    const updatedData = updatedDoc.data();

    console.log('\n📋 Verification:');
    console.log('Status:', updatedData.status);
    console.log('Payment Status:', updatedData.paymentStatus);
    console.log('Approval Type:', updatedData.approvalType);
    console.log('Is Approved:', updatedData.isApproved);

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

fixUser();