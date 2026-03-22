# Public Profile Page

## Overview

A public-facing profile page at `/u/[username]` that shows a user's identity, social links, and marketplace cards. Accessible without authentication; logged-in users can add cards to their own overlays directly from the profile.

## Route

`/u/[username]` — public, no auth required to view.

## Layout

Sidebar left, cards right.

### Left Sidebar (sticky)

- Generated avatar: gradient circle derived from username
- Username (bold, primary text)
- Display name (subtle, secondary text)
- Social links: clickable platform icons linking to actual profiles (Twitch, YouTube, Kick, X, TikTok)
- If primary identity is `username`: show thosewho.stream logo + username

### Right Content

- Section header: "Cards · {count}"
- List of user's marketplace items rendered with existing card components (AdCard, SpotifyCard, TwitchCard, KofiCard, BmcCard)
- Each card shows an "Add to Profile" button — only visible when viewer is logged in
- Uses existing `AddToProfileModal` component for the add flow

## API

### `GET /api/users/[username]`

Returns public user data and their marketplace items.

Response shape:
```json
{
  "user": {
    "username": "thedevdad",
    "displayName": "Brent Ryczak",
    "socialLinks": [
      { "platform": "twitch", "username": "thedevdad_" },
      { "platform": "x", "username": "thedevdad" }
    ],
    "primaryIdentity": "username" | "twitch" | "x" | etc.
  },
  "items": [
    {
      "id": "...",
      "type": "ad",
      "headline": "Flowbase",
      "subtext": "#1 sales CRM",
      "brandUrl": "www.flowbasehq.com",
      "imageUrl": null,
      "colorTheme": "blue",
      "colorStyle": "matched"
    }
  ]
}
```

Returns 404 if username not found.

## Edge Cases

- **Username not found**: render a 404 page with "User not found"
- **User has no cards**: show empty state — "No cards yet"
- **No username claimed**: profile is not accessible; users must claim a username on the settings page first

## Components

- Reuses existing card components: `AdCard`, `SpotifyCard`, `TwitchCard`, `KofiCard`, `BmcCard`
- Reuses existing `AddToProfileModal`
- New: `PublicProfile` page component at `src/app/(app)/u/[username]/page.tsx`
- New: API route at `src/app/api/users/[username]/route.ts`

## Files to Create

1. `src/app/(app)/u/[username]/page.tsx` — the profile page component
2. `src/app/api/users/[username]/route.ts` — public API endpoint

## Files to Modify

None — this is additive.
