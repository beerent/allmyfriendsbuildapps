# Spotify Integration — Design Spec

Add live "Now Playing" functionality to the Spotify system plugin.

## Overview

The Spotify item is a system-provided marketplace plugin (not user-created). When a streamer adds it to their ad profile, they connect their Spotify account via OAuth. The overlay then displays their currently playing track in real time using the same card format as all other items.

## Database Changes

Add columns to the existing `users` table:

| Column | Type | Notes |
|--------|------|-------|
| spotifyAccessToken | text | nullable, stored as plaintext (same security posture as other credentials in the app) |
| spotifyRefreshToken | text | nullable |
| spotifyTokenExpiry | timestamp | nullable, when the access token expires |

No new tables needed.

## OAuth Flow

1. Streamer clicks "Connect Spotify" on their dashboard
2. `GET /api/spotify/connect` — verifies auth via Firebase token in query param, generates a random `state` string, stores `{state, firebaseUid}` in a short-lived in-memory map, redirects to Spotify authorization URL with the state
3. Spotify redirects back to `GET /api/spotify/callback?code=...&state=...`
4. Callback validates the `state` param against the in-memory map to identify the user and prevent CSRF, exchanges the authorization code for access + refresh tokens, stores tokens in the users table
5. Redirects streamer back to `/dashboard?spotify=connected`

**Spotify OAuth scopes:** `user-read-currently-playing`, `user-read-playback-state`

**Token refresh:** When the access token is expired, the now-playing endpoint auto-refreshes using the refresh token before making the Spotify API call. Updated tokens are saved back to the database.

**Spotify API quirk:** The `/v1/me/player/currently-playing` endpoint returns 204 No Content when nothing is playing. The implementation must handle this (no response body to parse).

## New API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/spotify/connect` | GET | Required (token in query param) | Builds Spotify OAuth URL with state param, redirects |
| `/api/spotify/callback` | GET | Via state param lookup | Handles OAuth callback, exchanges code, stores tokens |
| `/api/spotify/now-playing/[userId]` | GET | None (public) | Returns current track data for a user |
| `/api/spotify/disconnect` | POST | Required (Bearer token) | Clears Spotify tokens from user record |

### `GET /api/spotify/now-playing/[userId]` Response

Success (playing):
```json
{
  "connected": true,
  "playing": true,
  "track": {
    "name": "Bohemian Rhapsody",
    "artist": "Queen",
    "albumArtUrl": "https://i.scdn.co/image/..."
  }
}
```

Connected but not playing: `{ "connected": true, "playing": false }`
Not connected: `{ "connected": false }`
User not found: 404 `{ "error": "user_not_found" }`
Spotify API error (rate limit, etc.): falls back to `{ "connected": true, "playing": false }`

**Caching:** Response is cached in-memory for 5 seconds per userId to reduce Spotify API calls from multiple OBS sources and prevent rate limiting.

## Overlay Data Flow

The existing overlay API (`GET /api/overlay/[profileId]`) must be extended to include the profile's `ownerId` in the response. This allows the overlay page to call `/api/spotify/now-playing/[ownerId]` when a Spotify item is in rotation.

Updated overlay API response shape:
```json
{
  "ownerId": "uuid-of-profile-owner",
  "items": [...]
}
```

When a Spotify item comes up in rotation, the overlay fetches now-playing data for the ownerId. The fetch happens each time the Spotify item rotates into view (not on a separate polling interval).

## Environment Variables

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:4444/api/spotify/callback
```

## Overlay Behavior

When a Spotify item appears in the rotation:

1. Overlay calls `/api/spotify/now-playing/[ownerId]`
2. **Connected + playing** → render SpotifyCard with track name, artist, spinning album art
3. **Connected + not playing** → render nothing for the full display duration then advance (same as placeholder — don't skip immediately to avoid rapid cycling)
4. **Not connected** → render SpotifyCard with "Spotify not connected" message and subdued styling

## Dashboard Changes

Add a Spotify connection section to the dashboard page:

- If not connected: "Connect Spotify" button that navigates to `/api/spotify/connect?token={idToken}`
- If connected: "Spotify Connected" indicator with a "Disconnect" button
- On redirect back with `?spotify=connected` query param: show brief success feedback

The dashboard needs a new API call to check if the user has Spotify connected. This can be a simple flag returned from the existing `GET /api/profiles` response, or a dedicated `GET /api/spotify/status` endpoint. Simplest: add a `spotifyConnected: boolean` field to the user data returned by `verifyAuthToken`.

## Component Changes

Update `SpotifyCard` props:

```typescript
type SpotifyCardProps = {
  trackName?: string;
  artistName?: string;
  albumArtUrl?: string;
  requester?: string;        // kept for backwards compatibility
  status?: 'playing' | 'not-connected';
};
```

- `status: 'playing'` (or undefined) — shows track info + spinning album art (existing behavior)
- `status: 'not-connected'` — shows "Spotify not connected · Configure in dashboard" with subdued styling, no spinning art

## Marketplace

No changes needed. The Spotify system item is already seeded. Users add it to profiles via the existing marketplace flow. The connection prompt appears on the dashboard.

## Key Decisions

- **Tokens stored server-side in users table** — OBS browser sources can't share browser state, so the overlay must fetch via API
- **Plaintext token storage** — consistent with the app's current security posture (Firebase admin key is also in plaintext env vars). Encryption can be added later.
- **Auto-refresh** — tokens refresh transparently on the now-playing endpoint
- **No user-created Spotify items** — it's a system plugin only
- **Profile owner's account** — the overlay shows what the profile owner is listening to
- **5-second cache on now-playing** — prevents Spotify rate limiting and reduces load
- **Render nothing when not playing** — keeps the card slot in rotation (doesn't skip immediately) to avoid rapid cycling if Spotify is paused
- **State param for OAuth callback** — in-memory map with random state string, prevents CSRF
