import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let spotifyName: string | null = null;
  let twitchName: string | null = null;

  if (user.spotifyAccessToken) {
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${user.spotifyAccessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        spotifyName = data.display_name ?? null;
      }
    } catch { /* token may be expired */ }
  }

  if (user.twitchAccessToken) {
    try {
      const res = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          Authorization: `Bearer ${user.twitchAccessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID!,
        },
      });
      if (res.ok) {
        const data = await res.json();
        twitchName = data.data?.[0]?.display_name ?? null;
      }
    } catch { /* token may be expired */ }
  }

  return NextResponse.json({
    spotify: { connected: !!user.spotifyRefreshToken, name: spotifyName },
    twitch: { connected: !!user.twitchRefreshToken, name: twitchName },
    kofi: { connected: !!user.kofiUsername, username: user.kofiUsername ?? null },
    buymeacoffee: { connected: !!user.bmcUsername, username: user.bmcUsername ?? null },
  });
}

export async function PUT(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { kofiUsername, bmcUsername } = await request.json();

  await db.update(users).set({
    kofiUsername: kofiUsername?.trim() || null,
    bmcUsername: bmcUsername?.trim() || null,
  }).where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}
