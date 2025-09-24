import * as fs from 'fs';
import * as path from 'path';

/**
 * Email template types for DopairPremium dunning and subscription emails
 */
export enum EmailType {
  PAYMENT_FAILED_DAY1 = 'payment-failed-day1',
  PAYMENT_FAILED_DAY3 = 'payment-failed-day3',
  PAYMENT_FAILED_DAY7 = 'payment-failed-day7',
  GRACE_PERIOD_WARNING = 'grace-period-warning',
  ACCOUNT_SUSPENDED = 'account-suspended',
  PAYMENT_SUCCESS = 'payment-success',
  SUBSCRIPTION_WELCOME = 'subscription-welcome',
  SUBSCRIPTION_CANCELLED = 'subscription-cancelled'
}

/**
 * Subject line templates for different email types
 */
export const EMAIL_SUBJECTS: Record<EmailType, string> = {
  [EmailType.PAYMENT_FAILED_DAY1]: '{{userName}}, quick payment update needed',
  [EmailType.PAYMENT_FAILED_DAY3]: 'Action needed: Update your payment method',
  [EmailType.PAYMENT_FAILED_DAY7]: 'Final notice: Continue your wellness journey',
  [EmailType.GRACE_PERIOD_WARNING]: 'Limited access active - {{daysRemaining}} days to restore',
  [EmailType.ACCOUNT_SUSPENDED]: 'Account suspended - Easy recovery available',
  [EmailType.PAYMENT_SUCCESS]: 'Welcome back! Payment successful',
  [EmailType.SUBSCRIPTION_WELCOME]: 'Welcome to DopairPremium! Your journey begins',
  [EmailType.SUBSCRIPTION_CANCELLED]: 'Subscription cancelled - We\'ll miss you'
};

/**
 * A/B test subject line variations for optimization
 */
export const AB_TEST_SUBJECTS: Partial<Record<EmailType, string[]>> = {
  [EmailType.PAYMENT_FAILED_DAY1]: [
    '{{userName}}, quick payment update needed',
    'Payment hiccup - let\'s fix this together',
    'Your wellness journey continues (payment update needed)'
  ],
  [EmailType.PAYMENT_FAILED_DAY3]: [
    'Action needed: Update your payment method',
    '{{userName}}, let\'s resolve your payment issue',
    'Keep your wellness momentum going'
  ],
  [EmailType.PAYMENT_FAILED_DAY7]: [
    'Final notice: Continue your wellness journey',
    'Don\'t lose your progress - update payment',
    '{{userName}}, we don\'t want to lose you'
  ]
};

/**
 * User data interface for email personalization
 */
export interface UserEmailData {
  // Basic user info
  userName: string;
  userEmail: string;
  userId: string;

  // Subscription data
  subscriptionId?: string;
  planType?: string;
  subscriptionAmount?: string;
  subscriptionStartDate?: string;
  nextBillingDate?: string;
  lastBillingDate?: string;
  accessExpiryDate?: string;

  // Payment data
  paymentDate?: string;
  paymentAmount?: string;
  paymentMethod?: string;
  transactionId?: string;
  refundStatus?: string;
  cancellationDate?: string;
  cancellationId?: string;

  // Wellness progress data
  totalDays?: number;
  daysSinceJoined?: number;
  totalSessions?: number;
  sessionsCompleted?: number;
  completedSessions?: number;
  totalInsights?: number;
  insights?: number;
  streakDays?: number;
  currentStreak?: number;
  goalsAchieved?: number;
  habitsFormed?: number;
  habits?: number;
  achievements?: number;

  // Timeline data
  currentDate?: string;
  nextAttemptDate?: string;
  graceStartDate?: string;
  suspensionDate?: string;
  daysRemaining?: number;

  // URL placeholders
  updatePaymentUrl?: string;
  supportUrl?: string;
  faqUrl?: string;
  emergencyContactUrl?: string;
  supportChatUrl?: string;
  dashboardUrl?: string;
  newGoalUrl?: string;
  onboardingUrl?: string;
  exploreUrl?: string;
  helpCenterUrl?: string;
  communityUrl?: string;
  billingUrl?: string;
  preferencesUrl?: string;
  unsubscribeUrl?: string;
  cancelSubscriptionUrl?: string;
  downloadDataUrl?: string;
  privacyUrl?: string;
  reactivateUrl?: string;
  feedbackUrl?: string;
  blogUrl?: string;
  newsletterUrl?: string;
  freeToolsUrl?: string;
  guidesUrl?: string;
}

/**
 * Email rendering options
 */
export interface EmailOptions {
  enableABTest?: boolean;
  abTestVariant?: 'A' | 'B' | 'C';
  personalizeSubject?: boolean;
  includePreheader?: boolean;
}

/**
 * Email template renderer class
 */
export class EmailTemplateRenderer {
  private templateCache: Map<string, string> = new Map();
  private templateDir: string;

  constructor(templateDirectory?: string) {
    this.templateDir = templateDirectory || path.join(__dirname, '.');
  }

  /**
   * Load HTML template from file system
   */
  private loadTemplate(templateType: EmailType): string {
    const cacheKey = templateType;

    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    const templatePath = path.join(this.templateDir, `${templateType}.html`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Email template not found: ${templatePath}`);
    }

    const template = fs.readFileSync(templatePath, 'utf-8');
    this.templateCache.set(cacheKey, template);

    return template;
  }

  /**
   * Replace template variables with user data
   */
  private interpolateTemplate(template: string, userData: UserEmailData): string {
    let interpolated = template;

    // Replace all {{variable}} placeholders with user data
    Object.entries(userData).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const replacementValue = value !== undefined ? String(value) : '';
      interpolated = interpolated.replace(placeholder, replacementValue);
    });

    // Handle any remaining placeholders with default values
    interpolated = this.handleDefaultValues(interpolated);

    return interpolated;
  }

  /**
   * Handle default values for common placeholders
   */
  private handleDefaultValues(template: string): string {
    const defaults: Record<string, string> = {
      'userName': 'there',
      'totalDays': '0',
      'sessionsCompleted': '0',
      'totalSessions': '0',
      'completedSessions': '0',
      'goalsAchieved': '0',
      'habitsFormed': '0',
      'streakDays': '0',
      'currentStreak': '0',
      'insights': '0',
      'totalInsights': '0',
      'achievements': '0',
      'habits': '0',
      'daysRemaining': '7',
      'updatePaymentUrl': '#update-payment',
      'supportUrl': 'mailto:support@dopairpremium.com',
      'dashboardUrl': '#dashboard',
      'preferencesUrl': '#preferences',
      'unsubscribeUrl': '#unsubscribe'
    };

    let result = template;

    Object.entries(defaults).forEach(([key, defaultValue]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, defaultValue);
    });

    return result;
  }

  /**
   * Generate subject line for email
   */
  generateSubject(
    emailType: EmailType,
    userData: UserEmailData,
    options: EmailOptions = {}
  ): string {
    let subject: string;

    // Handle A/B testing
    if (options.enableABTest && AB_TEST_SUBJECTS[emailType]) {
      const variants = AB_TEST_SUBJECTS[emailType]!;
      const variantIndex = options.abTestVariant === 'B' ? 1 :
                          options.abTestVariant === 'C' ? 2 : 0;
      subject = variants[Math.min(variantIndex, variants.length - 1)];
    } else {
      subject = EMAIL_SUBJECTS[emailType];
    }

    // Personalize subject if enabled
    if (options.personalizeSubject !== false) {
      subject = this.interpolateTemplate(subject, userData);
    }

    return subject;
  }

  /**
   * Render complete email template
   */
  renderEmail(
    emailType: EmailType,
    userData: UserEmailData,
    options: EmailOptions = {}
  ): { subject: string; html: string; preheader?: string } {
    const template = this.loadTemplate(emailType);
    const html = this.interpolateTemplate(template, userData);
    const subject = this.generateSubject(emailType, userData, options);

    const result: { subject: string; html: string; preheader?: string } = {
      subject,
      html
    };

    // Add preheader text for better email client display
    if (options.includePreheader !== false) {
      result.preheader = this.generatePreheader(emailType, userData);
    }

    return result;
  }

  /**
   * Generate preheader text for email
   */
  private generatePreheader(emailType: EmailType, userData: UserEmailData): string {
    const preheaders: Record<EmailType, string> = {
      [EmailType.PAYMENT_FAILED_DAY1]: 'Quick payment update needed - your wellness data is safe',
      [EmailType.PAYMENT_FAILED_DAY3]: 'Let\'s get your payment sorted to continue your journey',
      [EmailType.PAYMENT_FAILED_DAY7]: 'Final chance to continue your wellness progress',
      [EmailType.GRACE_PERIOD_WARNING]: 'Limited access active - easy restoration available',
      [EmailType.ACCOUNT_SUSPENDED]: 'Premium features suspended - instant recovery options',
      [EmailType.PAYMENT_SUCCESS]: 'All premium features restored - welcome back!',
      [EmailType.SUBSCRIPTION_WELCOME]: 'Your wellness journey begins now - explore premium features',
      [EmailType.SUBSCRIPTION_CANCELLED]: 'Subscription cancelled - your data is safe and we\'ll miss you'
    };

    return this.interpolateTemplate(preheaders[emailType], userData);
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

/**
 * Email sending integration interface
 */
export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string, options?: any): Promise<boolean>;
}

/**
 * Email service for sending dunning and subscription emails
 */
export class EmailService {
  private renderer: EmailTemplateRenderer;
  private provider: EmailProvider;

  constructor(provider: EmailProvider, templateDirectory?: string) {
    this.provider = provider;
    this.renderer = new EmailTemplateRenderer(templateDirectory);
  }

  /**
   * Send dunning email based on failure attempt count
   */
  async sendDunningEmail(
    userData: UserEmailData,
    attemptCount: number,
    options: EmailOptions = {}
  ): Promise<boolean> {
    let emailType: EmailType;

    switch (attemptCount) {
      case 1:
        emailType = EmailType.PAYMENT_FAILED_DAY1;
        break;
      case 2:
        emailType = EmailType.PAYMENT_FAILED_DAY3;
        break;
      case 3:
        emailType = EmailType.PAYMENT_FAILED_DAY7;
        break;
      default:
        emailType = EmailType.GRACE_PERIOD_WARNING;
    }

    return this.sendEmail(emailType, userData, options);
  }

  /**
   * Send any email type
   */
  async sendEmail(
    emailType: EmailType,
    userData: UserEmailData,
    options: EmailOptions = {}
  ): Promise<boolean> {
    try {
      const { subject, html } = this.renderer.renderEmail(emailType, userData, options);

      return await this.provider.sendEmail(
        userData.userEmail,
        subject,
        html,
        {
          userId: userData.userId,
          emailType,
          abTestVariant: options.abTestVariant
        }
      );
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Batch send emails (useful for testing different variants)
   */
  async batchSendEmails(
    emailConfigs: Array<{
      emailType: EmailType;
      userData: UserEmailData;
      options?: EmailOptions;
    }>
  ): Promise<Array<{ success: boolean; emailType: EmailType; userEmail: string }>> {
    const results = await Promise.allSettled(
      emailConfigs.map(config =>
        this.sendEmail(config.emailType, config.userData, config.options)
          .then(success => ({
            success,
            emailType: config.emailType,
            userEmail: config.userData.userEmail
          }))
      )
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          emailType: emailConfigs[index].emailType,
          userEmail: emailConfigs[index].userData.userEmail
        };
      }
    });
  }

  /**
   * Preview email without sending (useful for testing)
   */
  previewEmail(
    emailType: EmailType,
    userData: UserEmailData,
    options: EmailOptions = {}
  ): { subject: string; html: string; preheader?: string } {
    return this.renderer.renderEmail(emailType, userData, options);
  }
}

/**
 * A/B test configuration for email optimization
 */
export interface ABTestConfig {
  enabled: boolean;
  testName: string;
  variants: Array<{
    name: string;
    weight: number; // Percentage of users to receive this variant
    options: EmailOptions;
  }>;
}

/**
 * A/B testing utility for email optimization
 */
export class EmailABTester {
  private activeTests: Map<EmailType, ABTestConfig> = new Map();

  /**
   * Configure A/B test for an email type
   */
  configureTest(emailType: EmailType, config: ABTestConfig): void {
    this.activeTests.set(emailType, config);
  }

  /**
   * Get variant for user based on A/B test configuration
   */
  getVariantForUser(emailType: EmailType, userId: string): EmailOptions {
    const test = this.activeTests.get(emailType);

    if (!test || !test.enabled) {
      return {};
    }

    // Simple hash-based assignment for consistent variant selection
    const hash = this.hashUserId(userId);
    const totalWeight = test.variants.reduce((sum, variant) => sum + variant.weight, 0);
    const normalizedHash = hash % totalWeight;

    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (normalizedHash < cumulativeWeight) {
        return {
          ...variant.options,
          enableABTest: true,
          abTestVariant: variant.name as 'A' | 'B' | 'C'
        };
      }
    }

    return test.variants[0].options;
  }

  /**
   * Simple hash function for consistent user assignment
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Remove A/B test configuration
   */
  removeTest(emailType: EmailType): void {
    this.activeTests.delete(emailType);
  }

  /**
   * Get all active tests
   */
  getActiveTests(): Map<EmailType, ABTestConfig> {
    return new Map(this.activeTests);
  }
}

/**
 * Utility functions for email template development
 */
export class EmailUtils {
  /**
   * Validate email template for common issues
   */
  static validateTemplate(html: string): Array<{ type: 'warning' | 'error'; message: string }> {
    const issues: Array<{ type: 'warning' | 'error'; message: string }> = [];

    // Check for unresolved placeholders
    const unresolvedPlaceholders = html.match(/{{[^}]+}}/g);
    if (unresolvedPlaceholders) {
      issues.push({
        type: 'warning',
        message: `Unresolved placeholders: ${unresolvedPlaceholders.join(', ')}`
      });
    }

    // Check for missing alt tags on images
    const imagesWithoutAlt = html.match(/<img(?![^>]*alt=)[^>]*>/g);
    if (imagesWithoutAlt) {
      issues.push({
        type: 'warning',
        message: `${imagesWithoutAlt.length} images missing alt attributes`
      });
    }

    // Check for inline styles (recommended for email)
    const hasExternalStyles = html.includes('<link') || html.includes('@import');
    if (hasExternalStyles) {
      issues.push({
        type: 'warning',
        message: 'External stylesheets detected - use inline styles for better email client support'
      });
    }

    return issues;
  }

  /**
   * Generate test data for email previews
   */
  static generateTestUserData(overrides: Partial<UserEmailData> = {}): UserEmailData {
    return {
      userName: 'Alex Chen',
      userEmail: 'alex@example.com',
      userId: 'user_12345',
      subscriptionId: 'sub_67890',
      planType: 'Monthly',
      subscriptionAmount: '$19.99',
      subscriptionStartDate: 'January 15, 2025',
      nextBillingDate: 'February 15, 2025',
      lastBillingDate: 'January 15, 2025',
      paymentDate: 'January 15, 2025',
      paymentAmount: '$19.99',
      paymentMethod: '•••• 4242',
      transactionId: 'txn_abcdef123456',
      totalDays: 45,
      daysSinceJoined: 45,
      totalSessions: 28,
      sessionsCompleted: 28,
      completedSessions: 28,
      totalInsights: 15,
      insights: 15,
      streakDays: 7,
      currentStreak: 7,
      goalsAchieved: 3,
      habitsFormed: 5,
      habits: 5,
      achievements: 8,
      currentDate: 'January 22, 2025',
      nextAttemptDate: 'January 26, 2025',
      graceStartDate: 'January 23, 2025',
      suspensionDate: 'January 30, 2025',
      daysRemaining: 5,
      updatePaymentUrl: 'https://app.dopairpremium.com/billing/update',
      supportUrl: 'https://help.dopairpremium.com/contact',
      dashboardUrl: 'https://app.dopairpremium.com/dashboard',
      ...overrides
    };
  }

  /**
   * Extract plain text version from HTML email
   */
  static htmlToPlainText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate email size for delivery optimization
   */
  static calculateEmailSize(html: string): { bytes: number; sizeCategory: 'small' | 'medium' | 'large' } {
    const bytes = new Blob([html]).size;

    let sizeCategory: 'small' | 'medium' | 'large';
    if (bytes < 15000) {
      sizeCategory = 'small';
    } else if (bytes < 100000) {
      sizeCategory = 'medium';
    } else {
      sizeCategory = 'large';
    }

    return { bytes, sizeCategory };
  }
}

// Export default instance for convenience
export const emailService = (provider: EmailProvider, templateDirectory?: string) =>
  new EmailService(provider, templateDirectory);

export const emailRenderer = (templateDirectory?: string) =>
  new EmailTemplateRenderer(templateDirectory);

export const emailABTester = new EmailABTester();