# Freemium Paywall

## Overview

Free tier with natural limits. Pro ($5/mo via Stripe) unlocks unlimited usage. No watermarks, no injected ads, no shame mechanics — just a clean scaling limit.

## Tiers

| | Free | Pro ($5/mo) |
|---|---|---|
| Overlay profiles | 1 | Unlimited |
| Cards per profile | 3 | Unlimited |
| All card types | Yes | Yes |
| All integrations | Yes | Yes |
| All tools | Yes | Yes |

## Database

Add to `users` table:

```sql
ALTER TABLE users ADD COLUMN plan text NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN stripe_customer_id text;
```

## Limit Enforcement

### Server-side

- `PUT /api/profiles/[id]` — when adding items, check if user is free and item count would exceed 3. Return 403 with `{ error: 'Upgrade to Pro to add more than 3 cards', limit: true }`.
- `POST /api/profiles` — when creating a profile, check if user is free and already has 1 profile. Return 403 with `{ error: 'Upgrade to Pro for more profiles', limit: true }`.

### Client-side

- **Add to Profile modal** — if free user has 3 cards in the target profile, show upgrade prompt instead of adding.
- **Dashboard** — if free user tries to create a second profile, show upgrade prompt instead of the create input.

## Upgrade Prompt

When a user hits a limit, show an inline upgrade message in context (not a modal). Something like:

> "You've reached the free plan limit of 3 cards. **Upgrade to Pro** for unlimited cards and profiles — $5/mo."

With a button that initiates Stripe Checkout.

## Payment — Stripe

### Checkout

1. User clicks upgrade button
2. `POST /api/stripe/checkout` creates a Stripe Checkout Session for the $5/mo subscription, with the user's ID in metadata
3. Redirects to Stripe Checkout
4. On success, redirects to `/settings?upgraded=true`

### Webhook

`POST /api/stripe/webhook` handles:
- `checkout.session.completed` — set `plan` to `'pro'`, store `stripe_customer_id`
- `customer.subscription.deleted` — set `plan` back to `'free'`
- `invoice.payment_failed` — keep pro until Stripe actually cancels the subscription

### Customer Portal

`POST /api/stripe/portal` creates a Stripe Customer Portal session for managing subscription. Linked from settings page.

## UI Changes

### Settings page

Add a "Plan" section:
- **Free users**: Current plan badge + "Upgrade to Pro — $5/mo" button + feature comparison
- **Pro users**: "Pro" badge + "Manage subscription" link to Stripe Customer Portal

### Nav

- **Pro users**: Small "PRO" badge next to their username in the nav

### Dashboard

- Free user with 1 profile: hide the "create new profile" input, show a subtle "Upgrade for more profiles" link
- Profile card count: show "3/3 cards" indicator for free users approaching the limit

### Add to Profile modal

- If the target profile already has 3 cards and user is free: replace the add button with the upgrade prompt

## Files to Create

1. `src/app/api/stripe/checkout/route.ts` — create Checkout session
2. `src/app/api/stripe/webhook/route.ts` — handle Stripe events
3. `src/app/api/stripe/portal/route.ts` — create Customer Portal session
4. `src/lib/plans.ts` — shared plan constants (limits, feature flags)

## Files to Modify

1. `src/lib/db/schema.ts` — add `plan` and `stripe_customer_id` to users
2. `src/app/api/profiles/route.ts` — enforce 1 profile limit for free
3. `src/app/api/profiles/[id]/route.ts` — enforce 3 card limit for free
4. `src/app/(app)/settings/page.tsx` — add plan section
5. `src/app/(app)/dashboard/page.tsx` — add limit indicators and upgrade prompts
6. `src/components/add-to-profile-modal.tsx` — check limit before adding
7. `src/components/nav.tsx` — add PRO badge

## Environment Variables

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_... (the $5/mo subscription price ID)
NEXT_PUBLIC_BASE_URL=http://localhost:3000 (for redirect URLs)
```
