import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (!domain) {
    return NextResponse.json({ error: 'Missing domain' }, { status: 400 });
  }

  const origin = `https://${domain}`;

  try {
    const res = await fetch(origin, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaviconBot/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();

    // Look for <link rel="icon" or rel="shortcut icon" href="...">
    const iconMatch = html.match(
      /<link[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i
    ) ?? html.match(
      /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*>/i
    );

    if (iconMatch?.[1]) {
      const href = iconMatch[1];
      // Resolve relative URLs
      const faviconUrl = href.startsWith('http') ? href : new URL(href, origin).toString();
      return NextResponse.json({ url: faviconUrl });
    }

    // Fallback: try /favicon.ico directly
    const icoRes = await fetch(`${origin}/favicon.ico`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    });
    if (icoRes.ok) {
      return NextResponse.json({ url: `${origin}/favicon.ico` });
    }

    return NextResponse.json({ url: null });
  } catch {
    return NextResponse.json({ url: null });
  }
}
