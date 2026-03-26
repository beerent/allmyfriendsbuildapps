import { createHmac, timingSafeEqual } from 'crypto';

const TWITCH_MESSAGE_ID = 'twitch-eventsub-message-id';
const TWITCH_MESSAGE_TIMESTAMP = 'twitch-eventsub-message-timestamp';
const TWITCH_MESSAGE_SIGNATURE = 'twitch-eventsub-message-signature';

export function verifyTwitchSignature(
  headers: Headers,
  rawBody: string,
): boolean {
  const secret = process.env.TWITCH_WEBHOOK_SECRET;
  if (!secret) return false;

  const messageId = headers.get(TWITCH_MESSAGE_ID);
  const timestamp = headers.get(TWITCH_MESSAGE_TIMESTAMP);
  const signature = headers.get(TWITCH_MESSAGE_SIGNATURE);

  if (!messageId || !timestamp || !signature) return false;

  const message = messageId + timestamp + rawBody;
  const expectedSig =
    'sha256=' + createHmac('sha256', secret).update(message).digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

export type TwitchSubEvent = {
  messageId: string;
  broadcasterId: string;
  eventType: 'subscribe' | 'resub' | 'gift_sub';
  userName: string;
  userId: string;
  tier: string;
  message: string | null;
  cumulativeMonths: number | null;
  streakMonths: number | null;
  isGift: boolean;
  gifterName: string | null;
  gifterId: string | null;
  giftTotal: number | null;
  eventTimestamp: string;
};

export function parseSubscribeEvent(
  messageId: string,
  payload: Record<string, any>,
): TwitchSubEvent {
  const event = payload.event;
  return {
    messageId,
    broadcasterId: event.broadcaster_user_id,
    eventType: 'subscribe',
    userName: event.user_name,
    userId: event.user_id,
    tier: event.tier,
    message: null,
    cumulativeMonths: null,
    streakMonths: null,
    isGift: event.is_gift ?? false,
    gifterName: null,
    gifterId: null,
    giftTotal: null,
    eventTimestamp: payload.event?.created_at ?? new Date().toISOString(),
  };
}

export function parseResubEvent(
  messageId: string,
  payload: Record<string, any>,
): TwitchSubEvent {
  const event = payload.event;
  return {
    messageId,
    broadcasterId: event.broadcaster_user_id,
    eventType: 'resub',
    userName: event.user_name,
    userId: event.user_id,
    tier: event.tier,
    message: event.message?.text ?? null,
    cumulativeMonths: event.cumulative_months ?? null,
    streakMonths: event.streak_months ?? null,
    isGift: false,
    gifterName: null,
    gifterId: null,
    giftTotal: null,
    eventTimestamp: payload.event?.created_at ?? new Date().toISOString(),
  };
}

export function parseGiftSubEvent(
  messageId: string,
  payload: Record<string, any>,
): TwitchSubEvent {
  const event = payload.event;
  return {
    messageId,
    broadcasterId: event.broadcaster_user_id,
    eventType: 'gift_sub',
    userName: event.user_name,
    userId: event.user_id,
    tier: event.tier,
    message: null,
    cumulativeMonths: null,
    streakMonths: null,
    isGift: true,
    gifterName: event.user_name,
    gifterId: event.user_id,
    giftTotal: event.total ?? null,
    eventTimestamp: payload.event?.created_at ?? new Date().toISOString(),
  };
}
