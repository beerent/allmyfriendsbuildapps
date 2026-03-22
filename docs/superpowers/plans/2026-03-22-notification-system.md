# Notification System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bell icon notification system in the nav that alerts users when someone follows them, adds their card, or upvotes their card.

**Architecture:** New `notifications` table, three API routes (list, count, mark-read), notification inserts added to existing follow/upvote/profile handlers, and a NotificationBell component in the nav.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, PostgreSQL, Tailwind CSS

---

### Task 1: Schema + DB — notifications table

**Files:**
- Modify: `streamads/src/lib/db/schema.ts`

- [ ] **Step 1: Add notifications table to schema**

Add after the `follows` table in `streamads/src/lib/db/schema.ts`:

```typescript
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(), // 'follow' | 'card_added' | 'upvote'
  actorId: uuid('actor_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  targetId: uuid('target_id'), // marketplace item ID, nullable
  read: integer('read').default(0).notNull(), // 0 = unread, 1 = read
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

- [ ] **Step 2: Create table in database**

```bash
psql postgresql://thedevdad@localhost:5432/streamads -c "
CREATE TABLE notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id uuid,
  read integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, read, created_at DESC);"
```

- [ ] **Step 3: Commit**

```bash
git add streamads/src/lib/db/schema.ts
git commit -m "feat: add notifications table to schema"
```

---

### Task 2: Notification API routes

**Files:**
- Create: `streamads/src/app/api/notifications/route.ts`
- Create: `streamads/src/app/api/notifications/count/route.ts`

- [ ] **Step 1: Create GET list + PUT mark-read route**

Create `streamads/src/app/api/notifications/route.ts`:

```typescript
import { db } from '@/lib/db';
import { notifications, users, marketplaceItems } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      targetId: notifications.targetId,
      read: notifications.read,
      createdAt: notifications.createdAt,
      actorUsername: users.username,
      actorDisplayName: users.displayName,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorId, users.id))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  // Get target headlines for card_added/upvote notifications
  const targetIds = rows.filter((r) => r.targetId).map((r) => r.targetId!);
  const targets = targetIds.length > 0
    ? await db.select({ id: marketplaceItems.id, headline: marketplaceItems.headline }).from(marketplaceItems)
    : [];
  const targetMap = new Map(targets.map((t) => [t.id, t.headline]));

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      actorUsername: r.actorUsername,
      actorDisplayName: r.actorDisplayName,
      targetId: r.targetId,
      targetHeadline: r.targetId ? targetMap.get(r.targetId) ?? null : null,
      read: r.read === 1,
      createdAt: r.createdAt,
    }))
  );
}

export async function PUT(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.update(notifications).set({ read: 1 }).where(eq(notifications.userId, user.id));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create unread count route**

Create `streamads/src/app/api/notifications/count/route.ts`:

```typescript
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, and, count } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.read, 0)));

  return NextResponse.json({ count: Number(result.count) });
}
```

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/api/notifications/
git commit -m "feat: add notification list, count, and mark-read APIs"
```

---

### Task 3: Add notification triggers to existing APIs

**Files:**
- Modify: `streamads/src/app/api/follow/route.ts`
- Modify: `streamads/src/app/api/upvotes/route.ts`
- Modify: `streamads/src/app/api/profiles/[id]/route.ts`

- [ ] **Step 1: Add follow notification**

In `streamads/src/app/api/follow/route.ts`, import `notifications` from schema. After the successful follow insert (the `db.insert(follows)` line), add:

```typescript
// Notify the followed user
await db.insert(notifications).values({
  userId: userId, // the person being followed
  type: 'follow',
  actorId: user.id,
});
```

Only on follow, not unfollow (already in the else branch).

- [ ] **Step 2: Add upvote notification**

In `streamads/src/app/api/upvotes/route.ts`, import `notifications` and `marketplaceItems` from schema. After the successful upvote insert, add:

```typescript
// Notify the card creator (if not self and not system)
const [item] = await db.select({ creatorId: marketplaceItems.creatorId }).from(marketplaceItems).where(eq(marketplaceItems.id, itemId)).limit(1);
if (item?.creatorId && item.creatorId !== user.id) {
  await db.insert(notifications).values({
    userId: item.creatorId,
    type: 'upvote',
    actorId: user.id,
    targetId: itemId,
  });
}
```

Only on upvote, not un-upvote.

- [ ] **Step 3: Add card-added notification**

In `streamads/src/app/api/profiles/[id]/route.ts`, in the PUT handler, after items are inserted, determine which items are new and notify their creators. Import `notifications` and `marketplaceItems` from schema.

After the `db.insert(adProfileItems)` block, add:

```typescript
// Notify creators of newly added items
if (items && items.length > 0) {
  const itemIds = items.map((i: { itemId: string }) => i.itemId);
  for (const iid of itemIds) {
    const [mi] = await db.select({ creatorId: marketplaceItems.creatorId }).from(marketplaceItems).where(eq(marketplaceItems.id, iid)).limit(1);
    if (mi?.creatorId && mi.creatorId !== user.id) {
      await db.insert(notifications).values({
        userId: mi.creatorId,
        type: 'card_added',
        actorId: user.id,
        targetId: iid,
      });
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add streamads/src/app/api/follow/ streamads/src/app/api/upvotes/ streamads/src/app/api/profiles/
git commit -m "feat: add notification triggers for follow, upvote, and card-add"
```

---

### Task 4: NotificationBell component + Nav integration

**Files:**
- Create: `streamads/src/components/notification-bell.tsx`
- Modify: `streamads/src/components/nav.tsx`

- [ ] **Step 1: Create NotificationBell component**

Create `streamads/src/components/notification-bell.tsx`. Client component that:

- Renders a bell SVG icon with red unread count badge
- Polls `GET /api/notifications/count` on mount + every 60s with auth token
- On click, opens dropdown and fetches `GET /api/notifications` with auth token
- Each notification row: small gradient avatar (hash actor username for colors, same palette as profile page: #f5bde6, #c6a0f6, #7dc4e4, #a6da95, #f5a97f, #ed8796, #8bd5ca) + message + relative time
- Messages: follow → "**{actor}** followed you", card_added → "**{actor}** added **{headline}**", upvote → "**{actor}** upvoted **{headline}**"
- Unread rows: subtle green left border
- Click row: follow → `/u/{actorUsername}`, card_added/upvote → `/marketplace`
- "Mark all read" button at bottom, calls `PUT /api/notifications`
- Close on outside click or Escape
- Relative time helper: <60s → "just now", <60m → "{n}m", <24h → "{n}h", else "{n}d"

Styling: Catppuccin Macchiato dark theme. Dropdown background `#24273a`, border `rgba(202,211,245,0.06)`, shadow. Font: `var(--font-family-display)`.

Use the `frontend-design` skill for high design quality.

- [ ] **Step 2: Add NotificationBell to nav**

In `streamads/src/components/nav.tsx`, import `NotificationBell` and add it in the right-side div, between `SearchDropdown` and the profile link:

```tsx
<SearchDropdown />
<NotificationBell />
{username ? ( ... ) : ( ... )}
```

- [ ] **Step 3: Test**

- Verify bell appears in nav
- Follow a test user → check their notifications
- Upvote a card → check creator's notifications
- Add a card to profile → check creator's notifications

- [ ] **Step 4: Commit**

```bash
git add streamads/src/components/notification-bell.tsx streamads/src/components/nav.tsx
git commit -m "feat: add notification bell with dropdown to nav"
```
