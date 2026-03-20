'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

type Profile = {
  id: string;
  name: string;
  createdAt: string;
};

export default function DashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyMessage, setSpotifyMessage] = useState('');
  const [twitchConnected, setTwitchConnected] = useState(false);
  const [twitchMessage, setTwitchMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetchProfiles();
    fetchSpotifyStatus();
    fetchTwitchStatus();

    const spotifyParam = searchParams.get('spotify');
    if (spotifyParam === 'connected') {
      setSpotifyMessage('Spotify connected successfully!');
      setTimeout(() => setSpotifyMessage(''), 3000);
    } else if (spotifyParam === 'error') {
      setSpotifyMessage('Failed to connect Spotify. Try again.');
      setTimeout(() => setSpotifyMessage(''), 5000);
    }

    const twitchParam = searchParams.get('twitch');
    if (twitchParam === 'connected') {
      setTwitchMessage('Twitch connected successfully!');
      setTimeout(() => setTwitchMessage(''), 3000);
    } else if (twitchParam === 'error') {
      setTwitchMessage('Failed to connect Twitch. Try again.');
      setTimeout(() => setTwitchMessage(''), 5000);
    }
  }, [user]);

  async function fetchProfiles() {
    const token = await getIdToken();
    const res = await fetch('/api/profiles', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setProfiles(await res.json());
  }

  async function fetchSpotifyStatus() {
    const token = await getIdToken();
    const res = await fetch('/api/spotify/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSpotifyConnected(data.connected);
    }
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

  async function connectSpotify() {
    const token = await getIdToken();
    window.location.href = `/api/spotify/connect?token=${token}`;
  }

  async function fetchTwitchStatus() {
    const token = await getIdToken();
    const res = await fetch('/api/twitch/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setTwitchConnected(data.connected);
    }
  }

  async function disconnectSpotify() {
    const token = await getIdToken();
    const res = await fetch('/api/spotify/disconnect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setSpotifyConnected(false);
      setSpotifyMessage('Spotify disconnected.');
      setTimeout(() => setSpotifyMessage(''), 3000);
    }
  }

  async function connectTwitch() {
    const token = await getIdToken();
    window.location.href = `/api/twitch/connect?token=${token}`;
  }

  async function disconnectTwitch() {
    const token = await getIdToken();
    const res = await fetch('/api/twitch/disconnect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTwitchConnected(false);
      setTwitchMessage('Twitch disconnected.');
      setTimeout(() => setTwitchMessage(''), 3000);
    }
  }

  if (loading || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your Ad Profiles</h1>

      {/* Profile Creation */}
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

      {/* Profile List */}
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

      {/* Integrations */}
      <h2 className="mb-4 mt-12 text-xl font-bold">Integrations</h2>
      <div className="grid gap-4">
        <div className="rounded-md bg-[#1e2030] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f5bde6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <div>
                <h3 className="font-semibold">Spotify</h3>
                <p className="text-xs text-[#b8c0e0]">
                  {spotifyConnected
                    ? 'Connected — your overlay will show what you\'re listening to'
                    : 'Show Now Playing on your overlay'}
                </p>
              </div>
            </div>
            {spotifyConnected ? (
              <button
                onClick={disconnectSpotify}
                className="rounded-md bg-[#363a4f] px-4 py-2 text-sm text-[#cad3f5] hover:bg-[#494d64]"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={connectSpotify}
                className="rounded-md bg-[#a6da95] px-4 py-2 text-sm font-medium text-[#24273a] hover:bg-[#8bd5ca]"
              >
                Connect
              </button>
            )}
          </div>
          {spotifyMessage && (
            <p className="mt-2 text-sm text-[#a6da95]">{spotifyMessage}</p>
          )}
        </div>

        {/* Twitch */}
        <div className="rounded-md bg-[#1e2030] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9146FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
              </svg>
              <div>
                <h3 className="font-semibold">Twitch</h3>
                <p className="text-xs text-[#b8c0e0]">
                  {twitchConnected
                    ? 'Connected — latest follower & sub on your overlay'
                    : 'Show latest follower & sub on your overlay'}
                </p>
              </div>
            </div>
            {twitchConnected ? (
              <button
                onClick={disconnectTwitch}
                className="rounded-md bg-[#363a4f] px-4 py-2 text-sm text-[#cad3f5] hover:bg-[#494d64]"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={connectTwitch}
                className="rounded-md bg-[#a6da95] px-4 py-2 text-sm font-medium text-[#24273a] hover:bg-[#8bd5ca]"
              >
                Connect
              </button>
            )}
          </div>
          {twitchMessage && (
            <p className="mt-2 text-sm text-[#a6da95]">{twitchMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
