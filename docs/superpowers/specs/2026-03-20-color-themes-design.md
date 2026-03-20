# Color Themes — Design Spec

Ad creators choose a color theme and style when building their ad. Cards render with the selected colors everywhere they appear: marketplace, profile editor, and OBS overlay.

## Overview

Each ad gets two new properties at creation time:
- **Color theme** — one of 8 hues (blue, purple, magenta, red, orange, green, teal, slate)
- **Color style** — "matched" or "fulltint"

Both are stored in the database and passed through to card components for rendering.

## Theme Definitions

Each theme defines three colors derived from the same hue at different lightness levels:

| Theme | Key | Background | Surface | Accent |
|---------|----------|-----------|---------|--------|
| Blue | `blue` | `#24273a` | `#363a4f` | `#7dc4e4` |
| Purple | `purple` | `#2a2440` | `#3d3555` | `#c6a0f6` |
| Magenta | `magenta` | `#302438` | `#45354d` | `#f5bde6` |
| Red | `red` | `#302428` | `#453535` | `#ed8796` |
| Orange | `orange` | `#302a24` | `#453d35` | `#f5a97f` |
| Green | `green` | `#243028` | `#354540` | `#a6da95` |
| Teal | `teal` | `#243038` | `#354550` | `#8bd5ca` |
| Slate | `slate` | `#282a2e` | `#3e4045` | `#939ab7` |

## Style Definitions

- **Matched**: Background, image placeholder surface, and accent icon use the theme's three colors. Headline text stays `#cad3f5`, subtext and URL stay `#b8c0e0`.
- **Full Tint**: Same as Matched, plus subtext and URL text shift to the theme's accent color.

## Builder UX

The color picker appears in the ad builder (`/create`) between the form fields and publish button:

1. **Color row**: 8 circles (32x32, filled with each theme's accent color for visibility). Tap to select. Selected state: white ring (`#cad3f5` border + box-shadow). Default: blue.
2. **Style toggle**: Two labeled buttons below the circles — "Matched" and "Full Tint". Selected state: filled accent background. Default: matched.
3. **Live preview**: Updates instantly as the creator changes color or style.

## Database Changes

Two new columns on `marketplace_items`:

| Column | Type | Notes |
|--------|------|-------|
| colorTheme | enum(`blue`, `purple`, `magenta`, `red`, `orange`, `green`, `teal`, `slate`) | default `blue` |
| colorStyle | enum(`matched`, `fulltint`) | default `matched` |

These are set at creation time via the builder and stored permanently with the ad. Color theme and style are immutable after creation — there is no edit endpoint for marketplace items. Existing ads (and system items like Spotify/Placeholder) use the defaults.

## Schema Changes (Drizzle)

```typescript
export const colorThemeEnum = pgEnum('color_theme', [
  'blue', 'purple', 'magenta', 'red', 'orange', 'green', 'teal', 'slate',
]);

export const colorStyleEnum = pgEnum('color_style', ['matched', 'fulltint']);
```

Add to `marketplaceItems` table:

```typescript
colorTheme: colorThemeEnum('color_theme').default('blue').notNull(),
colorStyle: colorStyleEnum('color_style').default('matched').notNull(),
```

## Component Changes

### Theme map

A `colorThemes` constant maps theme keys to their three color values:

```typescript
const colorThemes = {
  blue:    { bg: '#24273a', surface: '#363a4f', accent: '#7dc4e4' },
  purple:  { bg: '#2a2440', surface: '#3d3555', accent: '#c6a0f6' },
  magenta: { bg: '#302438', surface: '#45354d', accent: '#f5bde6' },
  red:     { bg: '#302428', surface: '#453535', accent: '#ed8796' },
  orange:  { bg: '#302a24', surface: '#453d35', accent: '#f5a97f' },
  green:   { bg: '#243028', surface: '#354540', accent: '#a6da95' },
  teal:    { bg: '#243038', surface: '#354550', accent: '#8bd5ca' },
  slate:   { bg: '#282a2e', surface: '#3e4045', accent: '#939ab7' },
} as const;
```

### OverlayCard

Updated prop signature:

```typescript
type OverlayCardProps = {
  children: ReactNode;
  colorTheme?: ColorTheme;  // defaults to 'blue'
};
```

Uses the theme map to set card background → `bg`. Children receive surface/accent via props on their own components (not context).

### AdCard

Updated prop signature:

```typescript
type AdCardProps = {
  imageUrl: string | null;
  headline: string;
  subtext: string | null;
  brandUrl: string | null;
  colorTheme?: ColorTheme;    // defaults to 'blue'
  colorStyle?: ColorStyle;    // defaults to 'matched'
};
```

`AdCard` passes `colorTheme` through to `OverlayCard`, then uses the theme map directly for:
- Image placeholder background → theme `surface`
- Accent icon stroke → theme `accent`
- If `colorStyle === 'fulltint'`: subtext and URL text → theme `accent`
- If `colorStyle === 'matched'`: subtext `#b8c0e0`, URL `#b8c0e0` (unchanged defaults)

### SpotifyCard / Placeholder

System items ignore color themes — they render with their own fixed colors (Spotify: pink accent, Placeholder: transparent).

## Page Changes

Every page that renders `AdCard` must forward the stored `colorTheme` and `colorStyle` from the marketplace item data:

| Page | File | What changes |
|------|------|-------------|
| Ad Builder | `src/app/(app)/create/page.tsx` | Reads color picker state, passes to `AdCard` preview and POST body |
| Marketplace | `src/app/(app)/marketplace/page.tsx` | Passes `item.colorTheme` and `item.colorStyle` to `AdCard` |
| Profile Editor | `src/app/(app)/profile/[id]/page.tsx` | Passes `item.marketplaceItem.colorTheme` and `item.marketplaceItem.colorStyle` to `AdCard` |
| OBS Overlay | `src/app/overlay/[profileId]/page.tsx` | Passes `current.colorTheme` and `current.colorStyle` to `AdCard` |

## API Changes

### POST `/api/marketplace`

Accepts two new optional fields in the request body:
- `colorTheme` (string) — validated against the enum, defaults to `blue`
- `colorStyle` (string) — validated against the enum, defaults to `matched`

### GET endpoints

All endpoints that return marketplace items already return full item objects. The new columns are included automatically — no changes needed to GET responses.

## Migration Path

- Add the two enum types and columns via a Drizzle migration
- Both columns have defaults, so existing rows get `blue` / `matched` automatically
- No data backfill needed
