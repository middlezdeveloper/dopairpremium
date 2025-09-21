'use client';

import { User } from 'firebase/auth';

// Base API configuration
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://us-central1-dopair.cloudfunctions.net'
  : 'http://localhost:5001/dopair/us-central1';

/**
 * Secure API client for Stripe billing operations
 * All requests require authenticated Firebase user token
 */
export class BillingAPI {
  private static async makeAuthenticatedRequest(
    endpoint: string,
    user: User,
    options: RequestInit = {}
  ) {
    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE}/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get user's complete billing information
   * Includes subscription details, payment methods, billing history
   */
  static async getBillingInfo(user: User): Promise<BillingInfo> {
    return this.makeAuthenticatedRequest('getBillingInfo', user);
  }

  /**
   * Get billing history with invoices
   */
  static async getBillingHistory(user: User, limit = 12): Promise<BillingHistory> {
    return this.makeAuthenticatedRequest(`getBillingHistory?limit=${limit}`, user);
  }

  /**
   * Pause subscription for specified duration
   */
  static async pauseSubscription(user: User, pauseDuration: '1month'): Promise<PauseResult> {
    return this.makeAuthenticatedRequest('pauseSubscription', user, {
      method: 'POST',
      body: JSON.stringify({ pauseDuration }),
    });
  }

  /**
   * Cancel subscription with optional reason
   */
  static async cancelSubscription(user: User, reason?: string): Promise<CancelResult> {
    return this.makeAuthenticatedRequest('cancelSubscription', user, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Update payment method - redirects to Stripe-hosted page
   */
  static async getPaymentMethodUpdateURL(user: User): Promise<{ url: string }> {
    return this.makeAuthenticatedRequest('getPaymentMethodUpdateURL', user, {
      method: 'POST',
    });
  }

  /**
   * Download invoice PDF
   */
  static async downloadInvoice(user: User, invoiceId: string): Promise<{ downloadUrl: string }> {
    return this.makeAuthenticatedRequest('downloadInvoice', user, {
      method: 'POST',
      body: JSON.stringify({ invoiceId }),
    });
  }

  /**
   * Resume paused subscription
   */
  static async resumeSubscription(user: User): Promise<ResumeResult> {
    return this.makeAuthenticatedRequest('resumeSubscription', user, {
      method: 'POST',
    });
  }
}

// Type definitions for API responses
export interface BillingInfo {
  subscription: {
    id: string;
    status: 'active' | 'past_due' | 'canceled' | 'paused';
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    pauseCollection?: {
      behavior: 'keep_as_draft' | 'mark_uncollectible' | 'void';
      resumesAt: string;
    };
    items: Array<{
      id: string;
      price: {
        id: string;
        unitAmount: number;
        currency: string;
        recurring: {
          interval: 'month' | 'year';
        };
      };
    }>;
  };
  customer: {
    id: string;
    email: string;
    defaultPaymentMethod?: {
      id: string;
      type: 'card';
      card: {
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
      };
    };
  };
  upcomingInvoice?: {
    id: string;
    amountDue: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
  };
}

export interface BillingHistory {
  invoices: Array<{
    id: string;
    number: string;
    status: 'paid' | 'open' | 'void' | 'uncollectible';
    amountPaid: number;
    amountDue: number;
    currency: string;
    created: string;
    dueDate?: string;
    hostedInvoiceUrl: string;
    invoicePdf: string;
    description?: string;
  }>;
  hasMore: boolean;
}

export interface PauseResult {
  success: boolean;
  subscription: {
    id: string;
    status: string;
    pauseCollection: {
      behavior: string;
      resumesAt: string;
    };
  };
  message: string;
}

export interface CancelResult {
  success: boolean;
  subscription: {
    id: string;
    status: string;
    canceledAt: string;
    currentPeriodEnd: string;
  };
  message: string;
}

export interface ResumeResult {
  success: boolean;
  subscription: {
    id: string;
    status: string;
  };
  message: string;
}

// Error types
export class BillingAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'BillingAPIError';
  }
}