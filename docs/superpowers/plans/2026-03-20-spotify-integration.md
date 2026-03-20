# Spotify Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live Spotify "Now Playing" to the OBS overlay by integrating Spotify OAuth, server-side token storage, and a public now-playing endpoint.

**Architecture:** Spotify OAuth tokens stored in the users table. A public `/api/spotify/now-playing/[userId]` endpoint proxies the Spotify API with 5s caching and auto-refresh. The overlay API returns the profile ownerId so the overlay page can fetch now-playing data when a Spotify item is in rotation. Dashboard gets a connect/disconnect UI.

**Tech Stack:** Spotify Web API, OAuth 2.0 Authorization Code Flow, Drizzle ORM migrations

**Spec:** `docs/superpowers/specs/2026-03-20-spotify-integration-design.md`

---

## File Structure

```
src/
├── lib/
│   ├── db/
│   │   └── schema.ts                         # MODIFY: add Spotify token columns to users
│   └── spotify/
│       ├── oauth.ts                           # NEW: OAuth helpers (buildAuthUrl, exchangeCode, refreshToken)
│       └── now-playing.ts                     # NEW: fetchNowPlaying with 5s cache + auto-refresh
├── app/
│   ├── api/
│   │   ├── spotify/
│   │   │   ├── connect/
│   │   │   │   └── route.ts                   # NEW: GET — start OAuth flow
│   │   │   ├── callback/
│   │   │   │   └── route.ts                   # NEW: GET — handle OAuth callback
│   │   │   ├── now-playing/
│   │   │   │   └── [userId]/
│   │   │   │       └── route.ts               # NEW: GET — public now-playing endpoint
│   │   │   └── disconnect/
│   │   │       └── route.ts                   # NEW: POST — clear tokens
│   │   └── overlay/
│   │       └── [profileId]/
│   │           └── route.ts                   # MODIFY: include ownerId in response
│   ├── (app)/
│   │   └── dashboard/
│   │       └── page.tsx                       # MODIFY: add Spotify connect/disconnect UI
│   └── overlay/
│       └── [profileId]/
│           └── page.tsx                       # MODIFY: fetch now-playing for Spotify items
└── components/
    └── spotify-card.tsx                       # MODIFY: add status prop for not-connected state
```

---

## Task 1: Schema Migration — Add Spotify Token Columns

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Add Spotify columns to users table**

In `src/lib/db/schema.ts`, add three columns to the `users` table:

```typescript
  spotifyAccessToken: text('spotify_access_token'),
  spotifyRefreshToken: text('spotify_refresh_token'),
  spotifyTokenExpiry: timestamp('spotify_token_expiry'),
```

Add these after the `createdAt` column.

- [ ] **Step 2: Add Spotify env vars to `.env.local`**

Append to `.env.local`:

```env
# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:4444/api/spotify/callback
```

- [ ] **Step 3: Generate and run migration**

```bash
DATABASE_URL=postgresql://thedevdad@localhost:5432/streamads npx drizzle-kit generate
DATABASE_URL=postgresql://thedevdad@localhost:5432/streamads npx drizzle-kit migrate
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Spotify token columns to users table"
```

---

## Task 2: Spotify OAuth Helpers

**Files:**
- Create: `src/lib/spotify/oauth.ts`

- [ ] **Step 1: Create the OAuth helper module**

```typescript
// src/lib/spotify/oauth.ts
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SCOPES = 'user-read-currently-playing user-read-playback-state';

// In-memory state map for OAuth CSRF protection
// Maps state string -> { userId: string, createdAt: number }
const pendingStates = new Map<string, { userId: string; createdAt: number }>();

// Clean up expired states (older than 10 minutes)
function cleanupStates() {
  const now = Date.now();
  for (const [key, value] of pendingStates) {
    if (now - value.createdAt > 10 * 60 * 1000) {
      pendingStates.delete(key);
    }
  }
}

export function buildAuthUrl(userId: string): string {
  cleanupStates();
  const state = crypto.randomUUID();
  pendingStates.set(state, { userId, createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: SCOPES,
    state,
  });

  return `${SPOTIFY_AUTH_URL}?${params}`;
}

export function validateState(state: string): string | null {
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  // Reject if older than 10 minutes
  if (Date.now() - entry.createdAt > 10 * 60 * 1000) return null;
  return entry.userId;
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    throw new Error(`Spotify token exchange failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Spotify token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function storeTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const expiry = new Date(Date.now() + expiresIn * 1000);
  await db
    .update(users)
    .set({
      spotifyAccessToken: accessToken,
      spotifyRefreshToken: refreshToken,
      spotifyTokenExpiry: expiry,
    })
    .where(eq(users.id, userId));
}

export async function clearTokens(userId: string) {
  await db
    .update(users)
    .set({
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      spotifyTokenExpiry: null,
    })
    .where(eq(users.id, userId));
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add Spotify OAuth helpers (auth URL, token exchange, refresh)"
```

---

## Task 3: Now-Playing Helper with Cache

**Files:**
- Create: `src/lib/spotify/now-playing.ts`

- [ ] **Step 1: Create the now-playing helper**

```typescript
// src/lib/spotify/now-playing.ts
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { refreshAccessToken } from './oauth';

type NowPlayingResult =
  | { connected: false }
  | { connected: true; playing: false }
  | {
      connected: true;
      playing: true;
      track: { name: string; artist: string; albumArtUrl: string | null };
    };

// In-memory cache: userId -> { result, timestamp }
const cache = new Map<string, { result: NowPlayingResult; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

export async function getNowPlaying(userId: string): Promise<NowPlayingResult> {
  // Check cache
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    return { connected: false };
  }

  const { spotifyAccessToken, spotifyRefreshToken, spotifyTokenExpiry } = user[0];

  if (!spotifyAccessToken || !spotifyRefreshToken) {
    return { connected: false };
  }

  let accessToken = spotifyAccessToken;

  // Auto-refresh if expired
  if (spotifyTokenExpiry && new Date(spotifyTokenExpiry) <= new Date()) {
    try {
      const refreshed = await refreshAccessToken(spotifyRefreshToken);
      accessToken = refreshed.accessToken;

      // Update tokens in DB
      const expiry = new Date(Date.now() + refreshed.expiresIn * 1000);
      await db
        .update(users)
        .set({
          spotifyAccessToken: refreshed.accessToken,
          spotifyTokenExpiry: expiry,
        })
        .where(eq(users.id, userId));
    } catch {
      // Refresh failed — treat as not playing
      const result: NowPlayingResult = { connected: true, playing: false };
      cache.set(userId, { result, timestamp: Date.now() });
      return result;
    }
  }

  // Fetch from Spotify
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 204 = nothing playing
    if (res.status === 204) {
      const result: NowPlayingResult = { connected: true, playing: false };
      cache.set(userId, { result, timestamp: Date.now() });
      return result;
    }

    if (!res.ok) {
      const result: NowPlayingResult = { connected: true, playing: false };
      cache.set(userId, { result, timestamp: Date.now() });
      return result;
    }

    const data = await res.json();

    if (!data.is_playing || !data.item) {
      const result: NowPlayingResult = { connected: true, playing: false };
      cache.set(userId, { result, timestamp: Date.now() });
      return result;
    }

    const result: NowPlayingResult = {
      connected: true,
      playing: true,
      track: {
        name: data.item.name,
        artist: data.item.artists?.map((a: { name: string }) => a.name).join(', ') || '',
        albumArtUrl: data.item.album?.images?.[0]?.url || null,
      },
    };
    cache.set(userId, { result, timestamp: Date.now() });
    return result;
  } catch {
    const result: NowPlayingResult = { connected: true, playing: false };
    cache.set(userId, { result, timestamp: Date.now() });
    return result;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add Spotify now-playing helper with 5s cache and auto-refresh"
```

---

## Task 4: Spotify API Routes

**Files:**
- Create: `src/app/api/spotify/connect/route.ts`
- Create: `src/app/api/spotify/callback/route.ts`
- Create: `src/app/api/spotify/now-playing/[userId]/route.ts`
- Create: `src/app/api/spotify/disconnect/route.ts`

- [ ] **Step 1: Create connect route**

```typescript
// src/app/api/spotify/connect/route.ts
import { getAdminAuth } from '@/lib/firebase/admin';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { buildAuthUrl } from '@/lib/spotify/oauth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);

    const user = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const authUrl = buildAuthUrl(user[0].id);
    return NextResponse.redirect(authUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
```

- [ ] **Step 2: Create callback route**

```typescript
// src/app/api/spotify/callback/route.ts
import { validateState, exchangeCode, storeTokens } from '@/lib/spotify/oauth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/dashboard?spotify=error', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard?spotify=error', request.url));
  }

  const userId = validateState(state);
  if (!userId) {
    return NextResponse.redirect(new URL('/dashboard?spotify=error', request.url));
  }

  try {
    const tokens = await exchangeCode(code);
    await storeTokens(userId, tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
    return NextResponse.redirect(new URL('/dashboard?spotify=connected', request.url));
  } catch {
    return NextResponse.redirect(new URL('/dashboard?spotify=error', request.url));
  }
}
```

- [ ] **Step 3: Create now-playing route**

```typescript
// src/app/api/spotify/now-playing/[userId]/route.ts
import { getNowPlaying } from '@/lib/spotify/now-playing';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // Verify user exists
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }

  const result = await getNowPlaying(userId);
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Create disconnect route**

```typescript
// src/app/api/spotify/disconnect/route.ts
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { clearTokens } from '@/lib/spotify/oauth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await clearTokens(user.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Spotify API routes (connect, callback, now-playing, disconnect)"
```

---

## Task 5: Update Overlay API to Include ownerId

**Files:**
- Modify: `src/app/api/overlay/[profileId]/route.ts`

- [ ] **Step 1: Update overlay route to return ownerId**

Replace the entire contents of `src/app/api/overlay/[profileId]/route.ts`:

```typescript
// src/app/api/overlay/[profileId]/route.ts
import { db } from '@/lib/db';
import { adProfileItems, adProfiles, marketplaceItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;

  // Get profile to find ownerId
  const profile = await db
    .select({ ownerId: adProfiles.ownerId })
    .from(adProfiles)
    .where(eq(adProfiles.id, profileId))
    .limit(1);

  const ownerId = profile.length > 0 ? profile[0].ownerId : null;

  const items = await db
    .select({
      profileItem: adProfileItems,
      marketplaceItem: marketplaceItems,
    })
    .from(adProfileItems)
    .innerJoin(marketplaceItems, eq(adProfileItems.itemId, marketplaceItems.id))
    .where(eq(adProfileItems.profileId, profileId))
    .orderBy(adProfileItems.sortOrder);

  const result = items.map((i) => ({
    ...i.marketplaceItem,
    displayDuration: i.profileItem.displayDuration ?? i.marketplaceItem.displayDuration,
    sortOrder: i.profileItem.sortOrder,
  }));

  return NextResponse.json({ ownerId, items: result });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: include ownerId in overlay API response"
```

---

## Task 6: Update SpotifyCard Component

**Files:**
- Modify: `src/components/spotify-card.tsx`

- [ ] **Step 1: Add status prop and not-connected state**

Replace the entire contents of `src/components/spotify-card.tsx`:

```tsx
// src/components/spotify-card.tsx
import { OverlayCard } from './overlay-card';

type SpotifyCardProps = {
  trackName?: string;
  artistName?: string;
  albumArtUrl?: string;
  requester?: string;
  status?: 'playing' | 'not-connected';
};

export function SpotifyCard({
  trackName = 'Not Playing',
  artistName = '',
  albumArtUrl,
  requester,
  status,
}: SpotifyCardProps) {
  if (status === 'not-connected') {
    return (
      <OverlayCard>
        <div className="h-16 w-16 rounded-full bg-[#363a4f]" />
        <div className="flex-grow pl-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[#6e738d]">Spotify</h2>
            <p className="text-xs text-[#6e738d]">Not connected</p>
            <p className="text-xs text-[#494d64]">Configure in dashboard</p>
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#494d64"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-auto w-7 flex-shrink-0"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </OverlayCard>
    );
  }

  return (
    <OverlayCard>
      {albumArtUrl ? (
        <img
          src={albumArtUrl}
          width={64}
          height={64}
          alt="Album Art"
          className="animate-spin-slow rounded-full"
        />
      ) : (
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#f5bde6] to-[#c6a0f6]" />
      )}
      <div className="flex-grow pl-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Now Playing</h2>
          <p className="text-xs">{trackName}</p>
          {artistName && <p className="text-xs text-[#b8c0e0]">{artistName}</p>}
          {requester && (
            <p className="text-xs text-[#b8c0e0]">Requested by @{requester}</p>
          )}
        </div>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f5bde6"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-auto w-7 flex-shrink-0"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </OverlayCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add not-connected state to SpotifyCard"
```

---

## Task 7: Update Overlay Page for Live Spotify

**Files:**
- Modify: `src/app/overlay/[profileId]/page.tsx`

- [ ] **Step 1: Update overlay page to fetch now-playing for Spotify items**

Replace the entire contents of `src/app/overlay/[profileId]/page.tsx`:

```tsx
// src/app/overlay/[profileId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { AdCard } from '@/components/ad-card';
import { SpotifyCard } from '@/components/spotify-card';

type OverlayItem = {
  id: string;
  type: 'ad' | 'spotify' | 'placeholder';
  headline: string | null;
  subtext: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  displayDuration: number;
};

type OverlayData = {
  ownerId: string | null;
  items: OverlayItem[];
};

type SpotifyData = {
  connected: boolean;
  playing?: boolean;
  track?: { name: string; artist: string; albumArtUrl: string | null };
};

export default function OverlayPage() {
  const params = useParams();
  const profileId = params.profileId as string;
  const [data, setData] = useState<OverlayData>({ ownerId: null, items: [] });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchItems() {
    try {
      const res = await fetch(`/api/overlay/${profileId}`);
      if (res.ok) {
        const newData: OverlayData = await res.json();
        setData((prev) => {
          if (prev.items.length !== newData.items.length) setCurrentIndex(0);
          return newData;
        });
      }
    } catch {
      // Silently fail — don't break OBS
    }
  }

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchItems();
    const pollInterval = setInterval(fetchItems, 30000);
    return () => clearInterval(pollInterval);
  }, [profileId]);

  // Fetch Spotify data when a Spotify item is current
  useEffect(() => {
    if (data.items.length === 0 || !data.ownerId) return;
    const current = data.items[currentIndex % data.items.length];
    if (current.type !== 'spotify') {
      setSpotifyData(null);
      return;
    }

    async function fetchSpotify() {
      try {
        const res = await fetch(`/api/spotify/now-playing/${data.ownerId}`);
        if (res.ok) setSpotifyData(await res.json());
        else setSpotifyData({ connected: false });
      } catch {
        setSpotifyData({ connected: false });
      }
    }
    fetchSpotify();
  }, [currentIndex, data.ownerId, data.items]);

  // Rotation engine
  useEffect(() => {
    if (data.items.length === 0) return;

    const current = data.items[currentIndex % data.items.length];
    const duration = (current.displayDuration || 10) * 1000;

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % data.items.length);
        setVisible(true);
      }, 500);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, data.items]);

  if (data.items.length === 0) return null;

  const current = data.items[currentIndex % data.items.length];

  // Placeholder and "not playing" Spotify render nothing
  if (current.type === 'placeholder') return null;
  if (current.type === 'spotify' && spotifyData?.connected && !spotifyData?.playing) return null;

  return (
    <div
      className="mx-auto mt-5"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      {current.type === 'ad' ? (
        <AdCard
          imageUrl={current.imageUrl}
          headline={current.headline || ''}
          subtext={current.subtext}
          brandUrl={current.brandUrl}
        />
      ) : current.type === 'spotify' ? (
        spotifyData?.connected === false ? (
          <SpotifyCard status="not-connected" />
        ) : spotifyData?.playing && spotifyData.track ? (
          <SpotifyCard
            trackName={spotifyData.track.name}
            artistName={spotifyData.track.artist}
            albumArtUrl={spotifyData.track.albumArtUrl ?? undefined}
          />
        ) : null
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: overlay page fetches live Spotify data for now-playing"
```

---

## Task 8: Dashboard Spotify Connect/Disconnect UI

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add Spotify connection status API call**

Add a new route to check Spotify connection status. Create `src/app/api/spotify/status/route.ts`:

```typescript
// src/app/api/spotify/status/route.ts
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    connected: !!user.spotifyAccessToken,
  });
}
```

- [ ] **Step 2: Update dashboard page with Spotify section**

In `src/app/(app)/dashboard/page.tsx`, add Spotify state and UI. Replace the entire file:

```tsx
// src/app/(app)/dashboard/page.tsx
'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Profile = {
  id: string;
  name: string;
  createdAt: string;
};

export default function Dashboard() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyMessage, setSpotifyMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetchProfiles();
    fetchSpotifyStatus();

    // Check for Spotify callback result
    const spotifyParam = searchParams.get('spotify');
    if (spotifyParam === 'connected') {
      setSpotifyMessage('Spotify connected successfully!');
      setTimeout(() => setSpotifyMessage(''), 3000);
    } else if (spotifyParam === 'error') {
      setSpotifyMessage('Failed to connect Spotify. Try again.');
      setTimeout(() => setSpotifyMessage(''), 5000);
    }
  }, [user]);

  async function fetchProfiles() {
    const token = await getIdToken();
    const res = await fetch('/api/profiles', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setProfiles(await res.json());
  }

  async function fetchSpotifyStatus() {
    const token = await getIdToken();
    const res = await fetch('/api/spotify/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSpotifyConnected(data.connected);
    }
  }

  async function createProfile() {
    if (!newName.trim()) return;
    setCreating(true);
    const token = await getIdToken();
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setNewName('');
      fetchProfiles();
    }
    setCreating(false);
  }

  async function deleteProfile(id: string) {
    const token = await getIdToken();
    await fetch(`/api/profiles/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchProfiles();
  }

  async function connectSpotify() {
    const token = await getIdToken();
    window.location.href = `/api/spotify/connect?token=${token}`;
  }

  async function disconnectSpotify() {
    const token = await getIdToken();
    const res = await fetch('/api/spotify/disconnect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSpotifyConnected(false);
      setSpotifyMessage('Spotify disconnected.');
      setTimeout(() => setSpotifyMessage(''), 3000);
    }
  }

  if (loading || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your Ad Profiles</h1>

      {/* Spotify Connection */}
      <div className="mb-8 rounded-md bg-[#1e2030] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Spotify</h2>
            <p className="text-xs text-[#b8c0e0]">
              {spotifyConnected
                ? 'Connected — your overlay will show what you\'re listening to'
                : 'Connect to show Now Playing on your overlay'}
            </p>
          </div>
          {spotifyConnected ? (
            <button
              onClick={disconnectSpotify}
              className="rounded-md bg-[#363a4f] px-4 py-2 text-sm text-[#cad3f5] hover:bg-[#494d64]"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectSpotify}
              className="rounded-md bg-[#a6da95] px-4 py-2 text-sm font-medium text-[#24273a] hover:bg-[#8bd5ca]"
            >
              Connect Spotify
            </button>
          )}
        </div>
        {spotifyMessage && (
          <p className="mt-2 text-sm text-[#a6da95]">{spotifyMessage}</p>
        )}
      </div>

      {/* Profile Creation */}
      <div className="mb-8 flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New profile name..."
          className="rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
          onKeyDown={(e) => e.key === 'Enter' && createProfile()}
        />
        <button
          onClick={createProfile}
          disabled={creating}
          className="rounded-md bg-[#f5bde6] px-4 py-2 text-sm font-medium text-[#24273a] hover:bg-[#c6a0f6] disabled:opacity-50"
        >
          Create Profile
        </button>
      </div>

      {/* Profile List */}
      {profiles.length === 0 ? (
        <p className="text-[#b8c0e0]">No profiles yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between rounded-md bg-[#1e2030] p-4"
            >
              <div>
                <h2 className="font-semibold">{profile.name}</h2>
                <p className="text-xs text-[#b8c0e0]">
                  Created {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/profile/${profile.id}`}
                  className="rounded-md bg-[#363a4f] px-3 py-1.5 text-sm hover:bg-[#494d64]"
                >
                  Edit
                </Link>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/overlay/${profile.id}`
                    );
                  }}
                  className="rounded-md bg-[#a6da95] px-3 py-1.5 text-sm text-[#24273a] hover:bg-[#8bd5ca]"
                >
                  Copy OBS URL
                </button>
                <button
                  onClick={() => deleteProfile(profile.id)}
                  className="rounded-md bg-[#ed8796] px-3 py-1.5 text-sm text-[#24273a] hover:bg-[#ee99a0]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Spotify connect/disconnect UI to dashboard"
```

---

## Task 9: Verify and Build

- [ ] **Step 1: Run tests**

```bash
npx vitest run
```

Expected: All existing tests pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Fix any TypeScript errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address build errors for Spotify integration"
```
