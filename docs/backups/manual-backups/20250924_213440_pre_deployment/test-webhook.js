// Test script to send a webhook to our local emulator
// Run with: node test-webhook.js

const crypto = require('crypto');

async function testWebhook() {
  const webhookSecret = 'whsec_3MjBJVyb2L4u0SEjggMpILrFro5mXbrq';
  const endpointSecret = webhookSecret.replace('whsec_', '');

  // Create a test event payload
  const payload = JSON.stringify({
    "id": "evt_test_webhook",
    "object": "event",
    "api_version": "2020-08-27",
    "created": Math.floor(Date.now() / 1000),
    "type": "customer.subscription.created",
    "data": {
      "object": {
        "id": "sub_test_123",
        "object": "subscription",
        "customer": "cus_T6WmMvBcGadbux",
        "status": "active",
        "current_period_start": Math.floor(Date.now() / 1000),
        "current_period_end": Math.floor(Date.now() / 1000) + 2592000, // 30 days
        "items": {
          "data": [{
            "price": {
              "id": "price_1234567890",
              "unit_amount": 2000,
              "currency": "usd"
            }
          }]
        }
      }
    }
  });

  // Generate timestamp and signature
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;

  // Create signature using the endpoint secret
  const signature = crypto
    .createHmac('sha256', endpointSecret)
    .update(signedPayload)
    .digest('hex');

  const stripeSignature = `t=${timestamp},v1=${signature}`;

  console.log('🔍 Testing webhook with:');
  console.log('Timestamp:', timestamp);
  console.log('Payload length:', payload.length);
  console.log('Signature:', stripeSignature);

  try {
    const response = await fetch('http://127.0.0.1:5001/dopair/us-central1/stripeWebhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': stripeSignature
      },
      body: payload
    });

    const responseText = await response.text();

    console.log('\n📊 Response:');
    console.log('Status:', response.status);
    console.log('Body:', responseText);

    if (response.ok) {
      console.log('✅ Webhook processed successfully!');
    } else {
      console.log('❌ Webhook failed');
    }

  } catch (error) {
    console.error('❌ Error sending webhook:', error);
  }
}

testWebhook();