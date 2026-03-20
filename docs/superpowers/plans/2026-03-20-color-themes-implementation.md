# Color Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 color themes and 2 style options (matched, fulltint) to ad cards, selectable by the creator in the ad builder.

**Architecture:** Two new enum columns on `marketplace_items`, a shared theme map constant, updated card components that accept theme/style props, a color picker in the builder, and prop forwarding on all pages that render `AdCard`.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, Vitest

**Spec:** `docs/superpowers/specs/2026-03-20-color-themes-design.md`

---

## File Structure

```
src/
├── lib/
│   └── color-themes.ts                          # Theme map + types (NEW)
├── components/
│   ├── overlay-card.tsx                          # Add colorTheme prop (MODIFY)
│   ├── ad-card.tsx                               # Add colorTheme + colorStyle props (MODIFY)
│   └── color-picker.tsx                          # Theme + style picker for builder (NEW)
├── app/
│   ├── (app)/
│   │   ├── create/
│   │   │   └── page.tsx                          # Add color picker, wire to preview + POST (MODIFY)
│   │   ├── marketplace/
│   │   │   └── page.tsx                          # Forward theme props to AdCard (MODIFY)
│   │   └── profile/
│   │       └── [id]/
│   │           └── page.tsx                      # Forward theme props to AdCard (MODIFY)
│   ├── overlay/
│   │   └── [profileId]/
│   │       └── page.tsx                          # Forward theme props to AdCard (MODIFY)
│   └── api/
│       └── marketplace/
│           └── route.ts                          # Accept colorTheme + colorStyle in POST (MODIFY)
└── lib/
    └── db/
        └── schema.ts                             # Add enums + columns (MODIFY)

__tests__/
├── lib/
│   └── color-themes.test.ts                      # Theme map tests (NEW)
└── api/
    └── marketplace.test.ts                       # Updated POST test (MODIFY)
```

---

## Task 1: Theme Map & Types

**Files:**
- Create: `src/lib/color-themes.ts`
- Test: `__tests__/lib/color-themes.test.ts`

- [ ] **Step 1: Write failing test for theme map**

```typescript
// __tests__/lib/color-themes.test.ts
import { describe, it, expect } from 'vitest';
import {
  colorThemes,
  COLOR_THEME_KEYS,
  COLOR_STYLE_KEYS,
  type ColorTheme,
  type ColorStyle,
} from '@/lib/color-themes';

describe('color themes', () => {
  it('defines 8 themes', () => {
    expect(COLOR_THEME_KEYS).toHaveLength(8);
    expect(COLOR_THEME_KEYS).toEqual([
      'blue', 'purple', 'magenta', 'red', 'orange', 'green', 'teal', 'slate',
    ]);
  });

  it('defines 2 styles', () => {
    expect(COLOR_STYLE_KEYS).toEqual(['matched', 'fulltint']);
  });

  it('each theme has bg, surface, and accent hex colors', () => {
    const hexPattern = /^#[0-9a-f]{6}$/;
    for (const key of COLOR_THEME_KEYS) {
      const theme = colorThemes[key];
      expect(theme.bg).toMatch(hexPattern);
      expect(theme.surface).toMatch(hexPattern);
      expect(theme.accent).toMatch(hexPattern);
    }
  });

  it('blue theme matches Catppuccin Macchiato base', () => {
    expect(colorThemes.blue.bg).toBe('#24273a');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/color-themes.test.ts
```

Expected: FAIL — module `@/lib/color-themes` not found

- [ ] **Step 3: Create theme map**

```typescript
// src/lib/color-themes.ts
export const colorThemes = {
  blue:    { bg: '#24273a', surface: '#363a4f', accent: '#7dc4e4' },
  purple:  { bg: '#2a2440', surface: '#3d3555', accent: '#c6a0f6' },
  magenta: { bg: '#302438', surface: '#45354d', accent: '#f5bde6' },
  red:     { bg: '#302428', surface: '#453535', accent: '#ed8796' },
  orange:  { bg: '#302a24', surface: '#453d35', accent: '#f5a97f' },
  green:   { bg: '#243028', surface: '#354540', accent: '#a6da95' },
  teal:    { bg: '#243038', surface: '#354550', accent: '#8bd5ca' },
  slate:   { bg: '#282a2e', surface: '#3e4045', accent: '#939ab7' },
} as const;

export type ColorTheme = keyof typeof colorThemes;
export type ColorStyle = 'matched' | 'fulltint';

export const COLOR_THEME_KEYS = Object.keys(colorThemes) as ColorTheme[];
export const COLOR_STYLE_KEYS: ColorStyle[] = ['matched', 'fulltint'];
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/color-themes.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/color-themes.ts __tests__/lib/color-themes.test.ts
git commit -m "feat: add color theme map and types"
```

---

## Task 2: Database Schema Changes

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `__tests__/lib/db/schema.test.ts`

- [ ] **Step 1: Add failing test for new columns**

Add to the existing `marketplace_items` test in `__tests__/lib/db/schema.test.ts`:

```typescript
it('defines color theme and style columns on marketplace_items', () => {
  expect(marketplaceItems.colorTheme).toBeDefined();
  expect(marketplaceItems.colorStyle).toBeDefined();
});

it('defines color theme enum with correct values', () => {
  expect(colorThemeEnum.enumValues).toEqual([
    'blue', 'purple', 'magenta', 'red', 'orange', 'green', 'teal', 'slate',
  ]);
});

it('defines color style enum with correct values', () => {
  expect(colorStyleEnum.enumValues).toEqual(['matched', 'fulltint']);
});
```

Also add `colorThemeEnum` and `colorStyleEnum` to the import at the top of the test file:

```typescript
import {
  users,
  marketplaceItems,
  adProfiles,
  adProfileItems,
  itemTypeEnum,
  colorThemeEnum,
  colorStyleEnum,
} from '@/lib/db/schema';
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/lib/db/schema.test.ts
```

Expected: FAIL — `colorThemeEnum` and `colorStyleEnum` not exported

- [ ] **Step 3: Add enums and columns to schema**

In `src/lib/db/schema.ts`, add the two new enums after `itemTypeEnum`:

```typescript
export const colorThemeEnum = pgEnum('color_theme', [
  'blue', 'purple', 'magenta', 'red', 'orange', 'green', 'teal', 'slate',
]);

export const colorStyleEnum = pgEnum('color_style', ['matched', 'fulltint']);
```

Add two columns to the `marketplaceItems` table definition, after the `imageUrl` column:

```typescript
colorTheme: colorThemeEnum('color_theme').default('blue').notNull(),
colorStyle: colorStyleEnum('color_style').default('matched').notNull(),
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/lib/db/schema.test.ts
```

Expected: PASS

- [ ] **Step 5: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Expected: Migration creates `color_theme` and `color_style` enums and adds the two columns with defaults. Existing rows get `blue`/`matched`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts __tests__/lib/db/schema.test.ts drizzle/
git commit -m "feat: add colorTheme and colorStyle to marketplace_items schema"
```

---

## Task 3: Update OverlayCard Component

**Files:**
- Modify: `src/components/overlay-card.tsx`

- [ ] **Step 1: Update OverlayCard to accept colorTheme prop**

Replace the contents of `src/components/overlay-card.tsx`:

```tsx
// src/components/overlay-card.tsx
import type { ReactNode } from 'react';
import { colorThemes, type ColorTheme } from '@/lib/color-themes';

type OverlayCardProps = {
  children: ReactNode;
  colorTheme?: ColorTheme;
};

export function OverlayCard({ children, colorTheme = 'blue' }: OverlayCardProps) {
  const theme = colorThemes[colorTheme];
  return (
    <div
      className="flex h-[120px] w-80 items-center rounded-md p-2 text-[#cad3f5] shadow-lg"
      style={{ backgroundColor: theme.bg }}
    >
      {children}
    </div>
  );
}
```

Note: background color moves from the Tailwind class `bg-[#24273a]` to an inline `style` since it's now dynamic.

- [ ] **Step 2: Commit**

```bash
git add src/components/overlay-card.tsx
git commit -m "feat: add colorTheme prop to OverlayCard"
```

---

## Task 4: Update AdCard Component

**Files:**
- Modify: `src/components/ad-card.tsx`

- [ ] **Step 1: Update AdCard to accept and apply theme props**

Replace the contents of `src/components/ad-card.tsx`:

```tsx
// src/components/ad-card.tsx
import { OverlayCard } from './overlay-card';
import { colorThemes, type ColorTheme, type ColorStyle } from '@/lib/color-themes';

type AdCardProps = {
  imageUrl: string | null;
  headline: string;
  subtext: string | null;
  brandUrl: string | null;
  colorTheme?: ColorTheme;
  colorStyle?: ColorStyle;
};

export function AdCard({
  imageUrl,
  headline,
  subtext,
  brandUrl,
  colorTheme = 'blue',
  colorStyle = 'matched',
}: AdCardProps) {
  const theme = colorThemes[colorTheme];
  const secondaryColor = colorStyle === 'fulltint' ? theme.accent : '#b8c0e0';

  return (
    <OverlayCard colorTheme={colorTheme}>
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
              `<div class="h-16 w-16 rounded-md flex items-center justify-center" style="background:${theme.surface}"><span class="text-[#6e738d] text-xs">AD</span></div>`
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
          {brandUrl && (
            <p className="text-xs" style={{ color: secondaryColor }}>{brandUrl}</p>
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
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </OverlayCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ad-card.tsx
git commit -m "feat: add colorTheme and colorStyle props to AdCard"
```

---

## Task 5: Color Picker Component

**Files:**
- Create: `src/components/color-picker.tsx`

- [ ] **Step 1: Create the color picker component**

```tsx
// src/components/color-picker.tsx
'use client';

import {
  colorThemes,
  COLOR_THEME_KEYS,
  COLOR_STYLE_KEYS,
  type ColorTheme,
  type ColorStyle,
} from '@/lib/color-themes';

type ColorPickerProps = {
  selectedTheme: ColorTheme;
  selectedStyle: ColorStyle;
  onThemeChange: (theme: ColorTheme) => void;
  onStyleChange: (style: ColorStyle) => void;
};

const styleLabels: Record<ColorStyle, string> = {
  matched: 'Matched',
  fulltint: 'Full Tint',
};

export function ColorPicker({
  selectedTheme,
  selectedStyle,
  onThemeChange,
  onStyleChange,
}: ColorPickerProps) {
  const accent = colorThemes[selectedTheme].accent;

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm text-[#b8c0e0]">Color Theme</label>
      <div className="flex gap-2.5">
        {COLOR_THEME_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onThemeChange(key)}
            className="h-8 w-8 rounded-full transition-all"
            style={{
              backgroundColor: colorThemes[key].accent,
              border: selectedTheme === key ? '2px solid #cad3f5' : '2px solid transparent',
              boxShadow: selectedTheme === key ? '0 0 0 2px #cad3f5' : 'none',
            }}
            aria-label={`${key} theme`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {COLOR_STYLE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onStyleChange(key)}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: selectedStyle === key ? accent : '#363a4f',
              color: selectedStyle === key ? '#24273a' : '#cad3f5',
            }}
          >
            {styleLabels[key]}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/color-picker.tsx
git commit -m "feat: add ColorPicker component for ad builder"
```

---

## Task 6: Update Ad Builder Page

**Files:**
- Modify: `src/app/(app)/create/page.tsx`

- [ ] **Step 1: Add color picker state and wire to preview + POST**

In `src/app/(app)/create/page.tsx`, make these changes:

Add imports at the top:

```typescript
import { ColorPicker } from '@/components/color-picker';
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';
```

Add state for theme and style alongside existing state:

```typescript
const [colorTheme, setColorTheme] = useState<ColorTheme>('blue');
const [colorStyle, setColorStyle] = useState<ColorStyle>('matched');
```

Add the `ColorPicker` component in the form, between the Brand URL input and the Publish button:

```tsx
<div>
  <ColorPicker
    selectedTheme={colorTheme}
    selectedStyle={colorStyle}
    onThemeChange={setColorTheme}
    onStyleChange={setColorStyle}
  />
</div>
```

Update the `publish` function's `body: JSON.stringify(...)` to include the new fields:

```typescript
body: JSON.stringify({
  headline,
  subtext: subtext || null,
  brandUrl: brandUrl || null,
  imageUrl,
  colorTheme,
  colorStyle,
}),
```

Update the `AdCard` in the live preview to pass theme props:

```tsx
<AdCard
  imageUrl={imageUrl}
  headline={headline || 'Your Headline'}
  subtext={subtext || null}
  brandUrl={brandUrl || null}
  colorTheme={colorTheme}
  colorStyle={colorStyle}
/>
```

- [ ] **Step 2: Verify live preview updates with color picker**

```bash
npm run dev
```

Visit `http://localhost:3000/create` — select different colors and styles, confirm the live preview card updates instantly.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/create/page.tsx
git commit -m "feat: add color picker to ad builder with live preview"
```

---

## Task 7: Update Marketplace API POST

**Files:**
- Modify: `src/app/api/marketplace/route.ts`
- Modify: `__tests__/api/marketplace.test.ts`

- [ ] **Step 1: Add failing test for POST with color fields**

Add a new test case to `__tests__/api/marketplace.test.ts`:

```typescript
describe('POST /api/marketplace', () => {
  it('accepts colorTheme and colorStyle in body', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce({ id: 'user-1', firebaseUid: 'fb-1' } as any);

    const { db } = await import('@/lib/db');
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: 'item-1',
          type: 'ad',
          headline: 'Test',
          colorTheme: 'purple',
          colorStyle: 'fulltint',
        }]),
      }),
    } as any);

    const { POST } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({
        headline: 'Test',
        colorTheme: 'purple',
        colorStyle: 'fulltint',
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.colorTheme).toBe('purple');
    expect(data.colorStyle).toBe('fulltint');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run __tests__/api/marketplace.test.ts
```

Expected: FAIL — POST handler doesn't read `colorTheme`/`colorStyle` from body

- [ ] **Step 3: Update POST handler to accept color fields**

In `src/app/api/marketplace/route.ts`, update the `POST` function. Change the destructuring line:

```typescript
const { headline, subtext, brandUrl, imageUrl, colorTheme, colorStyle } = body;
```

Update the `values` object in the insert call:

```typescript
.values({
  type: 'ad',
  creatorId: user.id,
  headline,
  subtext,
  brandUrl,
  imageUrl,
  colorTheme: colorTheme || 'blue',
  colorStyle: colorStyle || 'matched',
})
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run __tests__/api/marketplace.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/marketplace/route.ts __tests__/api/marketplace.test.ts
git commit -m "feat: accept colorTheme and colorStyle in marketplace POST"
```

---

## Task 8: Forward Theme Props on All Pages

**Files:**
- Modify: `src/app/(app)/marketplace/page.tsx`
- Modify: `src/app/(app)/profile/[id]/page.tsx`
- Modify: `src/app/overlay/[profileId]/page.tsx`

- [ ] **Step 1: Update marketplace page**

In `src/app/(app)/marketplace/page.tsx`, update the `MarketplaceItem` type to include the new fields:

```typescript
type MarketplaceItem = {
  id: string;
  type: 'ad' | 'spotify' | 'placeholder';
  creatorFirebaseUid: string | null;
  headline: string | null;
  subtext: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  creatorName: string | null;
  usageCount: number;
  colorTheme: string;
  colorStyle: string;
};
```

Update the `AdCard` render to pass theme props:

```tsx
<AdCard
  imageUrl={item.imageUrl}
  headline={item.headline || ''}
  subtext={item.subtext}
  brandUrl={item.brandUrl}
  colorTheme={item.colorTheme as ColorTheme}
  colorStyle={item.colorStyle as ColorStyle}
/>
```

Add the import at the top:

```typescript
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';
```

- [ ] **Step 2: Update profile editor page**

In `src/app/(app)/profile/[id]/page.tsx`, update the `ProfileItem.marketplaceItem` type to include:

```typescript
marketplaceItem: {
  id: string;
  type: 'ad' | 'spotify' | 'placeholder';
  headline: string | null;
  subtext: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  colorTheme: string;
  colorStyle: string;
};
```

Update the `AdCard` render to pass theme props:

```tsx
<AdCard
  imageUrl={item.marketplaceItem.imageUrl}
  headline={item.marketplaceItem.headline || ''}
  subtext={item.marketplaceItem.subtext}
  brandUrl={item.marketplaceItem.brandUrl}
  colorTheme={item.marketplaceItem.colorTheme as ColorTheme}
  colorStyle={item.marketplaceItem.colorStyle as ColorStyle}
/>
```

Add the import at the top:

```typescript
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';
```

- [ ] **Step 3: Update overlay page**

In `src/app/overlay/[profileId]/page.tsx`, update the `OverlayItem` type to include:

```typescript
type OverlayItem = {
  id: string;
  type: 'ad' | 'spotify' | 'placeholder';
  headline: string | null;
  subtext: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  displayDuration: number;
  colorTheme: string;
  colorStyle: string;
};
```

Update the `AdCard` render to pass theme props:

```tsx
<AdCard
  imageUrl={current.imageUrl}
  headline={current.headline || ''}
  subtext={current.subtext}
  brandUrl={current.brandUrl}
  colorTheme={current.colorTheme as ColorTheme}
  colorStyle={current.colorStyle as ColorStyle}
/>
```

Add the import at the top:

```typescript
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/marketplace/page.tsx src/app/\(app\)/profile/\[id\]/page.tsx src/app/overlay/\[profileId\]/page.tsx
git commit -m "feat: forward colorTheme and colorStyle to AdCard on all pages"
```

---

## Task 9: Full Integration Verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run build to check for type errors**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

Test the full flow:
1. Go to `/create` → see the 8 color circles and Matched/Full Tint toggle
2. Select different colors → live preview card background, placeholder, and icon change
3. Toggle to Full Tint → subtext/URL text color shifts to accent
4. Publish the ad
5. Go to `/marketplace` → the ad appears with its chosen theme colors
6. Add to a profile → go to `/profile/[id]` → card renders with correct theme
7. Open OBS overlay URL → card renders with correct theme on transparent background

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address integration issues from color themes verification"
```
