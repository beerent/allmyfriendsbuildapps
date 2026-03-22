import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth/verify-token';

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
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: 'user-read-currently-playing user-read-recently-played',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    state: user.firebaseUid,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
}

export async function DELETE(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { db } = await import('@/lib/db');
  const { users } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  await db.update(users).set({
    spotifyAccessToken: null,
    spotifyRefreshToken: null,
    spotifyTokenExpiry: null,
  }).where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}
