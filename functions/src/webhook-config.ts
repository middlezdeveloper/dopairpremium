/**
 * Stripe Webhook Configuration
 * Contains webhook endpoints, dunning settings, and security configurations
 */

export const WEBHOOK_CONFIG = {
  // Webhook endpoints
  ENDPOINTS: {
    STRIPE_WEBHOOKS: '/stripeWebhooks',
    GRACE_PERIOD_CHECK: '/processGracePeriodExpirations'
  },

  // Dunning timeline configuration (in days)
  DUNNING: {
    SILENT_RETRY: 0,      // Day 0: Stripe Smart Retries handle this automatically
    GENTLE_REMINDER: 1,   // Day 1: Send gentle reminder email
    URGENT_REMINDER: 3,   // Day 3: Send urgent reminder with warning
    FINAL_NOTICE: 7,      // Day 7: Final notice and enter grace period
    GRACE_PERIOD_DAYS: 7, // 7 days grace period with limited access (20 messages/day)
    MAX_RETRY_ATTEMPTS: 3 // Maximum email retry attempts
  },

  // Access levels during payment issues
  ACCESS_RESTRICTIONS: {
    PAST_DUE: {
      chatAccess: false,
      premiumContent: false,
      ddasAccess: true,
      dailyMessageLimit: 0
    },
    GRACE_PERIOD: {
      chatAccess: true,
      premiumContent: false,
      ddasAccess: true,
      dailyMessageLimit: 20
    },
    SUSPENDED: {
      chatAccess: false,
      premiumContent: false,
      ddasAccess: true,
      dailyMessageLimit: 0
    }
  },

  // Security settings
  SECURITY: {
    WEBHOOK_TIMEOUT_MS: 30000,        // 30 seconds timeout for webhook processing
    SIGNATURE_TOLERANCE: 300,         // 5 minutes tolerance for webhook signatures
    RATE_LIMIT_WINDOW_MS: 60000,      // 1 minute rate limit window
    RATE_LIMIT_MAX_REQUESTS: 100,     // Max 100 requests per minute
    IDEMPOTENCY_TTL_HOURS: 24         // Keep processed events for 24 hours
  },

  // Email configuration
  EMAIL: {
    FROM_EMAIL: 'noreply@dopair.app',
    FROM_NAME: 'Dopair Premium',
    REPLY_TO: 'support@dopair.app',
    RETRY_DELAY_MS: 300000,           // 5 minutes between retries
    MAX_RETRY_ATTEMPTS: 3,
    BATCH_SIZE: 10                    // Process 10 failed emails at a time
  },

  // Stripe event types to handle
  HANDLED_EVENTS: [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.created'
  ] as const,

  // Logging configuration
  LOGGING: {
    LOG_WEBHOOK_PAYLOAD: false,       // Set to true for debugging (sensitive data)
    LOG_EMAIL_CONTENT: false,         // Set to true for debugging (PII)
    RETENTION_DAYS: 90,               // Keep logs for 90 days
    LOG_LEVEL: 'info'                 // 'debug', 'info', 'warn', 'error'
  }
} as const;

/**
 * Environment-specific configurations
 */
export const ENV_CONFIG = {
  development: {
    ...WEBHOOK_CONFIG,
    LOGGING: {
      ...WEBHOOK_CONFIG.LOGGING,
      LOG_WEBHOOK_PAYLOAD: true,
      LOG_EMAIL_CONTENT: true,
      LOG_LEVEL: 'debug'
    }
  },

  staging: {
    ...WEBHOOK_CONFIG,
    LOGGING: {
      ...WEBHOOK_CONFIG.LOGGING,
      LOG_LEVEL: 'info'
    }
  },

  production: {
    ...WEBHOOK_CONFIG,
    SECURITY: {
      ...WEBHOOK_CONFIG.SECURITY,
      RATE_LIMIT_MAX_REQUESTS: 200,    // Higher limits for production
      SIGNATURE_TOLERANCE: 300         // Strict tolerance in production
    }
  }
};

/**
 * Get configuration for current environment
 */
export function getWebhookConfig() {
  const env = process.env.NODE_ENV || 'development';
  return ENV_CONFIG[env as keyof typeof ENV_CONFIG] || ENV_CONFIG.development;
}

/**
 * Webhook event type definitions
 */
export type WebhookEventType = typeof WEBHOOK_CONFIG.HANDLED_EVENTS[number];

/**
 * Email template priority levels
 */
export const EMAIL_PRIORITY = {
  LOW: 1,      // Welcome emails, confirmations
  NORMAL: 2,   // Regular notifications
  HIGH: 3,     // Payment issues, urgent matters
  CRITICAL: 4  // Account suspension, final notices
} as const;

/**
 * Webhook processing status
 */
export const WEBHOOK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying'
} as const;

/**
 * Error codes for webhook processing
 */
export const WEBHOOK_ERROR_CODES = {
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PAYMENT_PROCESSOR_ERROR: 'PAYMENT_PROCESSOR_ERROR',
  EMAIL_DELIVERY_FAILED: 'EMAIL_DELIVERY_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN'
} as const;