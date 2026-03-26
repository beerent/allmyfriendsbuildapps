# Twitch EventSub Webhook Integration

## Problem

The current "Latest Sub" Twitch card uses `helix/subscriptions?first=1`, which returns an arbitrary current subscriber — not the most recent sub activity. It misses resubs and gift subs entirely because the endpoint has no date field or sort order.

## Solution

Replace Helix polling with Twitch EventSub webhooks. When a sub event happens on a user's channel, Twitch POSTs it to our server. We store every event in the database and serve the latest one to the overlay from DB instead of calling Twitch.

## Approach

Plain webhook transport (no conduits). One webhook endpoint handles all users. EventSub subscriptions are created per-user during the OAuth callback and cleaned up on disconnect.

## Data Model

### New table: `twitch_events`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| id | UUID | PK, default gen_random_uuid() | Primary key |
| message_id | text | unique, not null | Twitch-Eventsub-Message-Id for deduplication |
| broadcaster_id | text | not null, FK to users.twitch_user_id | The streamer's Twitch user ID |
| event_type | enum | not null, values: subscribe, resub, gift_sub | What happened |
| user_name | text | not null | Subscriber's display name |
| user_id | text | not null | Subscriber's Twitch user ID |
| avatar_url | text | nullable | Subscriber's profile image (fetched on event receipt) |
| tier | text | not null | "1000", "2000", "3000" |
| message | text | nullable | Resub message if shared |
| cumulative_months | int | nullable | Total months subbed |
| streak_months | int | nullable | Current streak |
| is_gift | boolean | not null, default false | Was this a gift? |
| gifter_name | text | nullable | Who gifted it |
| gifter_id | text | nullable | Gifter's Twitch user ID |
| gift_total | int | nullable | Number of subs gifted in this batch |
| event_timestamp | timestamp | not null | When Twitch says it happened |
| created_at | timestamp | not null, default now() | When we stored it |

**Index:** `(broadcaster_id, created_at DESC)` for fast latest-event lookups.

## Webhook Endpoint

### `POST /api/twitch/webhooks`

Handles three message types based on `Twitch-Eventsub-Message-Type` header:

1. **`webhook_callback_verification`** — Twitch sends this when a subscription is created. Verify HMAC signature, return the `challenge` string as plain text with 200.

2. **`notification`** — An actual event. Verify HMAC signature, check `message_id` for deduplication, parse the event, fetch subscriber avatar from `helix/users`, insert into `twitch_events`.

3. **`revocation`** — Twitch revoked a subscription (token expired, user deauthed). Log it, no further action needed.

### Signature Verification

All requests are verified using HMAC-SHA256:
- Message = `Twitch-Eventsub-Message-Id` + `Twitch-Eventsub-Message-Timestamp` + raw request body
- Key = `TWITCH_WEBHOOK_SECRET` env var (one app-level secret)
- Compare against `Twitch-Eventsub-Message-Signature` header (prefixed with `sha256=`)

Reject with 403 if signature doesn't match.

## Subscription Lifecycle

### Creation (in `/api/twitch/callback`)

After storing tokens and Twitch user ID, create 3 EventSub subscriptions using an **app access token**:

1. `channel.subscribe` — new first-time subs
2. `channel.subscription.message` — resubs (user shares resub in chat)
3. `channel.subscription.gift` — gift subs

Each subscription is created via `POST https://api.twitch.tv/helix/eventsub/subscriptions` with:
- `type`: the event type
- `version`: "1"
- `condition`: `{ broadcaster_user_id: <twitch_user_id> }`
- `transport`: `{ method: "webhook", callback: "${NEXT_PUBLIC_BASE_URL}/api/twitch/webhooks", secret: TWITCH_WEBHOOK_SECRET }`

### Cleanup (in `DELETE /api/twitch/auth`)

When a user disconnects Twitch:
1. List all EventSub subscriptions for the app via `GET helix/eventsub/subscriptions`
2. Filter by the user's broadcaster ID in the condition
3. Delete each one via `DELETE helix/eventsub/subscriptions?id=<sub_id>`

### App Access Token

EventSub webhook subscription creation requires a client credentials token, not a user token. Add a helper that:
- POSTs to `https://id.twitch.tv/oauth2/token` with `grant_type=client_credentials`
- Caches the token in memory (they last ~60 days)
- Refreshes when expired

## Overlay API Change

In `/api/overlay/[profileId]/route.ts`:

Replace `fetchTwitchLatestSub` (which calls `helix/subscriptions?first=1`) with a DB query:

```sql
SELECT * FROM twitch_events
WHERE broadcaster_id = ?
ORDER BY created_at DESC
LIMIT 1
```

No external API call. Instant. Includes resubs and gift subs.

The `TwitchCard` component already handles username + avatar, so no frontend changes needed for the basic case.

## Error Handling

- **Duplicate events:** `message_id` unique constraint. Insert with ON CONFLICT DO NOTHING.
- **Signature failure:** Return 403. Twitch retries.
- **Avatar fetch failure:** Store event with `avatar_url = null`. Overlay handles missing avatars.
- **Twitch retries:** Twitch retries failed webhook deliveries. Idempotency via `message_id` prevents duplicates.
- **Subscription revocation:** Logged but no action. User must re-auth to restore.

## Migration for Existing Users

A migration script creates EventSub subscriptions for all users who already have `twitch_user_id` and valid tokens. Run once after deployment.

## New Environment Variable

- `TWITCH_WEBHOOK_SECRET` — shared secret for webhook HMAC verification. Generate a random string (32+ chars).

## Scope

Existing OAuth scope `channel:read:subscriptions` already covers all three event types. No changes to the auth flow needed.

## Out of Scope

- Conduit transport (not needed at current scale)
- WebSocket transport (less reliable with PM2 restarts)
- Historical backfill (no API for past sub events)
- New card types for gift subs or resubs (can be added later using the stored data)
