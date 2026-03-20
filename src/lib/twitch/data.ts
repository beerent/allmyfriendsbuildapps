import { getValidAccessToken } from './tokens';

export type TwitchResult =
  | { connected: false }
  | { connected: true; hasData: false }
  | { connected: true; hasData: true; username: string; displayName: string; avatarUrl: string | null };

const cache = new Map<string, { result: TwitchResult; timestamp: number }>();
const CACHE_TTL = 10000;

function cached(key: string): TwitchResult | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.result;
  return null;
}

function setCache(key: string, result: TwitchResult): TwitchResult {
  cache.set(key, { result, timestamp: Date.now() });
  return result;
}

async function fetchUserAvatar(
  userId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.profile_image_url ?? null;
  } catch {
    return null;
  }
}

export async function getLatestFollower(userId: string): Promise<TwitchResult> {
  const cacheKey = `twitch-follower:${userId}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  const tokenResult = await getValidAccessToken(userId);
  if ('error' in tokenResult) {
    if (tokenResult.error === 'not-connected' || tokenResult.error === 'not-found') {
      return { connected: false };
    }
    return setCache(cacheKey, { connected: true, hasData: false });
  }

  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${tokenResult.twitchUserId}&first=1`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID!,
        },
      }
    );

    if (!res.ok) return setCache(cacheKey, { connected: true, hasData: false });

    const data = await res.json();
    const follower = data.data?.[0];
    if (!follower) return setCache(cacheKey, { connected: true, hasData: false });

    const avatarUrl = await fetchUserAvatar(follower.user_id, tokenResult.accessToken);

    return setCache(cacheKey, {
      connected: true,
      hasData: true,
      username: follower.user_login,
      displayName: follower.user_name,
      avatarUrl,
    });
  } catch {
    return setCache(cacheKey, { connected: true, hasData: false });
  }
}

export async function getLatestSub(userId: string): Promise<TwitchResult> {
  const cacheKey = `twitch-sub:${userId}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  const tokenResult = await getValidAccessToken(userId);
  if ('error' in tokenResult) {
    if (tokenResult.error === 'not-connected' || tokenResult.error === 'not-found') {
      return { connected: false };
    }
    return setCache(cacheKey, { connected: true, hasData: false });
  }

  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${tokenResult.twitchUserId}&first=1`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID!,
        },
      }
    );

    if (!res.ok) return setCache(cacheKey, { connected: true, hasData: false });

    const data = await res.json();
    const sub = data.data?.[0];
    if (!sub) return setCache(cacheKey, { connected: true, hasData: false });

    const avatarUrl = await fetchUserAvatar(sub.user_id, tokenResult.accessToken);

    return setCache(cacheKey, {
      connected: true,
      hasData: true,
      username: sub.user_login,
      displayName: sub.user_name,
      avatarUrl,
    });
  } catch {
    return setCache(cacheKey, { connected: true, hasData: false });
  }
}
