import { db } from '@/lib/db';
import { adProfiles, adProfileItems, marketplaceItems, users, twitchEvents } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

async function refreshTwitchToken(userId: string, refreshToken: string): Promise<string | null> {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) return null;

  const tokens = await res.json();
  const expiry = new Date(Date.now() + tokens.expires_in * 1000);

  await db.update(users).set({
    twitchAccessToken: tokens.access_token,
    twitchRefreshToken: tokens.refresh_token ?? refreshToken,
    twitchTokenExpiry: expiry,
  }).where(eq(users.id, userId));

  return tokens.access_token;
}

async function getTwitchToken(owner: { id: string; twitchAccessToken: string | null; twitchRefreshToken: string | null; twitchTokenExpiry: Date | null; twitchUserId: string | null }): Promise<string | null> {
  if (!owner.twitchAccessToken || !owner.twitchRefreshToken) return null;

  // Check if token is expired (with 5min buffer)
  if (owner.twitchTokenExpiry && new Date(owner.twitchTokenExpiry).getTime() < Date.now() + 300000) {
    return refreshTwitchToken(owner.id, owner.twitchRefreshToken);
  }

  return owner.twitchAccessToken;
}

async function fetchTwitchFollower(token: string, broadcasterId: string): Promise<{ username: string; avatarUrl: string | null } | null> {
  try {
    const res = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const follower = data.data?.[0];
    if (!follower) return null;

    // Fetch avatar
    const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${follower.user_login}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      },
    });
    let avatarUrl = null;
    if (userRes.ok) {
      const userData = await userRes.json();
      avatarUrl = userData.data?.[0]?.profile_image_url ?? null;
    }

    return { username: follower.user_name, avatarUrl };
  } catch {
    return null;
  }
}

async function fetchTwitchLatestSub(broadcasterId: string): Promise<{ username: string; avatarUrl: string | null } | null> {
  try {
    const [event] = await db
      .select({
        userName: twitchEvents.userName,
        avatarUrl: twitchEvents.avatarUrl,
      })
      .from(twitchEvents)
      .where(eq(twitchEvents.broadcasterId, broadcasterId))
      .orderBy(desc(twitchEvents.createdAt))
      .limit(1);

    if (!event) return null;
    return { username: event.userName, avatarUrl: event.avatarUrl };
  } catch {
    return null;
  }
}

async function fetchTwitchSubCount(token: string, broadcasterId: string): Promise<number> {
  try {
    // Get total sub count from the subscription endpoint
    const res = await fetch(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}&first=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    // total includes the broadcaster, subtract 1
    return Math.max((data.total ?? 0) - 1, 0);
  } catch {
    return 0;
  }
}

async function fetchTwitchBitsTotal(token: string, broadcasterId: string, startDate: Date): Promise<number> {
  try {
    const started = startDate.toISOString();
    const res = await fetch(`https://api.twitch.tv/helix/bits/leaderboard?count=100&period=all&started_at=${started}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    // Sum all bits from leaderboard
    return (data.data ?? []).reduce((sum: number, entry: { score: number }) => sum + entry.score, 0);
  } catch {
    return 0;
  }
}

async function fetchTwitchBitsToday(token: string): Promise<number> {
  try {
    const res = await fetch(`https://api.twitch.tv/helix/bits/leaderboard?count=100&period=day`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return (data.data ?? []).reduce((sum: number, entry: { score: number }) => sum + entry.score, 0);
  } catch {
    return 0;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;

  const profile = await db
    .select({ ownerId: adProfiles.ownerId })
    .from(adProfiles)
    .where(eq(adProfiles.id, profileId))
    .limit(1);

  if (profile.length === 0) {
    return NextResponse.json([]);
  }

  // Get owner data
  const owner = await db
    .select()
    .from(users)
    .where(eq(users.id, profile[0].ownerId))
    .limit(1);

  const ownerData = owner[0] ?? null;

  // Fetch items first so we know what data we need
  const items = await db
    .select({
      profileItem: adProfileItems,
      marketplaceItem: marketplaceItems,
    })
    .from(adProfileItems)
    .innerJoin(marketplaceItems, eq(adProfileItems.itemId, marketplaceItems.id))
    .where(eq(adProfileItems.profileId, profileId))
    .orderBy(adProfileItems.sortOrder);

  // Determine what Twitch data to fetch based on items
  const hasGoalItems = items.some((i) => i.marketplaceItem.type === 'goal');
  let twitchFollower: { username: string; avatarUrl: string | null } | null = null;
  let twitchLatestSub: { username: string; avatarUrl: string | null } | null = null;
  let twitchSubCount = 0;
  let twitchBitsTotal = 0;
  let twitchBitsToday = 0;

  if (ownerData?.twitchAccessToken && ownerData?.twitchUserId) {
    const token = await getTwitchToken(ownerData);
    if (token) {
      const goalConfigs = items
        .filter((i) => i.marketplaceItem.type === 'goal')
        .map((i) => (i.profileItem.config as Record<string, unknown> | null)?.goalType as string)
        .filter(Boolean);
      const needsSubs = goalConfigs.some((t) => t?.includes('sub'));
      const needsBits = goalConfigs.some((t) => t?.includes('bits'));

      const fetchPromises: Promise<any>[] = [
        fetchTwitchFollower(token, ownerData.twitchUserId),
        fetchTwitchLatestSub(ownerData.twitchUserId),
        needsSubs ? fetchTwitchSubCount(token, ownerData.twitchUserId) : Promise.resolve(0),
        needsBits ? fetchTwitchBitsTotal(token, ownerData.twitchUserId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) : Promise.resolve(0),
        needsBits ? fetchTwitchBitsToday(token) : Promise.resolve(0),
      ];

      const results = await Promise.all(fetchPromises);
      twitchFollower = results[0];
      twitchLatestSub = results[1];
      twitchSubCount = results[2] ?? 0;
      twitchBitsTotal = results[3] ?? 0;
      twitchBitsToday = results[4] ?? 0;

      // Handle daily sub baselines
      for (const item of items) {
        if (item.marketplaceItem.type !== 'goal') continue;
        const cfg = item.profileItem.config as Record<string, unknown> | null;
        if (cfg?.goalType !== 'daily_sub') continue;
        const tz = ownerData.timezone ?? 'America/New_York';
        const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
        if (cfg.baselineDate !== today) {
          const updated = { ...cfg, dailyBaseline: twitchSubCount, baselineDate: today };
          await db.update(adProfileItems).set({ config: updated }).where(eq(adProfileItems.id, item.profileItem.id));
          (item.profileItem as any).config = updated;
        }
      }
    }
  }

  const result = items.map((i) => {
    const base = {
      ...i.marketplaceItem,
      displayDuration: i.profileItem.displayDuration,
      sortOrder: i.profileItem.sortOrder,
      config: i.profileItem.config,
    };

    if (i.marketplaceItem.type === 'spotify') {
      return { ...base, ownerId: ownerData?.id ?? null };
    }
    if (i.marketplaceItem.type === 'kofi') {
      return { ...base, ownerKofi: ownerData?.kofiUsername ?? null };
    }
    if (i.marketplaceItem.type === 'buymeacoffee') {
      return { ...base, ownerBmc: ownerData?.bmcUsername ?? null };
    }
    if (i.marketplaceItem.type === 'twitch') {
      const isFollowerCard = i.marketplaceItem.headline?.toLowerCase().includes('follower');
      const twitchData = isFollowerCard ? twitchFollower : twitchLatestSub;
      return {
        ...base,
        twitchUsername: twitchData?.username ?? null,
        twitchAvatarUrl: twitchData?.avatarUrl ?? null,
      };
    }

    if (i.marketplaceItem.type === 'goal') {
      const cfg = i.profileItem.config as Record<string, unknown> | null;
      const goalType = (cfg?.goalType as string) ?? 'long_sub';
      let current = 0;
      if (goalType === 'long_sub') current = twitchSubCount;
      else if (goalType === 'long_bits') current = twitchBitsTotal;
      else if (goalType === 'daily_sub') current = Math.max(twitchSubCount - ((cfg?.dailyBaseline as number) ?? 0), 0);
      else if (goalType === 'daily_bits') current = twitchBitsToday;

      return {
        ...base,
        goalTitle: (cfg?.title as string) ?? i.marketplaceItem.headline ?? 'Goal',
        goalCurrent: current,
        goalTarget: (cfg?.target as number) ?? 100,
        goalUnit: goalType.includes('bit') ? 'bits' : 'subs',
        goalDaily: goalType.startsWith('daily'),
      };
    }

    if (i.marketplaceItem.type === 'countdown') {
      const cfg = i.profileItem.config as Record<string, unknown> | null;
      return {
        ...base,
        countdownLabel: (cfg?.label as string) ?? i.marketplaceItem.headline ?? 'Countdown',
        countdownEndDate: (cfg?.endDate as string) ?? null,
      };
    }

    return base;
  });

  return NextResponse.json(result);
}
