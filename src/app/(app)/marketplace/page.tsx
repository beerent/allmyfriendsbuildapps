'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdCard } from '@/components/ad-card';
import { SpotifyCard } from '@/components/spotify-card';
import { AddToProfileModal } from '@/components/add-to-profile-modal';

type MarketplaceItem = {
  id: string;
  type: 'ad' | 'spotify' | 'placeholder';
  creatorFirebaseUid: string | null;
  headline: string | null;
  subtext: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  displayDuration: number;
  creatorName: string | null;
  usageCount: number;
};

export default function Marketplace() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    fetchItems();
  }, [search, typeFilter]);

  async function fetchItems() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    const res = await fetch(`/api/marketplace?${params}`);
    if (res.ok) setItems(await res.json());
  }

  async function deleteItem(id: string) {
    const token = await getIdToken();
    await fetch(`/api/marketplace/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchItems();
  }

  if (loading || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Marketplace</h1>

      <div className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ads..."
          className="flex-grow rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] outline-none"
        >
          <option value="">All Types</option>
          <option value="ad">Ads</option>
          <option value="spotify">Spotify</option>
          <option value="placeholder">Placeholder</option>
        </select>
      </div>

      <div className="grid gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-6 rounded-md bg-[#1e2030] p-4"
          >
            {/* Card Preview */}
            <div className="flex-shrink-0">
              {item.type === 'ad' ? (
                <AdCard
                  imageUrl={item.imageUrl}
                  headline={item.headline || ''}
                  subtext={item.subtext}
                  brandUrl={item.brandUrl}
                />
              ) : item.type === 'spotify' ? (
                <SpotifyCard />
              ) : (
                <div className="flex h-[120px] w-80 items-center justify-center rounded-md bg-[#24273a] text-xs text-[#6e738d]">
                  Placeholder (invisible on stream)
                </div>
              )}
            </div>

            {/* Meta + Actions */}
            <div className="flex flex-grow flex-col gap-2">
              <p className="text-xs text-[#b8c0e0]">
                {item.creatorName ? `by ${item.creatorName}` : 'System'} &middot;{' '}
                {item.usageCount} profile{item.usageCount !== 1 ? 's' : ''} using this
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAddingItemId(item.id)}
                  className="rounded-md bg-[#a6da95] px-3 py-1.5 text-sm text-[#24273a] hover:bg-[#8bd5ca]"
                >
                  Add to Profile
                </button>
                {item.creatorFirebaseUid && user?.uid && item.creatorFirebaseUid === user.uid && (
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="rounded-md bg-[#ed8796] px-3 py-1.5 text-sm text-[#24273a] hover:bg-[#ee99a0]"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {addingItemId && (
        <AddToProfileModal
          itemId={addingItemId}
          onClose={() => setAddingItemId(null)}
        />
      )}
    </div>
  );
}
