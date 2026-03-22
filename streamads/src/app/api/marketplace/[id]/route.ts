import { db } from '@/lib/db';
import { marketplaceItems, adProfileItems } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { archived } = await request.json();

  const updated = await db
    .update(marketplaceItems)
    .set({ archived: archived ? 1 : 0 })
    .where(and(eq(marketplaceItems.id, id), eq(marketplaceItems.creatorId, user.id)))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 });
  }

  return NextResponse.json({ success: true, archived: !!archived });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Remove from all profiles first
  await db.delete(adProfileItems).where(eq(adProfileItems.itemId, id));

  const deleted = await db
    .delete(marketplaceItems)
    .where(and(eq(marketplaceItems.id, id), eq(marketplaceItems.creatorId, user.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
