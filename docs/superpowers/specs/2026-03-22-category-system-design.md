# Category System

## Overview

Predefined categories for marketplace cards. Filterable via emoji pill buttons in the marketplace. Users assign one category when creating a card.

## Database

Add `category` text column to `marketplace_items`. Nullable — system items (Spotify, Twitch, goals, etc.) don't have categories.

```sql
ALTER TABLE marketplace_items ADD COLUMN category text;
```

## Predefined Categories

| Key | Label | Emoji |
|-----|-------|-------|
| coding | Coding | 💻 |
| monetize | Monetize | 💰 |
| gear | Gear | 🎧 |
| gaming | Gaming | 🎮 |
| food | Food | 🍔 |
| merch | Merch | 👕 |
| music | Music | 🎵 |
| learning | Learning | 📚 |
| other | Other | ✨ |

Stored as a shared constant (e.g., `src/lib/categories.ts`) used by both API and UI.

## Marketplace UI

Replace the existing type dropdown with emoji pill buttons below the search bar. Rounded rects with emojis, wrapping layout.

- "All" pill selected by default — green gradient fill
- Unselected pills: dark background, subtle border
- Selected pill: green gradient, dark text
- Clicking a category filters cards to that category
- The existing "Friend Ads" / "Overlay Tools" type filter stays as a separate dropdown or is merged into the pill row as two additional pills at the start

Filter logic: `GET /api/marketplace?category=coding`. When "All" is selected, no category param is sent.

## Create Card Page

Add a required category selector to the create ad form. Same emoji pill style as marketplace filters. User taps one before publishing. The selected category is sent in the POST body.

## API Changes

### `GET /api/marketplace`

Accept optional `category` query param. Filter `WHERE category = $1` when present.

### `POST /api/marketplace`

Accept `category` in the request body. Store in the `category` column. Required for `type: 'ad'`, ignored for system types.

### `GET /api/users/[username]`

Include `category` in the returned items so the profile page could optionally display it.

## Shared Constant

Create `src/lib/categories.ts`:

```typescript
export const CATEGORIES = [
  { key: 'coding', label: 'Coding', emoji: '💻' },
  { key: 'monetize', label: 'Monetize', emoji: '💰' },
  { key: 'gear', label: 'Gear', emoji: '🎧' },
  { key: 'gaming', label: 'Gaming', emoji: '🎮' },
  { key: 'food', label: 'Food', emoji: '🍔' },
  { key: 'merch', label: 'Merch', emoji: '👕' },
  { key: 'music', label: 'Music', emoji: '🎵' },
  { key: 'learning', label: 'Learning', emoji: '📚' },
  { key: 'other', label: 'Other', emoji: '✨' },
] as const;
```

## Files to Create

1. `src/lib/categories.ts` — shared category definitions

## Files to Modify

1. `src/lib/db/schema.ts` — add `category` column to `marketplaceItems`
2. `src/app/api/marketplace/route.ts` — accept category filter in GET, accept category in POST
3. `src/app/(app)/marketplace/page.tsx` — replace type dropdown with emoji pill filters
4. `src/app/(app)/create/ad/page.tsx` — add category selector to create form
