// Check Stripe customer status and sync with Firebase
// This simulates what the webhook should have done

const admin = require('firebase-admin');
const Stripe = require('stripe');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'dopair'
});

// Initialize Stripe (you'll need to set your secret key)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_live_your_key_here');

async function checkStripeCustomer() {
  try {
    const customerId = 'cus_T5tUG4qw2bheX3';

    console.log('🔍 Checking Stripe customer:', customerId);

    // Get customer from Stripe
    const customer = await stripe.customers.retrieve(customerId);
    console.log('📧 Customer email:', customer.email);

    // Get subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10
    });

    console.log('\n📋 Subscriptions found:', subscriptions.data.length);

    subscriptions.data.forEach((sub, index) => {
      console.log(`\n--- Subscription ${index + 1} ---`);
      console.log('ID:', sub.id);
      console.log('Status:', sub.status);
      console.log('Created:', new Date(sub.created * 1000).toLocaleDateString());
      console.log('Current period end:', new Date(sub.current_period_end * 1000).toLocaleDateString());
      console.log('Cancel at period end:', sub.cancel_at_period_end);

      if (sub.items?.data?.length > 0) {
        console.log('Price ID:', sub.items.data[0].price.id);
        console.log('Amount:', sub.items.data[0].price.unit_amount / 100, sub.items.data[0].price.currency.toUpperCase());
      }
    });

    // Find active subscription
    const activeSubscription = subscriptions.data.find(sub =>
      ['active', 'trialing'].includes(sub.status)
    );

    if (activeSubscription) {
      console.log('\n✅ ACTIVE SUBSCRIPTION FOUND!');
      console.log('Subscription ID:', activeSubscription.id);
      console.log('Status:', activeSubscription.status);

      // This is what the webhook should update in Firebase:
      console.log('\n🔄 What Firebase should be updated to:');
      console.log('status: "premium"');
      console.log('paymentStatus: "active"');
      console.log('approvalType: "stripe"');
      console.log('isApproved: true');
      console.log('subscription.tier: "premium"');
      console.log('subscription.subscriptionId:', activeSubscription.id);

    } else {
      console.log('\n❌ NO ACTIVE SUBSCRIPTION FOUND');
      console.log('Available statuses:', subscriptions.data.map(s => s.status).join(', '));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkStripeCustomer();