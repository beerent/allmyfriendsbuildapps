# Follow System & User Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a follower/following system with a unified user search dropdown in the nav bar. Users can follow/unfollow from search results and profile pages. Profile pages show follower/following counts.

**Architecture:** New `follows` table for the relationship. Search API queries users + social_links with deduplication. SearchDropdown component in the nav handles the UI. Profile API and page updated with counts and follow button.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, PostgreSQL, Tailwind CSS

---

### Task 1: Schema + DB Migration — `follows` table

**Files:**
- Modify: `streamads/src/lib/db/schema.ts`

- [ ] **Step 1: Add follows table to schema**

Add after the `upvotes` table definition in `streamads/src/lib/db/schema.ts`:

```typescript
export const follows = pgTable('follows', {
  id: uuid('id').defaultRandom().primaryKey(),
  followerId: uuid('follower_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  followingId: uuid('following_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique().on(t.followerId, t.followingId),
]);
```

- [ ] **Step 2: Create the table in the database**

```bash
psql postgresql://thedevdad@localhost:5432/streamads -c "
CREATE TABLE follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);"
```

- [ ] **Step 3: Commit**

```bash
git add streamads/src/lib/db/schema.ts
git commit -m "feat: add follows table to schema"
```

---

### Task 2: Follow API — `POST /api/follow`

**Files:**
- Create: `streamads/src/app/api/follow/route.ts`

- [ ] **Step 1: Create the follow toggle endpoint**

```typescript
import { db } from '@/lib/db';
import { follows } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await request.json();
  if (!userId || userId === user.id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Check if already following
  const existing = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(eq(follows.followerId, user.id), eq(follows.followingId, userId)))
    .limit(1);

  if (existing.length > 0) {
    // Unfollow
    await db.delete(follows).where(eq(follows.id, existing[0].id));
    return NextResponse.json({ following: false });
  }

  // Follow
  await db.insert(follows).values({
    followerId: user.id,
    followingId: userId,
  });

  return NextResponse.json({ following: true });
}
```

- [ ] **Step 2: Verify**

```bash
curl -s http://localhost:3000/api/follow -X POST -H "Content-Type: application/json" -d '{}' 2>&1
```

Expected: 401 Unauthorized (no auth token). This confirms the route is loaded.

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/api/follow/
git commit -m "feat: add follow/unfollow toggle API"
```

---

### Task 3: Search API — `GET /api/search`

**Files:**
- Create: `streamads/src/app/api/search/route.ts`

- [ ] **Step 1: Create the search endpoint**

```typescript
import { db } from '@/lib/db';
import { users, socialLinks, follows } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, ilike, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const pattern = `%${q}%`;

  // Search users by username and display name
  const userMatches = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(users)
    .where(or(
      ilike(users.username, pattern),
      ilike(users.displayName, pattern)
    ))
    .limit(20);

  // Search social links
  const socialMatches = await db
    .select({
      userId: socialLinks.userId,
      platform: socialLinks.platform,
      socialUsername: socialLinks.username,
    })
    .from(socialLinks)
    .where(ilike(socialLinks.username, pattern))
    .limit(20);

  // Build deduplicated results
  const resultMap = new Map<string, {
    id: string;
    username: string | null;
    displayName: string;
    matchedPlatforms: string[];
  }>();

  // Add user matches
  for (const u of userMatches) {
    const existing = resultMap.get(u.id) || {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      matchedPlatforms: [],
    };
    // Check which fields matched
    if (u.username && u.username.toLowerCase().includes(q.toLowerCase())) {
      existing.matchedPlatforms.push('username');
    }
    if (u.displayName.toLowerCase().includes(q.toLowerCase())) {
      if (!existing.matchedPlatforms.includes('displayName')) {
        existing.matchedPlatforms.push('displayName');
      }
    }
    resultMap.set(u.id, existing);
  }

  // Add social matches — need to fetch user info for any new users
  const socialUserIds = [...new Set(socialMatches.map((s) => s.userId))];
  const missingUserIds = socialUserIds.filter((id) => !resultMap.has(id));

  if (missingUserIds.length > 0) {
    for (const uid of missingUserIds) {
      const [u] = await db
        .select({ id: users.id, username: users.username, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, uid))
        .limit(1);
      if (u) {
        resultMap.set(u.id, {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          matchedPlatforms: [],
        });
      }
    }
  }

  for (const s of socialMatches) {
    const existing = resultMap.get(s.userId);
    if (existing && !existing.matchedPlatforms.includes(s.platform)) {
      existing.matchedPlatforms.push(s.platform);
    }
  }

  // Get follow status for all results
  const resultIds = [...resultMap.keys()];
  const userFollows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, user.id));
  const followingSet = new Set(userFollows.map((f) => f.followingId));

  // Filter out users without a username (can't link to profile)
  const results = [...resultMap.values()]
    .filter((r) => r.username)
    .slice(0, 10)
    .map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.displayName,
      matchedPlatforms: r.matchedPlatforms,
      isFollowing: followingSet.has(r.id),
    }));

  return NextResponse.json(results);
}
```

- [ ] **Step 2: Verify**

```bash
curl -s "http://localhost:3000/api/search?q=dev" 2>&1
```

Expected: 401 (no auth). Confirms route is loaded.

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/api/search/
git commit -m "feat: add unified user search API"
```

---

### Task 4: Update Profile API — add follower/following counts

**Files:**
- Modify: `streamads/src/app/api/users/[username]/route.ts`

- [ ] **Step 1: Add follow counts and isFollowing to the profile API**

Replace the entire file with:

```typescript
import { db } from '@/lib/db';
import { users, marketplaceItems, socialLinks, follows } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, count, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

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

  // Get marketplace items
  const items = await db
    .select()
    .from(marketplaceItems)
    .where(eq(marketplaceItems.creatorId, user.id))
    .orderBy(marketplaceItems.createdAt);

  // Get follower/following counts
  const [followerResult] = await db
    .select({ count: count() })
    .from(follows)
    .where(eq(follows.followingId, user.id));

  const [followingResult] = await db
    .select({ count: count() })
    .from(follows)
    .where(eq(follows.followerId, user.id));

  // Check if current viewer follows this user
  let isFollowing = false;
  const viewer = await verifyAuthToken(request);
  if (viewer && viewer.id !== user.id) {
    const [followRow] = await db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, viewer.id), eq(follows.followingId, user.id)))
      .limit(1);
    isFollowing = !!followRow;
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      socialLinks: userSocialLinks.map((l) => ({
        platform: l.platform,
        username: l.username,
      })),
      primaryIdentity: primaryLink ? primaryLink.platform : (user.username ? 'username' : null),
      followerCount: Number(followerResult.count),
      followingCount: Number(followingResult.count),
      isFollowing,
    },
    items,
  });
}
```

- [ ] **Step 2: Verify**

```bash
curl -s http://localhost:3000/api/users/thedevdad 2>&1 | head -100
```

Expected: response now includes `followerCount`, `followingCount`, `isFollowing`, and `id` fields.

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/api/users/
git commit -m "feat: add follower/following counts to profile API"
```

---

### Task 5: Search Dropdown Component

**Files:**
- Create: `streamads/src/components/search-dropdown.tsx`
- Modify: `streamads/src/components/nav.tsx`

- [ ] **Step 1: Create the SearchDropdown component**

Create `streamads/src/components/search-dropdown.tsx`. This is a client component that:

- Renders a search input with magnifying glass icon
- Debounces input by 300ms, minimum 2 chars
- Fetches `GET /api/search?q={query}` with auth token
- Shows a dropdown with results below the input
- Each result row: deterministic gradient avatar (hash username to pick 2 colors from `#f5bde6, #c6a0f6, #7dc4e4, #a6da95, #f5a97f, #ed8796, #8bd5ca`) | username + display name | matched platform icons | Follow/Unfollow button
- Platform icons: same SVGs and colors used in marketplace (twitch=#9146FF, youtube=#FF0000, kick=#53FC18, x=#cad3f5, tiktok=#ff0050). For `"username"` match, use the thosewho.stream stacked-cards logo in #a6da95.
- Follow button calls `POST /api/follow` with `{ userId }`, toggles state locally
- Follow button hidden for your own result (compare user.uid against result)
- Clicking username links to `/u/[username]` and closes dropdown
- Clicking outside or pressing Escape closes dropdown
- Styling: match existing app aesthetic — Catppuccin Macchiato, `var(--font-family-display)`, rounded corners, subtle borders

Use the `frontend-design` skill for high design quality.

- [ ] **Step 2: Add SearchDropdown to the nav**

In `streamads/src/components/nav.tsx`, import and render `SearchDropdown` between the nav links and the Sign Out button. Place it in the right section of the nav, before the sign out button:

```typescript
import { SearchDropdown } from './search-dropdown';

// In the nav JSX, replace the right-side div:
<div className="flex items-center gap-4">
  <SearchDropdown />
  {!loading && user && (
    <button onClick={signOut} className="...">Sign Out</button>
  )}
</div>
```

- [ ] **Step 3: Test in browser**

- Type "dev" in the search box — should see results
- Click follow on a result — button should toggle
- Click username — should navigate to profile
- Click outside — dropdown should close

- [ ] **Step 4: Commit**

```bash
git add streamads/src/components/search-dropdown.tsx streamads/src/components/nav.tsx
git commit -m "feat: add search dropdown with follow buttons to nav"
```

---

### Task 6: Update Profile Page — follow button + counts

**Files:**
- Modify: `streamads/src/app/(app)/u/[username]/page.tsx`

- [ ] **Step 1: Add follow counts and button to the profile sidebar**

Read the current profile page file first. Then modify the sidebar to add:

1. After the social links section, add follower/following counts:
```
12 followers · 8 following
```
Use the `followerCount` and `followingCount` from the API response (which now includes them from Task 4).

2. Below the counts, add a Follow/Unfollow button:
- Only visible when viewer is logged in (`useAuth().user` is truthy) AND it's not their own profile
- "Follow" button: green accent background (`bg-[#a6da95] text-[#1e2030]`)
- "Following" button: subtle outline style (`border border-[rgba(202,211,245,0.1)] text-[#b8c0e0]`), text changes to "Unfollow" on hover
- Calls `POST /api/follow` with `{ userId: profile.user.id }` on click, toggles state and updates count locally

3. The API response `user` object now includes `id` and `isFollowing` — use these for the follow logic.

- [ ] **Step 2: Test in browser**

Navigate to `/u/thedevdad` (or another user's profile):
- Follower/following counts should appear
- Follow button should appear (if logged in as different user)
- Clicking follow should toggle and update count

- [ ] **Step 3: Commit**

```bash
git add "streamads/src/app/(app)/u/"
git commit -m "feat: add follow button and counts to profile page"
```
