import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'test-id', name: 'Test' }]),
    delete: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  };
  return { db: mockQueryBuilder };
});

vi.mock('@/lib/auth/verify-token', () => ({
  verifyAuthToken: vi.fn().mockResolvedValue({ id: 'user-1', firebaseUid: 'fb-1' }),
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
});
