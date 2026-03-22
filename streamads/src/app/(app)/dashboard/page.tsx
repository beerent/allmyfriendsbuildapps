'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AdCard } from '@/components/ad-card';
import { CustomCard } from '@/components/custom-card';
import { SpotifyCard } from '@/components/spotify-card';
import { TwitchCard } from '@/components/twitch-card';
import { KofiCard } from '@/components/kofi-card';
import { BmcCard } from '@/components/bmc-card';
import { demoAlbumArt } from '@/lib/demo-art';
import { GoalCard } from '@/components/goal-card';
import { CountdownCard } from '@/components/countdown-card';
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';

type MarketplaceItem = {
  id: string;
  type: 'ad' | 'card' | 'spotify' | 'placeholder' | 'twitch' | 'kofi' | 'buymeacoffee' | 'goal' | 'countdown';
  headline: string | null;
  subtext: string | null;
  subtext2: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  colorTheme: string;
  colorStyle: string;
};

type ProfileItem = {
  id: string;
  itemId: string;
  displayDuration: number;
  sortOrder: number;
  marketplaceItem: MarketplaceItem;
};

type ProfileWithItems = {
  id: string;
  name: string;
  createdAt: string;
  items: ProfileItem[];
};

type Integrations = {
  spotify: { connected: boolean };
  twitch: { connected: boolean };
  kofi: { connected: boolean };
  buymeacoffee: { connected: boolean };
} | null;

function ProfilePreview({ profile, onDelete, integrations }: { profile: ProfileWithItems; onDelete: () => void; integrations: Integrations }) {
  const needsSpotify = integrations && !integrations.spotify.connected && profile.items.some((i) => i.marketplaceItem.type === 'spotify');
  const needsTwitch = integrations && !integrations.twitch.connected && profile.items.some((i) => i.marketplaceItem.type === 'twitch');
  const needsKofi = integrations && !integrations.kofi?.connected && profile.items.some((i) => i.marketplaceItem.type === 'kofi');
  const needsBmc = integrations && !integrations.buymeacoffee?.connected && profile.items.some((i) => i.marketplaceItem.type === 'buymeacoffee');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const visibleItems = profile.items.filter((i) => i.marketplaceItem.type !== 'placeholder');

  useEffect(() => {
    if (visibleItems.length <= 1) return;

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % visibleItems.length);
        setVisible(true);
      }, 400);
    }, 4000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, visibleItems.length]);

  const copyUrl = useCallback(() => {
    const url = `${window.location.origin}/overlay/${profile.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [profile.id]);

  const current = visibleItems.length > 0 ? visibleItems[currentIndex % visibleItems.length] : null;
  const item = current?.marketplaceItem;

  return (
    <div
      className="group overflow-hidden rounded-xl transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
      style={{ backgroundColor: '#1e2030' }}
    >
      <div className="flex items-stretch gap-0">
        {/* Left: Live preview area */}
        <div className="flex flex-col items-center justify-center bg-[#181926] px-8 py-7">
          {/* Profile name badge */}
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#a6da95] shadow-[0_0_6px_rgba(166,218,149,0.5)]" />
            <span
              className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6e738d]"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              {profile.name}
            </span>
          </div>

          {/* Card preview */}
          <div
            className="transition-all duration-400"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.98)',
            }}
          >
            {item ? (
              item.type === 'ad' ? (
                <AdCard
                  imageUrl={item.imageUrl}
                  headline={item.headline || ''}
                  subtext={item.subtext}
                  brandUrl={item.brandUrl}
                  colorTheme={item.colorTheme as ColorTheme}
                  colorStyle={item.colorStyle as ColorStyle}
                />
              ) : item.type === 'card' ? (
                <CustomCard
                  imageUrl={item.imageUrl}
                  headline={item.headline || ''}
                  subtext={item.subtext}
                  subtext2={item.subtext2}
                  colorTheme={item.colorTheme as ColorTheme}
                  colorStyle={item.colorStyle as ColorStyle}
                />
              ) : item.type === 'spotify' ? (
                <SpotifyCard label={item.headline || undefined} albumArtUrl={demoAlbumArt()} />
              ) : item.type === 'twitch' ? (
                <TwitchCard
                  label={item.headline || undefined}
                  colorTheme={item.colorTheme as ColorTheme}
                />
              ) : item.type === 'kofi' ? (
                <KofiCard colorTheme={item.colorTheme as ColorTheme} />
              ) : item.type === 'buymeacoffee' ? (
                <BmcCard colorTheme={item.colorTheme as ColorTheme} />
              ) : item.type === 'goal' ? (
                <GoalCard colorTheme={item.colorTheme as ColorTheme} />
              ) : item.type === 'countdown' ? (
                <CountdownCard colorTheme={item.colorTheme as ColorTheme} />
              ) : null
            ) : (
              <Link
                href="/marketplace"
                className="flex h-[120px] w-80 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#363a4f] text-xs text-[#494d64] transition-all hover:border-[#a6da95]/30 hover:text-[#a6da95]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span>Browse Marketplace</span>
              </Link>
            )}
          </div>

          {/* Dot indicators */}
          {visibleItems.length > 1 && (
            <div className="mt-4 flex gap-1.5">
              {visibleItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setVisible(false);
                    setTimeout(() => {
                      setCurrentIndex(i);
                      setVisible(true);
                    }, 300);
                  }}
                  className="transition-all duration-300"
                  style={{
                    width: i === currentIndex % visibleItems.length ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === currentIndex % visibleItems.length ? '#a6da95' : '#363a4f',
                    boxShadow: i === currentIndex % visibleItems.length ? '0 0 8px rgba(166,218,149,0.4)' : 'none',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-[#363a4f]" />

        {/* Right: Controls */}
        <div className="flex flex-1 flex-col justify-between px-6 py-7">
          {/* Stats row */}
          <div className="flex gap-6">
            <div>
              <p
                className="text-2xl font-bold text-[#cad3f5]"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                {profile.items.length}
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#494d64]">items</p>
            </div>
            <div>
              <p
                className="text-2xl font-bold text-[#cad3f5]"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                {profile.items.length > 0
                  ? `${profile.items.reduce((s, i) => s + i.displayDuration, 0)}s`
                  : '—'}
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#494d64]">cycle</p>
            </div>
            <div>
              <p
                className="text-2xl font-bold text-[#cad3f5]"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                {new Set(profile.items.map((i) => i.marketplaceItem.type)).size || '—'}
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#494d64]">types</p>
            </div>
          </div>

          {/* Integration warnings */}
          {(needsSpotify || needsTwitch || needsKofi || needsBmc) && (
            <Link
              href="/integrations"
              className="mt-4 flex items-center gap-2 rounded-lg bg-[#ed8796]/10 px-3 py-2 text-xs text-[#ed8796] transition-all hover:bg-[#ed8796]/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>
                {[
                  needsSpotify && 'Spotify',
                  needsTwitch && 'Twitch',
                  needsKofi && 'Ko-fi',
                  needsBmc && 'BMC',
                ].filter(Boolean).join(', ')} not connected
              </span>
            </Link>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex flex-col gap-2">
            <div className="flex gap-2">
              <Link
                href={`/profile/${profile.id}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#363a4f] px-4 py-2.5 text-sm font-medium text-[#cad3f5] transition-all hover:bg-[#494d64]"
                style={{ fontFamily: 'var(--font-family-display)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </Link>
              <button
                onClick={copyUrl}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
                style={{
                  fontFamily: 'var(--font-family-display)',
                  backgroundColor: copied ? 'rgba(166,218,149,0.15)' : 'rgba(166,218,149,0.08)',
                  color: '#a6da95',
                }}
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    OBS URL
                  </>
                )}
              </button>
            </div>
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs text-[#494d64] transition-all hover:bg-[#ed8796]/10 hover:text-[#ed8796]"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileWithItems[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [integrations, setIntegrations] = useState<Integrations>(null);
  const [plan, setPlan] = useState('free');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      router.refresh();
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetchProfiles();
    fetchIntegrations();
  }, [user]);

  async function fetchIntegrations() {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/integrations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setIntegrations(await res.json());
  }

  async function fetchProfiles() {
    const token = await getIdToken();

    const planRes = await fetch('/api/username', { headers: { Authorization: `Bearer ${token}` } });
    if (planRes.ok) { const d = await planRes.json(); setPlan(d.plan || 'free'); }

    const res = await fetch('/api/profiles', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setLoadingProfiles(false); return; }
    const profileList = await res.json();

    // Fetch items for each profile
    const withItems = await Promise.all(
      profileList.map(async (p: { id: string; name: string; createdAt: string }) => {
        const itemRes = await fetch(`/api/profiles/${p.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (itemRes.ok) return itemRes.json();
        return { ...p, items: [] };
      })
    );

    setProfiles(withItems);
    setLoadingProfiles(false);
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
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-[#cad3f5]"
            style={{ fontFamily: 'var(--font-family-display)' }}
          >
            Your Overlays
          </h1>
          <p className="mt-1 text-sm text-[#494d64]">
            Live-rotating card profiles for your stream
          </p>
        </div>
      </div>

      {/* Create new profile */}
      {plan === 'free' && profiles.length >= 1 ? (
        <div className="mb-8 rounded-xl border border-[rgba(202,211,245,0.06)] bg-[rgba(30,32,48,0.8)] px-5 py-4 text-center">
          <p className="text-sm text-[#6e738d]" style={{ fontFamily: 'var(--font-family-display)' }}>
            Free plan — 1 profile.{' '}
            <button
              onClick={async () => {
                const token = await getIdToken();
                const res = await fetch('/api/stripe/checkout', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                  const { url } = await res.json();
                  window.location.href = url;
                }
              }}
              className="text-[#a6da95] underline underline-offset-2 hover:text-[#8bd5ca]"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              Upgrade to Pro for unlimited.
            </button>
          </p>
        </div>
      ) : (
        <div className="mb-8 flex gap-3">
          <div className="relative flex-grow">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New profile name..."
              className="w-full rounded-xl border border-[rgba(202,211,245,0.06)] bg-[rgba(30,32,48,0.8)] px-5 py-3 text-sm text-[#cad3f5] placeholder-[#494d64] outline-none transition-all focus:border-[rgba(166,218,149,0.3)] focus:shadow-[0_0_0_3px_rgba(166,218,149,0.08)]"
              style={{ fontFamily: 'var(--font-family-display)' }}
              onKeyDown={(e) => e.key === 'Enter' && createProfile()}
            />
          </div>
          <button
            onClick={createProfile}
            disabled={creating || !newName.trim()}
            className="rounded-xl bg-gradient-to-r from-[#a6da95] to-[#8bd5ca] px-6 py-3 text-sm font-semibold text-[#181926] shadow-[0_2px_12px_rgba(166,218,149,0.2)] transition-all hover:shadow-[0_4px_20px_rgba(166,218,149,0.3)] disabled:opacity-40 disabled:shadow-none"
            style={{ fontFamily: 'var(--font-family-display)' }}
          >
            {creating ? '...' : 'Create'}
          </button>
        </div>
      )}

      {/* Profiles */}
      {loadingProfiles ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#a6da95] border-t-transparent" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#363a4f] py-16">
          <div className="mb-3 rounded-full bg-[rgba(166,218,149,0.08)] p-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#494d64" strokeWidth={1.5} className="h-8 w-8">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <p className="text-sm text-[#494d64]" style={{ fontFamily: 'var(--font-family-display)' }}>
            No overlay profiles yet
          </p>
          <p className="mt-1 text-xs text-[#363a4f]">
            Create one using the field above to get started
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {profiles.map((profile, i) => (
            <div
              key={profile.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <ProfilePreview
                profile={profile}
                onDelete={() => deleteProfile(profile.id)}
                integrations={integrations}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
