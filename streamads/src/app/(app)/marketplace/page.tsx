'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdCard } from '@/components/ad-card';
import { CustomCard } from '@/components/custom-card';
import { SpotifyCard } from '@/components/spotify-card';
import { TwitchCard } from '@/components/twitch-card';
import { KofiCard } from '@/components/kofi-card';
import { BmcCard } from '@/components/bmc-card';
import { GoalCard } from '@/components/goal-card';
import { CountdownCard } from '@/components/countdown-card';
import { AddToProfileModal } from '@/components/add-to-profile-modal';
import Link from 'next/link';
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';
import { CATEGORIES } from '@/lib/categories';
import { ProBadge } from '@/components/pro-badge';
import { Logo } from '@/components/logo';

type MarketplaceItem = {
  id: string;
  type: 'ad' | 'card' | 'spotify' | 'placeholder' | 'twitch' | 'kofi' | 'buymeacoffee' | 'goal' | 'countdown';
  creatorFirebaseUid: string | null;
  headline: string | null;
  subtext: string | null;
  subtext2: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  creatorName: string | null;
  usageCount: number;
  upvoteCount: number;
  upvoted: boolean;
  creatorSocial: { platform: string; username: string } | null;
  creatorPlan: string;
  colorTheme: string;
  colorStyle: string;
};

const PLATFORM_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  twitch: {
    color: '#9146FF',
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" /></svg>,
  },
  youtube: {
    color: '#FF0000',
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></svg>,
  },
  kick: {
    color: '#53FC18',
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3"><path d="M3 3h6v6h3V6h3V3h6v6h-3v3h-3v3h3v3h3v6h-6v-3h-3v-3H9v6H3v-6h3v-3h3v-3H6V9H3V3z" /></svg>,
  },
  x: {
    color: '#cad3f5',
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
  },
  tiktok: {
    color: '#ff0050',
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.18 8.18 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z" /></svg>,
  },
};

type Integrations = {
  spotify: { connected: boolean };
  twitch: { connected: boolean };
  kofi: { connected: boolean };
  buymeacoffee: { connected: boolean };
} | null;

const SOCIAL_URLS: Record<string, (u: string) => string> = {
  twitch: (u) => `https://twitch.tv/${u}`,
  youtube: (u) => `https://youtube.com/@${u}`,
  kick: (u) => `https://kick.com/${u}`,
  x: (u) => `https://x.com/${u}`,
};

const font = { fontFamily: 'var(--font-family-display)' };

const SAMPLE_TRACKS = [
  { track: 'Bohemian Rhapsody', artist: 'Queen', color1: '#e74856', color2: '#1e1e2e' },
  { track: 'Blinding Lights', artist: 'The Weeknd', color1: '#f5a97f', color2: '#3d1f00' },
  { track: 'Levitating', artist: 'Dua Lipa', color1: '#c6a0f6', color2: '#2a1f3d' },
  { track: 'Starboy', artist: 'The Weeknd', color1: '#8bd5ca', color2: '#1a2f2b' },
  { track: 'Anti-Hero', artist: 'Taylor Swift', color1: '#7dc4e4', color2: '#1a2a3d' },
];

function twitchAvatarSvg(bg: string, hair: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${bg}"/><circle cx="32" cy="26" r="12" fill="${hair}"/><ellipse cx="32" cy="52" rx="18" ry="14" fill="${hair}"/></svg>`)}`;
}

const SAMPLE_TWITCH_USERS = [
  { name: 'thedevdad_', bg: '#9146FF', hair: '#cad3f5' },
  { name: 'pixelwarrior', bg: '#f5bde6', hair: '#24273a' },
  { name: 'nightowl_ttv', bg: '#a6da95', hair: '#1e2030' },
  { name: 'coolgamer42', bg: '#7dc4e4', hair: '#181926' },
];

function DemoTwitchCard({ label, colorTheme }: { label?: string; colorTheme?: ColorTheme }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * SAMPLE_TWITCH_USERS.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % SAMPLE_TWITCH_USERS.length);
        setVisible(true);
      }, 400);
    }, 10000);
    return () => clearTimeout(timer);
  }, [index]);

  const sample = SAMPLE_TWITCH_USERS[index];
  const defaultLabel = label || (index % 2 === 0 ? 'Latest Follower' : 'Latest Sub');

  return (
    <div style={{ transition: 'opacity 0.4s', opacity: visible ? 1 : 0 }}>
      <TwitchCard
        label={defaultLabel}
        username={sample.name}
        avatarUrl={twitchAvatarSvg(sample.bg, sample.hair)}
        colorTheme={colorTheme}
      />
    </div>
  );
}

function albumArtSvg(c1: string, c2: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="50%" stop-color="${c2}"/><stop offset="100%" stop-color="${c1}"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g)"/><rect x="8" y="10" width="20" height="3" rx="1.5" fill="${c1}" opacity="0.4"/><rect x="8" y="16" width="30" height="2" rx="1" fill="${c1}" opacity="0.2"/><circle cx="32" cy="32" r="6" fill="${c2}"/><circle cx="32" cy="32" r="2" fill="${c1}" opacity="0.5"/></svg>`)}`;
}

function DemoSpotifyCard({ label }: { label?: string }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * SAMPLE_TRACKS.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % SAMPLE_TRACKS.length);
        setVisible(true);
      }, 400);
    }, 10000);
    return () => clearTimeout(timer);
  }, [index]);

  const sample = SAMPLE_TRACKS[index];

  return (
    <div style={{ transition: 'opacity 0.4s', opacity: visible ? 1 : 0 }}>
      <SpotifyCard
        label={label || 'Now Playing'}
        trackName={sample.track}
        artistName={sample.artist}
        albumArtUrl={albumArtSvg(sample.color1, sample.color2)}
      />
    </div>
  );
}

export default function Marketplace() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [feed, setFeed] = useState<'global' | 'official' | 'following'>('global');
  const [addingItem, setAddingItem] = useState<{ id: string; type: string } | null>(null);
  const [integrations, setIntegrations] = useState<Integrations>(null);
  const [plan, setPlan] = useState('free');
  const [cardCount, setCardCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchUserData() {
      const token = await getIdToken();
      if (!token) return;
      const [intRes, planRes, profilesRes] = await Promise.all([
        fetch('/api/integrations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/username', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/profiles', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (intRes.ok) setIntegrations(await intRes.json());
      if (planRes.ok) {
        const d = await planRes.json();
        setPlan(d.plan || 'free');
      }
      if (profilesRes.ok) {
        const profiles = await profilesRes.json();
        if (profiles.length > 0) {
          const profileRes = await fetch(`/api/profiles/${profiles[0].id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (profileRes.ok) {
            const profile = await profileRes.json();
            setCardCount(profile.items?.length || 0);
          }
        }
      }
    }
    if (user) fetchUserData();
  }, [user, getIdToken]);

  useEffect(() => {
    if (user) fetchItems();
  }, [search, categoryFilter, feed, user]);

  async function fetchItems() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);
    if (feed !== 'global') params.set('feed', feed);
    const token = await getIdToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/marketplace?${params}`, { headers });
    if (res.ok) setItems(await res.json());
  }

  async function toggleUpvote(id: string) {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/upvotes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ itemId: id }),
    });
    if (res.ok) {
      const { upvoted } = await res.json();
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, upvoted, upvoteCount: item.upvoteCount + (upvoted ? 1 : -1) }
            : item
        )
      );
    }
  }

  async function archiveItem(id: string) {
    const token = await getIdToken();
    await fetch(`/api/marketplace/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ archived: true }),
    });
    fetchItems();
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
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#cad3f5]" style={font}>
          Marketplace
        </h1>
        <p className="mt-1 text-sm text-[#494d64]">
          Discover overlay cards from the community
        </p>
      </div>

      {/* Plan limit banner */}
      {plan === 'free' && (
        <div className="mb-8 rounded-xl border border-[rgba(202,211,245,0.06)] bg-[rgba(30,32,48,0.8)] px-5 py-4 text-center">
          <p className="text-sm text-[#6e738d]" style={font}>
            Free plan — {cardCount}/3 cards.{' '}
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
              style={font}
            >
              Upgrade to Pro for unlimited.
            </button>
          </p>
        </div>
      )}

      {/* Feed toggle */}
      <div className="mb-5 flex items-center gap-3">
        <div className="relative flex rounded-xl border border-[rgba(202,211,245,0.06)] bg-[rgba(30,32,48,0.6)] p-0.5" style={font}>
          {(['official', 'following', 'global'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFeed(f)}
              className="relative z-10 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors"
              style={{
                color: feed === f ? '#181926' : '#6e738d',
              }}
            >
              {f === 'official' ? 'Official' : f === 'following' ? 'Following' : 'Global'}
            </button>
          ))}
          {/* Sliding indicator */}
          <div
            className="absolute top-0.5 bottom-0.5 rounded-lg bg-[#a6da95] transition-all duration-200"
            style={{
              width: 'calc(33.333% - 2px)',
              left: feed === 'official' ? '2px' : feed === 'following' ? 'calc(33.333% + 1px)' : 'calc(66.666%)',
            }}
          />
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#494d64" strokeWidth={1.5} className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards..."
            className="w-full rounded-xl border border-[rgba(202,211,245,0.06)] bg-[rgba(30,32,48,0.8)] py-3 pl-11 pr-4 text-sm text-[#cad3f5] placeholder-[#494d64] outline-none transition-all focus:border-[rgba(166,218,149,0.3)] focus:shadow-[0_0_0_3px_rgba(166,218,149,0.08)]"
            style={font}
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('')}
          className="rounded-xl px-4 py-2 text-xs font-medium transition-all"
          style={{
            background: !categoryFilter ? 'linear-gradient(135deg, #a6da95, #8bd5ca)' : 'rgba(30,32,48,0.8)',
            color: !categoryFilter ? '#1e2030' : '#b8c0e0',
            border: `1px solid ${!categoryFilter ? 'transparent' : 'rgba(202,211,245,0.06)'}`,
            fontFamily: 'var(--font-family-display)',
          }}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategoryFilter(categoryFilter === cat.key ? '' : cat.key)}
            className="rounded-xl px-4 py-2 text-xs font-medium transition-all"
            style={{
              background: categoryFilter === cat.key ? 'linear-gradient(135deg, #a6da95, #8bd5ca)' : 'rgba(30,32,48,0.8)',
              color: categoryFilter === cat.key ? '#1e2030' : '#b8c0e0',
              border: `1px solid ${categoryFilter === cat.key ? 'transparent' : 'rgba(202,211,245,0.06)'}`,
              fontFamily: 'var(--font-family-display)',
            }}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="group overflow-hidden rounded-xl transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
            style={{ backgroundColor: '#1e2030' }}
          >
            {/* Preview well — darker inset for the card */}
            <div className="flex items-center justify-center bg-[#181926] px-6 py-5">
              {item.type === 'ad' ? (
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
                <DemoSpotifyCard label={item.headline || undefined} />
              ) : item.type === 'twitch' ? (
                <DemoTwitchCard
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
              ) : (
                <div className="flex h-[120px] w-80 items-center justify-center rounded-md text-xs text-[#494d64]">
                  Placeholder (invisible on stream)
                </div>
              )}
            </div>

            {/* Footer bar */}
            <div className="flex items-center justify-between px-4 py-3">
              {/* Creator */}
              <div className="flex min-w-0 items-center gap-1.5">
                {item.creatorSocial ? (
                  <a
                    href={SOCIAL_URLS[item.creatorSocial.platform]?.(item.creatorSocial.username) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-[#b8c0e0] transition-opacity hover:opacity-80"
                    style={font}
                  >
                    <span style={{ color: PLATFORM_ICONS[item.creatorSocial.platform]?.color }}>
                      {PLATFORM_ICONS[item.creatorSocial.platform]?.icon}
                    </span>
                    <span className="truncate">{item.creatorSocial.username}</span>
                    {item.creatorPlan === 'pro' && <ProBadge size="sm" />}
                  </a>
                ) : item.creatorName ? (
                  <span className="flex items-center gap-1 truncate text-[11px] text-[#6e738d]" style={font}>{item.creatorName} {item.creatorPlan === 'pro' && <ProBadge size="sm" />}</span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px]" style={font}>
                    <Logo className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-[#6e738d]">thosewho<span className="text-[#a6da95]">.stream</span></span>
                  </span>
                )}
              </div>

              {/* Stats + Actions */}
              <div className="flex flex-shrink-0 items-center gap-2.5">
                {/* Usage count */}
                <span className="flex items-center gap-1 text-[10px] text-[#494d64]" style={font}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="tabular-nums">{item.usageCount}</span>
                </span>

                {/* Upvote */}
                <button
                  onClick={() => toggleUpvote(item.id)}
                  className="flex items-center gap-1 rounded-lg px-1.5 py-1 transition-all hover:bg-[rgba(245,189,230,0.08)]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 transition-all"
                    style={{
                      stroke: item.upvoted ? '#f5bde6' : '#494d64',
                      filter: item.upvoted ? 'drop-shadow(0 0 4px rgba(245,189,230,0.4))' : 'none',
                    }}
                  >
                    <path d="M12 19V5" />
                    <path d="M5 12l7-7 7 7" />
                  </svg>
                  <span className="text-[10px] tabular-nums" style={{ color: item.upvoted ? '#f5bde6' : '#494d64', ...font }}>
                    {item.upvoteCount}
                  </span>
                </button>


                {/* Add / Setup */}
                {(() => {
                  let needsSetup = false;
                  if (item.type === 'spotify' && integrations && !integrations.spotify.connected) needsSetup = true;
                  else if (item.type === 'twitch' && integrations && !integrations.twitch.connected) needsSetup = true;
                  else if (item.type === 'kofi' && integrations && !integrations.kofi.connected) needsSetup = true;
                  else if (item.type === 'buymeacoffee' && integrations && !integrations.buymeacoffee.connected) needsSetup = true;
                  else if (item.type === 'goal' && integrations && !integrations.twitch.connected) needsSetup = true;

                  return needsSetup ? (
                    <Link
                      href="/integrations"
                      className="rounded-lg px-2.5 py-1 text-[10px] font-medium text-[#ed8796] transition-all hover:bg-[rgba(237,135,150,0.08)]"
                      style={font}
                    >
                      Setup
                    </Link>
                  ) : (
                    <button
                      onClick={() => setAddingItem({ id: item.id, type: item.type })}
                      className="rounded-lg bg-[#a6da95]/10 px-2.5 py-1 text-[10px] font-medium text-[#a6da95] transition-all hover:bg-[#a6da95]/20"
                      style={font}
                    >
                      + Add
                    </button>
                  );
                })()}

                {item.creatorFirebaseUid && user?.uid && item.creatorFirebaseUid === user.uid && (
                  <>
                    <button
                      onClick={() => archiveItem(item.id)}
                      className="rounded-lg px-2 py-1 text-[10px] text-[#494d64] transition-all hover:text-[#f5a97f]"
                      style={font}
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="rounded-lg px-2 py-1 text-[10px] text-[#494d64] transition-all hover:text-[#ed8796]"
                      style={font}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {addingItem && (
        <AddToProfileModal
          itemId={addingItem.id}
          itemType={addingItem.type}
          onClose={() => setAddingItem(null)}
        />
      )}
    </div>
  );
}
