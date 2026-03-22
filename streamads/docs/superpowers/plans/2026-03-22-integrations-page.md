# Integrations Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `/integrations` page with Spotify and Twitch OAuth connect/disconnect flows, storing tokens on the users table.

**Architecture:** OAuth authorization code grant for both services. New columns on the `users` table store tokens. API routes handle auth initiation, callbacks, disconnect, and status. Client page shows connection state.

**Tech Stack:** Next.js 16, Drizzle ORM, PostgreSQL, Firebase Auth, Spotify Web API, Twitch API

**Spec:** `docs/superpowers/specs/2026-03-22-integrations-page-design.md`

---

### Task 1: Add token columns to users schema

**Files:**
- Modify: `src/lib/db/schema.ts:24-30`

- [ ] **Step 1: Update the users table schema**

Add token columns to the `users` pgTable definition in `src/lib/db/schema.ts`:

```typescript
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  displayName: text('display_name').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  spotifyAccessToken: text('spotify_access_token'),
  spotifyRefreshToken: text('spotify_refresh_token'),
  spotifyTokenExpiry: timestamp('spotify_token_expiry'),
  twitchAccessToken: text('twitch_access_token'),
  twitchRefreshToken: text('twitch_refresh_token'),
  twitchTokenExpiry: timestamp('twitch_token_expiry'),
  twitchUserId: text('twitch_user_id'),
});
```

- [ ] **Step 2: Push schema to local database**

Run: `npx drizzle-kit push`
Expected: Changes applied successfully

- [ ] **Step 3: Verify columns exist**

Run: `psql -d streamads -c '\d users'`
Expected: New spotify/twitch columns visible

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat: add spotify and twitch token columns to users schema"
```

---

### Task 2: Spotify OAuth API routes

**Files:**
- Create: `src/app/api/spotify/auth/route.ts`
- Create: `src/app/api/spotify/callback/route.ts`

**Env vars needed:** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` (already in `.env.local`)

- [ ] **Step 1: Create Spotify auth initiation route**

Create `src/app/api/spotify/auth/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: 'user-read-currently-playing user-read-recently-played',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    state: user.firebaseUid,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
}

export async function DELETE(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db.update(users).set({
    spotifyAccessToken: null,
    spotifyRefreshToken: null,
    spotifyTokenExpiry: null,
  }).where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create Spotify callback route**

Create `src/app/api/spotify/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/integrations?error=spotify_denied', request.url));
  }

  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/integrations?error=spotify_token_failed', request.url));
  }

  const tokens = await tokenResponse.json();
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);

  await db.update(users).set({
    spotifyAccessToken: tokens.access_token,
    spotifyRefreshToken: tokens.refresh_token,
    spotifyTokenExpiry: expiry,
  }).where(eq(users.firebaseUid, state));

  return NextResponse.redirect(new URL('/integrations?connected=spotify', request.url));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/spotify/
git commit -m "feat: add Spotify OAuth auth and callback routes"
```

---

### Task 3: Twitch OAuth API routes

**Files:**
- Create: `src/app/api/twitch/auth/route.ts`
- Create: `src/app/api/twitch/callback/route.ts`

**Env vars needed:** `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REDIRECT_URI` (already in `.env.local`)

- [ ] **Step 1: Create Twitch auth initiation route**

Create `src/app/api/twitch/auth/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITCH_CLIENT_ID!,
    redirect_uri: process.env.TWITCH_REDIRECT_URI!,
    scope: 'channel:read:subscriptions moderator:read:followers',
    state: user.firebaseUid,
  });

  return NextResponse.redirect(`https://id.twitch.tv/oauth2/authorize?${params}`);
}

export async function DELETE(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db.update(users).set({
    twitchAccessToken: null,
    twitchRefreshToken: null,
    twitchTokenExpiry: null,
    twitchUserId: null,
  }).where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create Twitch callback route**

Create `src/app/api/twitch/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/integrations?error=twitch_denied', request.url));
  }

  const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TWITCH_REDIRECT_URI!,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/integrations?error=twitch_token_failed', request.url));
  }

  const tokens = await tokenResponse.json();
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);

  // Get Twitch user ID
  const userResponse = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID!,
    },
  });

  let twitchUserId = null;
  if (userResponse.ok) {
    const userData = await userResponse.json();
    twitchUserId = userData.data?.[0]?.id ?? null;
  }

  await db.update(users).set({
    twitchAccessToken: tokens.access_token,
    twitchRefreshToken: tokens.refresh_token,
    twitchTokenExpiry: expiry,
    twitchUserId,
  }).where(eq(users.firebaseUid, state));

  return NextResponse.redirect(new URL('/integrations?connected=twitch', request.url));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/twitch/
git commit -m "feat: add Twitch OAuth auth and callback routes"
```

---

### Task 4: Integrations status API route

**Files:**
- Create: `src/app/api/integrations/route.ts`

- [ ] **Step 1: Create integrations status route**

Create `src/app/api/integrations/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth/verify-token';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    spotify: !!user.spotifyRefreshToken,
    twitch: !!user.twitchRefreshToken,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/integrations/
git commit -m "feat: add integrations status API route"
```

---

### Task 5: Integrations page

**Files:**
- Create: `src/app/(app)/integrations/page.tsx`

- [ ] **Step 1: Create the integrations page**

Create `src/app/(app)/integrations/page.tsx`:

```tsx
'use client';

import { useAuth } from '@/lib/auth/context';
import { useEffect, useState } from 'react';

type IntegrationStatus = {
  spotify: boolean;
  twitch: boolean;
};

export default function Integrations() {
  const { getIdToken } = useAuth();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/integrations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStatus(await res.json());
      }
      setLoading(false);
    }
    fetchStatus();
  }, [getIdToken]);

  async function handleConnect(service: 'spotify' | 'twitch') {
    const token = await getIdToken();
    if (!token) return;
    // Navigate to OAuth initiation with auth token
    window.location.href = `/api/${service}/auth?token=${encodeURIComponent(token)}`;
  }

  async function handleDisconnect(service: 'spotify' | 'twitch') {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`/api/${service}/auth`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setStatus((prev) => prev ? { ...prev, [service]: false } : null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#a6da95] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold">Integrations</h1>
      <p className="mb-8 text-sm text-[#b8c0e0]">
        Connect your accounts to use Spotify and Twitch cards in your overlays.
      </p>

      <div className="flex flex-col gap-4">
        {/* Spotify */}
        <div className="flex items-center justify-between rounded-xl border border-[#363a4f] bg-[#1e2030] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1DB954]/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1DB954" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold">Spotify</h2>
              <p className="text-sm text-[#b8c0e0]">Show Now Playing and queue in your overlay</p>
            </div>
          </div>
          {status?.spotify ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#a6da95]/10 px-3 py-1 text-xs font-medium text-[#a6da95]">Connected</span>
              <button
                onClick={() => handleDisconnect('spotify')}
                className="rounded-lg border border-[#363a4f] px-4 py-2 text-sm text-[#ed8796] hover:bg-[#ed8796]/10"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleConnect('spotify')}
              className="rounded-lg bg-[#1DB954] px-4 py-2 text-sm font-medium text-white hover:bg-[#1ed760]"
            >
              Connect
            </button>
          )}
        </div>

        {/* Twitch */}
        <div className="flex items-center justify-between rounded-xl border border-[#363a4f] bg-[#1e2030] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#9146FF]/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9146FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold">Twitch</h2>
              <p className="text-sm text-[#b8c0e0]">Show latest followers and subs in your overlay</p>
            </div>
          </div>
          {status?.twitch ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#a6da95]/10 px-3 py-1 text-xs font-medium text-[#a6da95]">Connected</span>
              <button
                onClick={() => handleDisconnect('twitch')}
                className="rounded-lg border border-[#363a4f] px-4 py-2 text-sm text-[#ed8796] hover:bg-[#ed8796]/10"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleConnect('twitch')}
              className="rounded-lg bg-[#9146FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#772CE8]"
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/integrations/
git commit -m "feat: add integrations page with connect/disconnect UI"
```

---

### Task 6: Add Integrations link to nav

**Files:**
- Modify: `src/components/nav.tsx:27-33`

- [ ] **Step 1: Add Integrations link between Marketplace and Create Ad**

In `src/components/nav.tsx`, add the Integrations link after the Marketplace link (line 30):

```tsx
<Link href="/integrations" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
  Integrations
</Link>
```

The nav links section should read:
```tsx
<Link href="/dashboard" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
  Dashboard
</Link>
<Link href="/marketplace" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
  Marketplace
</Link>
<Link href="/integrations" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
  Integrations
</Link>
<Link href="/create/ad" className="rounded-md bg-[#a6da95] px-3 py-1 text-sm font-medium text-[#1e2030] hover:bg-[#8bd5ca]">
  + Create Ad
</Link>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/nav.tsx
git commit -m "feat: add Integrations link to nav"
```

---

### Task 7: Update OAuth routes to accept token via query param

The Spotify/Twitch auth routes use `verifyAuthToken` which reads the `Authorization` header. But when navigating via `window.location.href`, we can't set headers. We need to also accept the token as a query parameter.

**Files:**
- Modify: `src/app/api/spotify/auth/route.ts`
- Modify: `src/app/api/twitch/auth/route.ts`

- [ ] **Step 1: Update both auth routes to accept token from query string**

In both `GET` handlers, before calling `verifyAuthToken`, check for a `token` query param and construct a new request with the Authorization header:

```typescript
export async function GET(request: Request) {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');

  let authRequest = request;
  if (queryToken) {
    authRequest = new Request(request.url, {
      headers: { Authorization: `Bearer ${queryToken}` },
    });
  }

  const user = await verifyAuthToken(authRequest);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... rest of the route
}
```

Apply this pattern to both `src/app/api/spotify/auth/route.ts` and `src/app/api/twitch/auth/route.ts` GET handlers.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/spotify/auth/route.ts src/app/api/twitch/auth/route.ts
git commit -m "feat: accept auth token via query param for OAuth redirect routes"
```

---

### Task 8: Test locally and deploy

- [ ] **Step 1: Run dev server and test**

Run: `npm run dev`

1. Log in
2. Navigate to `/integrations`
3. Verify both cards show "Connect" buttons
4. Click "Connect" for Spotify — should redirect to Spotify OAuth
5. After authorizing, should redirect back to `/integrations` with Spotify showing "Connected"
6. Click "Disconnect" — should revert to "Connect"
7. Repeat for Twitch

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `npx vitest run`
Expected: All existing tests pass

- [ ] **Step 3: Commit all changes, push, and deploy**

```bash
git push origin main
```

Then deploy to prod:
```bash
ssh rzecqjus@64.7.4.14 "cd /var/www/streamads && git pull origin main && cd streamads && npm install && npx drizzle-kit push && npm run build && pm2 restart streamads"
```

Note: `drizzle-kit push` is needed this time to add the new columns to the prod database.
