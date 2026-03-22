import { db } from '@/lib/db';
import { adProfiles } from '@/lib/db/schema';
import { verifyAuthToken } from '@/lib/auth/verify-token';
import { getPlanLimits } from '@/lib/plans';
import { eq, count } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profiles = await db
    .select()
    .from(adProfiles)
    .where(eq(adProfiles.ownerId, user.id));

  return NextResponse.json(profiles);
}

export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name } = await request.json();

  const [profile] = await db
    .insert(adProfiles)
    .values({ ownerId: user.id, name })
    .returning();

  return NextResponse.json(profile, { status: 201 });
}
