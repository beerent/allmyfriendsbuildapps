'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';

type Profile = { id: string; name: string };

type AddToProfileModalProps = {
  itemId: string;
  onClose: () => void;
};

export function AddToProfileModal({ itemId, onClose }: AddToProfileModalProps) {
  const { getIdToken } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const token = await getIdToken();
      const res = await fetch('/api/profiles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProfiles(await res.json());
    }
    load();
  }, [getIdToken]);

  async function addToProfile(profileId: string) {
    setAdding(profileId);
    const token = await getIdToken();

    const profileRes = await fetch(`/api/profiles/${profileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) return;
    const profile = await profileRes.json();

    const currentItems = (profile.items || []).map((i: { itemId: string; displayDuration?: number }) => ({
      itemId: i.itemId,
      displayDuration: i.displayDuration,
    }));
    currentItems.push({ itemId });

    await fetch(`/api/profiles/${profileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: currentItems }),
    });

    setAdding(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-80 rounded-md bg-[#1e2030] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">Add to Profile</h3>
        {profiles.length === 0 ? (
          <p className="text-sm text-[#b8c0e0]">No profiles yet. Create one on the dashboard.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => addToProfile(p.id)}
                disabled={adding === p.id}
                className="rounded-md bg-[#363a4f] px-4 py-2 text-left text-sm hover:bg-[#494d64] disabled:opacity-50"
              >
                {adding === p.id ? 'Adding...' : p.name}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-md bg-[#363a4f] px-4 py-2 text-sm hover:bg-[#494d64]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
