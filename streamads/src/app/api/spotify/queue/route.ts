import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const [user] = await db
    .select({
      id: users.id,
      spotifyAccessToken: users.spotifyAccessToken,
      spotifyRefreshToken: users.spotifyRefreshToken,
      spotifyTokenExpiry: users.spotifyTokenExpiry,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.spotifyAccessToken) {
    return NextResponse.json({ hasNext: false });
  }

  let accessToken = user.spotifyAccessToken;

  // Refresh if expired
  if (user.spotifyTokenExpiry && new Date(user.spotifyTokenExpiry) < new Date()) {
    if (!user.spotifyRefreshToken) {
      return NextResponse.json({ hasNext: false });
    }
    const refreshRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.spotifyRefreshToken,
      }),
    });

    if (!refreshRes.ok) return NextResponse.json({ hasNext: false });

    const tokens = await refreshRes.json();
    accessToken = tokens.access_token;
    const expiry = new Date(Date.now() + tokens.expires_in * 1000);
    await db.update(users).set({
      spotifyAccessToken: tokens.access_token,
      spotifyTokenExpiry: expiry,
      ...(tokens.refresh_token ? { spotifyRefreshToken: tokens.refresh_token } : {}),
    }).where(eq(users.id, user.id));
  }

  // Fetch queue
  const queueRes = await fetch('https://api.spotify.com/v1/me/player/queue', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!queueRes.ok) {
    return NextResponse.json({ hasNext: false });
  }

  const data = await queueRes.json();
  const nextTrack = data.queue?.[0];

  if (!nextTrack) {
    return NextResponse.json({ hasNext: false });
  }

  return NextResponse.json({
    hasNext: true,
    trackName: nextTrack.name,
    artistName: nextTrack.artists?.map((a: { name: string }) => a.name).join(', ') || '',
    albumArtUrl: nextTrack.album?.images?.[1]?.url || nextTrack.album?.images?.[0]?.url || null,
  });
}
