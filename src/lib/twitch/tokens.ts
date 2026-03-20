import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { refreshAccessToken } from './oauth';

export async function getValidAccessToken(
  userId: string
): Promise<
  | { accessToken: string; twitchUserId: string }
  | { error: 'not-found' | 'not-connected' | 'refresh-failed' }
> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) return { error: 'not-found' };

  const { twitchAccessToken, twitchRefreshToken, twitchTokenExpiry, twitchUserId } = user[0];

  if (!twitchAccessToken || !twitchRefreshToken || !twitchUserId) return { error: 'not-connected' };

  let accessToken = twitchAccessToken;

  if (twitchTokenExpiry && new Date(twitchTokenExpiry) <= new Date()) {
    try {
      const refreshed = await refreshAccessToken(twitchRefreshToken);
      accessToken = refreshed.accessToken;

      const expiry = new Date(Date.now() + refreshed.expiresIn * 1000);
      await db
        .update(users)
        .set({
          twitchAccessToken: refreshed.accessToken,
          twitchRefreshToken: refreshed.refreshToken,
          twitchTokenExpiry: expiry,
        })
        .where(eq(users.id, userId));
    } catch {
      return { error: 'refresh-failed' };
    }
  }

  return { accessToken, twitchUserId };
}
