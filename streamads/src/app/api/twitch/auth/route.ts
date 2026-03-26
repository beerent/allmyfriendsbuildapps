import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { deleteEventSubSubscriptions } from '@/lib/twitch/eventsub';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');

  let authRequest = request;
  if (queryToken) {
    authRequest = new Request(request.url, {
      headers: { Authorization: `Bearer ${queryToken}` },
    });
  }

  const user = await verifyAuthToken(authRequest);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITCH_CLIENT_ID!,
    redirect_uri: process.env.TWITCH_REDIRECT_URI!,
    scope: 'channel:read:subscriptions moderator:read:followers bits:read',
    state: user.firebaseUid,
  });

  return NextResponse.redirect(`https://id.twitch.tv/oauth2/authorize?${params}`);
}

export async function DELETE(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { db } = await import('@/lib/db');
  const { users } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  // Get the user's Twitch ID before clearing it
  const [userData] = await db
    .select({ twitchUserId: users.twitchUserId })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  // Clean up EventSub subscriptions
  if (userData?.twitchUserId) {
    deleteEventSubSubscriptions(userData.twitchUserId).catch((err) =>
      console.error('Failed to delete EventSub subscriptions:', err),
    );
  }

  await db.update(users).set({
    twitchAccessToken: null,
    twitchRefreshToken: null,
    twitchTokenExpiry: null,
    twitchUserId: null,
  }).where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}
