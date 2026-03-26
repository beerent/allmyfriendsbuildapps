import { db } from '@/lib/db';
import { twitchEvents } from '@/lib/db/schema';
import { getAppAccessToken } from '@/lib/twitch/eventsub';
import {
  verifyTwitchSignature,
  parseSubscribeEvent,
  parseResubEvent,
  parseGiftSubEvent,
  type TwitchSubEvent,
} from '@/lib/twitch/webhook';

const TWITCH_MESSAGE_TYPE = 'twitch-eventsub-message-type';
const TWITCH_MESSAGE_ID = 'twitch-eventsub-message-id';

async function fetchTwitchAvatar(userId: string): Promise<string | null> {
  try {
    const appToken = await getAppAccessToken();
    const res = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
      headers: {
        Authorization: `Bearer ${appToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.profile_image_url ?? null;
  } catch {
    return null;
  }
}

async function storeEvent(event: TwitchSubEvent): Promise<void> {
  const avatarUrl = await fetchTwitchAvatar(event.userId);

  await db
    .insert(twitchEvents)
    .values({
      messageId: event.messageId,
      broadcasterId: event.broadcasterId,
      eventType: event.eventType,
      userName: event.userName,
      userId: event.userId,
      avatarUrl,
      tier: event.tier,
      message: event.message,
      cumulativeMonths: event.cumulativeMonths,
      streakMonths: event.streakMonths,
      isGift: event.isGift ? 1 : 0,
      gifterName: event.gifterName,
      gifterId: event.gifterId,
      giftTotal: event.giftTotal,
      eventTimestamp: new Date(event.eventTimestamp),
    })
    .onConflictDoNothing({ target: twitchEvents.messageId });
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  if (!verifyTwitchSignature(request.headers, rawBody)) {
    return new Response('Invalid signature', { status: 403 });
  }

  const messageType = request.headers.get(TWITCH_MESSAGE_TYPE);
  const messageId = request.headers.get(TWITCH_MESSAGE_ID)!;
  const payload = JSON.parse(rawBody);

  // Handle verification challenge
  if (messageType === 'webhook_callback_verification') {
    return new Response(payload.challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Handle revocation
  if (messageType === 'revocation') {
    console.log(`EventSub revoked: ${payload.subscription?.type} for ${payload.subscription?.condition?.broadcaster_user_id}`);
    return new Response('OK', { status: 200 });
  }

  // Handle notification
  if (messageType === 'notification') {
    const subType = payload.subscription?.type;
    let event: TwitchSubEvent | null = null;

    if (subType === 'channel.subscribe') {
      event = parseSubscribeEvent(messageId, payload);
    } else if (subType === 'channel.subscription.message') {
      event = parseResubEvent(messageId, payload);
    } else if (subType === 'channel.subscription.gift') {
      event = parseGiftSubEvent(messageId, payload);
    }

    if (event) {
      await storeEvent(event);
    }

    return new Response('OK', { status: 200 });
  }

  return new Response('Unknown message type', { status: 400 });
}
