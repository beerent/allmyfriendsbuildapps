import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

async function refreshToken(userId: string, refreshToken: string) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const expiry = new Date(Date.now() + data.expires_in * 1000);

  await db.update(users).set({
    spotifyAccessToken: data.access_token,
    spotifyTokenExpiry: expiry,
    ...(data.refresh_token ? { spotifyRefreshToken: data.refresh_token } : {}),
  }).where(eq(users.id, userId));

  return data.access_token;
}

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
    return NextResponse.json({ playing: false });
  }

  let accessToken = user.spotifyAccessToken;

  // Refresh if expired
  if (user.spotifyTokenExpiry && new Date(user.spotifyTokenExpiry) < new Date()) {
    if (!user.spotifyRefreshToken) {
      return NextResponse.json({ playing: false });
    }
    const newToken = await refreshToken(user.id, user.spotifyRefreshToken);
    if (!newToken) {
      return NextResponse.json({ playing: false });
    }
    accessToken = newToken;
  }

  // Fetch currently playing
  const spotifyRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (spotifyRes.status === 204 || !spotifyRes.ok) {
    return NextResponse.json({ playing: false });
  }

  const data = await spotifyRes.json();

  if (!data.is_playing || !data.item) {
    return NextResponse.json({ playing: false });
  }

  return NextResponse.json({
    playing: true,
    trackName: data.item.name,
    artistName: data.item.artists?.map((a: { name: string }) => a.name).join(', ') || '',
    albumArtUrl: data.item.album?.images?.[1]?.url || data.item.album?.images?.[0]?.url || null,
  });
}
