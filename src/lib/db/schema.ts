import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const itemTypeEnum = pgEnum('item_type', [
  'ad',
  'spotify',
  'placeholder',
  'twitch',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  displayName: text('display_name').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  spotifyAccessToken: text('spotify_access_token'),
  spotifyRefreshToken: text('spotify_refresh_token'),
  spotifyTokenExpiry: timestamp('spotify_token_expiry'),
  twitchAccessToken: text('twitch_access_token'),
  twitchRefreshToken: text('twitch_refresh_token'),
  twitchTokenExpiry: timestamp('twitch_token_expiry'),
  twitchUserId: text('twitch_user_id'),
});

export const marketplaceItems = pgTable('marketplace_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: itemTypeEnum('type').notNull(),
  creatorId: uuid('creator_id').references(() => users.id),
  headline: text('headline'),
  subtext: text('subtext'),
  brandUrl: text('brand_url'),
  imageUrl: text('image_url'),
  variant: text('variant'),
  displayDuration: integer('display_duration').default(10).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adProfiles = pgTable('ad_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .references(() => users.id)
    .notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adProfileItems = pgTable('ad_profile_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .references(() => adProfiles.id, { onDelete: 'cascade' })
    .notNull(),
  itemId: uuid('item_id')
    .references(() => marketplaceItems.id)
    .notNull(),
  displayDuration: integer('display_duration'),
  sortOrder: integer('sort_order').notNull(),
});
