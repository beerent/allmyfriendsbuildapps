import { db } from './index';
import { marketplaceItems } from './schema';
import { isNull } from 'drizzle-orm';

async function seed() {
  console.log('Seeding system items...');

  const existing = await db
    .select()
    .from(marketplaceItems)
    .where(isNull(marketplaceItems.creatorId));

  if (existing.length > 0) {
    console.log('System items already exist, skipping seed.');
    process.exit(0);
  }

  await db.insert(marketplaceItems).values([
    {
      type: 'spotify',
      variant: 'now-playing',
      creatorId: null,
      headline: 'Now Playing',
      subtext: 'Spotify Integration',
      displayDuration: 10,
    },
    {
      type: 'spotify',
      variant: 'next-up',
      creatorId: null,
      headline: 'Next Up',
      subtext: 'Spotify Queue',
      displayDuration: 10,
    },
    {
      type: 'twitch',
      variant: 'latest-follower',
      creatorId: null,
      headline: 'Latest Follower',
      subtext: 'Twitch Integration',
      displayDuration: 10,
    },
    {
      type: 'twitch',
      variant: 'latest-sub',
      creatorId: null,
      headline: 'Latest Sub',
      subtext: 'Twitch Integration',
      displayDuration: 10,
    },
    {
      type: 'placeholder',
      creatorId: null,
      headline: null,
      subtext: null,
      displayDuration: 5,
    },
  ]);

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
