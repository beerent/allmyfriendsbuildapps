import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const SCOPES = 'moderator:read:followers channel:read:subscriptions';

const pendingStates = new Map<string, { userId: string; createdAt: number }>();

function cleanupStates() {
  const now = Date.now();
  for (const [key, value] of pendingStates) {
    if (now - value.createdAt > 10 * 60 * 1000) {
      pendingStates.delete(key);
    }
  }
}

export function buildAuthUrl(userId: string): string {
  cleanupStates();
  const state = crypto.randomUUID();
  pendingStates.set(state, { userId, createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!,
    redirect_uri: process.env.TWITCH_REDIRECT_URI!,
    response_type: 'code',
    scope: SCOPES,
    state,
  });

  return `${TWITCH_AUTH_URL}?${params}`;
}

export function validateState(state: string): string | null {
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  if (Date.now() - entry.createdAt > 10 * 60 * 1000) return null;
  return entry.userId;
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const res = await fetch(TWITCH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TWITCH_REDIRECT_URI!,
    }),
  });

  if (!res.ok) throw new Error(`Twitch token exchange failed: ${res.status}`);

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const res = await fetch(TWITCH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error(`Twitch token refresh failed: ${res.status}`);

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function storeTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  twitchUserId: string
) {
  const expiry = new Date(Date.now() + expiresIn * 1000);
  await db
    .update(users)
    .set({
      twitchAccessToken: accessToken,
      twitchRefreshToken: refreshToken,
      twitchTokenExpiry: expiry,
      twitchUserId,
    })
    .where(eq(users.id, userId));
}

export async function clearTokens(userId: string) {
  await db
    .update(users)
    .set({
      twitchAccessToken: null,
      twitchRefreshToken: null,
      twitchTokenExpiry: null,
      twitchUserId: null,
    })
    .where(eq(users.id, userId));
}

export async function getTwitchUserId(accessToken: string): Promise<string> {
  const res = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID!,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch Twitch user');
  const data = await res.json();
  return data.data[0].id;
}
