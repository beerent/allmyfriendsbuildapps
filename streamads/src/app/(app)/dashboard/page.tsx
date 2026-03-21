'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Profile = {
  id: string;
  name: string;
  createdAt: string;
};

export default function Dashboard() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      router.refresh();
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetchProfiles();
  }, [user]);

  async function fetchProfiles() {
    const token = await getIdToken();
    const res = await fetch('/api/profiles', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setProfiles(await res.json());
  }

  async function createProfile() {
    if (!newName.trim()) return;
    setCreating(true);
    const token = await getIdToken();
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setNewName('');
      fetchProfiles();
    }
    setCreating(false);
  }

  async function deleteProfile(id: string) {
    const token = await getIdToken();
    await fetch(`/api/profiles/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchProfiles();
  }

  if (loading || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your Ad Profiles</h1>

      <div className="mb-8 flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New profile name..."
          className="rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
          onKeyDown={(e) => e.key === 'Enter' && createProfile()}
        />
        <button
          onClick={createProfile}
          disabled={creating}
          className="rounded-md bg-[#f5bde6] px-4 py-2 text-sm font-medium text-[#24273a] hover:bg-[#c6a0f6] disabled:opacity-50"
        >
          Create Profile
        </button>
      </div>

      {profiles.length === 0 ? (
        <p className="text-[#b8c0e0]">No profiles yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between rounded-md bg-[#1e2030] p-4"
            >
              <div>
                <h2 className="font-semibold">{profile.name}</h2>
                <p className="text-xs text-[#b8c0e0]">
                  Created {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/profile/${profile.id}`}
                  className="rounded-md bg-[#363a4f] px-3 py-1.5 text-sm hover:bg-[#494d64]"
                >
                  Edit
                </Link>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/overlay/${profile.id}`
                    );
                  }}
                  className="rounded-md bg-[#a6da95] px-3 py-1.5 text-sm text-[#24273a] hover:bg-[#8bd5ca]"
                >
                  Copy OBS URL
                </button>
                <button
                  onClick={() => deleteProfile(profile.id)}
                  className="rounded-md bg-[#ed8796] px-3 py-1.5 text-sm text-[#24273a] hover:bg-[#ee99a0]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
