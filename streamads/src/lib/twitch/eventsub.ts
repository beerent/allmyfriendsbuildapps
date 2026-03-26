let cachedAppToken: { token: string; expiresAt: number } | null = null;

export async function getAppAccessToken(): Promise<string> {
  if (cachedAppToken && cachedAppToken.expiresAt > Date.now() + 60_000) {
    return cachedAppToken.token;
  }

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get app access token: ${res.status}`);
  }

  const data = await res.json();
  cachedAppToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedAppToken.token;
}

const EVENTSUB_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions';

const SUB_TYPES = [
  { type: 'channel.subscribe', version: '1' },
  { type: 'channel.subscription.message', version: '1' },
  { type: 'channel.subscription.gift', version: '1' },
] as const;

export async function createEventSubSubscriptions(
  broadcasterUserId: string,
): Promise<void> {
  const appToken = await getAppAccessToken();
  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/twitch/webhooks`;
  const secret = process.env.TWITCH_WEBHOOK_SECRET!;

  for (const sub of SUB_TYPES) {
    const res = await fetch(EVENTSUB_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: sub.type,
        version: sub.version,
        condition: { broadcaster_user_id: broadcasterUserId },
        transport: {
          method: 'webhook',
          callback: callbackUrl,
          secret,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Failed to create EventSub ${sub.type} for ${broadcasterUserId}: ${err}`);
    }
  }
}

export async function deleteEventSubSubscriptions(
  broadcasterUserId: string,
): Promise<void> {
  const appToken = await getAppAccessToken();

  // List all subscriptions
  const res = await fetch(EVENTSUB_URL, {
    headers: {
      Authorization: `Bearer ${appToken}`,
      'Client-Id': process.env.TWITCH_CLIENT_ID!,
    },
  });

  if (!res.ok) return;

  const data = await res.json();
  const subs = (data.data ?? []).filter(
    (s: any) =>
      s.condition?.broadcaster_user_id === broadcasterUserId,
  );

  for (const sub of subs) {
    await fetch(`${EVENTSUB_URL}?id=${sub.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${appToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      },
    });
  }
}
