import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockResolvedValue([{ ownerId: 'owner-1' }]),
  };
  return { db: mockQueryBuilder };
});

describe('GET /api/overlay/[profileId]', () => {
  it('returns ownerId and items for a profile without auth', async () => {
    const { GET } = await import('@/app/api/overlay/[profileId]/route');
    const request = new Request('http://localhost/api/overlay/test-id');
    const response = await GET(request, { params: Promise.resolve({ profileId: 'test-id' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('ownerId');
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
  });
});
