# Freemium Paywall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a freemium paywall — free users get 1 profile with 3 cards, Pro users get unlimited. Mock Stripe flow toggles plan for local testing.

**Architecture:** New `plan` column on users, shared plan constants, server-side limit enforcement on profile/card APIs, mock Stripe endpoints that toggle plan, UI upgrade prompts on dashboard/settings/modal, PRO badge in nav.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, PostgreSQL, Tailwind CSS

---

### Task 1: Plan constants + Schema + DB

**Files:**
- Create: `streamads/src/lib/plans.ts`
- Modify: `streamads/src/lib/db/schema.ts`

- [ ] **Step 1: Create shared plan constants**

Create `streamads/src/lib/plans.ts`:

```typescript
export const PLANS = {
  free: {
    name: 'Free',
    maxProfiles: 1,
    maxCardsPerProfile: 3,
  },
  pro: {
    name: 'Pro',
    price: '$5/mo',
    maxProfiles: Infinity,
    maxCardsPerProfile: Infinity,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanLimits(plan: string) {
  return PLANS[plan as PlanKey] ?? PLANS.free;
}
```

- [ ] **Step 2: Add plan to schema**

Read `streamads/src/lib/db/schema.ts` first. Add to the `users` table, after `avatarUrl`:

```typescript
plan: text('plan').default('free').notNull(),
stripeCustomerId: text('stripe_customer_id'),
```

- [ ] **Step 3: Add columns to database**

```bash
psql postgresql://thedevdad@localhost:5432/streamads -c "
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;"
```

- [ ] **Step 4: Commit**

```bash
git add streamads/src/lib/plans.ts streamads/src/lib/db/schema.ts
git commit -m "feat: add plan constants and schema columns"
```

---

### Task 2: Server-side limit enforcement

**Files:**
- Modify: `streamads/src/app/api/profiles/route.ts`
- Modify: `streamads/src/app/api/profiles/[id]/route.ts`

- [ ] **Step 1: Enforce 1 profile limit on POST /api/profiles**

Read `streamads/src/app/api/profiles/route.ts` first. Import `getPlanLimits` from `@/lib/plans` and `count` from `drizzle-orm`. In the POST handler, after auth check, before inserting:

```typescript
const limits = getPlanLimits(user.plan);
const [profileCount] = await db
  .select({ count: count() })
  .from(adProfiles)
  .where(eq(adProfiles.ownerId, user.id));

if (Number(profileCount.count) >= limits.maxProfiles) {
  return NextResponse.json(
    { error: 'Upgrade to Pro for more profiles', limit: true },
    { status: 403 }
  );
}
```

Import `count` from `drizzle-orm` if not already imported.

- [ ] **Step 2: Enforce 3 card limit on PUT /api/profiles/[id]**

Read `streamads/src/app/api/profiles/[id]/route.ts` first. Import `getPlanLimits` from `@/lib/plans`. In the PUT handler, after auth and ownership check, before the items insert, add:

```typescript
if (items) {
  const limits = getPlanLimits(user.plan);
  if (items.length > limits.maxCardsPerProfile) {
    return NextResponse.json(
      { error: `Upgrade to Pro to add more than ${limits.maxCardsPerProfile} cards`, limit: true },
      { status: 403 }
    );
  }
}
```

Add this check BEFORE the existing `db.delete(adProfileItems)` line.

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/api/profiles/
git commit -m "feat: enforce free tier limits on profiles and cards"
```

---

### Task 3: Mock Stripe endpoints

**Files:**
- Create: `streamads/src/app/api/stripe/checkout/route.ts`
- Create: `streamads/src/app/api/stripe/portal/route.ts`

- [ ] **Step 1: Create mock checkout endpoint**

Create `streamads/src/app/api/stripe/checkout/route.ts`:

```typescript
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// MOCK: In production, this creates a Stripe Checkout Session.
// For now, it just upgrades the user to pro immediately.
export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db.update(users).set({ plan: 'pro' }).where(eq(users.id, user.id));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return NextResponse.json({ url: `${baseUrl}/settings?upgraded=true` });
}
```

- [ ] **Step 2: Create mock portal endpoint**

Create `streamads/src/app/api/stripe/portal/route.ts`:

```typescript
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// MOCK: In production, this creates a Stripe Customer Portal session.
// For now, it just downgrades the user to free.
export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db.update(users).set({ plan: 'free' }).where(eq(users.id, user.id));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return NextResponse.json({ url: `${baseUrl}/settings?downgraded=true` });
}
```

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/api/stripe/
git commit -m "feat: add mock Stripe checkout and portal endpoints"
```

---

### Task 4: Settings page — plan section

**Files:**
- Modify: `streamads/src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Add plan section to settings**

Read the current settings page first. The page needs to:

1. Fetch the user's plan — add a state `const [plan, setPlan] = useState('free');` and fetch it alongside the existing username/social links data. The `verifyAuthToken` return includes `plan` since it returns the full user record. Add a new API call or piggyback on the existing username fetch. Simplest: add a `/api/plan` fetch, or just read `plan` from the username endpoint response. Actually simplest: just call `GET /api/username` which returns the user — extend that endpoint to also return `plan`, OR create a dedicated fetch.

For simplicity, just fetch the plan from the existing user data. The `GET /api/username` route returns `{ username }`. Extend it to also return `{ username, plan }` by modifying `streamads/src/app/api/username/route.ts` — in the GET handler, also return `user.plan`:

In the GET handler of `/api/username`, change the response to include plan:
```typescript
return NextResponse.json({ username: user.username, plan: user.plan });
```

Then in the settings page, read `plan` from that response and set state.

2. Add a "Plan" section BEFORE the username section. Render based on plan:

**Free users:**
```tsx
<div className="mb-8 rounded-2xl border border-[rgba(202,211,245,0.06)] p-6" style={{ background: 'rgba(30,32,48,0.8)' }}>
  <div className="flex items-center justify-between">
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-[#cad3f5]" style={font}>Free Plan</h2>
        <span className="rounded-full bg-[#363a4f] px-2 py-0.5 text-[10px] text-[#6e738d]">Current</span>
      </div>
      <p className="mt-1 text-xs text-[#494d64]">1 profile · 3 cards per profile</p>
    </div>
    <button
      onClick={handleUpgrade}
      className="rounded-xl bg-gradient-to-r from-[#a6da95] to-[#8bd5ca] px-5 py-2.5 text-sm font-semibold text-[#181926] shadow-[0_2px_12px_rgba(166,218,149,0.2)] transition-all hover:shadow-[0_4px_20px_rgba(166,218,149,0.3)]"
      style={font}
    >
      Upgrade to Pro — $5/mo
    </button>
  </div>
</div>
```

**Pro users:**
```tsx
<div className="mb-8 rounded-2xl border border-[rgba(166,218,149,0.15)] p-6" style={{ background: 'rgba(30,32,48,0.8)' }}>
  <div className="flex items-center justify-between">
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-[#cad3f5]" style={font}>Pro Plan</h2>
        <span className="rounded-full bg-[rgba(166,218,149,0.15)] px-2 py-0.5 text-[10px] font-bold text-[#a6da95]">PRO</span>
      </div>
      <p className="mt-1 text-xs text-[#494d64]">Unlimited profiles · Unlimited cards</p>
    </div>
    <button
      onClick={handleManage}
      className="rounded-xl border border-[rgba(202,211,245,0.1)] px-4 py-2 text-sm text-[#b8c0e0] transition-all hover:bg-[#363a4f]"
      style={font}
    >
      Manage Subscription
    </button>
  </div>
</div>
```

3. Add handler functions:

```typescript
async function handleUpgrade() {
  const token = await getIdToken();
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    const { url } = await res.json();
    window.location.href = url;
  }
}

async function handleManage() {
  const token = await getIdToken();
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    const { url } = await res.json();
    window.location.href = url;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add streamads/src/app/(app)/settings/ streamads/src/app/api/username/
git commit -m "feat: add plan section to settings with upgrade/manage buttons"
```

---

### Task 5: Dashboard limits + Nav PRO badge

**Files:**
- Modify: `streamads/src/app/(app)/dashboard/page.tsx`
- Modify: `streamads/src/components/nav.tsx`

- [ ] **Step 1: Add limits to dashboard**

Read the dashboard page first. It needs to know the user's plan. The `verifyAuthToken` returns the full user, so the profiles API could return the plan. Simplest approach: fetch plan from `/api/username` on mount (same as nav does).

Add state: `const [plan, setPlan] = useState('free');`

Fetch plan on mount alongside existing data:
```typescript
const planRes = await fetch('/api/username', { headers: { Authorization: `Bearer ${token}` } });
if (planRes.ok) { const d = await planRes.json(); setPlan(d.plan || 'free'); }
```

Then in the UI:
- If `plan === 'free'` and `profiles.length >= 1`: hide the create profile input, show instead:
```tsx
<p className="text-xs text-[#494d64]" style={font}>
  Free plan — 1 profile. <button onClick={handleUpgrade} className="text-[#a6da95] hover:underline">Upgrade to Pro</button> for unlimited.
</p>
```

- On each profile card, if free, show card count like "2/3 cards" near the items count.

- [ ] **Step 2: Add PRO badge to nav**

Read `streamads/src/components/nav.tsx` first. The nav already fetches username from `/api/username`. Extend to also read `plan` from the same response.

Add state: `const [plan, setPlan] = useState('free');`

In the existing `fetchUsername` function, also set plan:
```typescript
if (data.username) setUsername(data.username);
setPlan(data.plan || 'free');
```

Then next to the username link in the nav, if `plan === 'pro'`, render a small badge:
```tsx
{plan === 'pro' && (
  <span className="rounded-full bg-[rgba(166,218,149,0.15)] px-1.5 py-0.5 text-[9px] font-bold text-[#a6da95]">PRO</span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/\(app\)/dashboard/ streamads/src/components/nav.tsx
git commit -m "feat: add free tier limits to dashboard and PRO badge to nav"
```

---

### Task 6: Add to Profile modal — limit check

**Files:**
- Modify: `streamads/src/components/add-to-profile-modal.tsx`

- [ ] **Step 1: Add limit check to the modal**

Read the modal first. It fetches profiles and lets you pick one to add a card to. Before adding, it fetches the profile's items to append.

After fetching the target profile's items in `addToProfile()`, check the count:

```typescript
// Check free tier limit
const planRes = await fetch('/api/username', {
  headers: { Authorization: `Bearer ${token}` },
});
let userPlan = 'free';
if (planRes.ok) {
  const pd = await planRes.json();
  userPlan = pd.plan || 'free';
}

if (userPlan === 'free' && currentItems.length >= 3) {
  // Show upgrade prompt instead of adding
  setLimitReached(true);
  setAdding(null);
  return;
}
```

Add state: `const [limitReached, setLimitReached] = useState(false);`

When `limitReached` is true, render an upgrade prompt instead of the profile list:

```tsx
{limitReached ? (
  <div className="text-center">
    <p className="mb-3 text-sm text-[#b8c0e0]" style={font}>
      You've reached the free plan limit of 3 cards.
    </p>
    <button
      onClick={async () => {
        const token = await getIdToken();
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { url } = await res.json();
          window.location.href = url;
        }
      }}
      className="rounded-xl bg-gradient-to-r from-[#a6da95] to-[#8bd5ca] px-5 py-2.5 text-sm font-semibold text-[#181926]"
      style={font}
    >
      Upgrade to Pro — $5/mo
    </button>
  </div>
) : (
  // existing profile list UI
)}
```

- [ ] **Step 2: Commit**

```bash
git add streamads/src/components/add-to-profile-modal.tsx
git commit -m "feat: add free tier limit check to add-to-profile modal"
```
