# Card Configuration System Design Spec

## Goal

Replace the separate goals table with a unified per-profile-item JSON config system. Configurable cards (goals, countdown, future types) store their settings directly on the profile item. Config happens at add time and is editable on the profile editor.

## Architecture

Add a `config` JSONB column to `ad_profile_items`. Card type determines the config schema. No separate tables or pages needed for new configurable card types.

## Database Changes

- Add `config` (jsonb, nullable) column to `ad_profile_items`
- Drop `goals` table
- Drop `goal_type` enum
- Add `countdown` to `item_type` enum

## Config Schemas

```
goal:       { title: string, target: number, goalType: 'long_sub'|'long_bits'|'daily_sub'|'daily_bits', dailyBaseline?: number, baselineDate?: string }
countdown:  { label: string, endDate: string }
all others: null
```

## User Flow

1. User clicks "+ Add to Profile" on a marketplace item
2. If card type has a config schema → config form modal appears
3. User fills in config → item + config saved to `ad_profile_items`
4. On profile editor → configurable items show a "Configure" button to edit
5. Overlay API reads config from profile item, enriches with live data

## Card Types Requiring Config

| Type | Config Fields | Notes |
|------|--------------|-------|
| `goal` | title, target, goalType | goalType determines sub vs bits, long vs daily |
| `countdown` | label, endDate | Client-side countdown timer |

## API Changes

### Profiles PUT (`/api/profiles/[id]`)
- Accept `config` on each item in the items array
- Store it in the new JSONB column

### Overlay API (`/api/overlay/[profileId]`)
- Read config from `ad_profile_items.config` instead of `goals` table
- For goal items: use config to determine what Twitch data to fetch
- For countdown items: pass config through to client
- Daily baseline updates write back to the profile item's config

### Goals API
- Remove `/api/goals` entirely

## Component Changes

### Add-to-Profile Modal
- Detect if marketplace item type needs config
- Show inline config form before saving
- Config form is type-specific: goal form for goals, countdown form for countdowns

### Profile Editor
- Show "Configure" button on items that have config
- Opens same config form as add-time, pre-filled with current values
- Saves via the existing PUT endpoint

### CountdownCard (new)
- Accepts `label` and `endDate` props
- Renders live countdown (days/hours/minutes/seconds)
- Shows "Complete!" when past end date

## Integrations Page
- Remove the "Goal Tracker" section entirely
- Goals are now configured per-card, not globally

## Migration

- Drop the `goals` table (it was just added this session, no prod data to preserve)
- Existing goal marketplace items stay, they just use the new config system

## Out of Scope

- Config validation beyond required fields
- Config versioning or migration
- Sharing configs between profile items
