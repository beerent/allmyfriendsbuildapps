import { describe, it, expect } from 'vitest';
import {
  users,
  marketplaceItems,
  adProfiles,
  adProfileItems,
  itemTypeEnum,
  colorThemeEnum,
  colorStyleEnum,
} from '@/lib/db/schema';

describe('database schema', () => {
  it('defines users table with required columns', () => {
    expect(users.id).toBeDefined();
    expect(users.firebaseUid).toBeDefined();
    expect(users.displayName).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.createdAt).toBeDefined();
  });

  it('defines marketplace_items table with required columns', () => {
    expect(marketplaceItems.id).toBeDefined();
    expect(marketplaceItems.type).toBeDefined();
    expect(marketplaceItems.creatorId).toBeDefined();
    expect(marketplaceItems.headline).toBeDefined();
    expect(marketplaceItems.subtext).toBeDefined();
    expect(marketplaceItems.brandUrl).toBeDefined();
    expect(marketplaceItems.imageUrl).toBeDefined();
    expect(marketplaceItems.subtext2).toBeDefined();
    expect(marketplaceItems.createdAt).toBeDefined();
  });

  it('defines ad_profiles table with required columns', () => {
    expect(adProfiles.id).toBeDefined();
    expect(adProfiles.ownerId).toBeDefined();
    expect(adProfiles.name).toBeDefined();
    expect(adProfiles.createdAt).toBeDefined();
    expect(adProfiles.updatedAt).toBeDefined();
  });

  it('defines ad_profile_items join table', () => {
    expect(adProfileItems.id).toBeDefined();
    expect(adProfileItems.profileId).toBeDefined();
    expect(adProfileItems.itemId).toBeDefined();
    expect(adProfileItems.displayDuration).toBeDefined();
    expect(adProfileItems.sortOrder).toBeDefined();
  });

  it('defines item type enum with correct values', () => {
    expect(itemTypeEnum.enumValues).toEqual(['ad', 'card', 'spotify', 'placeholder', 'twitch']);
  });

  it('defines color theme and style columns on marketplace_items', () => {
    expect(marketplaceItems.colorTheme).toBeDefined();
    expect(marketplaceItems.colorStyle).toBeDefined();
  });

  it('defines color theme enum with correct values', () => {
    expect(colorThemeEnum.enumValues).toEqual([
      'blue', 'purple', 'magenta', 'red', 'orange', 'green', 'teal', 'slate',
    ]);
  });

  it('defines color style enum with correct values', () => {
    expect(colorStyleEnum.enumValues).toEqual(['matched', 'fulltint']);
  });
});
