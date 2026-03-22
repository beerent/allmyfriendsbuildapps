# Watermark Freemium Monetization

## Overview

Everything is free with no limits. Pro ($5/mo) removes a small thosewho.stream watermark from overlay cards on the live stream. The watermark only appears on the OBS overlay output, not in the app UI.

## Model

- **Free**: All features unlocked. All cards, integrations, profiles, tools. A small thosewho.stream logo watermark appears on every card in the live overlay.
- **Pro ($5/mo)**: Identical features. No watermark on overlay cards.

## Database

Add `plan` text column to `users` table. Default `'free'`. Values: `'free'` or `'pro'`.

Add `stripe_customer_id` text column to `users` table for linking Stripe customer.

```sql
ALTER TABLE users ADD COLUMN plan text NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN stripe_customer_id text;
```

## Watermark

- The thosewho.stream stacked-cards logo icon
- Rendered at ~30% opacity in the bottom-right corner of each overlay card
- Only on the overlay page (`/overlay/[profileId]`) — NOT in dashboard, marketplace, profile, or any other app UI
- Conditional: only renders when the overlay owner's `plan === 'free'`

### Implementation

The `GET /api/overlay/[profileId]` response includes the owner's `plan` in the response. The overlay page checks: if plan is free, render watermark on each card.

The watermark is rendered as an absolute-positioned element inside the card wrapper on the overlay page — not inside the card components themselves. This keeps card components clean and unaware of billing.

## Payment — Stripe

### Checkout flow

1. User clicks "Go Pro" on settings page
2. `POST /api/stripe/checkout` creates a Stripe Checkout Session for the $5/mo subscription
3. User is redirected to Stripe Checkout
4. On success, redirected back to `/settings?upgraded=true`

### Webhook

`POST /api/stripe/webhook` handles:
- `checkout.session.completed` — set user's `plan` to `'pro'`, store `stripe_customer_id`
- `customer.subscription.deleted` — set user's `plan` back to `'free'`
- `invoice.payment_failed` — optionally notify user, keep pro until subscription actually ends

### Customer Portal

`POST /api/stripe/portal` creates a Stripe Customer Portal session for managing subscription (cancel, update payment method). Linked from settings page.

## UI

### Settings page

Add a "Plan" section:
- Free users: show "Go Pro — Remove watermark from your overlay" with a $5/mo price and upgrade button
- Pro users: show "Pro" badge, "Manage subscription" link to Stripe Customer Portal

### Nav

- Pro users: subtle "PRO" badge next to their username/profile link

## Files to Create

1. `src/app/api/stripe/checkout/route.ts` — create Checkout session
2. `src/app/api/stripe/webhook/route.ts` — handle Stripe events
3. `src/app/api/stripe/portal/route.ts` — create Customer Portal session

## Files to Modify

1. `src/lib/db/schema.ts` — add `plan` and `stripe_customer_id` to users
2. `src/app/api/overlay/[profileId]/route.ts` — include owner plan in response
3. `src/app/overlay/[profileId]/page.tsx` — render watermark when plan is free
4. `src/app/(app)/settings/page.tsx` — add plan section with upgrade button
5. `src/components/nav.tsx` — add PRO badge for paying users

## Environment Variables

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_... (the $5/mo subscription price)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```
