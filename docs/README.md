# Dopair Premium Platform

The subscription-based recovery platform for the Dopair ecosystem.

## Overview

Dopair Premium is a Next.js 14 application that provides subscription-based recovery services with multi-tier access, AI coaching, and integration with the broader Dopair ecosystem.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase and Stripe keys

# Run development server
npm run dev
```

## Project Structure

```
src/
├── app/                    # Next.js 14 App Router
│   ├── (public)/          # Public routes (no auth)
│   ├── (dashboard)/       # Protected dashboard routes
│   └── api/              # API routes
├── components/           # React components
│   ├── features/        # Feature-specific components
│   ├── guards/          # Access control components
│   └── ui/              # Shared UI components
├── lib/                 # Utilities and configurations
│   ├── subscription/    # Subscription tier logic
│   ├── firebase-shared/ # Shared Firebase config
│   └── ai/              # AI coach logic
└── hooks/               # Custom React hooks

docs/                    # Documentation
resources/              # Static assets
```

## Subscription Tiers

- **Free**: Basic blocking, daily stats ($0/month)
- **Recovery**: Full AI coach, unlimited blocking ($39/month)
- **Alumni**: Maintenance coach, challenge creator ($14/month)
- **Family**: Everything + up to 5 accounts ($99/month)

## Integration

This platform integrates with:
- **Quiz App** (`quiz.dopair.com`): Reads DDAS assessment data
- **Mobile App**: Syncs subscription status and features
- **Marketing Site** (`dopair.com`): User acquisition funnel

All products share the same Firebase project with ID `dopair`.

## Documentation

See `docs/architecture/` for detailed system architecture and integration patterns.