# StreamAds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js app where friends create ads, browse a marketplace, build ad profiles, and generate OBS browser source URLs that cycle through selected items on-stream.

**Architecture:** Next.js App Router with server components and route handlers for API. PostgreSQL via Drizzle ORM for data. Firebase Auth for identity, Firebase Storage for image uploads. Public overlay pages served without auth for OBS browser sources.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, Firebase Auth, Firebase Storage, Vitest

**Spec:** `docs/superpowers/specs/2026-03-19-streamads-design.md`

---

## File Structure

```
streamads/
├── drizzle.config.ts                          # Drizzle Kit config
├── src/
│   ├── app/
│   │   ├── layout.tsx                         # Root layout (minimal shell)
│   │   ├── globals.css                        # Tailwind base + Catppuccin tokens
│   │   ├── (app)/
│   │   │   ├── layout.tsx                     # App layout with AuthProvider, nav
│   │   │   ├── page.tsx                       # Landing page (public)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                   # List/create ad profiles
│   │   │   ├── profile/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx               # Edit profile, manage items, copy URL
│   │   │   ├── marketplace/
│   │   │   │   └── page.tsx                   # Browse/search marketplace items
│   │   │   └── create/
│   │   │       └── page.tsx                   # Ad builder with live preview
│   │   ├── overlay/
│   │   │   └── [profileId]/
│   │   │       └── page.tsx                   # OBS overlay — rotation engine (no nav)
│   │   └── api/
│   │       ├── marketplace/
│   │       │   ├── route.ts                   # GET (list/search), POST (create)
│   │       │   └── [id]/
│   │       │       └── route.ts               # DELETE (creator only)
│   │       ├── profiles/
│   │       │   ├── route.ts                   # GET (list mine), POST (create)
│   │       │   └── [id]/
│   │       │       └── route.ts               # GET, PUT (full replace), DELETE
│   │       └── overlay/
│   │           └── [profileId]/
│   │               └── route.ts               # GET (public, no auth)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                       # Drizzle client (pg connection)
│   │   │   ├── schema.ts                      # All table definitions
│   │   │   └── seed.ts                        # Seed system items (Spotify, Placeholder)
│   │   ├── firebase/
│   │   │   ├── admin.ts                       # Firebase Admin SDK init
│   │   │   ├── client.ts                      # Firebase client SDK init
│   │   │   └── storage.ts                     # Upload helper
│   │   └── auth/
│   │       ├── context.tsx                    # AuthProvider + useAuth hook
│   │       └── verify-token.ts                # Server-side token verification
│   └── components/
│       ├── overlay-card.tsx                   # Universal 320x120 card shell
│       ├── ad-card.tsx                        # Ad variant (logo, headline, subtext, url)
│       ├── spotify-card.tsx                   # Spotify variant (spinning art, now playing)
│       ├── nav.tsx                            # App navigation bar
│       ├── image-upload.tsx                   # Firebase Storage upload widget
│       └── add-to-profile-modal.tsx           # Modal: pick profile to add item to
├── drizzle/
│   └── (generated migrations)
├── __tests__/
│   ├── lib/
│   │   └── db/
│   │       └── schema.test.ts                 # Schema validation tests
│   └── api/
│       ├── marketplace.test.ts                # Marketplace API tests
│       ├── profiles.test.ts                   # Profiles API tests
│       └── overlay.test.ts                    # Overlay API tests
├── vitest.config.ts                           # Vitest config with path aliases
├── .env.local                                 # Firebase + DB credentials (gitignored)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.env.local`, `.gitignore`

- [ ] **Step 1: Scaffold Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

- [ ] **Step 2: Install core dependencies**

```bash
npm install drizzle-orm postgres firebase firebase-admin uuid
npm install -D drizzle-kit vitest @types/uuid
```

- [ ] **Step 3: Create `.env.local` with placeholder values**

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamads

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

- [ ] **Step 4: Add Catppuccin color tokens to `globals.css`**

Replace the default `globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --ctp-base: #24273a;
  --ctp-text: #cad3f5;
  --ctp-subtext: #b8c0e0;
  --ctp-pink: #f5bde6;
  --ctp-green: #a6da95;
  --ctp-surface: #363a4f;
  --ctp-overlay: #494d64;
  --ctp-mantle: #1e2030;
  --ctp-crust: #181926;
}
```

- [ ] **Step 5: Add `.superpowers/` to `.gitignore`**

Append to the generated `.gitignore`:

```
.superpowers/
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with deps"
```

---

## Task 2: Database Schema & Migrations

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `drizzle.config.ts`, `src/lib/db/seed.ts`
- Test: `__tests__/lib/db/schema.test.ts`

- [ ] **Step 1: Write schema validation test**

```typescript
// __tests__/lib/db/schema.test.ts
import { describe, it, expect } from 'vitest';
import {
  users,
  marketplaceItems,
  adProfiles,
  adProfileItems,
  itemTypeEnum,
} from '@/lib/db/schema';

describe('database schema', () => {
  it('defines users table with required columns', () => {
    expect(users.id).toBeDefined();
    expect(users.firebaseUid).toBeDefined();
    expect(users.displayName).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.createdAt).toBeDefined();
  });

  it('defines marketplace_items table with required columns', () => {
    expect(marketplaceItems.id).toBeDefined();
    expect(marketplaceItems.type).toBeDefined();
    expect(marketplaceItems.creatorId).toBeDefined();
    expect(marketplaceItems.headline).toBeDefined();
    expect(marketplaceItems.subtext).toBeDefined();
    expect(marketplaceItems.brandUrl).toBeDefined();
    expect(marketplaceItems.imageUrl).toBeDefined();
    expect(marketplaceItems.displayDuration).toBeDefined();
    expect(marketplaceItems.createdAt).toBeDefined();
  });

  it('defines ad_profiles table with required columns', () => {
    expect(adProfiles.id).toBeDefined();
    expect(adProfiles.ownerId).toBeDefined();
    expect(adProfiles.name).toBeDefined();
    expect(adProfiles.createdAt).toBeDefined();
    expect(adProfiles.updatedAt).toBeDefined();
  });

  it('defines ad_profile_items join table', () => {
    expect(adProfileItems.id).toBeDefined();
    expect(adProfileItems.profileId).toBeDefined();
    expect(adProfileItems.itemId).toBeDefined();
    expect(adProfileItems.displayDuration).toBeDefined();
    expect(adProfileItems.sortOrder).toBeDefined();
  });

  it('defines item type enum with correct values', () => {
    expect(itemTypeEnum.enumValues).toEqual(['ad', 'spotify', 'placeholder']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/db/schema.test.ts
```

Expected: FAIL — module `@/lib/db/schema` not found

- [ ] **Step 3: Create Drizzle config**

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: Create schema**

```typescript
// src/lib/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const itemTypeEnum = pgEnum('item_type', [
  'ad',
  'spotify',
  'placeholder',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  displayName: text('display_name').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const marketplaceItems = pgTable('marketplace_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: itemTypeEnum('type').notNull(),
  creatorId: uuid('creator_id').references(() => users.id),
  headline: text('headline'),
  subtext: text('subtext'),
  brandUrl: text('brand_url'),
  imageUrl: text('image_url'),
  displayDuration: integer('display_duration').default(10).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adProfiles = pgTable('ad_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .references(() => users.id)
    .notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adProfileItems = pgTable('ad_profile_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .references(() => adProfiles.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => marketplaceItems.id)
    .notNull(),
  displayDuration: integer('display_duration'),
  sortOrder: integer('sort_order').notNull(),
});
```

- [ ] **Step 5: Create DB client**

```typescript
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

- [ ] **Step 6: Configure Vitest for path aliases**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/db/schema.test.ts
```

Expected: PASS

- [ ] **Step 8: Create seed script**

```typescript
// src/lib/db/seed.ts
import { db } from './index';
import { marketplaceItems } from './schema';
import { eq, and, isNull } from 'drizzle-orm';

async function seed() {
  console.log('Seeding system items...');

  // Check if system items already exist (creatorId is null = system item)
  const existing = await db
    .select()
    .from(marketplaceItems)
    .where(isNull(marketplaceItems.creatorId));

  if (existing.length > 0) {
    console.log('System items already exist, skipping seed.');
    process.exit(0);
  }

  await db.insert(marketplaceItems).values([
    {
      type: 'spotify',
      creatorId: null,
      headline: 'Now Playing',
      subtext: 'Spotify Integration',
      displayDuration: 10,
    },
    {
      type: 'placeholder',
      creatorId: null,
      headline: null,
      subtext: null,
      displayDuration: 5,
    },
  ]);

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
```

- [ ] **Step 9: Create local database and run migration**

```bash
createdb streamads
npx drizzle-kit generate
npx drizzle-kit migrate
npx tsx src/lib/db/seed.ts
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle schema, migrations, and seed script"
```

---

## Task 3: Firebase Setup (Auth + Storage)

**Files:**
- Create: `src/lib/firebase/client.ts`, `src/lib/firebase/admin.ts`, `src/lib/firebase/storage.ts`, `src/lib/auth/context.tsx`, `src/lib/auth/verify-token.ts`

- [ ] **Step 1: Create Firebase client SDK init**

```typescript
// src/lib/firebase/client.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const storage = getStorage(app);
```

- [ ] **Step 2: Create Firebase Admin SDK init**

```typescript
// src/lib/firebase/admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = getAuth();
```

- [ ] **Step 3: Create server-side token verification**

```typescript
// src/lib/auth/verify-token.ts
import { adminAuth } from '@/lib/firebase/admin';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function verifyAuthToken(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);

    // Upsert user in Postgres
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);

    if (existing.length === 0) {
      const [newUser] = await db
        .insert(users)
        .values({
          firebaseUid: decoded.uid,
          displayName: decoded.name || decoded.email || 'Anonymous',
          email: decoded.email || '',
        })
        .returning();
      return newUser;
    }

    return existing[0];
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Create Auth context provider**

```tsx
// src/lib/auth/context.tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const getIdToken = async () => {
    if (!user) return null;
    return user.getIdToken();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

- [ ] **Step 5: Create Firebase Storage upload helper**

```typescript
// src/lib/firebase/storage.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './client';
import { v4 as uuidv4 } from 'uuid';

export async function uploadImage(file: File): Promise<string> {
  const fileRef = ref(storage, `ad-images/${uuidv4()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Firebase auth, storage, and auth context"
```

---

## Task 4: Overlay Card Components

**Files:**
- Create: `src/components/overlay-card.tsx`, `src/components/ad-card.tsx`, `src/components/spotify-card.tsx`

These are the core visual components — every marketplace item renders through these. The design must match the `effect-twitch-integrations` Spotify overlay exactly (320x120, `#24273a` bg, Catppuccin colors).

- [ ] **Step 1: Create the universal card shell**

```tsx
// src/components/overlay-card.tsx
import type { ReactNode } from 'react';

export function OverlayCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[120px] w-80 items-center rounded-md bg-[#24273a] p-2 text-[#cad3f5] shadow-lg">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create the ad card variant**

```tsx
// src/components/ad-card.tsx
import { OverlayCard } from './overlay-card';

type AdCardProps = {
  imageUrl: string | null;
  headline: string;
  subtext: string | null;
  brandUrl: string | null;
};

export function AdCard({ imageUrl, headline, subtext, brandUrl }: AdCardProps) {
  return (
    <OverlayCard>
      {imageUrl ? (
        <img
          src={imageUrl}
          width={64}
          height={64}
          alt="Ad logo"
          className="rounded-md object-cover"
          style={{ aspectRatio: '1 / 1' }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            img.parentElement?.insertAdjacentHTML(
              'afterbegin',
              '<div class="h-16 w-16 rounded-md bg-[#363a4f] flex items-center justify-center"><span class="text-[#6e738d] text-xs">AD</span></div>'
            );
          }}
        />
      ) : (
        <div className="h-16 w-16 rounded-md bg-[#363a4f]" />
      )}
      <div className="flex-grow pl-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">{headline}</h2>
          {subtext && <p className="text-xs">{subtext}</p>}
          {brandUrl && <p className="text-xs text-[#b8c0e0]">{brandUrl}</p>}
        </div>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#a6da95"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-auto w-7 flex-shrink-0"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </OverlayCard>
  );
}
```

- [ ] **Step 3: Create the Spotify card variant**

```tsx
// src/components/spotify-card.tsx
import { OverlayCard } from './overlay-card';

type SpotifyCardProps = {
  trackName?: string;
  artistName?: string;
  albumArtUrl?: string;
  requester?: string;
};

export function SpotifyCard({
  trackName = 'Not Playing',
  artistName = '',
  albumArtUrl,
  requester,
}: SpotifyCardProps) {
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

- [ ] **Step 4: Add `spin-slow` animation to Tailwind config**

In `tailwind.config.ts`, add to `theme.extend`:

```typescript
animation: {
  'spin-slow': 'spin 5s linear infinite',
},
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add overlay card components (ad, spotify, shell)"
```

---

## Task 5: App Layout & Navigation

**Files:**
- Create: `src/components/nav.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create navigation component**

```tsx
// src/components/nav.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';

export function Nav() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <nav className="flex items-center justify-between border-b border-[#363a4f] bg-[#1e2030] px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold text-[#cad3f5]">
          StreamAds
        </Link>
        {user && (
          <>
            <Link href="/dashboard" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
              Dashboard
            </Link>
            <Link href="/marketplace" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
              Marketplace
            </Link>
            <Link href="/create" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
              Create Ad
            </Link>
          </>
        )}
      </div>
      <div>
        {loading ? null : user ? (
          <button
            onClick={signOut}
            className="rounded-md bg-[#363a4f] px-4 py-2 text-sm text-[#cad3f5] hover:bg-[#494d64]"
          >
            Sign Out
          </button>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="rounded-md bg-[#f5bde6] px-4 py-2 text-sm font-medium text-[#24273a] hover:bg-[#c6a0f6]"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth/context';
import { Nav } from '@/components/nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'StreamAds',
  description: 'Run ads on your friends streams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#24273a] text-[#cad3f5]">
        <AuthProvider>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create landing page**

```tsx
// src/app/page.tsx
'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-6 pt-24">
      <h1 className="text-4xl font-bold">StreamAds</h1>
      <p className="text-lg text-[#b8c0e0]">
        Run ads on your friends&apos; streams with OBS browser sources
      </p>
      <button
        onClick={signInWithGoogle}
        className="rounded-md bg-[#f5bde6] px-6 py-3 text-lg font-medium text-[#24273a] hover:bg-[#c6a0f6]"
      >
        Get Started with Google
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add app layout, navigation, and landing page"
```

---

## Task 6: Marketplace API Routes

**Files:**
- Create: `src/app/api/marketplace/route.ts`, `src/app/api/marketplace/[id]/route.ts`
- Test: `__tests__/api/marketplace.test.ts`

- [ ] **Step 1: Write failing test for marketplace GET**

```typescript
// __tests__/api/marketplace.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/auth/verify-token', () => ({
  verifyAuthToken: vi.fn(),
}));

describe('GET /api/marketplace', () => {
  it('returns marketplace items', async () => {
    const { GET } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/marketplace.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement marketplace GET and POST**

```typescript
// src/app/api/marketplace/route.ts
import { db } from '@/lib/db';
import { marketplaceItems, users, adProfileItems } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, ilike, or, and, count, type SQL } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search');
  const type = url.searchParams.get('type');

  const conditions: SQL[] = [];

  if (search) {
    conditions.push(
      or(
        ilike(marketplaceItems.headline, `%${search}%`),
        ilike(marketplaceItems.subtext, `%${search}%`),
        ilike(users.displayName, `%${search}%`)
      )!
    );
  }

  if (type && ['ad', 'spotify', 'placeholder'].includes(type)) {
    conditions.push(eq(marketplaceItems.type, type as 'ad' | 'spotify' | 'placeholder'));
  }

  let query = db
    .select({
      item: marketplaceItems,
      creatorName: users.displayName,
      creatorFirebaseUid: users.firebaseUid,
      usageCount: count(adProfileItems.id),
    })
    .from(marketplaceItems)
    .leftJoin(users, eq(marketplaceItems.creatorId, users.id))
    .leftJoin(adProfileItems, eq(marketplaceItems.id, adProfileItems.itemId))
    .groupBy(marketplaceItems.id, users.displayName, users.firebaseUid)
    .orderBy(marketplaceItems.createdAt)
    .$dynamic();

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const results = await query;

  return NextResponse.json(
    results.map((r) => ({
      ...r.item,
      creatorName: r.creatorName,
      creatorFirebaseUid: r.creatorFirebaseUid,
      usageCount: Number(r.usageCount),
    }))
  );
}

export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { headline, subtext, brandUrl, imageUrl, displayDuration } = body;

  const [item] = await db
    .insert(marketplaceItems)
    .values({
      type: 'ad',
      creatorId: user.id,
      headline,
      subtext,
      brandUrl,
      imageUrl,
      displayDuration: displayDuration || 10,
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
}
```

- [ ] **Step 4: Implement marketplace DELETE**

```typescript
// src/app/api/marketplace/[id]/route.ts
import { db } from '@/lib/db';
import { marketplaceItems } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const deleted = await db
    .delete(marketplaceItems)
    .where(and(eq(marketplaceItems.id, id), eq(marketplaceItems.creatorId, user.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run __tests__/api/marketplace.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add marketplace API routes (GET, POST, DELETE)"
```

---

## Task 7: Profiles API Routes

**Files:**
- Create: `src/app/api/profiles/route.ts`, `src/app/api/profiles/[id]/route.ts`
- Test: `__tests__/api/profiles.test.ts`

- [ ] **Step 1: Write failing test for profiles GET**

```typescript
// __tests__/api/profiles.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'test-id', name: 'Test' }]),
    delete: vi.fn().mockReturnThis(),
    query: {
      adProfiles: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    },
  },
}));

vi.mock('@/lib/auth/verify-token', () => ({
  verifyAuthToken: vi.fn().mockResolvedValue({ id: 'user-1', firebaseUid: 'fb-1' }),
}));

describe('GET /api/profiles', () => {
  it('returns 401 without auth', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce(null);

    const { GET } = await import('@/app/api/profiles/route');
    const request = new Request('http://localhost/api/profiles');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/profiles.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement profiles list and create**

```typescript
// src/app/api/profiles/route.ts
import { db } from '@/lib/db';
import { adProfiles } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profiles = await db
    .select()
    .from(adProfiles)
    .where(eq(adProfiles.ownerId, user.id));

  return NextResponse.json(profiles);
}

export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();

  const [profile] = await db
    .insert(adProfiles)
    .values({ ownerId: user.id, name })
    .returning();

  return NextResponse.json(profile, { status: 201 });
}
```

- [ ] **Step 4: Implement single profile GET, PUT, DELETE**

```typescript
// src/app/api/profiles/[id]/route.ts
import { db } from '@/lib/db';
import { adProfiles, adProfileItems, marketplaceItems } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const profile = await db
    .select()
    .from(adProfiles)
    .where(and(eq(adProfiles.id, id), eq(adProfiles.ownerId, user.id)))
    .limit(1);

  if (profile.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const items = await db
    .select({
      profileItem: adProfileItems,
      marketplaceItem: marketplaceItems,
    })
    .from(adProfileItems)
    .innerJoin(marketplaceItems, eq(adProfileItems.itemId, marketplaceItems.id))
    .where(eq(adProfileItems.profileId, id))
    .orderBy(adProfileItems.sortOrder);

  return NextResponse.json({
    ...profile[0],
    items: items.map((i) => ({
      ...i.profileItem,
      marketplaceItem: i.marketplaceItem,
    })),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const profile = await db
    .select()
    .from(adProfiles)
    .where(and(eq(adProfiles.id, id), eq(adProfiles.ownerId, user.id)))
    .limit(1);

  if (profile.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { name, items } = await request.json();

  // Update profile name if provided
  if (name) {
    await db
      .update(adProfiles)
      .set({ name, updatedAt: new Date() })
      .where(eq(adProfiles.id, id));
  }

  // Full replacement of items
  if (items) {
    await db.delete(adProfileItems).where(eq(adProfileItems.profileId, id));

    if (items.length > 0) {
      await db.insert(adProfileItems).values(
        items.map((item: { itemId: string; displayDuration?: number }, index: number) => ({
          profileId: id,
          itemId: item.itemId,
          displayDuration: item.displayDuration ?? null,
          sortOrder: index,
        }))
      );
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const deleted = await db
    .delete(adProfiles)
    .where(and(eq(adProfiles.id, id), eq(adProfiles.ownerId, user.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run __tests__/api/profiles.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add profiles API routes (CRUD + items management)"
```

---

## Task 8: Overlay API Route

**Files:**
- Create: `src/app/api/overlay/[profileId]/route.ts`
- Test: `__tests__/api/overlay.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/api/overlay.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  },
}));

describe('GET /api/overlay/[profileId]', () => {
  it('returns items for a profile without auth', async () => {
    const { GET } = await import('@/app/api/overlay/[profileId]/route');
    const request = new Request('http://localhost/api/overlay/test-id');
    const response = await GET(request, { params: Promise.resolve({ profileId: 'test-id' }) });
    expect(response.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/overlay.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement overlay GET**

```typescript
// src/app/api/overlay/[profileId]/route.ts
import { db } from '@/lib/db';
import { adProfileItems, marketplaceItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;

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

  return NextResponse.json(result);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/api/overlay.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add public overlay API route"
```

---

## Task 9: Dashboard Page

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Implement dashboard page**

```tsx
// src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetchProfiles();
  }, [user]);

  async function fetchProfiles() {
    const token = await getIdToken();
    const res = await fetch('/api/profiles', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setProfiles(await res.json());
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

  if (loading || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your Ad Profiles</h1>

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

- [ ] **Step 2: Verify page renders**

```bash
npm run dev
```

Visit `http://localhost:3000/dashboard` — should see the profile list (empty state) after login.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add dashboard page with profile CRUD"
```

---

## Task 10: Ad Builder Page

**Files:**
- Create: `src/components/image-upload.tsx`, `src/app/create/page.tsx`

- [ ] **Step 1: Create image upload component**

```tsx
// src/components/image-upload.tsx
'use client';

import { useState, useRef } from 'react';
import { uploadImage } from '@/lib/firebase/storage';

type ImageUploadProps = {
  onUpload: (url: string) => void;
  currentUrl?: string;
};

export function ImageUpload({ onUpload, currentUrl }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      onUpload(url);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  }

  return (
    <div>
      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md bg-[#363a4f] hover:bg-[#494d64]"
      >
        {currentUrl ? (
          <img src={currentUrl} alt="Logo" className="h-16 w-16 rounded-md object-cover" />
        ) : uploading ? (
          <span className="text-xs text-[#b8c0e0]">...</span>
        ) : (
          <span className="text-2xl text-[#6e738d]">+</span>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
```

- [ ] **Step 2: Create ad builder page with live preview**

```tsx
// src/app/create/page.tsx
'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ImageUpload } from '@/components/image-upload';
import { AdCard } from '@/components/ad-card';

export default function CreateAd() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [displayDuration, setDisplayDuration] = useState(10);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  async function publish() {
    if (!headline.trim()) return;
    setPublishing(true);
    const token = await getIdToken();
    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        headline,
        subtext: subtext || null,
        brandUrl: brandUrl || null,
        imageUrl,
        displayDuration,
      }),
    });
    if (res.ok) {
      router.push('/marketplace');
    }
    setPublishing(false);
  }

  if (loading || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Create Ad</h1>

      <div className="grid grid-cols-2 gap-8">
        {/* Form */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Logo / Image</label>
            <ImageUpload onUpload={setImageUrl} currentUrl={imageUrl ?? undefined} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Use Code: FRIEND20"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Subtext</label>
            <input
              type="text"
              value={subtext}
              onChange={(e) => setSubtext(e.target.value)}
              placeholder="20% off your first order"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Brand URL</label>
            <input
              type="text"
              value={brandUrl}
              onChange={(e) => setBrandUrl(e.target.value)}
              placeholder="coolbrand.com"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">
              Display Duration (seconds)
            </label>
            <input
              type="number"
              value={displayDuration}
              onChange={(e) => setDisplayDuration(Number(e.target.value))}
              min={3}
              max={60}
              className="w-24 rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <button
            onClick={publish}
            disabled={publishing || !headline.trim()}
            className="mt-4 rounded-md bg-[#f5bde6] px-6 py-3 font-medium text-[#24273a] hover:bg-[#c6a0f6] disabled:opacity-50"
          >
            {publishing ? 'Publishing...' : 'Publish to Marketplace'}
          </button>
        </div>

        {/* Live Preview */}
        <div>
          <label className="mb-3 block text-sm text-[#b8c0e0]">Live Preview</label>
          <div className="flex items-start justify-center rounded-md bg-[#181926] p-8">
            <AdCard
              imageUrl={imageUrl}
              headline={headline || 'Your Headline'}
              subtext={subtext || null}
              brandUrl={brandUrl || null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify page renders with live preview**

```bash
npm run dev
```

Visit `http://localhost:3000/create` — type in fields and see the card update live.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add ad builder page with image upload and live preview"
```

---

## Task 11: Marketplace Page

**Files:**
- Create: `src/components/add-to-profile-modal.tsx`, `src/app/marketplace/page.tsx`

- [ ] **Step 1: Create "Add to Profile" modal**

```tsx
// src/components/add-to-profile-modal.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';

type Profile = { id: string; name: string };

type AddToProfileModalProps = {
  itemId: string;
  onClose: () => void;
};

export function AddToProfileModal({ itemId, onClose }: AddToProfileModalProps) {
  const { getIdToken } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = await getIdToken();
      const res = await fetch('/api/profiles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProfiles(await res.json());
    }
    load();
  }, [getIdToken]);

  async function addToProfile(profileId: string) {
    setAdding(profileId);
    const token = await getIdToken();

    // Get current profile items
    const profileRes = await fetch(`/api/profiles/${profileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) return;
    const profile = await profileRes.json();

    // Append new item
    const currentItems = (profile.items || []).map((i: { itemId: string; displayDuration?: number }) => ({
      itemId: i.itemId,
      displayDuration: i.displayDuration,
    }));
    currentItems.push({ itemId });

    await fetch(`/api/profiles/${profileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: currentItems }),
    });

    setAdding(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-80 rounded-md bg-[#1e2030] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">Add to Profile</h3>
        {profiles.length === 0 ? (
          <p className="text-sm text-[#b8c0e0]">No profiles yet. Create one on the dashboard.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => addToProfile(p.id)}
                disabled={adding === p.id}
                className="rounded-md bg-[#363a4f] px-4 py-2 text-left text-sm hover:bg-[#494d64] disabled:opacity-50"
              >
                {adding === p.id ? 'Adding...' : p.name}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-md bg-[#363a4f] px-4 py-2 text-sm hover:bg-[#494d64]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create marketplace page**

```tsx
// src/app/marketplace/page.tsx
'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdCard } from '@/components/ad-card';
import { SpotifyCard } from '@/components/spotify-card';
import { AddToProfileModal } from '@/components/add-to-profile-modal';

type MarketplaceItem = {
  id: string;
  type: 'ad' | 'spotify' | 'placeholder';
  creatorFirebaseUid: string | null;
  headline: string | null;
  subtext: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  displayDuration: number;
  creatorName: string | null;
  usageCount: number;
};

export default function Marketplace() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    fetchItems();
  }, [search, typeFilter]);

  async function fetchItems() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    const res = await fetch(`/api/marketplace?${params}`);
    if (res.ok) setItems(await res.json());
  }

  async function deleteItem(id: string) {
    const token = await getIdToken();
    await fetch(`/api/marketplace/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchItems();
  }

  if (loading || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Marketplace</h1>

      <div className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ads..."
          className="flex-grow rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] outline-none"
        >
          <option value="">All Types</option>
          <option value="ad">Ads</option>
          <option value="spotify">Spotify</option>
          <option value="placeholder">Placeholder</option>
        </select>
      </div>

      <div className="grid gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-6 rounded-md bg-[#1e2030] p-4"
          >
            {/* Card Preview */}
            <div className="flex-shrink-0">
              {item.type === 'ad' ? (
                <AdCard
                  imageUrl={item.imageUrl}
                  headline={item.headline || ''}
                  subtext={item.subtext}
                  brandUrl={item.brandUrl}
                />
              ) : item.type === 'spotify' ? (
                <SpotifyCard />
              ) : (
                <div className="flex h-[120px] w-80 items-center justify-center rounded-md bg-[#24273a] text-xs text-[#6e738d]">
                  Placeholder (invisible on stream)
                </div>
              )}
            </div>

            {/* Meta + Actions */}
            <div className="flex flex-grow flex-col gap-2">
              <p className="text-xs text-[#b8c0e0]">
                {item.creatorName ? `by ${item.creatorName}` : 'System'} &middot;{' '}
                {item.usageCount} profile{item.usageCount !== 1 ? 's' : ''} using this
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAddingItemId(item.id)}
                  className="rounded-md bg-[#a6da95] px-3 py-1.5 text-sm text-[#24273a] hover:bg-[#8bd5ca]"
                >
                  Add to Profile
                </button>
                {item.creatorFirebaseUid && user?.uid && item.creatorFirebaseUid === user.uid && (
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="rounded-md bg-[#ed8796] px-3 py-1.5 text-sm text-[#24273a] hover:bg-[#ee99a0]"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {addingItemId && (
        <AddToProfileModal
          itemId={addingItemId}
          onClose={() => setAddingItemId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify marketplace renders with search and filter**

```bash
npm run dev
```

Visit `http://localhost:3000/marketplace` — should see seeded Spotify and Placeholder items.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add marketplace page with search, filter, and add-to-profile"
```

---

## Task 12: Profile Editor Page

**Files:**
- Create: `src/app/profile/[id]/page.tsx`

- [ ] **Step 1: Implement profile editor**

```tsx
// src/app/profile/[id]/page.tsx
'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdCard } from '@/components/ad-card';
import { SpotifyCard } from '@/components/spotify-card';

type ProfileItem = {
  id: string;
  itemId: string;
  displayDuration: number | null;
  sortOrder: number;
  marketplaceItem: {
    id: string;
    type: 'ad' | 'spotify' | 'placeholder';
    headline: string | null;
    subtext: string | null;
    brandUrl: string | null;
    imageUrl: string | null;
    displayDuration: number;
  };
};

type Profile = {
  id: string;
  name: string;
  items: ProfileItem[];
};

export default function ProfileEditor() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, profileId]);

  async function fetchProfile() {
    const token = await getIdToken();
    const res = await fetch(`/api/profiles/${profileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setProfile(await res.json());
    else router.push('/dashboard');
  }

  async function saveItems(items: ProfileItem[]) {
    setSaving(true);
    const token = await getIdToken();
    await fetch(`/api/profiles/${profileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: items.map((i) => ({
          itemId: i.itemId,
          displayDuration: i.displayDuration,
        })),
      }),
    });
    await fetchProfile();
    setSaving(false);
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    if (!profile) return;
    const items = [...profile.items];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    saveItems(items);
  }

  function removeItem(index: number) {
    if (!profile) return;
    const items = profile.items.filter((_, i) => i !== index);
    saveItems(items);
  }

  function updateDuration(index: number, duration: number | null) {
    if (!profile) return;
    const items = [...profile.items];
    items[index] = { ...items[index], displayDuration: duration };
    setProfile({ ...profile, items });
  }

  function saveDuration(index: number) {
    if (!profile) return;
    saveItems(profile.items);
  }

  if (loading || !user || !profile) return null;

  const obsUrl = `${window.location.origin}/overlay/${profile.id}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{profile.name}</h1>
        <div className="flex items-center gap-3">
          <code className="rounded bg-[#1e2030] px-3 py-1.5 text-xs text-[#b8c0e0]">
            {obsUrl}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(obsUrl)}
            className="rounded-md bg-[#a6da95] px-3 py-1.5 text-sm text-[#24273a] hover:bg-[#8bd5ca]"
          >
            Copy
          </button>
        </div>
      </div>

      {profile.items.length === 0 ? (
        <p className="text-[#b8c0e0]">
          No items yet. Add some from the{' '}
          <a href="/marketplace" className="text-[#f5bde6] underline">
            marketplace
          </a>.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {profile.items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-md bg-[#1e2030] p-4"
            >
              {/* Order controls */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="rounded bg-[#363a4f] px-2 py-0.5 text-xs hover:bg-[#494d64] disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === profile.items.length - 1}
                  className="rounded bg-[#363a4f] px-2 py-0.5 text-xs hover:bg-[#494d64] disabled:opacity-30"
                >
                  ↓
                </button>
              </div>

              {/* Card preview */}
              <div className="flex-shrink-0">
                {item.marketplaceItem.type === 'ad' ? (
                  <AdCard
                    imageUrl={item.marketplaceItem.imageUrl}
                    headline={item.marketplaceItem.headline || ''}
                    subtext={item.marketplaceItem.subtext}
                    brandUrl={item.marketplaceItem.brandUrl}
                  />
                ) : item.marketplaceItem.type === 'spotify' ? (
                  <SpotifyCard />
                ) : (
                  <div className="flex h-[120px] w-80 items-center justify-center rounded-md bg-[#24273a] text-xs text-[#6e738d]">
                    Placeholder
                  </div>
                )}
              </div>

              {/* Duration + remove */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#b8c0e0]">Duration:</label>
                  <input
                    type="number"
                    value={item.displayDuration ?? item.marketplaceItem.displayDuration}
                    onChange={(e) => updateDuration(index, Number(e.target.value) || null)}
                    onBlur={() => saveDuration(index)}
                    min={3}
                    max={60}
                    className="w-16 rounded bg-[#363a4f] px-2 py-1 text-sm outline-none"
                  />
                  <span className="text-xs text-[#6e738d]">sec</span>
                </div>
                <button
                  onClick={() => removeItem(index)}
                  className="rounded-md bg-[#ed8796] px-3 py-1 text-xs text-[#24273a] hover:bg-[#ee99a0]"
                >
                  Remove
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

- [ ] **Step 2: Verify profile editor renders and reorders items**

```bash
npm run dev
```

Visit `http://localhost:3000/profile/[id]` — should show items with reorder and duration controls.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add profile editor with reorder, duration, and OBS URL copy"
```

---

## Task 13: OBS Overlay Page

**Files:**
- Create: `src/app/overlay/[profileId]/layout.tsx`, `src/app/overlay/[profileId]/page.tsx`

This is the public page that streamers use as an OBS browser source. No nav, transparent background, auto-cycling cards.

- [ ] **Step 1: Create bare layout (no nav/chrome)**

The overlay needs its own layout without the nav bar. Since Next.js App Router doesn't allow multiple `<html>` roots, the overlay layout just wraps children without the nav:

```tsx
// src/app/overlay/[profileId]/layout.tsx
import '@/app/globals.css';

export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'transparent' }}>{children}</div>;
}
```

Also update the root layout to conditionally exclude the nav for overlay routes. Instead, restructure using route groups:

Move the current root layout to wrap only non-overlay routes by updating `src/app/layout.tsx` to be a minimal shell:

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StreamAds',
  description: 'Run ads on your friends streams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#24273a] text-[#cad3f5]">
        {children}
      </body>
    </html>
  );
}
```

Then wrap the AuthProvider and Nav in a layout for the app pages only. Create `src/app/(app)/layout.tsx`:

```tsx
// src/app/(app)/layout.tsx
import { AuthProvider } from '@/lib/auth/context';
import { Nav } from '@/components/nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </AuthProvider>
  );
}
```

Move the landing page, dashboard, profile, marketplace, and create pages under `src/app/(app)/`. The overlay route stays at `src/app/overlay/` outside the route group so it gets the bare root layout without nav.

Update file structure accordingly:
- `src/app/(app)/page.tsx` — landing
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/profile/[id]/page.tsx`
- `src/app/(app)/marketplace/page.tsx`
- `src/app/(app)/create/page.tsx`
- `src/app/overlay/[profileId]/page.tsx` — no nav, no AuthProvider

- [ ] **Step 2: Create overlay page with rotation engine**

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

export default function OverlayPage() {
  const params = useParams();
  const profileId = params.profileId as string;
  const [items, setItems] = useState<OverlayItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch items
  async function fetchItems() {
    try {
      const res = await fetch(`/api/overlay/${profileId}`);
      if (res.ok) {
        const newItems = await res.json();
        setItems((prev) => {
          // Reset index if item count changed
          if (prev.length !== newItems.length) setCurrentIndex(0);
          return newItems;
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

  // Rotation engine
  useEffect(() => {
    if (items.length === 0) return;

    const current = items[currentIndex % items.length];
    const duration = (current.displayDuration || 10) * 1000;

    timerRef.current = setTimeout(() => {
      // Fade out
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 500); // fade duration
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, items]);

  if (items.length === 0) return null;

  const current = items[currentIndex % items.length];

  // Placeholder renders nothing
  if (current.type === 'placeholder') return null;

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
        <SpotifyCard />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Verify overlay layout is correct**

The overlay layout was already created in Step 1 with `@/app/globals.css` imported and no duplicate `<html>` tags. Verify that `/overlay/[profileId]` renders without the nav bar.

- [ ] **Step 4: Verify overlay works**

```bash
npm run dev
```

Visit `http://localhost:3000/overlay/[profileId]` with a profile that has items — cards should cycle with fade transitions on a transparent background.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add OBS overlay page with rotation engine and polling"
```

---

## Task 14: Final Integration & Cleanup

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run dev server and manually verify full flow**

```bash
npm run dev
```

Test the full flow:
1. Land on `/` → click Sign In
2. Redirected to `/dashboard` → create a profile
3. Go to `/create` → build an ad with image, see live preview, publish
4. Go to `/marketplace` → see the ad, search for it, add to profile
5. Go to `/profile/[id]` → see the item, reorder, copy OBS URL
6. Open OBS URL in new tab → see card cycling on transparent background

- [ ] **Step 3: Run build to check for type errors**

```bash
npm run build
```

Fix any TypeScript errors.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address build errors and cleanup"
```
