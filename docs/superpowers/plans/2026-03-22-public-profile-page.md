# Public Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a public user profile page at `/u/[username]` showing identity, social links, and marketplace cards.

**Architecture:** New API route queries user by username and joins their marketplace items + social links. New page component renders a sidebar layout with profile info left and cards right. Reuses all existing card components and the AddToProfileModal.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, PostgreSQL, Tailwind CSS

---

### Task 1: API Route — `GET /api/users/[username]`

**Files:**
- Create: `streamads/src/app/api/users/[username]/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
import { db } from '@/lib/db';
import { users, marketplaceItems, socialLinks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  // Find user by username
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get social links
  const userSocialLinks = await db
    .select({
      platform: socialLinks.platform,
      username: socialLinks.username,
      isPrimary: socialLinks.isPrimary,
    })
    .from(socialLinks)
    .where(eq(socialLinks.userId, user.id));

  const primaryLink = userSocialLinks.find((l) => l.isPrimary);

  // Get marketplace items created by this user
  const items = await db
    .select()
    .from(marketplaceItems)
    .where(eq(marketplaceItems.creatorId, user.id))
    .orderBy(marketplaceItems.createdAt);

  return NextResponse.json({
    user: {
      username: user.username,
      displayName: user.displayName,
      socialLinks: userSocialLinks.map((l) => ({
        platform: l.platform,
        username: l.username,
      })),
      primaryIdentity: primaryLink ? primaryLink.platform : (user.username ? 'username' : null),
    },
    items,
  });
}
```

- [ ] **Step 2: Verify the route works**

Run: `curl -s http://localhost:3000/api/users/thedevdad | head -100`

Set your username to `thedevdad` first if not already done via the settings page. Expected: JSON with user object and items array, or 404 if username not set.

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/api/users/
git commit -m "feat: add public user profile API route"
```

---

### Task 2: Profile Page Component

**Files:**
- Create: `streamads/src/app/(app)/u/[username]/page.tsx`

- [ ] **Step 1: Create the page component**

Build a client component with sidebar layout. Key details:

- Fetches `/api/users/[username]` on mount
- Left sidebar (sticky): generated gradient avatar, username, display name, social links as clickable icons
- Right content: cards list using existing AdCard, SpotifyCard, TwitchCard, KofiCard, BmcCard components
- "Add to Profile" button per card, visible only when logged in (use `useAuth()`)
- AddToProfileModal for the add flow
- 404 state when user not found
- Empty state when no cards
- Social link URLs: twitch→`https://twitch.tv/{u}`, youtube→`https://youtube.com/@{u}`, kick→`https://kick.com/{u}`, x→`https://x.com/{u}`, tiktok→`https://tiktok.com/@{u}`

Platform icons: reuse the same SVG icons from the marketplace page (`PLATFORM_ICONS` pattern).

Avatar generation: create a deterministic gradient from the username string. Hash the username to pick two colors from a palette.

Styling must match existing app aesthetic: Catppuccin Macchiato colors, `var(--font-family-display)` font, glass effects, rounded corners.

```typescript
// Core structure (not complete — use frontend-design skill for full implementation):

'use client';

import { useAuth } from '@/lib/auth/context';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdCard } from '@/components/ad-card';
import { SpotifyCard } from '@/components/spotify-card';
import { TwitchCard } from '@/components/twitch-card';
import { KofiCard } from '@/components/kofi-card';
import { BmcCard } from '@/components/bmc-card';
import { AddToProfileModal } from '@/components/add-to-profile-modal';
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';

// ... types, platform icons, social URLs, avatar gradient helper ...

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/users/${username}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setProfile)
      .catch(() => setNotFound(true));
  }, [username]);

  // Render: sidebar left + cards right
  // ...
}
```

Use the `frontend-design` skill when implementing this component for high design quality.

- [ ] **Step 2: Test the page in browser**

Navigate to `http://localhost:3000/u/thedevdad` (or whatever username is claimed).

Verify:
- Profile info shows in left sidebar
- Social links are clickable and open correct URLs
- Cards render with proper card components
- "Add to Profile" button appears only when logged in
- 404 state works for `/u/nonexistent`

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/\(app\)/u/
git commit -m "feat: add public profile page at /u/[username]"
```
