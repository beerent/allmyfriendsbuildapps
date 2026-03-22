import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';

export const itemTypeEnum = pgEnum('item_type', [
  'ad',
  'card',
  'spotify',
  'placeholder',
  'twitch',
  'kofi',
  'buymeacoffee',
  'goal',
  'countdown',
]);

export const colorThemeEnum = pgEnum('color_theme', [
  'blue', 'purple', 'magenta', 'red', 'orange', 'green', 'teal', 'slate',
]);

export const colorStyleEnum = pgEnum('color_style', ['matched', 'fulltint']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  username: text('username').unique(),
  displayName: text('display_name').notNull(),
  email: text('email').notNull(),
  avatarUrl: text('avatar_url'),
  plan: text('plan').default('free').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  spotifyAccessToken: text('spotify_access_token'),
  spotifyRefreshToken: text('spotify_refresh_token'),
  spotifyTokenExpiry: timestamp('spotify_token_expiry'),
  twitchAccessToken: text('twitch_access_token'),
  twitchRefreshToken: text('twitch_refresh_token'),
  twitchTokenExpiry: timestamp('twitch_token_expiry'),
  twitchUserId: text('twitch_user_id'),
  kofiUsername: text('kofi_username'),
  bmcUsername: text('bmc_username'),
  timezone: text('timezone').default('America/New_York'),
});

export const marketplaceItems = pgTable('marketplace_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: itemTypeEnum('type').notNull(),
  creatorId: uuid('creator_id').references(() => users.id),
  headline: text('headline'),
  subtext: text('subtext'),
  brandUrl: text('brand_url'),
  imageUrl: text('image_url'),
  subtext2: text('subtext2'),
  colorTheme: colorThemeEnum('color_theme').default('blue').notNull(),
  colorStyle: colorStyleEnum('color_style').default('matched').notNull(),
  category: text('category'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  archived: integer('archived').default(0).notNull(),
  tags: text('tags'),
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
  displayDuration: integer('display_duration').default(10).notNull(),
  sortOrder: integer('sort_order').notNull(),
  config: jsonb('config'),
});

export const platformEnum = pgEnum('platform', ['twitch', 'youtube', 'kick', 'x', 'tiktok']);

export const socialLinks = pgTable('social_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  platform: platformEnum('platform').notNull(),
  username: text('username').notNull(),
  isPrimary: integer('is_primary').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique().on(t.userId, t.platform),
]);

export const upvotes = pgTable('upvotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  itemId: uuid('item_id')
    .references(() => marketplaceItems.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique().on(t.userId, t.itemId),
]);

export const follows = pgTable('follows', {
  id: uuid('id').defaultRandom().primaryKey(),
  followerId: uuid('follower_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  followingId: uuid('following_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  unique().on(t.followerId, t.followingId),
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(),
  actorId: uuid('actor_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  targetId: uuid('target_id'),
  read: integer('read').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
