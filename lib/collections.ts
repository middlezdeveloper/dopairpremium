// Basic collections and types for Firebase functions
export const COLLECTIONS = {
  USERS: "users",
  SUBSCRIPTIONS: "subscriptions",
  USAGE: "usage",
  EVENTS: "events"
};

export enum UserStatus {
  FREE = "free",
  PREMIUM = "premium",
  PAST_DUE = "past_due",
  GRACE_PERIOD = "grace_period",
  SUSPENDED = "suspended"
}

export enum PaymentStatus {
  ACTIVE = "active",
  PAST_DUE = "past_due",
  CANCELED = "canceled",
  UNPAID = "unpaid"
}

export interface UserProfile {
  uid: string;
  email: string;
  status: UserStatus;
  paymentStatus?: PaymentStatus;
  approvalType?: string;
  isApproved?: boolean;
  subscription?: {
    tier: string;
    subscriptionId?: string;
    customerId?: string;
    currentPeriodStart?: number;
    currentPeriodEnd?: number;
  };
  createdAt?: any;
  updatedAt?: any;
}

export const ACCESS_LEVELS = {
  FREE: "free",
  PREMIUM: "premium"
};