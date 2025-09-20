# Dopair Premium Platform Sitemap

## Overview

This sitemap documents the complete URL structure, access levels, authentication requirements, and user flows for the Dopair Premium platform. The platform is built with Next.js 14 using the App Router and Firebase authentication.

---

## 🗂️ Complete URL Structure

### Public Pages (No Authentication Required)

#### Landing & Marketing
- **`/`** - Homepage
  - **Purpose**: Marketing landing page with platform overview
  - **Access**: Public (no authentication)
  - **Key Features**:
    - Platform introduction and value proposition
    - Links to DDAS assessment (external quiz.dopair.com)
    - Auth-aware navigation (Login/Signup or Dashboard)
    - Feature highlights and CTA sections
  - **Navigation**: Links to Login, Signup, Dashboard (if authenticated)

#### Authentication Flow
- **`/login`** - User Sign In
  - **Purpose**: User authentication portal
  - **Access**: Public
  - **Features**:
    - Email/password login
    - Social auth (Google, Microsoft, Apple, Facebook)
    - Password reset functionality
    - Redirects to `/dashboard` on success
  - **User Flow**: Login → Dashboard (if approved) | Approval Queue (if pending)

- **`/signup`** - User Registration
  - **Purpose**: New user account creation
  - **Access**: Public
  - **Features**:
    - Email/password registration
    - Social auth signup options
    - Terms and privacy policy notice
    - **Admin approval required** notice
  - **User Flow**: Signup → Success message → Approval wait → Login when approved

### Protected Pages (Authentication + Approval Required)

#### Dashboard Section (Route Group: `(dashboard)`)
**Layout Protection**: `SubscriptionGuard` component wraps all dashboard routes
**Authentication Required**: Yes
**Approval Required**: Yes

- **`/dashboard`** - Main Dashboard (alias for `/(dashboard)`)
  - **Purpose**: Central hub and user overview
  - **Access**: Authenticated + Approved users
  - **Subscription**: Free tier and above
  - **Features**:
    - Welcome card with subscription status
    - Dashboard stats and analytics
    - Quick actions based on user tier
    - Recent activity feed
    - Assessment status and recommendations

#### AI Coach Section
- **`/coach`** - AI Coach Interface (alias for `/(dashboard)/coach`)
  - **Purpose**: Main AI coaching conversation interface
  - **Access**: Authenticated + Approved + **Subscription Required**
  - **Subscription**: Recovery, Alumni, or Family tier
  - **Features**:
    - Personalized AI coach (Dr. Chen, Luna, Marcus based on DDAS scores)
    - Unlimited conversations (Recovery/Family) or limited (Alumni: 100/month)
    - Assessment integration for personalization
    - Crisis support information
    - Usage tips and guidance
  - **AI Personas**:
    - **Dr. Chen**: Evidence-based, clinical approach (default)
    - **Luna**: Gentle, supportive for high anxiety users
    - **Marcus**: Structured, practical for low self-control users

- **`/coach/test`** - Coach Testing Interface
  - **Purpose**: Development/testing endpoint for AI coach
  - **Access**: Authenticated + Approved
  - **Note**: Development feature

#### Premium Features (Subscription Gated)
*Note: These routes exist in directory structure but pages not yet implemented*

- **`/blocking`** - App Blocking Management
  - **Purpose**: Configure and manage digital wellness blocking rules
  - **Access**: Authenticated + Approved + Subscription
  - **Subscription Limits**:
    - Free: 5 apps maximum
    - Recovery/Alumni/Family: Unlimited

- **`/challenges`** - Recovery Challenges
  - **Purpose**: Structured recovery programs and challenges
  - **Access**: Authenticated + Approved + Subscription
  - **Features**: Time-based challenges, progress tracking

- **`/family`** - Family Dashboard
  - **Purpose**: Family account management and monitoring
  - **Access**: Family tier subscription only
  - **Features**: Multi-account management, parental controls

- **`/settings`** - Account Settings
  - **Purpose**: User preferences and account management
  - **Access**: Authenticated + Approved

### Admin Section

- **`/admin`** - Admin Portal
  - **Purpose**: User management and platform administration
  - **Access**: **Admin Only** (hardcoded emails: middlezdeveloper@gmail.com, daniel@mzconsulting.com.au)
  - **Features**:
    - User approval queue management
    - User statistics dashboard
    - Approve/reject pending users
    - View all users by status (pending, approved, all)
  - **Security**: Admin email hardcoded in component logic

### Development/Testing Routes

- **`/test`** - General Testing Page
  - **Purpose**: Development testing
  - **Access**: Varies by implementation

- **`/auth-demo`** - Authentication Demo
  - **Purpose**: Auth system demonstration
  - **Access**: Development feature

- **`/auth-test`** - Authentication Testing
  - **Purpose**: Auth system testing
  - **Access**: Development feature

---

## 🔐 Access Control Matrix

### Subscription Tiers

| Tier | Price | AI Messages | App Blocking | Key Features |
|------|-------|-------------|--------------|--------------|
| **Free** | $0 | 0 | 5 apps | DDAS assessment, basic features |
| **Recovery** | $39/month | Unlimited | Unlimited | Full AI coach, complete program |
| **Alumni** | $14/month | 100/month | Unlimited | Maintenance mode, mentor access |
| **Family** | $99/month | Unlimited | Unlimited | 5 family accounts, group features |

### Authentication States

1. **Unauthenticated**
   - Access: Public pages only (`/`, `/login`, `/signup`)
   - Restrictions: Cannot access dashboard or premium features

2. **Authenticated but Pending Approval**
   - Access: Login possible but blocked by SubscriptionGuard
   - Display: "Account Pending Approval" message
   - Action: Must wait for admin approval (1-2 business days)

3. **Authenticated and Approved (Free)**
   - Access: Dashboard, settings, DDAS assessment
   - Restrictions: No AI coach, limited blocking features
   - Upgrade Path: Available to premium tiers

4. **Authenticated with Active Subscription**
   - Access: All features based on subscription tier
   - AI Coach: Access to personalized coaching
   - Premium Content: Tier-specific features

### User Status Hierarchy

```
User Registration → Pending Approval → Approved (Free) → Premium Subscription
                                    ↓
                               Admin Dashboard
                               (approval management)
```

---

## 🔒 Route Protection Mechanisms

### 1. Layout-Level Protection

#### `SubscriptionGuard` Component
- **Applied to**: All `(dashboard)` routes
- **Checks**: Authentication, approval status, subscription status
- **Fallbacks**:
  - Not authenticated → Login redirect
  - Pending approval → Approval notice
  - No subscription (for premium features) → Upgrade prompt

#### Auth State Management
- **Provider**: `AuthProvider` (wraps entire app)
- **Hook**: `useAuth()` provides user state
- **Real-time**: Firebase auth state listener
- **Status Tracking**: Approval and subscription status

### 2. Feature-Level Protection

#### AI Coach Access
- **Component**: `ChatInterface`
- **Requirements**: Active subscription (Recovery, Alumni, or Family)
- **Limits**: Based on subscription tier
- **Grace Period**: Limited access during payment issues

#### Admin Features
- **Check**: Hardcoded admin email addresses
- **Fallback**: Redirect to dashboard if not admin
- **Security**: Server-side verification recommended for production

---

## 🔄 User Flows & Navigation Paths

### New User Journey

```
1. Homepage (/)
   ↓
2. Take DDAS Assessment (external quiz.dopair.com)
   ↓
3. Sign Up (/signup)
   ↓
4. Account Created → Pending Approval
   ↓
5. Admin Approval (/admin)
   ↓
6. Login (/login) → Dashboard (/dashboard)
   ↓
7. Choose Subscription Tier (if desired)
   ↓
8. Access AI Coach (/coach) + Premium Features
```

### Daily User Flow

```
Login (/login)
   ↓
Dashboard (/dashboard) - View progress, stats, quick actions
   ↓
AI Coach (/coach) - Daily check-ins, get guidance
   ↓
Additional Features:
   • App Blocking (/blocking)
   • Challenges (/challenges)
   • Family Management (/family)
   • Settings (/settings)
```

### Admin Workflow

```
Admin Login (/login)
   ↓
Admin Portal (/admin)
   ↓
Review Pending Users → Approve/Reject
   ↓
Monitor User Statistics
   ↓
Manage Platform Health
```

---

## 🌐 External Integrations

### DDAS Assessment Platform
- **URL**: `quiz.dopair.com` (configurable via `NEXT_PUBLIC_QUIZ_URL`)
- **Purpose**: Digital Dopamine Addiction Scale assessment
- **Access**: Public, no authentication required
- **Integration**: Results sync with main platform for AI coach personalization

### Firebase Services
- **Authentication**: User registration, login, social auth
- **Firestore**: User data, conversations, assessments, admin logs
- **Cloud Functions**: Server-side processing, webhooks

### Stripe Integration
- **Subscription Management**: Payment processing and subscription tiers
- **Webhooks**: Payment status updates and subscription changes
- **Customer Portal**: User billing management

---

## 📊 API Endpoints & Backend Routes

*Note: These are in backup folder, suggesting API routes may be moved to separate service*

### Coach Chat API
- **`/api/coach/chat`** - AI conversation processing
- **`/api/coach/test`** - Testing endpoint

### Stripe Integration
- **`/api/stripe/create-subscription`** - Subscription creation
- **`/api/stripe/webhook`** - Payment status webhooks

### Mobile Sync
- **`/api/sync/mobile`** - Mobile app data synchronization

---

## 🎯 Feature Access Summary

### Free Tier Features
- ✅ DDAS Assessment
- ✅ Basic dashboard
- ✅ Community forum access (planned)
- ✅ Basic progress tracking
- ✅ Limited app blocking (5 apps)
- ❌ AI Coach conversations
- ❌ Premium content
- ❌ Advanced blocking features

### Recovery Tier Features ($39/month)
- ✅ All Free tier features
- ✅ **Unlimited AI coach conversations**
- ✅ Personalized recovery program
- ✅ Unlimited app blocking
- ✅ Screenshot analysis (planned)
- ✅ Accountability partner matching (planned)
- ✅ Advanced progress tracking
- ✅ Priority support

### Alumni Tier Features ($14/month)
- ✅ Maintenance AI coach (100 messages/month)
- ✅ Challenge creator tools (planned)
- ✅ Mentor access and matching (planned)
- ✅ Advanced blocking rules
- ✅ Lifetime progress tracking
- ✅ Alumni community access (planned)
- 📋 **Requirement**: Must complete 8+ weeks in Recovery program

### Family Tier Features ($99/month)
- ✅ All Recovery features for 5 accounts
- ✅ Family dashboard and insights (planned)
- ✅ Group challenges and goals (planned)
- ✅ Parental controls and monitoring (planned)
- ✅ Family therapy session booking (planned)
- ✅ Shared accountability tools (planned)

---

## 🚨 Security & Compliance Notes

### Authentication Security
- Firebase Authentication with social providers
- Email verification required
- Password reset functionality
- Admin approval required for all new accounts

### Data Protection
- User conversations stored in Firestore
- Assessment data encrypted
- Admin action logging for audit trails
- GDPR-compliant data handling (implementation needed)

### Payment Security
- Stripe integration for PCI compliance
- Webhook signature verification
- Subscription status real-time updates

---

## 🔄 Planned Features & Future Routes

Based on directory structure and component references:

### Upcoming Pages
- **`/pricing`** - Subscription plans and pricing
- **`/profile`** - User profile management
- **`/community`** - User community features
- **`/resources`** - Educational content library
- **`/accountability`** - Partner matching system

### Mobile App Integration
- API endpoints for mobile sync
- Cross-platform user sessions
- Mobile-specific features and limitations

---

## 📝 Development Notes

### Route Organization
- **Route Groups**: `(dashboard)` and `(public)` for logical organization
- **Duplicate Routes**: Some routes exist in both `/dashboard/` and `/(dashboard)/` - cleanup recommended
- **Layout Inheritance**: Nested layouts provide consistent protection and styling

### Performance Considerations
- Authentication state cached in React context
- Real-time Firestore listeners for live updates
- Subscription status checked on route changes

### Maintenance Tasks
- Consolidate duplicate route structures
- Implement remaining planned features
- Add comprehensive error handling
- Set up proper admin role management (move from hardcoded emails)
- Add rate limiting and abuse prevention
- Implement comprehensive logging and monitoring

---

*Last Updated: September 2024*
*Platform: Next.js 14 with App Router*
*Authentication: Firebase Auth*
*Database: Firestore*
*Payments: Stripe*