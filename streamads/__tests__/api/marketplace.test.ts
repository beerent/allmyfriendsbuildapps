import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    $dynamic: vi.fn().mockReturnValue(
      Object.assign(Promise.resolve([]), {
        where: vi.fn().mockResolvedValue([]),
      })
    ),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: 'item-1',
          type: 'ad',
          headline: 'Test',
          colorTheme: 'purple',
          colorStyle: 'fulltint',
        }]),
      }),
    }),
  },
}));

vi.mock('@/lib/auth/verify-token', () => ({
  verifyAuthToken: vi.fn(),
}));

describe('GET /api/marketplace', () => {
  it('returns marketplace items', async () => {
    const { GET } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('filters by card type', async () => {
    const { GET } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace?type=card');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  it('filters by tools category', async () => {
    const { GET } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace?type=tools');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});

describe('POST /api/marketplace', () => {
  it('returns 401 without auth', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce(null);

    const { POST } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headline: 'Test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('accepts colorTheme and colorStyle in body', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce({ id: 'user-1', firebaseUid: 'fb-1' } as any);

    const { POST } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({
        headline: 'Test',
        colorTheme: 'purple',
        colorStyle: 'fulltint',
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.colorTheme).toBe('purple');
    expect(data.colorStyle).toBe('fulltint');
  });

  it('creates a card item when type is card', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: 'item-2',
          type: 'card',
          headline: 'My Card',
          subtext2: 'Extra info',
          colorTheme: 'blue',
          colorStyle: 'matched',
        }]),
      }),
    } as any);

    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce({ id: 'user-1', firebaseUid: 'fb-1' } as any);

    const { POST } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({
        type: 'card',
        headline: 'My Card',
        subtext2: 'Extra info',
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.type).toBe('card');
  });

  it('rejects card with brandUrl', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce({ id: 'user-1', firebaseUid: 'fb-1' } as any);

    const { POST } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({
        type: 'card',
        headline: 'My Card',
        brandUrl: 'bad.com',
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('rejects ad with subtext2', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce({ id: 'user-1', firebaseUid: 'fb-1' } as any);

    const { POST } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({
        headline: 'My Ad',
        subtext2: 'should not be here',
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('defaults to blue/matched when color fields omitted', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce({ id: 'user-1', firebaseUid: 'fb-1' } as any);

    const { db } = await import('@/lib/db');
    // Capture what values() receives
    let capturedValues: any;
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockImplementation((vals: any) => {
        capturedValues = vals;
        return {
          returning: vi.fn().mockResolvedValue([{
            id: 'item-2',
            type: 'ad',
            headline: 'No Color',
            colorTheme: 'blue',
            colorStyle: 'matched',
          }]),
        };
      }),
    } as any);

    const { POST } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({ headline: 'No Color' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.colorTheme).toBe('blue');
    expect(data.colorStyle).toBe('matched');
  });
});
