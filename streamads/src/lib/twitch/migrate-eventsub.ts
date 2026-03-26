import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isNotNull } from 'drizzle-orm';
import { createEventSubSubscriptions } from './eventsub';

async function migrate() {
  const twitchUsers = await db
    .select({
      id: users.id,
      twitchUserId: users.twitchUserId,
      displayName: users.displayName,
    })
    .from(users)
    .where(isNotNull(users.twitchUserId));

  console.log(`Found ${twitchUsers.length} Twitch-connected users`);

  for (const user of twitchUsers) {
    if (!user.twitchUserId) continue;
    console.log(`Creating EventSub subscriptions for ${user.displayName} (${user.twitchUserId})`);
    try {
      await createEventSubSubscriptions(user.twitchUserId);
      console.log(`  Done`);
    } catch (err) {
      console.error(`  Failed:`, err);
    }
  }

  console.log('Migration complete');
  process.exit(0);
}

migrate();
