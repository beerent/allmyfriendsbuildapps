# StreamAds — Design Spec

Friends run ads on other friends' streams via OBS browser sources.

## Overview

A Next.js app where users create ads, browse a marketplace of community-created content, build ad profiles (ordered playlists of marketplace items), and generate OBS browser source URLs that cycle through their selected items on-stream.

## Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS, TypeScript
- **Auth**: Firebase Auth (Google, email/password)
- **Database**: PostgreSQL (local) + Drizzle ORM
- **Storage**: Firebase Storage (image/logo uploads)

## Card Format

All marketplace items share a uniform card format based on the Spotify "Now Playing" overlay from the `effect-twitch-integrations` repo:

- **Dimensions**: 320x120px
- **Style**: Rounded corners (`rounded-md`), dark background (`#24273a` Catppuccin Macchiato), light text (`#cad3f5`), secondary text (`#b8c0e0`), shadow
- **Layout**: 64x64 image/logo on left, text block in middle (headline, subtext, brand URL), icon on right
- **Transitions**: Fade between items during rotation

### Item Types

1. **Ad** — user-created. Uploaded logo (64x64, rounded), headline text, subtext, brand URL. Default accent icon on right.
2. **Spotify** — pre-built system item seeded in the database. Visual-only placeholder for now — displays the Spotify card UI with static content. Future: integrate with Spotify API for live "Now Playing" data. Music note icon in pink (`#f5bde6`).
3. **Placeholder** — pre-built system item seeded in the database. Renders transparent/invisible. Lets streamers pause ads without removing the OBS source.

System items (Spotify, Placeholder) are seeded via a Drizzle migration with `creatorId: null`.

## Database Schema (Drizzle)

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| firebaseUid | text | unique, links to Firebase Auth |
| displayName | text | |
| email | text | |
| createdAt | timestamp | default now() |

### marketplace_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| type | enum('ad', 'spotify', 'placeholder') | |
| creatorId | uuid | FK → users, nullable (null for system items) |
| headline | text | nullable, for ads |
| subtext | text | nullable, for ads |
| brandUrl | text | nullable, for ads |
| imageUrl | text | nullable, Firebase Storage URL |
| displayDuration | integer | default 10 (seconds) |
| createdAt | timestamp | default now() |

### ad_profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| ownerId | uuid | FK → users |
| name | text | |
| createdAt | timestamp | default now() |
| updatedAt | timestamp | default now() |

### ad_profile_items (join table)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| profileId | uuid | FK → ad_profiles |
| itemId | uuid | FK → marketplace_items |
| displayDuration | integer | nullable, falls back to marketplace_items.displayDuration if null |
| sortOrder | integer | controls rotation order |

## Pages & Routes

### Public Pages
| Route | Purpose |
|-------|---------|
| `/` | Landing page with login CTA |
| `/overlay/[profileId]` | OBS browser source — no auth, cycles through profile items |

### App Pages (authed)
| Route | Purpose |
|-------|---------|
| `/dashboard` | List user's ad profiles, create new ones |
| `/profile/[id]` | Edit a profile — add/remove/reorder items, set per-item durations, copy OBS URL |
| `/marketplace` | Browse and search all marketplace items, add to profiles |
| `/create` | Ad builder — upload image, enter text, set duration, live preview, publish |

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/marketplace` | GET | List/search marketplace items |
| `/api/marketplace` | POST | Create new marketplace item (authed) |
| `/api/profiles` | GET | List user's ad profiles (authed) |
| `/api/profiles` | POST | Create new ad profile (authed) |
| `/api/profiles/[id]` | GET | Get single profile with items (authed) |
| `/api/profiles/[id]` | PUT | Update profile — full replacement of items list (authed) |
| `/api/profiles/[id]` | DELETE | Delete a profile (authed, owner only) |
| `/api/marketplace/[id]` | DELETE | Delete a marketplace item (authed, creator only) |
| `/api/overlay/[profileId]` | GET | Public — returns profile items for OBS overlay |

## Auth Flow

1. User signs in via Firebase Auth on the client (Google or email/password)
2. Client sends Firebase ID token with API requests
3. Server verifies token via Firebase Admin SDK
4. On first login, upsert user record in Postgres (firebaseUid → users table)

## Overlay Behavior (OBS Page)

- Fetches profile items from `/api/overlay/[profileId]` on load
- Renders each item as the standard 320x120 card
- Cycles through items using each item's `displayDuration`
- Smooth fade transition between items
- Transparent background (works with OBS compositing, no chroma key needed)
- Polls API every 30 seconds for updates (streamer can edit profile while live)
- Placeholder items render as transparent (invisible gap in rotation)
- Empty profile or API error: shows nothing (transparent), does not break OBS
- Broken image URLs: fall back to a generic icon placeholder

## Ad Builder Flow

1. Upload logo/image (stored in Firebase Storage, displayed at 64x64 with rounded corners)
2. Enter headline text (line 1)
3. Enter subtext (line 2)
4. Enter brand URL (line 3)
5. Set default display duration in seconds
6. Live preview shows the exact card as it will appear on stream
7. Publish to marketplace

## Marketplace

- Open to all logged-in users
- Search by text using PostgreSQL ILIKE (headline, subtext, creator name)
- Filter by type (ad, spotify, placeholder)
- Usage count computed from ad_profile_items at query time
- "Add to profile" action — select which profile to add it to
- Users can browse and add any public item to their profiles

## Key Decisions

- **Public overlay URLs**: `/overlay/[profileId]` with no auth — OBS browser sources don't support auth flows, and ad content is inherently public
- **Per-item duration**: Each item in a profile can have its own display duration, configurable when adding to a profile
- **Multiple profiles per user**: Streamers can have different ad sets for different stream types
- **Minimal ad builder**: Logo, headline, subtext, brand URL only — keeps uniform card appearance
- **Postgres + Drizzle over Firestore**: Relational model fits the join table pattern better, Drizzle provides type-safe queries
- **Firebase Auth + Storage retained**: Auth handles social login well, Storage handles uploads simply
