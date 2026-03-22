# Integrations Page Design Spec

## Goal

Add an `/integrations` page where users can connect/disconnect their Spotify and Twitch accounts via OAuth. Spotify/Twitch marketplace cards should check the profile owner's integration status and show "not connected" when tokens are missing.

## Architecture

- OAuth flows use standard authorization code grant for both Spotify and Twitch
- Tokens stored on the `users` table in PostgreSQL via new columns
- API routes handle OAuth initiation, callbacks, disconnect, and status
- Client-side integrations page shows connection status with connect/disconnect buttons
- Token refresh handled server-side when tokens expire

## Database Changes

Add to `users` table:
- `spotify_access_token` (text, nullable)
- `spotify_refresh_token` (text, nullable)
- `spotify_token_expiry` (timestamp, nullable)
- `twitch_access_token` (text, nullable)
- `twitch_refresh_token` (text, nullable)
- `twitch_token_expiry` (timestamp, nullable)
- `twitch_user_id` (text, nullable)

## API Routes

### Spotify
- `GET /api/spotify/auth` — Requires Firebase auth. Generates Spotify OAuth URL with scopes `user-read-currently-playing user-read-recently-played` and `state` param containing user's Firebase UID. Redirects to Spotify.
- `GET /api/spotify/callback` — Exchanges code for tokens, stores on user row, redirects to `/integrations`.
- `DELETE /api/spotify/auth` — Requires Firebase auth. Clears Spotify tokens from user row.

### Twitch
- `GET /api/twitch/auth` — Requires Firebase auth. Generates Twitch OAuth URL with scopes `channel:read:subscriptions moderator:read:followers` and state param. Redirects to Twitch.
- `GET /api/twitch/callback` — Exchanges code for tokens + user ID, stores on user row, redirects to `/integrations`.
- `DELETE /api/twitch/auth` — Requires Firebase auth. Clears Twitch tokens from user row.

### Integrations Status
- `GET /api/integrations` — Requires Firebase auth. Returns `{ spotify: boolean, twitch: boolean }` indicating whether each service is connected.

## Integrations Page (`/integrations`)

- Shows two cards: Spotify and Twitch
- Each card shows: service name, icon, connection status
- When disconnected: "Connect" button that navigates to the OAuth auth route
- When connected: green "Connected" badge + "Disconnect" button
- Matches existing app styling (Catppuccin Macchiato theme)

## Nav Update

Add "Integrations" link to the nav bar between "Marketplace" and "+ Create Ad".

## OAuth State Security

The `state` parameter in OAuth flows contains a signed/encoded token to prevent CSRF. For simplicity, use the Firebase ID token as the state — the callback verifies it server-side.

## Scopes

- **Spotify:** `user-read-currently-playing user-read-recently-played` (for Now Playing card)
- **Twitch:** `channel:read:subscriptions moderator:read:followers` (for Latest Sub / Latest Follower cards)

## Out of Scope (Phase 2)

- Actually fetching live Spotify/Twitch data for overlay cards
- Token auto-refresh middleware
- Webhook-based Twitch event subscriptions
