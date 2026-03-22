# Notification System

## Overview

Bell icon in the nav with a dropdown showing notifications. Users are notified when someone follows them, adds their card to a profile, or upvotes their card. Notifications link to relevant pages when clicked.

## Database

### New table: `notifications`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default random |
| user_id | uuid | NOT NULL, FK → users.id ON DELETE CASCADE (recipient) |
| type | text | NOT NULL, one of: 'follow', 'card_added', 'upvote' |
| actor_id | uuid | NOT NULL, FK → users.id ON DELETE CASCADE (who triggered it) |
| target_id | uuid | nullable (marketplace item ID for card_added/upvote, null for follow) |
| read | boolean | NOT NULL, default false |
| created_at | timestamp | NOT NULL, default now() |

Index on `(user_id, read, created_at DESC)` for fast unread count + listing.

## API

### `GET /api/notifications`

Auth required. Returns the user's latest 50 notifications with actor info.

Response:
```json
[
  {
    "id": "uuid",
    "type": "follow",
    "actorUsername": "alice_codes",
    "actorDisplayName": "Alice Chen",
    "targetHeadline": null,
    "targetId": null,
    "read": false,
    "createdAt": "2026-03-22T..."
  }
]
```

### `GET /api/notifications/count`

Auth required. Returns unread count.

Response: `{ "count": 3 }`

### `PUT /api/notifications/read`

Auth required. Marks all notifications as read.

Response: `{ "success": true }`

## Trigger Points

Notifications are created by inserting a row in existing API handlers:

1. **`POST /api/follow`** — on follow (not unfollow), create notification with `type: 'follow'`, `userId: followedUser`, `actorId: follower`
2. **Add item to profile** — when a user adds a marketplace item to their profile, create notification with `type: 'card_added'`, `userId: cardCreator`, `actorId: adder`, `targetId: itemId`. Skip if creator is null (system items) or if adding your own card.
3. **`POST /api/upvote`** — on upvote (not un-upvote), create notification with `type: 'upvote'`, `userId: cardCreator`, `actorId: upvoter`, `targetId: itemId`. Skip if creator is null or upvoting your own card.

## UI

### Bell icon in nav

- Position: between search dropdown and profile link
- Red dot badge with unread count (hidden when 0)
- Click opens dropdown, fetches full notification list
- Click outside or Escape closes dropdown

### Notification row

- Actor's gradient avatar (small, deterministic from username)
- Message text with bold actor username
- Relative timestamp (e.g., "2m ago", "1h ago", "3d ago")
- Unread rows have a subtle left border accent or dot
- Clicking navigates: follow → `/u/[actorUsername]`, card_added → `/marketplace`, upvote → `/marketplace`

### Mark all read

- Button at bottom of dropdown: "Mark all read"
- Calls `PUT /api/notifications/read`
- Clears unread badge

### Polling

- Fetch `GET /api/notifications/count` on nav mount
- Poll every 60 seconds for updated count
- Full list fetched only when dropdown is opened

## Files to Create

1. `src/app/api/notifications/route.ts` — GET list + PUT mark read
2. `src/app/api/notifications/count/route.ts` — GET unread count
3. `src/components/notification-bell.tsx` — bell icon + dropdown component

## Files to Modify

1. `src/lib/db/schema.ts` — add `notifications` table
2. `src/app/api/follow/route.ts` — insert notification on follow
3. `src/app/api/marketplace/[id]/upvote/route.ts` or wherever upvote lives — insert notification on upvote
4. `src/app/api/profiles/[id]/route.ts` or add-to-profile handler — insert notification on card add
5. `src/components/nav.tsx` — add NotificationBell component
