import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createEventSubSubscriptions } from '@/lib/twitch/eventsub';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.url;

  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/integrations?error=twitch_denied', baseUrl));
  }

  const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
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

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/integrations?error=twitch_token_failed', baseUrl));
  }

  const tokens = await tokenResponse.json();
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);

  // Get Twitch user ID
  const userResponse = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID!,
    },
  });

  let twitchUserId = null;
  if (userResponse.ok) {
    const userData = await userResponse.json();
    twitchUserId = userData.data?.[0]?.id ?? null;
  }

  await db.update(users).set({
    twitchAccessToken: tokens.access_token,
    twitchRefreshToken: tokens.refresh_token,
    twitchTokenExpiry: expiry,
    twitchUserId,
  }).where(eq(users.firebaseUid, state));

  // Create EventSub subscriptions for real-time sub events
  if (twitchUserId) {
    createEventSubSubscriptions(twitchUserId).catch((err) =>
      console.error('Failed to create EventSub subscriptions:', err),
    );
  }

  return NextResponse.redirect(new URL('/integrations?connected=twitch', baseUrl));
}
