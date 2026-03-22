# Follow System & User Search

## Overview

A follower/following system with a unified user search dropdown in the nav bar. Users can follow/unfollow from search results and profile pages. Profile pages show follower/following counts (numbers only, not lists).

## Database

### New table: `follows`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default random |
| follower_id | uuid | NOT NULL, FK → users.id ON DELETE CASCADE |
| following_id | uuid | NOT NULL, FK → users.id ON DELETE CASCADE |
| created_at | timestamp | NOT NULL, default now() |

Unique constraint on `(follower_id, following_id)`. Check constraint: `follower_id != following_id` (can't follow yourself).

## API

### `POST /api/follow`

Auth required. Toggles follow/unfollow.

Request: `{ "userId": "uuid" }`

Response: `{ "following": true | false }`

If a follow row exists, delete it (unfollow). If not, create it (follow).

### `GET /api/search?q=query`

Auth required. Searches users across all identity fields:
- `users.username` (thosewho.stream identity)
- `users.display_name`
- `social_links.username` (all platforms)

Returns deduplicated results — one entry per user, with all matching platforms indicated.

Response:
```json
[
  {
    "id": "uuid",
    "username": "thedevdad",
    "displayName": "Brent Ryczak",
    "matchedPlatforms": ["username", "twitch", "x"],
    "isFollowing": false
  }
]
```

`matchedPlatforms` includes `"username"` when the thosewho.stream username matched, plus any social_links platforms that matched. This tells the UI which icons to display next to the result.

Limit results to 10. Minimum query length: 2 characters.

### `GET /api/users/[username]` (modify existing)

Add to response:
- `followerCount`: number
- `followingCount`: number
- `isFollowing`: boolean (if viewer is authenticated, whether they follow this user)

## UI

### Nav Search Dropdown

Location: in the nav bar, between the nav links and the Sign Out button.

Behavior:
- Search input with magnifying glass icon
- On focus + type (2+ chars), dropdown appears below with results (debounced 300ms)
- Clicking outside or pressing Escape closes the dropdown
- Each result row: gradient avatar | username + display name | matched platform icons | Follow/Unfollow button
- Follow button not shown for your own result
- Clicking username navigates to `/u/[username]` and closes dropdown

Platform icons use the same SVG icons and colors already defined in the marketplace and settings pages. The thosewho.stream match uses the stacked-cards logo icon in green.

### Profile Page `/u/[username]` (modify existing)

Add to the left sidebar:
- Follower count and following count (e.g., "12 followers · 8 following")
- Follow/Unfollow button — only visible when logged in and not your own profile
- Button style: green accent for "Follow", subtle outline for "Unfollow"/"Following"

## Files to Create

1. `src/app/api/follow/route.ts` — follow toggle endpoint
2. `src/app/api/search/route.ts` — user search endpoint
3. `src/components/search-dropdown.tsx` — nav search dropdown component

## Files to Modify

1. `src/lib/db/schema.ts` — add `follows` table
2. `src/app/api/users/[username]/route.ts` — add follower/following counts and isFollowing
3. `src/app/(app)/u/[username]/page.tsx` — add follow button and counts to sidebar
4. `src/components/nav.tsx` — add search dropdown
