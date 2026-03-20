import { verifyAuthToken } from '@/lib/auth/verify-token';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    connected: !!user.twitchAccessToken,
  });
}
