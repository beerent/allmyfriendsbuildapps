import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  };
  return { db: mockQueryBuilder };
});

describe('GET /api/overlay/[profileId]', () => {
  it('returns items for a profile without auth', async () => {
    const { GET } = await import('@/app/api/overlay/[profileId]/route');
    const request = new Request('http://localhost/api/overlay/test-id');
    const response = await GET(request, { params: Promise.resolve({ profileId: 'test-id' }) });
    expect(response.status).toBe(200);
  });
});
