import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { refreshAccessToken } from './oauth';

export async function getValidAccessToken(
  userId: string
): Promise<{ accessToken: string } | { error: 'not-found' | 'not-connected' | 'refresh-failed' }> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) return { error: 'not-found' };

  const { spotifyAccessToken, spotifyRefreshToken, spotifyTokenExpiry } = user[0];

  if (!spotifyAccessToken || !spotifyRefreshToken) return { error: 'not-connected' };

  let accessToken = spotifyAccessToken;

  if (spotifyTokenExpiry && new Date(spotifyTokenExpiry) <= new Date()) {
    try {
      const refreshed = await refreshAccessToken(spotifyRefreshToken);
      accessToken = refreshed.accessToken;

      const expiry = new Date(Date.now() + refreshed.expiresIn * 1000);
      await db
        .update(users)
        .set({ spotifyAccessToken: refreshed.accessToken, spotifyTokenExpiry: expiry })
        .where(eq(users.id, userId));
    } catch {
      return { error: 'refresh-failed' };
    }
  }

  return { accessToken };
}
