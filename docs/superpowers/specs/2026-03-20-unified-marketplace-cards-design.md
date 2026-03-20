# Unified Marketplace with Cards

## Overview

Unify the marketplace to support three categories: **Ads**, **Cards**, and **Tools**. Cards are user-created items with a photo, headline, subtext, and optional second subtext line — similar to ads but without a brand URL. Tools group the existing system items (Spotify, Twitch, Placeholder). Everything lives in one marketplace.

## Schema Changes

### Enum Update

Add `'card'` to `itemTypeEnum`:

```typescript
export const itemTypeEnum = pgEnum('item_type', [
  'ad',
  'card',
  'spotify',
  'placeholder',
  'twitch',
]);
```

### New Column

Add `subtext2` (nullable text) to `marketplace_items`:

```typescript
subtext2: text('subtext2'),
```

This field is used by cards for an optional second line of subtext (in the position where ads show a brand URL).

### Migration

Note: PostgreSQL `ALTER TYPE ... ADD VALUE` cannot run inside a transaction. This migration needs a raw SQL file executed outside Drizzle's default transaction wrapper:

```sql
-- Run outside transaction
ALTER TYPE item_type ADD VALUE IF NOT EXISTS 'card';
```

Then in a standard migration:
```sql
ALTER TABLE marketplace_items ADD COLUMN subtext2 TEXT;
```

## Create Pages

### Route Changes

- Move existing `/create/page.tsx` to `/create/ad/page.tsx` (no functional changes)
- New `/create/page.tsx` — simple index page with links to "Create Ad" and "Create Card"
- New `/create/card/page.tsx` — same layout as create ad with these differences:
  - Title: "Create Card"
  - No Brand URL field
  - New optional "Second Subtext" field (maps to `subtext2`)
  - Includes `ColorPicker` component (same as ad creator — theme + style selection)
  - Live preview uses `CustomCard` component with `colorTheme` and `colorStyle` props
  - POSTs to `/api/marketplace` with `type: 'card'`, `colorTheme`, and `colorStyle`

### Nav Update

- Replace single "Create Ad" link with two links: "Create Ad" and "Create Card"
- Update search placeholder from "Search ads..." to "Search marketplace..."

## Card Component

New file: `src/components/custom-card.tsx`

Same structure as `ad-card.tsx`:
- Image (64x64, rounded) on left
- Text block: headline, subtext, optional subtext2 (where brand URL sits on ads)
- Different icon on right — a card/rectangle icon using `theme.accent` color (instead of the hardcoded green layers icon used by the original ad card)
- Same fallback behavior for missing/broken images (gray box with `theme.surface` color)
- Full color theme support: background via `OverlayCard`, surface for placeholders, accent for icon
- `colorStyle` support: when `fulltint`, subtext and subtext2 use `theme.accent`; when `matched`, they use fixed `#b8c0e0`

Props:
```typescript
type CustomCardProps = {
  imageUrl: string | null;
  headline: string;
  subtext: string | null;
  subtext2: string | null;
  colorTheme?: ColorTheme;
  colorStyle?: ColorStyle;
};
```

## Marketplace UI Changes

### Filter Categories

Replace the current type dropdown options:

| Label | Filter behavior |
|-------|----------------|
| All | No filter |
| Ads | `type=ad` |
| Cards | `type=card` |
| Tools | `type=tools` (maps to spotify, twitch, placeholder) |

### Card Rendering

Add `card` case to the item rendering in marketplace page:
```tsx
item.type === 'card' ? (
  <CustomCard
    imageUrl={item.imageUrl}
    headline={item.headline || ''}
    subtext={item.subtext}
    subtext2={item.subtext2}
    colorTheme={item.colorTheme as ColorTheme}
    colorStyle={item.colorStyle as ColorStyle}
  />
)
```

### Type Definition

Update `MarketplaceItem` type to include `'card'` in the type union and add `subtext2: string | null`.

## API Changes

### `GET /api/marketplace`

- Add `'card'` to the valid type filter values
- Handle `type=tools` server-side as a special case: translate to a SQL `IN ('spotify', 'twitch', 'placeholder')` clause
- Include `subtext2` in the response

### `POST /api/marketplace`

- Accept `type` field in request body ('ad' or 'card'), default to 'ad' for backwards compatibility
- Accept `subtext2` field for cards
- `headline` is required for both ads and cards
- Validation (return 400 on failure):
  - If `type=card` and `brandUrl` is provided: `{ error: "Cards cannot have a brand URL" }`
  - If `type=ad` and `subtext2` is provided: `{ error: "Ads cannot have a second subtext" }`

## Overlay Changes

### Type Updates

Add `'card'` to the `OverlayItem` type union. Add `subtext2: string | null` to the type.

### Rendering

Add card case to the overlay page rendering:
```tsx
current.type === 'card' ? (
  <CustomCard
    imageUrl={current.imageUrl}
    headline={current.headline || ''}
    subtext={current.subtext}
    subtext2={current.subtext2}
    colorTheme={current.colorTheme as ColorTheme}
    colorStyle={current.colorStyle as ColorStyle}
  />
)
```

Same fade transition and rotation behavior as ads.

### Overlay API

Add `subtext2` to the fields returned by `GET /api/overlay/[profileId]`.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Add 'card' to enum, add subtext2 column |
| `drizzle/` | New migration |
| `src/app/(app)/create/ad/page.tsx` | Move from `/create/page.tsx` |
| `src/app/(app)/create/card/page.tsx` | New — card creation form |
| `src/app/(app)/create/page.tsx` | Replace with index page linking to create ad / create card |
| `src/components/custom-card.tsx` | New — card overlay component |
| `src/components/nav.tsx` | Two create links, updated text |
| `src/app/(app)/marketplace/page.tsx` | New filter categories, card rendering, updated types |
| `src/app/api/marketplace/route.ts` | Accept type + subtext2, tools filter |
| `src/app/overlay/[profileId]/page.tsx` | Render card type |
| `src/app/api/overlay/[profileId]/route.ts` | Include subtext2 in response |

## Out of Scope

- Renaming database tables (ad_profiles, ad_profile_items) — these are internal and don't affect the user-facing product
- Changing the Firebase Storage path (`ad-images/`) — existing URLs must keep working
- Any changes to Spotify/Twitch/Placeholder functionality
