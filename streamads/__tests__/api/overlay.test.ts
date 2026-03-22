import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockResolvedValue([]),
  },
}));

describe('GET /api/overlay/[profileId]', () => {
  it('returns items without requiring auth', async () => {
    const { GET } = await import('@/app/api/overlay/[profileId]/route');
    const request = new Request('http://localhost/api/overlay/test-id');
    const response = await GET(request, { params: Promise.resolve({ profileId: 'test-id' }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
