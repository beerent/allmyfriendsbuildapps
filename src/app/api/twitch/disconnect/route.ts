import { verifyAuthToken } from '@/lib/auth/verify-token';
import { clearTokens } from '@/lib/twitch/oauth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await clearTokens(user.id);
  return NextResponse.json({ success: true });
}
