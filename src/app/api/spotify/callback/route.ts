import { validateState, exchangeCode, storeTokens } from '@/lib/spotify/oauth';
import { NextResponse } from 'next/server';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4444';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${DASHBOARD_URL}/dashboard?spotify=error`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${DASHBOARD_URL}/dashboard?spotify=error`);
  }

  const userId = validateState(state);
  if (!userId) {
    return NextResponse.redirect(`${DASHBOARD_URL}/dashboard?spotify=error`);
  }

  try {
    const tokens = await exchangeCode(code);
    await storeTokens(userId, tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
    return NextResponse.redirect(`${DASHBOARD_URL}/dashboard?spotify=connected`);
  } catch {
    return NextResponse.redirect(`${DASHBOARD_URL}/dashboard?spotify=error`);
  }
}
