# Unified Marketplace with Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "card" item type to the unified marketplace — cards have photo, headline, subtext, optional second subtext, and color theming, but no brand URL. Update marketplace filters to show Ads, Cards, and Tools categories.

**Architecture:** Extend the existing `marketplace_items` table with a new `card` enum value and `subtext2` column. Add a `CustomCard` component mirroring `AdCard`. Split the create page into `/create/ad` and `/create/card` routes. Update the marketplace API to handle `type=tools` as a composite filter.

**Tech Stack:** Next.js (App Router), TypeScript, Drizzle ORM, PostgreSQL, Firebase Auth/Storage, Vitest

**Spec:** `docs/superpowers/specs/2026-03-20-unified-marketplace-cards-design.md`

**Important:** Read `AGENTS.md` before writing any code — this Next.js version has breaking changes. Check `node_modules/next/dist/docs/` for API guidance.

---

### Task 1: Schema — Add `card` enum value and `subtext2` column

**Files:**
- Modify: `src/lib/db/schema.ts:10-14` (itemTypeEnum), `src/lib/db/schema.ts:30-41` (marketplaceItems)
- Modify: `__tests__/lib/db/schema.test.ts:48-49`
- Create: `drizzle/` (new migration files)

- [ ] **Step 1: Update the schema test to expect `card` in the enum and `subtext2` on the table**

In `__tests__/lib/db/schema.test.ts`, update the enum values test and add a subtext2 assertion:

```typescript
it('defines item type enum with correct values', () => {
  expect(itemTypeEnum.enumValues).toEqual(['ad', 'card', 'spotify', 'placeholder', 'twitch']);
});
```

Add inside the `'defines marketplace_items table with required columns'` test:
```typescript
expect(marketplaceItems.subtext2).toBeDefined();
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd streamads && npx vitest run __tests__/lib/db/schema.test.ts`
Expected: FAIL — enum doesn't include `card`, `subtext2` not defined

- [ ] **Step 3: Update schema.ts**

In `src/lib/db/schema.ts`, update `itemTypeEnum`:
```typescript
export const itemTypeEnum = pgEnum('item_type', [
  'ad',
  'card',
  'spotify',
  'placeholder',
  'twitch',
]);
```

Add `subtext2` column to `marketplaceItems` table (after `imageUrl`):
```typescript
subtext2: text('subtext2'),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd streamads && npx vitest run __tests__/lib/db/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Generate and fix the database migration**

Run: `cd streamads && npx drizzle-kit generate`

The generated migration will contain `ALTER TYPE item_type ADD VALUE 'card'` which cannot run inside a transaction in PostgreSQL. Edit the generated migration SQL file to split it:
- The `ADD VALUE` statement must have a comment `-- Run outside transaction` or be in a separate migration file
- The `ALTER TABLE marketplace_items ADD COLUMN subtext2 TEXT` can stay in the normal migration

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts __tests__/lib/db/schema.test.ts drizzle/
git commit -m "feat: add card enum value and subtext2 column to schema"
```

---

### Task 2: CustomCard component

**Files:**
- Create: `src/components/custom-card.tsx`
- Reference: `src/components/ad-card.tsx` (follow this pattern exactly)

- [ ] **Step 1: Create `src/components/custom-card.tsx`**

```tsx
import { OverlayCard } from './overlay-card';
import { colorThemes, type ColorTheme, type ColorStyle } from '@/lib/color-themes';

type CustomCardProps = {
  imageUrl: string | null;
  headline: string;
  subtext: string | null;
  subtext2: string | null;
  colorTheme?: ColorTheme;
  colorStyle?: ColorStyle;
};

export function CustomCard({
  imageUrl,
  headline,
  subtext,
  subtext2,
  colorTheme = 'blue',
  colorStyle = 'matched',
}: CustomCardProps) {
  const theme = colorThemes[colorTheme];
  const secondaryColor = colorStyle === 'fulltint' ? theme.accent : '#b8c0e0';

  return (
    <OverlayCard colorTheme={colorTheme}>
      {imageUrl ? (
        <img
          src={imageUrl}
          width={64}
          height={64}
          alt="Card image"
          className="rounded-md object-cover"
          style={{ aspectRatio: '1 / 1' }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            img.parentElement?.insertAdjacentHTML(
              'afterbegin',
              `<div class="h-16 w-16 rounded-md flex items-center justify-center" style="background:${theme.surface}"><span class="text-[#6e738d] text-xs">IMG</span></div>`
            );
          }}
        />
      ) : (
        <div
          className="h-16 w-16 rounded-md"
          style={{ backgroundColor: theme.surface }}
        />
      )}
      <div className="flex-grow pl-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">{headline}</h2>
          {subtext && (
            <p className="text-xs" style={{ color: secondaryColor }}>{subtext}</p>
          )}
          {subtext2 && (
            <p className="text-xs" style={{ color: secondaryColor }}>{subtext2}</p>
          )}
        </div>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke={theme.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-auto w-7 flex-shrink-0"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
      </svg>
    </OverlayCard>
  );
}
```

The icon is a card/rectangle shape (rounded rect with a horizontal line) — visually distinct from the ad's stacked-layers icon.

- [ ] **Step 2: Verify it compiles**

Run: `cd streamads && npx tsc --noEmit --pretty`
Expected: No errors related to `custom-card.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/custom-card.tsx
git commit -m "feat: add CustomCard component for card items"
```

---

### Task 3: Marketplace API — Accept `type` in POST, add `tools` filter to GET

**Files:**
- Modify: `src/app/api/marketplace/route.ts`
- Modify: `__tests__/api/marketplace.test.ts`

- [ ] **Step 1: Add tests for card creation and tools filter**

Add to `__tests__/api/marketplace.test.ts`:

```typescript
it('creates a card item when type is card', async () => {
  const { db } = await import('@/lib/db');
  vi.mocked(db.insert).mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{
        id: 'item-2',
        type: 'card',
        headline: 'My Card',
        subtext2: 'Extra info',
        colorTheme: 'blue',
        colorStyle: 'matched',
      }]),
    }),
  } as any);

  const { verifyAuthToken } = await import('@/lib/auth/verify-token');
  vi.mocked(verifyAuthToken).mockResolvedValueOnce({ id: 'user-1', firebaseUid: 'fb-1' } as any);

  const { POST } = await import('@/app/api/marketplace/route');
  const request = new Request('http://localhost/api/marketplace', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    },
    body: JSON.stringify({
      type: 'card',
      headline: 'My Card',
      subtext2: 'Extra info',
    }),
  });
  const response = await POST(request);
  expect(response.status).toBe(201);
  const data = await response.json();
  expect(data.type).toBe('card');
});

it('rejects card with brandUrl', async () => {
  const { verifyAuthToken } = await import('@/lib/auth/verify-token');
  vi.mocked(verifyAuthToken).mockResolvedValueOnce({ id: 'user-1', firebaseUid: 'fb-1' } as any);

  const { POST } = await import('@/app/api/marketplace/route');
  const request = new Request('http://localhost/api/marketplace', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    },
    body: JSON.stringify({
      type: 'card',
      headline: 'My Card',
      brandUrl: 'bad.com',
    }),
  });
  const response = await POST(request);
  expect(response.status).toBe(400);
});

it('filters by tools category', async () => {
  const { GET } = await import('@/app/api/marketplace/route');
  const request = new Request('http://localhost/api/marketplace?type=tools');
  const response = await GET(request);
  expect(response.status).toBe(200);
});

it('rejects ad with subtext2', async () => {
  const { verifyAuthToken } = await import('@/lib/auth/verify-token');
  vi.mocked(verifyAuthToken).mockResolvedValueOnce({ id: 'user-1', firebaseUid: 'fb-1' } as any);

  const { POST } = await import('@/app/api/marketplace/route');
  const request = new Request('http://localhost/api/marketplace', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    },
    body: JSON.stringify({
      headline: 'My Ad',
      subtext2: 'should not be here',
    }),
  });
  const response = await POST(request);
  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd streamads && npx vitest run __tests__/api/marketplace.test.ts`
Expected: FAIL — POST doesn't accept `type`, no validation

- [ ] **Step 3: Update POST handler in `src/app/api/marketplace/route.ts`**

Replace the POST function:

```typescript
export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { headline, subtext, brandUrl, imageUrl, colorTheme, colorStyle, subtext2 } = body;
  const type = body.type || 'ad';

  if (type === 'card' && brandUrl) {
    return NextResponse.json({ error: 'Cards cannot have a brand URL' }, { status: 400 });
  }
  if (type === 'ad' && subtext2) {
    return NextResponse.json({ error: 'Ads cannot have a second subtext' }, { status: 400 });
  }

  const [item] = await db
    .insert(marketplaceItems)
    .values({
      type,
      creatorId: user.id,
      headline,
      subtext,
      brandUrl: type === 'card' ? null : brandUrl,
      imageUrl,
      subtext2: type === 'ad' ? null : subtext2,
      colorTheme: colorTheme || 'blue',
      colorStyle: colorStyle || 'matched',
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
}
```

- [ ] **Step 4: Update GET handler — add `card` and `tools` filter support**

In the GET function, replace the type filter block:

```typescript
if (type === 'tools') {
  conditions.push(
    or(
      eq(marketplaceItems.type, 'spotify'),
      eq(marketplaceItems.type, 'placeholder'),
      eq(marketplaceItems.type, 'twitch')
    )!
  );
} else if (type && ['ad', 'card', 'spotify', 'placeholder', 'twitch'].includes(type)) {
  conditions.push(eq(marketplaceItems.type, type as any));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd streamads && npx vitest run __tests__/api/marketplace.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/marketplace/route.ts __tests__/api/marketplace.test.ts
git commit -m "feat: accept card type in POST, add tools filter to GET"
```

---

### Task 4: Create pages — move ad, add card creator, add index

**Files:**
- Move: `src/app/(app)/create/page.tsx` → `src/app/(app)/create/ad/page.tsx`
- Create: `src/app/(app)/create/card/page.tsx`
- Create: `src/app/(app)/create/page.tsx` (index)

- [ ] **Step 1: Move existing create page to `/create/ad/`**

```bash
cd streamads && mkdir -p src/app/\(app\)/create/ad
mv src/app/\(app\)/create/page.tsx src/app/\(app\)/create/ad/page.tsx
```

No code changes needed — the file is self-contained.

- [ ] **Step 2: Create the create index page at `src/app/(app)/create/page.tsx`**

```tsx
'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function CreateIndex() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Create</h1>
      <div className="grid grid-cols-2 gap-6">
        <Link
          href="/create/ad"
          className="flex flex-col gap-2 rounded-md bg-[#1e2030] p-6 hover:bg-[#363a4f]"
        >
          <h2 className="text-lg font-semibold text-[#cad3f5]">Create Ad</h2>
          <p className="text-sm text-[#b8c0e0]">
            Promote a brand with a logo, headline, subtext, and URL.
          </p>
        </Link>
        <Link
          href="/create/card"
          className="flex flex-col gap-2 rounded-md bg-[#1e2030] p-6 hover:bg-[#363a4f]"
        >
          <h2 className="text-lg font-semibold text-[#cad3f5]">Create Card</h2>
          <p className="text-sm text-[#b8c0e0]">
            Share a custom card with a photo, headline, and text.
          </p>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the card creator at `src/app/(app)/create/card/page.tsx`**

```tsx
'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ImageUpload } from '@/components/image-upload';
import { CustomCard } from '@/components/custom-card';
import { ColorPicker } from '@/components/color-picker';
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';

export default function CreateCard() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [subtext2, setSubtext2] = useState('');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('blue');
  const [colorStyle, setColorStyle] = useState<ColorStyle>('matched');
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
        type: 'card',
        headline,
        subtext: subtext || null,
        subtext2: subtext2 || null,
        imageUrl,
        colorTheme,
        colorStyle,
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
      <h1 className="mb-6 text-2xl font-bold">Create Card</h1>

      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Photo / Image</label>
            <ImageUpload onUpload={setImageUrl} currentUrl={imageUrl ?? undefined} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Your headline here"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Subtext</label>
            <input
              type="text"
              value={subtext}
              onChange={(e) => setSubtext(e.target.value)}
              placeholder="A short description"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Second Subtext (optional)</label>
            <input
              type="text"
              value={subtext2}
              onChange={(e) => setSubtext2(e.target.value)}
              placeholder="Additional info"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <ColorPicker
              selectedTheme={colorTheme}
              selectedStyle={colorStyle}
              onThemeChange={setColorTheme}
              onStyleChange={setColorStyle}
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

        <div>
          <label className="mb-3 block text-sm text-[#b8c0e0]">Live Preview</label>
          <div className="flex items-start justify-center rounded-md bg-[#181926] p-8">
            <CustomCard
              imageUrl={imageUrl}
              headline={headline || 'Your Headline'}
              subtext={subtext || null}
              subtext2={subtext2 || null}
              colorTheme={colorTheme}
              colorStyle={colorStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd streamads && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/create/
git commit -m "feat: split create into /create/ad and /create/card with index page"
```

---

### Task 5: Nav — update links and search placeholder

**Files:**
- Modify: `src/components/nav.tsx:23-25`

- [ ] **Step 1: Update nav links**

In `src/components/nav.tsx`, replace the "Create Ad" link:

```tsx
<Link href="/create/ad" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
  Create Ad
</Link>
<Link href="/create/card" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
  Create Card
</Link>
```

- [ ] **Step 2: Verify it compiles**

Run: `cd streamads && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/nav.tsx
git commit -m "feat: add Create Card link to nav"
```

---

### Task 6: Marketplace page — add card rendering and update filters

**Files:**
- Modify: `src/app/(app)/marketplace/page.tsx`

- [ ] **Step 1: Add `CustomCard` import and update types**

At the top of `src/app/(app)/marketplace/page.tsx`, add the import:
```typescript
import { CustomCard } from '@/components/custom-card';
```

Update the `MarketplaceItem` type:
```typescript
type MarketplaceItem = {
  id: string;
  type: 'ad' | 'card' | 'spotify' | 'placeholder' | 'twitch';
  creatorFirebaseUid: string | null;
  headline: string | null;
  subtext: string | null;
  subtext2: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  creatorName: string | null;
  usageCount: number;
  colorTheme: string;
  colorStyle: string;
};
```

- [ ] **Step 2: Update the filter dropdown**

Replace the `<select>` options:
```tsx
<select
  value={typeFilter}
  onChange={(e) => setTypeFilter(e.target.value)}
  className="rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] outline-none"
>
  <option value="">All</option>
  <option value="ad">Ads</option>
  <option value="card">Cards</option>
  <option value="tools">Tools</option>
</select>
```

- [ ] **Step 3: Update the search placeholder**

Change `placeholder="Search ads..."` to `placeholder="Search marketplace..."`

- [ ] **Step 4: Add card rendering case**

In the card preview section, add the `card` case after the `ad` case:

```tsx
{item.type === 'ad' ? (
  <AdCard
    imageUrl={item.imageUrl}
    headline={item.headline || ''}
    subtext={item.subtext}
    brandUrl={item.brandUrl}
    colorTheme={item.colorTheme as ColorTheme}
    colorStyle={item.colorStyle as ColorStyle}
  />
) : item.type === 'card' ? (
  <CustomCard
    imageUrl={item.imageUrl}
    headline={item.headline || ''}
    subtext={item.subtext}
    subtext2={item.subtext2}
    colorTheme={item.colorTheme as ColorTheme}
    colorStyle={item.colorStyle as ColorStyle}
  />
) : item.type === 'spotify' ? (
  <SpotifyCard />
) : (
  <div className="flex h-[120px] w-80 items-center justify-center rounded-md bg-[#24273a] text-xs text-[#6e738d]">
    Placeholder (invisible on stream)
  </div>
)}
```

- [ ] **Step 5: Verify it compiles**

Run: `cd streamads && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/marketplace/page.tsx
git commit -m "feat: add card rendering and unified filters to marketplace"
```

---

### Task 7: Overlay — render card type

**Files:**
- Modify: `src/app/overlay/[profileId]/page.tsx:9-18` (type), `src/app/overlay/[profileId]/page.tsx:83-94` (rendering)

- [ ] **Step 1: Add `CustomCard` import and update type**

At the top of `src/app/overlay/[profileId]/page.tsx`, add:
```typescript
import { CustomCard } from '@/components/custom-card';
```

Update `OverlayItem` type to add `card` and `subtext2`:
```typescript
type OverlayItem = {
  id: string;
  type: 'ad' | 'card' | 'spotify' | 'placeholder' | 'twitch';
  headline: string | null;
  subtext: string | null;
  subtext2: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  displayDuration: number;
  colorTheme: string;
  colorStyle: string;
};
```

- [ ] **Step 2: Add card rendering case**

In the return JSX, add the card case after the ad case:

```tsx
{current.type === 'ad' ? (
  <AdCard
    imageUrl={current.imageUrl}
    headline={current.headline || ''}
    subtext={current.subtext}
    brandUrl={current.brandUrl}
    colorTheme={current.colorTheme as ColorTheme}
    colorStyle={current.colorStyle as ColorStyle}
  />
) : current.type === 'card' ? (
  <CustomCard
    imageUrl={current.imageUrl}
    headline={current.headline || ''}
    subtext={current.subtext}
    subtext2={current.subtext2}
    colorTheme={current.colorTheme as ColorTheme}
    colorStyle={current.colorStyle as ColorStyle}
  />
) : current.type === 'spotify' ? (
  <SpotifyCard />
) : null}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd streamads && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/overlay/\[profileId\]/page.tsx
git commit -m "feat: render card type in OBS overlay"
```

---

### Note: Overlay API (`src/app/api/overlay/[profileId]/route.ts`)

No changes needed. The overlay API uses `...i.marketplaceItem` spread when building the response, so `subtext2` is automatically included once the schema column is added in Task 1.

---

### Task 8: Run all tests and verify

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `cd streamads && npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run type check**

Run: `cd streamads && npx tsc --noEmit --pretty`
Expected: No type errors

- [ ] **Step 3: Verify dev server starts**

Run: `cd streamads && npx next build` (or `npx next dev` and check for errors)
Expected: Build succeeds without errors
