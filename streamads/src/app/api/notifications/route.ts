import { db } from '@/lib/db';
import { notifications, users, marketplaceItems } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      targetId: notifications.targetId,
      read: notifications.read,
      createdAt: notifications.createdAt,
      actorUsername: users.username,
      actorDisplayName: users.displayName,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.actorId, users.id))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const targetIds = rows.filter((r) => r.targetId).map((r) => r.targetId!);
  const targets = targetIds.length > 0
    ? await db.select({ id: marketplaceItems.id, headline: marketplaceItems.headline }).from(marketplaceItems)
    : [];
  const targetMap = new Map(targets.map((t) => [t.id, t.headline]));

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      actorUsername: r.actorUsername,
      actorDisplayName: r.actorDisplayName,
      targetId: r.targetId,
      targetHeadline: r.targetId ? targetMap.get(r.targetId) ?? null : null,
      read: r.read === 1,
      createdAt: r.createdAt,
    }))
  );
}

export async function PUT(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.update(notifications).set({ read: 1 }).where(eq(notifications.userId, user.id));

  return NextResponse.json({ success: true });
}
