import { getValidAccessToken } from './tokens';

export type SpotifyTrack = {
  name: string;
  artist: string;
  albumArtUrl: string | null;
};

export type SpotifyResult =
  | { connected: false }
  | { connected: true; playing: false }
  | { connected: true; playing: true; track: SpotifyTrack };

const cache = new Map<string, { result: SpotifyResult; timestamp: number }>();
const CACHE_TTL = 5000;

function cached(key: string): SpotifyResult | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.result;
  return null;
}

function setCache(key: string, result: SpotifyResult): SpotifyResult {
  cache.set(key, { result, timestamp: Date.now() });
  return result;
}

function parseTrack(item: Record<string, unknown>): SpotifyTrack {
  return {
    name: (item as { name: string }).name,
    artist: ((item as { artists?: { name: string }[] }).artists ?? []).map((a) => a.name).join(', '),
    albumArtUrl: ((item as { album?: { images?: { url: string }[] } }).album?.images?.[0]?.url) ?? null,
  };
}

export async function getNowPlaying(userId: string): Promise<SpotifyResult> {
  const cacheKey = `now-playing:${userId}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  const tokenResult = await getValidAccessToken(userId);
  if ('error' in tokenResult) {
    if (tokenResult.error === 'not-connected' || tokenResult.error === 'not-found') {
      return { connected: false };
    }
    return setCache(cacheKey, { connected: true, playing: false });
  }

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
    });

    if (res.status === 204 || !res.ok) {
      return setCache(cacheKey, { connected: true, playing: false });
    }

    const data = await res.json();
    if (!data.is_playing || !data.item) {
      return setCache(cacheKey, { connected: true, playing: false });
    }

    return setCache(cacheKey, { connected: true, playing: true, track: parseTrack(data.item) });
  } catch {
    return setCache(cacheKey, { connected: true, playing: false });
  }
}

export async function getNextUp(userId: string): Promise<SpotifyResult> {
  const cacheKey = `next-up:${userId}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  const tokenResult = await getValidAccessToken(userId);
  if ('error' in tokenResult) {
    if (tokenResult.error === 'not-connected' || tokenResult.error === 'not-found') {
      return { connected: false };
    }
    return setCache(cacheKey, { connected: true, playing: false });
  }

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/queue', {
      headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
    });

    if (res.status === 204 || !res.ok) {
      return setCache(cacheKey, { connected: true, playing: false });
    }

    const data = await res.json();
    const nextTrack = data.queue?.[0];
    if (!nextTrack) {
      return setCache(cacheKey, { connected: true, playing: false });
    }

    return setCache(cacheKey, { connected: true, playing: true, track: parseTrack(nextTrack) });
  } catch {
    return setCache(cacheKey, { connected: true, playing: false });
  }
}
