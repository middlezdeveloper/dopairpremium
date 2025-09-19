# Dopair Platform - Complete Architecture & Premium Setup
## Multi-Product Ecosystem with Subscription Platform

---

## 🏗️ Overall Platform Architecture

### Current Project Structure
```
/dopair-projects/               # Your Mac root for all Dopair projects
│
├── /dopairquiz/                # EXISTING - Assessment web app
│   ├── src/                    # Quiz application code
│   ├── public/                 # Currently contains marketing HTML
│   └── package.json           
│
├── /dopair/                    # EXISTING - iOS/Android app (Xcode)
│   ├── ios/                    # Native iOS code
│   ├── android/                # Native Android code
│   └── App.tsx                 # React Native code
│
├── /dopairpublic/              # TO CREATE - Marketing website
│   ├── index.html              # Landing page
│   ├── pricing.html            # Pricing page
│   ├── about.html              # About page
│   └── assets/                 # Images, CSS, JS
│
└── /dopairpremium/             # NEW - Subscription platform
    ├── src/                    # Premium web app
    └── package.json            
```

### How They Connect
```
All projects share ONE Firebase Project: "dopair"
├── Authentication (shared across all apps)
├── Firestore Database (unified data)
├── Cloud Functions (shared backend)
└── Multiple Hosting Sites:
    ├── dopair.com → /dopairpublic
    ├── quiz.dopair.com → /dopairquiz  
    ├── app.dopair.com → /dopairpremium
    └── Mobile apps → /dopair (iOS/Android)
```

---

## 📱 Product Ecosystem Overview

### 1. Public Website (`/dopairpublic` - dopair.com)
- **Purpose**: Marketing, SEO, conversions
- **Tech**: Static HTML/CSS/JS
- **Hosting**: Firebase Hosting
- **No auth required**

### 2. Assessment Quiz (`/dopairquiz` - quiz.dopair.com)
- **Purpose**: DDAS assessment, user profiling
- **Tech**: React app (existing)
- **Data**: Saves to Firestore `assessments` collection
- **Auth**: Optional (can take anonymously)

### 3. Mobile App (`/dopair` - iOS/Android apps)
- **Purpose**: On-device blocking, basic features
- **Tech**: React Native (Xcode project)
- **Features**: Free tier functionality
- **Auth**: Required for sync

### 4. Premium Platform (`/dopairpremium` - app.dopair.com)
- **Purpose**: Subscription SaaS, AI coach, recovery program
- **Tech**: Next.js 14
- **Features**: All subscription tiers
- **Auth**: Required

---

## 🔥 Shared Firebase Configuration

### Firebase Project Structure
```javascript
// Shared across ALL projects
const firebaseConfig = {
  apiKey: "same-for-all-projects",
  authDomain: "dopair.firebaseapp.com",
  projectId: "dopair",
  storageBucket: "dopair.appspot.com",
  messagingSenderId: "same-id",
  appId: "different-per-platform" // Web vs iOS vs Android
};
```

### Firestore Collections (Shared Database)
```typescript
firestore/
├── users/                      # Shared user profiles
│   └── {userId}/
│       ├── profile            # Basic info (all apps)
│       ├── subscription       # Premium tiers (premium app)
│       └── deviceTokens       # Push tokens (mobile app)
│
├── assessments/               # From quiz app
│   └── {userId}/
│       └── ddasResults
│
├── conversations/             # Premium app only
│   └── {userId}/
│       └── messages/
│
├── blockingRules/            # Mobile app + premium
│   └── {userId}/
│       └── rules/
│
└── webContent/               # Public site content (optional)
    └── blogPosts/
```

---

## 🎯 User Journey Across Products

```mermaid
graph LR
    A[dopair.com] -->|Take Quiz| B[quiz.dopair.com]
    B -->|Get Results| C{Choose Path}
    C -->|Mobile User| D[Download App]
    C -->|Desktop User| E[app.dopair.com]
    D -->|App Store| F[/dopair Mobile]
    E -->|Sign Up| G[Premium Platform]
    F -->|Upgrade| G
```

### Data Flow Example
```typescript
// 1. User completes quiz at quiz.dopair.com
const quizResults = {
  userId: "anonymous-123", // Can be anonymous
  ddasScores: {...},
  addictionPathway: "impulsive",
  timestamp: Date.now()
};
await db.collection('assessments').add(quizResults);

// 2. User signs up at app.dopair.com
const newUser = {
  email: "user@example.com",
  assessmentId: "anonymous-123" // Links to quiz results
};
const user = await createUser(newUser);

// 3. Premium app reads assessment data
const assessment = await db
  .collection('assessments')
  .doc(user.assessmentId)
  .get();

// 4. Mobile app syncs subscription status
const subscription = await db
  .collection('users')
  .doc(user.uid)
  .get()
  .then(doc => doc.data().subscription);
```

---

## 💼 Dopair Premium - Subscription Platform Details

### Project Overview
**Dopair Premium** (`/dopairpremium`) is the subscription-based recovery platform with multiple tiers:

### Subscription Tiers
```typescript
interface SubscriptionTiers {
  free: {
    price: 0;
    features: ['basic_blocking', 'daily_stats', 'community_forum'];
    limitations: { ai_messages: 0, blocking_apps: 5 };
    availableIn: ['mobile_app', 'premium_platform'];
  };
  
  recovery: {
    price: 39; // per month
    features: ['full_ai_coach', 'personalized_program', 'unlimited_blocking', 
               'screenshot_analysis', 'accountability_partner'];
    limitations: { ai_messages: 'unlimited' };
    availableIn: ['premium_platform', 'mobile_sync'];
  };
  
  alumni: {
    price: 14; // per month
    features: ['maintenance_coach', 'challenge_creator', 'mentor_access', 
               'advanced_blocking', 'lifetime_progress'];
    limitations: { ai_messages: 100 };
    requirement: 'must_complete_recovery_program';
    availableIn: ['premium_platform', 'mobile_sync'];
  };
  
  family: {
    price: 99; // per month
    features: ['everything', 'up_to_5_accounts', 'family_dashboard', 
               'group_challenges', 'parental_controls'];
    limitations: { accounts: 5 };
    availableIn: ['premium_platform', 'mobile_sync'];
  };
}
```

### Technical Stack
```javascript
const premiumTechStack = {
  frontend: "Next.js 14 with TypeScript",
  styling: "Tailwind CSS",
  backend: "Firebase (Firestore, Functions, Auth)",
  payments: "Stripe Subscriptions",
  ai: "OpenAI GPT-4 API",
  deployment: "Vercel",
  analytics: "Mixpanel + Firebase Analytics"
};
```

### Premium App File Structure
```
/dopairpremium/
├── src/
│   ├── app/
│   │   ├── (public)/           # No auth required
│   │   │   ├── page.tsx        # Landing (or redirect to dopair.com)
│   │   │   └── login/          # Auth flow
│   │   │
│   │   ├── (dashboard)/        # Auth required
│   │   │   ├── layout.tsx      # Dashboard layout
│   │   │   ├── page.tsx        # Main dashboard
│   │   │   ├── coach/          # AI coach (tier-gated)
│   │   │   ├── blocking/       # Advanced blocking
│   │   │   ├── challenges/     # Challenges (alumni+)
│   │   │   ├── family/         # Family dashboard
│   │   │   └── settings/       # Account & billing
│   │   │
│   │   └── api/
│   │       ├── stripe/         # Payment handling
│   │       ├── coach/          # AI endpoints
│   │       └── sync/           # Mobile app sync
│   │
│   ├── components/
│   │   ├── features/           # Feature components
│   │   ├── guards/             # Access control
│   │   └── ui/                 # Shared UI
│   │
│   ├── lib/
│   │   ├── subscription/       # Tier logic
│   │   ├── firebase-shared/   # Shared Firebase config
│   │   └── ai/                 # Coach logic
│   │
│   └── hooks/
│       ├── useSubscription.ts
│       ├── useAssessment.ts   # Read quiz data
│       └── useMobileSync.ts   # Sync with mobile app
│
├── .env.local
├── package.json
└── README.md
```

---

## 🔄 Cross-Product Integration

### How Premium Platform Integrates with Other Products

#### 1. Reading Quiz Data
```typescript
// In /dopairpremium
export async function getUserAssessment(userId: string) {
  // Check if user has linked assessment
  const user = await db.collection('users').doc(userId).get();
  const assessmentId = user.data()?.assessmentId;
  
  if (assessmentId) {
    // Read from shared Firestore
    const assessment = await db
      .collection('assessments')
      .doc(assessmentId)
      .get();
    
    return assessment.data();
  }
  
  // Prompt to take quiz
  return { needsAssessment: true, quizUrl: 'https://quiz.dopair.com' };
}
```

#### 2. Syncing with Mobile App
```typescript
// In /dopairpremium - API endpoint for mobile sync
export async function POST(request: Request) {
  const { userId, deviceToken, platform } = await request.json();
  
  // Get user's subscription from premium platform
  const subscription = await getUserSubscription(userId);
  
  // Return features available in mobile app
  return Response.json({
    tier: subscription.tier,
    mobileFeatures: getMobileFeaturesForTier(subscription.tier),
    blockingLimit: subscription.tier === 'free' ? 5 : 'unlimited',
    hasAICoach: ['recovery', 'family'].includes(subscription.tier)
  });
}
```

#### 3. Shared Authentication
```typescript
// Same Firebase Auth across all products
import { getAuth } from 'firebase/auth';

// In /dopairquiz
const auth = getAuth(firebaseApp);
const user = await signInAnonymously(auth); // Optional auth

// In /dopairpremium  
const auth = getAuth(firebaseApp);
const user = await signInWithEmail(auth, email, password); // Required

// In /dopair (mobile)
const auth = getAuth(firebaseApp);
const user = await signInWithApple(); // Mobile sign-in
```

---

## 🚀 Development & Deployment

### Local Development Setup
```bash
# Terminal 1: Run quiz app
cd /dopairquiz
npm run dev # Port 3000

# Terminal 2: Run premium platform
cd /dopairpremium
npm run dev # Port 3001

# Terminal 3: Run mobile app
cd /dopair
npx react-native run-ios

# Terminal 4: Firebase emulators (shared)
firebase emulators:start
```

### Deployment Strategy
```bash
# Deploy public website
cd /dopairpublic
firebase deploy --only hosting:dopair-public

# Deploy quiz app
cd /dopairquiz
npm run build
firebase deploy --only hosting:dopair-quiz

# Deploy premium platform
cd /dopairpremium
vercel deploy --prod # or firebase deploy

# Deploy mobile app
cd /dopair
# Use Xcode/Android Studio for app store deployment
```

---

## 🔐 Environment Variables

### For Premium Platform (`/dopairpremium/.env.local`)
```bash
# Firebase (shared config)
NEXT_PUBLIC_FIREBASE_API_KEY=same-across-all-projects
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dopair.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dopair
NEXT_PUBLIC_FIREBASE_APP_ID=web-app-specific-id

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Stripe Price IDs
STRIPE_RECOVERY_PRICE_ID=price_recovery
STRIPE_ALUMNI_PRICE_ID=price_alumni
STRIPE_FAMILY_PRICE_ID=price_family

# OpenAI
OPENAI_API_KEY=sk-xxx

# URLs
NEXT_PUBLIC_APP_URL=https://app.dopair.com
NEXT_PUBLIC_QUIZ_URL=https://quiz.dopair.com
NEXT_PUBLIC_MARKETING_URL=https://dopair.com
```

---

## 📋 Implementation Checklist

### Phase 1: Organize Existing Projects
- [ ] Move marketing HTML from `/dopairquiz` to new `/dopairpublic`
- [ ] Clean up `/dopairquiz` to be assessment-only
- [ ] Document `/dopair` mobile app features
- [ ] Set up shared Firebase config file

### Phase 2: Build Premium Platform
- [ ] Create `/dopairpremium` with Next.js 14
- [ ] Implement subscription tiers with Stripe
- [ ] Build AI coach with tier-based access
- [ ] Connect to existing assessment data
- [ ] Add mobile app sync endpoints

### Phase 3: Integration Testing
- [ ] Test user flow: Marketing → Quiz → Premium signup
- [ ] Verify subscription sync with mobile app
- [ ] Ensure assessment data flows to premium platform
- [ ] Test tier upgrades/downgrades

---

## 🎯 Claude Code Implementation Prompt

```
I'm building the Dopair Premium subscription platform that integrates with our existing ecosystem. Read 'dopair-subscription-setup.md' for complete architecture.

Context about existing projects:
- /dopairquiz: React assessment app (quiz.dopair.com) 
- /dopair: React Native mobile app (iOS/Android)
- /dopairpublic: Static marketing site (dopair.com)
- All share one Firebase project with ID "dopair"

Build the premium platform (/dopairpremium) with:
1. Multi-tier subscriptions (Free, Recovery $39, Alumni $14, Family $99)
2. Integration with existing quiz assessment data from Firestore
3. AI coach that reads user's DDAS results from assessments collection
4. Subscription status that syncs with mobile app
5. Shared Firebase auth across all products

Key requirements:
- Must read existing assessment data from 'assessments' collection
- Subscription status must be readable by mobile app
- Use same Firebase project (project ID: "dopair")
- Alumni tier requires 8+ weeks in recovery program
- Feature flags control access based on subscription tier

Start with the subscription system and Firebase integration. The AI coach should personalize based on existing DDAS assessment data.
```

---

## Key Architecture Decisions

1. **Separate Projects, Shared Firebase**: Each product has its own codebase but shares data
2. **Premium Platform is Web-Only**: Mobile app remains free/basic tier with sync
3. **Assessment Data is Foundational**: Quiz results drive personalization everywhere
4. **Subscription is Source of Truth**: Premium platform manages billing, other apps read status
5. **Feature Flags in Each App**: Each product implements its own tier-based access

This architecture gives you maximum flexibility while maintaining data consistency across your entire ecosystem.