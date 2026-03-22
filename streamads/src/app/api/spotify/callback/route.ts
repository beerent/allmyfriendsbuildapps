import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.url;

  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/integrations?error=spotify_denied', baseUrl));
  }

  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/integrations?error=spotify_token_failed', baseUrl));
  }

  const tokens = await tokenResponse.json();
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);

  await db.update(users).set({
    spotifyAccessToken: tokens.access_token,
    spotifyRefreshToken: tokens.refresh_token,
    spotifyTokenExpiry: expiry,
  }).where(eq(users.firebaseUid, state));

  return NextResponse.redirect(new URL('/integrations?connected=spotify', baseUrl));
}
