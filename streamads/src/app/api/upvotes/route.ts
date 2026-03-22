import { db } from '@/lib/db';
import { upvotes, notifications, marketplaceItems } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { itemId } = await request.json();
  if (!itemId) {
    return NextResponse.json({ error: 'itemId required' }, { status: 400 });
  }

  // Toggle: if already upvoted, remove it
  const existing = await db
    .select()
    .from(upvotes)
    .where(and(eq(upvotes.userId, user.id), eq(upvotes.itemId, itemId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(upvotes).where(eq(upvotes.id, existing[0].id));
    return NextResponse.json({ upvoted: false });
  }

  await db.insert(upvotes).values({ userId: user.id, itemId });

  const [item] = await db.select({ creatorId: marketplaceItems.creatorId }).from(marketplaceItems).where(eq(marketplaceItems.id, itemId)).limit(1);
  if (item?.creatorId && item.creatorId !== user.id) {
    await db.insert(notifications).values({
      userId: item.creatorId,
      type: 'upvote',
      actorId: user.id,
      targetId: itemId,
    });
  }

  return NextResponse.json({ upvoted: true });
}
