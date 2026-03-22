'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdCard } from '@/components/ad-card';
import { SpotifyCard } from '@/components/spotify-card';
import { TwitchCard } from '@/components/twitch-card';
import { KofiCard } from '@/components/kofi-card';
import { BmcCard } from '@/components/bmc-card';
import { GoalCard } from '@/components/goal-card';
import { CountdownCard } from '@/components/countdown-card';
import { ConfigForm } from '@/components/add-to-profile-modal';
import { isConfigurable, getConfigFields, validateConfig } from '@/lib/card-config';
import { demoAlbumArt } from '@/lib/demo-art';
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';

type ProfileItem = {
  id: string;
  itemId: string;
  displayDuration: number;
  sortOrder: number;
  config: Record<string, unknown> | null;
  marketplaceItem: {
    id: string;
    type: 'ad' | 'card' | 'spotify' | 'placeholder' | 'twitch' | 'kofi' | 'buymeacoffee' | 'goal' | 'countdown';
    headline: string | null;
    subtext: string | null;
    brandUrl: string | null;
    imageUrl: string | null;
    colorTheme: string;
    colorStyle: string;
  };
};

type Integrations = {
  spotify: { connected: boolean };
  twitch: { connected: boolean };
  kofi: { connected: boolean };
  buymeacoffee: { connected: boolean };
} | null;

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
  const [integrations, setIntegrations] = useState<Integrations>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [configuringIndex, setConfiguringIndex] = useState<number | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, profileId]);

  useEffect(() => {
    async function fetchIntegrations() {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/integrations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setIntegrations(await res.json());
    }
    if (user) fetchIntegrations();
  }, [user, getIdToken]);

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
          config: i.config,
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

  function updateDuration(index: number, duration: number) {
    if (!profile) return;
    const items = [...profile.items];
    items[index] = { ...items[index], displayDuration: duration };
    setProfile({ ...profile, items });
  }

  function saveDuration() {
    if (!profile) return;
    saveItems(profile.items);
  }

  async function renameProfile() {
    if (!profile || !editName.trim()) return;
    const token = await getIdToken();
    await fetch(`/api/profiles/${profileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setProfile({ ...profile, name: editName.trim() });
    setEditing(false);
  }

  if (loading || !user || !profile) return null;

  const obsUrl = typeof window !== 'undefined' ? `${window.location.origin}/overlay/${profile.id}` : '';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameProfile();
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
              className="rounded-md bg-[#363a4f] px-3 py-1.5 text-2xl font-bold text-[#cad3f5] outline-none focus:ring-2 focus:ring-[#a6da95]"
            />
            <button onClick={renameProfile} className="rounded-md bg-[#a6da95] px-3 py-1.5 text-sm text-[#24273a] hover:bg-[#8bd5ca]">
              Save
            </button>
            <button onClick={() => setEditing(false)} className="rounded-md bg-[#363a4f] px-3 py-1.5 text-sm hover:bg-[#494d64]">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditName(profile.name); setEditing(true); }}
            className="group flex items-center gap-2 text-2xl font-bold hover:text-[#a6da95]"
          >
            {profile.name}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
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

      {integrations && profile.items.some((i) =>
        (i.marketplaceItem.type === 'spotify' && !integrations.spotify.connected) ||
        (i.marketplaceItem.type === 'twitch' && !integrations.twitch.connected) ||
        (i.marketplaceItem.type === 'kofi' && !integrations.kofi.connected) ||
        (i.marketplaceItem.type === 'buymeacoffee' && !integrations.buymeacoffee.connected)
      ) && (
        <Link
          href="/integrations"
          className="mb-6 flex items-center gap-2 rounded-lg border border-[#ed8796]/30 bg-[#ed8796]/10 px-4 py-3 text-sm text-[#ed8796] hover:bg-[#ed8796]/20"
        >
          <span>Some items in this profile require integrations that aren&apos;t connected.</span>
          <span className="font-medium">Set up integrations &rarr;</span>
        </Link>
      )}

      {profile.items.length === 0 ? (
        <Link
          href="/marketplace"
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#363a4f] py-16 transition-all hover:border-[#a6da95]/30"
        >
          <div className="rounded-full bg-[rgba(166,218,149,0.08)] p-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#494d64" strokeWidth={1.5} className="h-8 w-8">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <p className="text-sm text-[#494d64]">No items in this profile</p>
          <span className="rounded-lg bg-[#a6da95]/10 px-4 py-2 text-sm font-medium text-[#a6da95]">
            Browse Marketplace
          </span>
        </Link>
      ) : (
        <div className="flex flex-col gap-4">
          {profile.items.map((item, index) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl"
              style={{ backgroundColor: '#1e2030' }}
            >
              {/* Preview well */}
              <div className="flex items-center justify-center bg-[#181926] px-6 py-5">
                {item.marketplaceItem.type === 'ad' ? (
                  <AdCard
                    imageUrl={item.marketplaceItem.imageUrl}
                    headline={item.marketplaceItem.headline || ''}
                    subtext={item.marketplaceItem.subtext}
                    brandUrl={item.marketplaceItem.brandUrl}
                    colorTheme={item.marketplaceItem.colorTheme as ColorTheme}
                    colorStyle={item.marketplaceItem.colorStyle as ColorStyle}
                  />
                ) : item.marketplaceItem.type === 'spotify' ? (
                  <SpotifyCard
                    label={item.marketplaceItem.headline || 'Now Playing'}
                    albumArtUrl={demoAlbumArt()}
                    status={integrations?.spotify.connected ? undefined : 'not-connected'}
                  />
                ) : item.marketplaceItem.type === 'twitch' ? (
                  <TwitchCard
                    label={item.marketplaceItem.headline || undefined}
                    status={integrations?.twitch.connected ? undefined : 'not-connected'}
                    colorTheme={item.marketplaceItem.colorTheme as ColorTheme}
                  />
                ) : item.marketplaceItem.type === 'kofi' ? (
                  <KofiCard
                    status={integrations?.kofi.connected ? undefined : 'not-connected'}
                    colorTheme={item.marketplaceItem.colorTheme as ColorTheme}
                  />
                ) : item.marketplaceItem.type === 'buymeacoffee' ? (
                  <BmcCard
                    status={integrations?.buymeacoffee.connected ? undefined : 'not-connected'}
                    colorTheme={item.marketplaceItem.colorTheme as ColorTheme}
                  />
                ) : item.marketplaceItem.type === 'goal' ? (
                  <GoalCard
                    status={integrations?.twitch.connected ? undefined : 'not-connected'}
                    colorTheme={item.marketplaceItem.colorTheme as ColorTheme}
                  />
                ) : item.marketplaceItem.type === 'countdown' ? (
                  <CountdownCard
                    label={(item.config as Record<string, unknown> | null)?.label as string}
                    endDate={(item.config as Record<string, unknown> | null)?.endDate as string}
                    colorTheme={item.marketplaceItem.colorTheme as ColorTheme}
                  />
                ) : (
                  <div className="flex h-[120px] w-80 items-center justify-center text-xs text-[#494d64]">
                    Placeholder
                  </div>
                )}
              </div>

              {/* Footer controls */}
              <div className="flex items-center gap-3 px-4 py-2.5">
                {/* Reorder */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="rounded-md px-1.5 py-0.5 text-xs text-[#6e738d] transition-colors hover:bg-[#363a4f] hover:text-[#cad3f5] disabled:opacity-20"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === profile.items.length - 1}
                    className="rounded-md px-1.5 py-0.5 text-xs text-[#6e738d] transition-colors hover:bg-[#363a4f] hover:text-[#cad3f5] disabled:opacity-20"
                  >
                    ↓
                  </button>
                </div>

                <div className="h-3 w-px bg-[#363a4f]" />

                {/* Duration */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={item.displayDuration}
                    onChange={(e) => updateDuration(index, Number(e.target.value) || 10)}
                    onBlur={() => saveDuration()}
                    min={3}
                    max={60}
                    className="w-12 rounded-md bg-[#181926] px-2 py-1 text-center text-[11px] text-[#cad3f5] outline-none"
                  />
                  <span className="text-[10px] text-[#494d64]">sec</span>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions */}
                {isConfigurable(item.marketplaceItem.type) && (
                  <button
                    onClick={() => {
                      setConfiguringIndex(index);
                      setConfigValues((item.config as Record<string, unknown>) ?? {});
                    }}
                    className="rounded-md px-2.5 py-1 text-[10px] text-[#6e738d] transition-all hover:bg-[#363a4f] hover:text-[#cad3f5]"
                  >
                    Configure
                  </button>
                )}
                <button
                  onClick={() => removeItem(index)}
                  className="rounded-md px-2.5 py-1 text-[10px] text-[#494d64] transition-all hover:text-[#ed8796]"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Config editing modal */}
      {configuringIndex !== null && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfiguringIndex(null)}>
          <div className="w-96 rounded-2xl border border-[rgba(202,211,245,0.06)] bg-[#1e2030] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">Configure</h3>
            <ConfigForm
              fields={getConfigFields(profile.items[configuringIndex].marketplaceItem.type)}
              values={configValues}
              onChange={(key, value) => setConfigValues((prev) => ({ ...prev, [key]: value }))}
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  const items = [...profile.items];
                  const processed = { ...configValues };
                  if (processed.endDate && typeof processed.endDate === 'string') {
                    processed.endDate = new Date(processed.endDate as string).toISOString();
                  }
                  if (processed.target) {
                    processed.target = parseInt(processed.target as string);
                  }
                  items[configuringIndex] = { ...items[configuringIndex], config: processed };
                  saveItems(items);
                  setConfiguringIndex(null);
                }}
                disabled={!validateConfig(profile.items[configuringIndex].marketplaceItem.type, configValues)}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#a6da95] to-[#8bd5ca] py-2 text-sm font-semibold text-[#181926] disabled:opacity-40"
              >
                Save
              </button>
              <button
                onClick={() => setConfiguringIndex(null)}
                className="flex-1 rounded-lg bg-[#363a4f] py-2 text-sm hover:bg-[#494d64]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
