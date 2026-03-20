import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'profile-1', name: 'Test Profile' }]),
      }),
    }),
  },
}));

vi.mock('@/lib/auth/verify-token', () => ({
  verifyAuthToken: vi.fn(),
}));

describe('GET /api/profiles', () => {
  it('returns 401 without auth', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce(null);

    const { GET } = await import('@/app/api/profiles/route');
    const request = new Request('http://localhost/api/profiles');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns profiles for authenticated user', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce({ id: 'user-1' } as any);

    const { GET } = await import('@/app/api/profiles/route');
    const request = new Request('http://localhost/api/profiles', {
      headers: { Authorization: 'Bearer token' },
    });
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('POST /api/profiles', () => {
  it('returns 401 without auth', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce(null);

    const { POST } = await import('@/app/api/profiles/route');
    const request = new Request('http://localhost/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('creates a profile for authenticated user', async () => {
    const { verifyAuthToken } = await import('@/lib/auth/verify-token');
    vi.mocked(verifyAuthToken).mockResolvedValueOnce({ id: 'user-1' } as any);

    const { POST } = await import('@/app/api/profiles/route');
    const request = new Request('http://localhost/api/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({ name: 'My Profile' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.name).toBe('Test Profile');
  });
});
