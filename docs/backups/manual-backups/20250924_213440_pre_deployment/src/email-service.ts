import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { EmailTemplate } from "./stripe-webhooks";

// Re-export EmailTemplate for other modules
export { EmailTemplate } from "./stripe-webhooks";

// Email service configuration
const emailApiKey = defineSecret("SENDGRID_API_KEY");
const fromEmail = "noreply@dopair.app";
const fromName = "Dopair Premium";

// Email template data interface
interface EmailTemplateData {
  userName?: string;
  subscriptionId?: string;
  invoiceId?: string;
  amount?: string;
  currency?: string;
  daysSinceFailure?: number;
  gracePeriodEndDate?: string;
  [key: string]: any;
}

/**
 * Send payment notification email using SendGrid or alternative service
 * This is a placeholder implementation - you can replace with your preferred email service
 */
export async function sendPaymentNotificationEmail(
  to: string,
  template: EmailTemplate,
  data: EmailTemplateData
): Promise<void> {
  try {
    console.log(`Sending email to ${to} with template ${template}`);

    // Get email content based on template
    const emailContent = getEmailContent(template, data);

    // For now, we'll log the email content and create a notification record
    // Replace this with actual email service integration
    await logEmailNotification(to, template, emailContent, data);

    // TODO: Integrate with SendGrid, AWS SES, or other email service
    // Example SendGrid integration:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(emailApiKey.value());

    const msg = {
      to,
      from: { email: fromEmail, name: fromName },
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    };

    await sgMail.send(msg);
    */

    console.log(`Email logged for ${to} with template ${template}`);

  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    // Don't throw error to prevent webhook from failing
    // Store failed email for retry
    await logFailedEmail(to, template, error.message, data);
  }
}

/**
 * Get email content based on template type
 */
function getEmailContent(template: EmailTemplate, data: EmailTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const userName = data.userName || "there";

  switch (template) {
    case 'payment_failed_gentle':
      return {
        subject: "Payment Update - Dopair Premium",
        html: generatePaymentFailedGentleHTML(data),
        text: `Hi ${userName},

We wanted to let you know that we had trouble processing your recent payment for Dopair Premium.

Don't worry - your account is still active and we'll automatically retry the payment. You can also update your payment method in your account settings.

If you have any questions, please don't hesitate to reach out to our support team.

Best regards,
The Dopair Team`
      };

    case 'payment_failed_urgent':
      return {
        subject: "Action Required - Payment Issue with Dopair Premium",
        html: generatePaymentFailedUrgentHTML(data),
        text: `Hi ${userName},

We've been unable to process your payment for Dopair Premium (Day ${data.daysSinceFailure} of ${data.daysSinceFailure === 1 ? '1 attempt' : data.daysSinceFailure + ' attempts'}).

Your account is currently at risk of being restricted. Please update your payment method as soon as possible to avoid any service interruption.

Amount due: ${data.currency} ${data.amount}
Invoice: ${data.invoiceId}

Update your payment method: [Account Settings Link]

If you have any questions, please contact our support team immediately.

Best regards,
The Dopair Team`
      };

    case 'payment_failed_final':
      return {
        subject: "Final Notice - Dopair Premium Payment Required",
        html: generatePaymentFailedFinalHTML(data),
        text: `Hi ${userName},

This is our final notice regarding your unpaid Dopair Premium subscription.

Your account will enter a grace period with limited access (20 messages per day) until ${data.gracePeriodEndDate}. After this date, your account will be suspended.

Amount due: ${data.currency} ${data.amount}
Invoice: ${data.invoiceId}
Grace period ends: ${data.gracePeriodEndDate}

URGENT: Please update your payment method immediately to restore full access.

If you need assistance, our support team is here to help.

Best regards,
The Dopair Team`
      };

    case 'grace_period_started':
      return {
        subject: "Grace Period Active - Dopair Premium",
        html: generateGracePeriodHTML(data),
        text: `Hi ${userName},

Your Dopair Premium account is now in a grace period due to payment issues.

During this grace period (until ${data.gracePeriodEndDate}):
- You have limited access (20 messages per day)
- Premium features are restricted
- DDAS assessment remains available

To restore full access, please update your payment method in your account settings.

Best regards,
The Dopair Team`
      };

    case 'account_suspended':
      return {
        subject: "Account Suspended - Dopair Premium",
        html: generateAccountSuspendedHTML(data),
        text: `Hi ${userName},

Your Dopair Premium account has been suspended due to unpaid invoices.

Your account now has:
- No access to premium chat features
- Basic DDAS assessment still available
- No premium content access

To reactivate your account, please update your payment method and contact our support team.

We're here to help you get back on track with your wellness journey.

Best regards,
The Dopair Team`
      };

    case 'payment_succeeded':
      return {
        subject: "Payment Successful - Welcome Back!",
        html: generatePaymentSuccessHTML(data),
        text: `Hi ${userName},

Great news! Your payment has been processed successfully and your Dopair Premium account has been fully restored.

Payment details:
- Amount: ${data.currency} ${data.amount}
- Invoice: ${data.invoiceId}

You now have full access to all premium features. Thank you for your continued trust in Dopair.

Best regards,
The Dopair Team`
      };

    case 'subscription_created':
      return {
        subject: "Welcome to Dopair Premium!",
        html: generateSubscriptionCreatedHTML(data),
        text: `Hi ${userName},

Welcome to Dopair Premium! Your subscription has been activated and you now have access to all premium features.

Your subscription includes:
- Unlimited premium coach conversations
- Advanced wellness content
- Priority support

Start exploring your premium features in the app today!

Best regards,
The Dopair Team`
      };

    case 'subscription_cancelled':
      return {
        subject: "Subscription Cancelled - Dopair Premium",
        html: generateSubscriptionCancelledHTML(data),
        text: `Hi ${userName},

Your Dopair Premium subscription has been cancelled as requested.

You'll continue to have access to premium features until the end of your current billing period. After that, your account will revert to the free tier.

We're sorry to see you go! If you change your mind, you can resubscribe anytime in your account settings.

Best regards,
The Dopair Team`
      };

    default:
      return {
        subject: "Dopair Premium Notification",
        html: `<p>Hi ${userName},</p><p>This is a notification from Dopair Premium.</p>`,
        text: `Hi ${userName}, This is a notification from Dopair Premium.`
      };
  }
}

/**
 * HTML template generators
 */
function generatePaymentFailedGentleHTML(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Update</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Update</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName || 'there'},</p>

      <p>We wanted to let you know that we had trouble processing your recent payment for Dopair Premium.</p>

      <p><strong>Don't worry</strong> - your account is still active and we'll automatically retry the payment. You can also update your payment method in your account settings if needed.</p>

      <a href="#" class="button">Update Payment Method</a>

      <p>If you have any questions, please don't hesitate to reach out to our support team.</p>

      <p>Best regards,<br>The Dopair Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Dopair Premium.</p>
    </div>
  </div>
</body>
</html>`;
}

function generatePaymentFailedUrgentHTML(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Action Required - Payment Issue</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f39c12; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .button { display: inline-block; background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Action Required</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName || 'there'},</p>

      <div class="warning">
        <strong>Payment Issue - Day ${data.daysSinceFailure}</strong><br>
        We've been unable to process your payment for Dopair Premium. Your account is at risk of being restricted.
      </div>

      <p><strong>Payment Details:</strong></p>
      <ul>
        <li>Amount due: ${data.currency} ${data.amount}</li>
        <li>Invoice: ${data.invoiceId}</li>
        <li>Attempts: ${data.daysSinceFailure}</li>
      </ul>

      <p>Please update your payment method as soon as possible to avoid service interruption.</p>

      <a href="#" class="button">Update Payment Method Now</a>

      <p>If you have any questions, please contact our support team immediately.</p>

      <p>Best regards,<br>The Dopair Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Dopair Premium.</p>
    </div>
  </div>
</body>
</html>`;
}

function generatePaymentFailedFinalHTML(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Final Notice - Payment Required</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .urgent { background: #ffebee; border: 2px solid #e74c3c; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center; }
    .button { display: inline-block; background: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Final Notice</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName || 'there'},</p>

      <div class="urgent">
        <h2>FINAL NOTICE</h2>
        <p>Your account will enter grace period with limited access</p>
        <p><strong>Grace period ends: ${data.gracePeriodEndDate}</strong></p>
      </div>

      <p><strong>What this means:</strong></p>
      <ul>
        <li>Limited access: 20 messages per day</li>
        <li>Restricted premium features</li>
        <li>Account suspension after grace period</li>
      </ul>

      <p><strong>Payment Details:</strong></p>
      <ul>
        <li>Amount due: ${data.currency} ${data.amount}</li>
        <li>Invoice: ${data.invoiceId}</li>
      </ul>

      <div style="text-align: center;">
        <a href="#" class="button">UPDATE PAYMENT METHOD NOW</a>
      </div>

      <p>If you need assistance, our support team is here to help.</p>

      <p>Best regards,<br>The Dopair Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Dopair Premium.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateGracePeriodHTML(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Grace Period Active</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f39c12; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .info { background: #e8f4fd; border: 1px solid #bee5eb; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .button { display: inline-block; background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Grace Period Active</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName || 'there'},</p>

      <div class="info">
        <p><strong>Your account is now in grace period until ${data.gracePeriodEndDate}</strong></p>
      </div>

      <p><strong>Current limitations:</strong></p>
      <ul>
        <li>Limited to 20 messages per day</li>
        <li>Premium features restricted</li>
        <li>DDAS assessment remains available</li>
      </ul>

      <p>To restore full access, please update your payment method.</p>

      <a href="#" class="button">Restore Full Access</a>

      <p>Best regards,<br>The Dopair Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Dopair Premium.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateAccountSuspendedHTML(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Suspended</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6c757d; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .suspended { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center; }
    .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Suspended</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName || 'there'},</p>

      <div class="suspended">
        <h3>Your account has been suspended</h3>
        <p>Due to unpaid invoices</p>
      </div>

      <p><strong>Current access:</strong></p>
      <ul>
        <li>❌ No premium chat features</li>
        <li>✅ Basic DDAS assessment available</li>
        <li>❌ No premium content access</li>
      </ul>

      <p>To reactivate your account, please update your payment method and contact our support team.</p>

      <a href="#" class="button">Reactivate Account</a>

      <p>We're here to help you get back on track with your wellness journey.</p>

      <p>Best regards,<br>The Dopair Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Dopair Premium.</p>
    </div>
  </div>
</body>
</html>`;
}

function generatePaymentSuccessHTML(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Successful</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #28a745; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Payment Successful</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName || 'there'},</p>

      <div class="success">
        <h3>Welcome back!</h3>
        <p>Your payment has been processed and full access restored</p>
      </div>

      <p><strong>Payment details:</strong></p>
      <ul>
        <li>Amount: ${data.currency} ${data.amount}</li>
        <li>Invoice: ${data.invoiceId}</li>
      </ul>

      <p>You now have full access to all premium features. Thank you for your continued trust in Dopair.</p>

      <a href="#" class="button">Continue Your Journey</a>

      <p>Best regards,<br>The Dopair Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Dopair Premium.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateSubscriptionCreatedHTML(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Dopair Premium</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .welcome { background: #e8f5e8; border: 1px solid #d4edda; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center; }
    .features { background: white; padding: 20px; border-radius: 4px; margin: 20px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Dopair Premium!</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName || 'there'},</p>

      <div class="welcome">
        <h2>Your subscription is now active!</h2>
        <p>Subscription ID: ${data.subscriptionId}</p>
      </div>

      <div class="features">
        <h3>Your premium features include:</h3>
        <ul>
          <li>✅ Unlimited premium coach conversations</li>
          <li>✅ Advanced wellness content</li>
          <li>✅ Priority support</li>
          <li>✅ Comprehensive DDAS assessments</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="#" class="button">Start Exploring Premium Features</a>
      </div>

      <p>Thank you for choosing Dopair Premium. We're excited to support your wellness journey!</p>

      <p>Best regards,<br>The Dopair Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Dopair Premium.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateSubscriptionCancelledHTML(data: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Subscription Cancelled</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6c757d; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .info { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Subscription Cancelled</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName || 'there'},</p>

      <div class="info">
        <p><strong>Your Dopair Premium subscription has been cancelled.</strong></p>
        <p>Subscription ID: ${data.subscriptionId}</p>
      </div>

      <p>You'll continue to have access to premium features until the end of your current billing period. After that, your account will revert to the free tier.</p>

      <p>We're sorry to see you go! If you change your mind, you can resubscribe anytime.</p>

      <a href="#" class="button">Resubscribe</a>

      <p>Thank you for being part of the Dopair community.</p>

      <p>Best regards,<br>The Dopair Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Dopair Premium.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Log email notification to Firestore for tracking
 */
async function logEmailNotification(
  to: string,
  template: EmailTemplate,
  content: { subject: string; html: string; text: string },
  data: EmailTemplateData
): Promise<void> {
  await admin.firestore().collection('email_notifications').add({
    to,
    template,
    subject: content.subject,
    templateData: data,
    status: 'sent', // In production, this would be 'sent' after successful delivery
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Log failed email for retry
 */
async function logFailedEmail(
  to: string,
  template: EmailTemplate,
  error: string,
  data: EmailTemplateData
): Promise<void> {
  await admin.firestore().collection('failed_emails').add({
    to,
    template,
    templateData: data,
    error,
    status: 'failed',
    retryCount: 0,
    failedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Function to retry failed emails (can be called via scheduled function)
 */
export async function retryFailedEmails(): Promise<void> {
  const failedEmailsQuery = await admin.firestore()
    .collection('failed_emails')
    .where('status', '==', 'failed')
    .where('retryCount', '<', 3) // Max 3 retries
    .limit(10) // Process in batches
    .get();

  for (const doc of failedEmailsQuery.docs) {
    const emailData = doc.data();
    try {
      await sendPaymentNotificationEmail(
        emailData.to,
        emailData.template,
        emailData.templateData
      );

      // Mark as sent
      await doc.ref.update({
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        retryCount: admin.firestore.FieldValue.increment(1)
      });

    } catch (error) {
      // Increment retry count
      await doc.ref.update({
        retryCount: admin.firestore.FieldValue.increment(1),
        lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
        lastError: error.message
      });
    }
  }
}