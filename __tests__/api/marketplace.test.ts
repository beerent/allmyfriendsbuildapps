import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module
const mockQueryBuilder = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  leftJoin: vi.fn(),
  groupBy: vi.fn(),
  orderBy: vi.fn(),
  $dynamic: vi.fn(),
};

// Each method returns the same object so chaining works
mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.leftJoin.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.groupBy.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder);
// $dynamic returns an object that is also awaitable and has .where()
mockQueryBuilder.$dynamic.mockReturnValue({
  ...mockQueryBuilder,
  then: (resolve: (v: unknown[]) => void) => resolve([]),
});

vi.mock('@/lib/db', () => ({
  db: mockQueryBuilder,
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
});
