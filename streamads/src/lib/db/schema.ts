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
  'card',
  'spotify',
  'placeholder',
  'twitch',
]);

export const colorThemeEnum = pgEnum('color_theme', [
  'blue', 'purple', 'magenta', 'red', 'orange', 'green', 'teal', 'slate',
]);

export const colorStyleEnum = pgEnum('color_style', ['matched', 'fulltint']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  displayName: text('display_name').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  displayDuration: integer('display_duration').default(10).notNull(),
  sortOrder: integer('sort_order').notNull(),
});
