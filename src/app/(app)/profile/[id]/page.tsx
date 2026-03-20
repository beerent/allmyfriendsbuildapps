'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdCard } from '@/components/ad-card';
import { SpotifyCard } from '@/components/spotify-card';
import { TwitchCard } from '@/components/twitch-card';

type ProfileItem = {
  id: string;
  itemId: string;
  displayDuration: number | null;
  sortOrder: number;
  marketplaceItem: {
    id: string;
    type: 'ad' | 'spotify' | 'placeholder' | 'twitch';
    headline: string | null;
    subtext: string | null;
    brandUrl: string | null;
    imageUrl: string | null;
    displayDuration: number;
  };
};

type Profile = {
  id: string;
  name: string;
  items: ProfileItem[];
};

export default function ProfileEditor() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, profileId]);

  async function fetchProfile() {
    const token = await getIdToken();
    const res = await fetch(`/api/profiles/${profileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setProfile(await res.json());
    else router.push('/dashboard');
  }

  async function saveItems(items: ProfileItem[]) {
    setSaving(true);
    const token = await getIdToken();
    await fetch(`/api/profiles/${profileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: items.map((i) => ({
          itemId: i.itemId,
          displayDuration: i.displayDuration,
        })),
      }),
    });
    await fetchProfile();
    setSaving(false);
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    if (!profile) return;
    const items = [...profile.items];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    saveItems(items);
  }

  function removeItem(index: number) {
    if (!profile) return;
    const items = profile.items.filter((_, i) => i !== index);
    saveItems(items);
  }

  function updateDuration(index: number, duration: number | null) {
    if (!profile) return;
    const items = [...profile.items];
    items[index] = { ...items[index], displayDuration: duration };
    setProfile({ ...profile, items });
  }

  function saveDuration(index: number) {
    if (!profile) return;
    saveItems(profile.items);
  }

  if (loading || !user || !profile) return null;

  const obsUrl = `${window.location.origin}/overlay/${profile.id}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{profile.name}</h1>
        <div className="flex items-center gap-3">
          <code className="rounded bg-[#1e2030] px-3 py-1.5 text-xs text-[#b8c0e0]">
            {obsUrl}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(obsUrl)}
            className="rounded-md bg-[#a6da95] px-3 py-1.5 text-sm text-[#24273a] hover:bg-[#8bd5ca]"
          >
            Copy
          </button>
        </div>
      </div>

      {profile.items.length === 0 ? (
        <p className="text-[#b8c0e0]">
          No items yet. Add some from the{' '}
          <a href="/marketplace" className="text-[#f5bde6] underline">
            marketplace
          </a>.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {profile.items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-md bg-[#1e2030] p-4"
            >
              {/* Order controls */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="rounded bg-[#363a4f] px-2 py-0.5 text-xs hover:bg-[#494d64] disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === profile.items.length - 1}
                  className="rounded bg-[#363a4f] px-2 py-0.5 text-xs hover:bg-[#494d64] disabled:opacity-30"
                >
                  ↓
                </button>
              </div>

              {/* Card preview */}
              <div className="flex-shrink-0">
                {item.marketplaceItem.type === 'ad' ? (
                  <AdCard
                    imageUrl={item.marketplaceItem.imageUrl}
                    headline={item.marketplaceItem.headline || ''}
                    subtext={item.marketplaceItem.subtext}
                    brandUrl={item.marketplaceItem.brandUrl}
                  />
                ) : item.marketplaceItem.type === 'spotify' ? (
                  <SpotifyCard label={item.marketplaceItem.headline || 'Spotify'} />
                ) : item.marketplaceItem.type === 'twitch' ? (
                  <TwitchCard label={item.marketplaceItem.headline || 'Twitch'} />
                ) : (
                  <div className="flex h-[120px] w-80 items-center justify-center rounded-md bg-[#24273a] text-xs text-[#6e738d]">
                    Placeholder
                  </div>
                )}
              </div>

              {/* Duration + remove */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#b8c0e0]">Duration:</label>
                  <input
                    type="number"
                    value={item.displayDuration ?? item.marketplaceItem.displayDuration}
                    onChange={(e) => updateDuration(index, Number(e.target.value) || null)}
                    onBlur={() => saveDuration(index)}
                    min={3}
                    max={60}
                    className="w-16 rounded bg-[#363a4f] px-2 py-1 text-sm outline-none"
                  />
                  <span className="text-xs text-[#6e738d]">sec</span>
                </div>
                <button
                  onClick={() => removeItem(index)}
                  className="rounded-md bg-[#ed8796] px-3 py-1 text-xs text-[#24273a] hover:bg-[#ee99a0]"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
