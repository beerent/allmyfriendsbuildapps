'use client';

import { useAuth } from '@/lib/auth/context';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ProBadge } from '@/components/pro-badge';
import { AdCard } from '@/components/ad-card';
import { CustomCard } from '@/components/custom-card';
import { SpotifyCard } from '@/components/spotify-card';
import { TwitchCard } from '@/components/twitch-card';
import { KofiCard } from '@/components/kofi-card';
import { BmcCard } from '@/components/bmc-card';
import { AddToProfileModal } from '@/components/add-to-profile-modal';
import { Logo } from '@/components/logo';
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';

type SocialLink = {
  platform: string;
  username: string;
};

type UserProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  socialLinks: SocialLink[];
  primaryIdentity: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  plan: string;
};

type MarketplaceItem = {
  id: string;
  type: 'ad' | 'card' | 'spotify' | 'placeholder' | 'twitch' | 'kofi' | 'buymeacoffee';
  headline: string | null;
  subtext: string | null;
  subtext2: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  colorTheme: string;
  colorStyle: string;
};

type ProfileData = {
  user: UserProfile;
  items: MarketplaceItem[];
};

const font = { fontFamily: 'var(--font-family-display)' };

// --- Deterministic avatar gradient from username ---
const AVATAR_PALETTE = ['#f5bde6', '#c6a0f6', '#7dc4e4', '#a6da95', '#f5a97f', '#ed8796', '#8bd5ca'];

function hashUsername(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function avatarGradient(username: string): [string, string] {
  const h = hashUsername(username);
  const i1 = h % AVATAR_PALETTE.length;
  let i2 = (h >> 4) % AVATAR_PALETTE.length;
  if (i2 === i1) i2 = (i1 + 1) % AVATAR_PALETTE.length;
  return [AVATAR_PALETTE[i1], AVATAR_PALETTE[i2]];
}

// --- Platform icons + URLs ---
const PLATFORM_META: Record<string, {
  icon: React.ReactNode;
  color: string;
  url: (u: string) => string;
}> = {
  twitch: {
    color: '#9146FF',
    url: (u) => `https://twitch.tv/${u}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
      </svg>
    ),
  },
  youtube: {
    color: '#FF0000',
    url: (u) => `https://youtube.com/@${u}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
      </svg>
    ),
  },
  kick: {
    color: '#53FC18',
    url: (u) => `https://kick.com/${u}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M3 3h6v6h3V6h3V3h6v6h-3v3h-3v3h3v3h3v6h-6v-3h-3v-3H9v6H3v-6h3v-3h3v-3H6V9H3V3z" />
      </svg>
    ),
  },
  x: {
    color: '#cad3f5',
    url: (u) => `https://x.com/${u}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  tiktok: {
    color: '#ff0050',
    url: (u) => `https://tiktok.com/@${u}`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.18 8.18 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z" />
      </svg>
    ),
  },
};


export default function PublicProfile() {
  const { user, getIdToken } = useAuth();
  const params = useParams();
  const username = params.username as string;

  const [data, setData] = useState<ProfileData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'notfound'>('loading');
  const [addingItem, setAddingItem] = useState<{ id: string; type: string } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [viewerUsername, setViewerUsername] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const token = await getIdToken();
      const res = await fetch('/api/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      if (res.ok && data) {
        setData({ ...data, user: { ...data.user, avatarUrl: dataUrl } });
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!username) return;
    setStatus('loading');
    fetch(`/api/users/${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((d: ProfileData) => {
        setData(d);
        setIsFollowing(d.user.isFollowing);
        setIsSelf(d.user.isSelf);
        setFollowerCount(d.user.followerCount);
        setStatus('ok');
      })
      .catch(() => setStatus('notfound'));
  }, [username]);

  useEffect(() => {
    if (!user) { setViewerUsername(null); return; }
    getIdToken().then((token) => {
      if (!token) return;
      return fetch('/api/username', { headers: { Authorization: `Bearer ${token}` } });
    }).then((res) => {
      if (!res || !res.ok) return;
      return res.json();
    }).then((d) => {
      if (d?.username) setViewerUsername(d.username);
    }).catch(() => {});
  }, [user, getIdToken]);

  const handleFollow = async () => {
    if (!data || followLoading) return;
    const token = await getIdToken();
    if (!token) return;
    setFollowLoading(true);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: data.user.id }),
      });
      if (res.ok) {
        const result = await res.json();
        setIsFollowing(result.following);
        setFollowerCount((c) => c + (result.following ? 1 : -1));
      }
    } finally {
      setFollowLoading(false);
    }
  };

  // --- Loading state ---
  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[#363a4f] border-t-[#a6da95]"
          />
          <p className="text-sm text-[#494d64]" style={font}>Loading profile...</p>
        </div>
      </div>
    );
  }

  // --- 404 state ---
  if (status === 'notfound') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="rounded-2xl bg-[#1e2030] p-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#494d64" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12">
              <circle cx="12" cy="12" r="10" />
              <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#cad3f5]" style={font}>User not found</h1>
            <p className="mt-1 text-sm text-[#494d64]" style={font}>
              There&apos;s no one here by that name.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl bg-[#363a4f] px-6 py-2.5 text-sm font-medium text-[#cad3f5] transition-all hover:bg-[#494d64]"
            style={font}
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user: profile, items } = data;
  const [c1, c2] = avatarGradient(profile.username);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">

        {/* ─── Left sidebar ─── */}
        <aside className="flex flex-col items-center gap-5 lg:sticky lg:top-24 lg:w-64 lg:self-start lg:items-start">
          {/* Avatar */}
          <div className="relative">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                className="h-28 w-28 rounded-full object-cover shadow-[0_0_40px_rgba(166,218,149,0.08)]"
              />
            ) : (
              <div
                className="flex h-28 w-28 items-center justify-center rounded-full shadow-[0_0_40px_rgba(166,218,149,0.08)]"
                style={{
                  background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
                }}
              >
                <span className="text-3xl font-bold text-[#1e2030] opacity-60" style={{ fontFamily: 'var(--font-family-display)' }}>
                  {profile.username.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            {/* Upload button — own profile only */}
            {user && viewerUsername === profile.username && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#363a4f] text-[#cad3f5] shadow-lg transition-all hover:bg-[#494d64]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </>
            )}
          </div>

          {/* Username row */}
          <div className="flex items-center gap-2">
            {profile.primaryIdentity === 'username' && (
              <Logo className="h-5 w-5 flex-shrink-0" />
            )}
            <h1 className="text-2xl font-bold text-[#cad3f5]" style={font}>
              {profile.username}
            </h1>
            {profile.plan === 'pro' && <ProBadge size="md" />}
          </div>

          {/* Display name */}
          {profile.displayName && (
            <p className="-mt-3 text-sm text-[#6e738d]" style={font}>
              {profile.displayName}
            </p>
          )}

          {/* Social links */}
          {profile.socialLinks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.socialLinks.map((link) => {
                const meta = PLATFORM_META[link.platform];
                if (!meta) return null;
                return (
                  <a
                    key={link.platform}
                    href={meta.url(link.username)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e2030] transition-all duration-200 hover:scale-110 hover:bg-[#363a4f]"
                    style={{ color: meta.color }}
                    title={`${link.platform}: ${link.username}`}
                  >
                    {meta.icon}
                  </a>
                );
              })}
            </div>
          )}

          {/* Follower / following counts */}
          <p className="text-sm" style={{ color: '#6e738d', fontFamily: 'var(--font-family-display)' }}>
            <span className="font-medium text-[#b8c0e0]">{followerCount}</span>{' '}
            {followerCount === 1 ? 'follower' : 'followers'}
            {' · '}
            <span className="font-medium text-[#b8c0e0]">{profile.followingCount}</span>{' '}
            following
          </p>

          {/* Own profile links */}
          {user && viewerUsername && viewerUsername === profile.username && (
            <div className="flex w-full flex-col gap-1.5">
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-xl bg-[#1e2030] px-4 py-2.5 text-xs text-[#6e738d] transition-all hover:bg-[#363a4f] hover:text-[#cad3f5]"
                style={font}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Edit Profile
              </Link>
              <Link
                href="/integrations"
                className="flex items-center gap-2 rounded-xl bg-[#1e2030] px-4 py-2.5 text-xs text-[#6e738d] transition-all hover:bg-[#363a4f] hover:text-[#cad3f5]"
                style={font}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Integrations
              </Link>
            </div>
          )}

          {/* Follow / unfollow button */}
          {user && !isSelf && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={
                isFollowing
                  ? 'group w-full rounded-xl border border-[rgba(202,211,245,0.1)] px-4 py-2 text-sm font-medium text-[#b8c0e0] transition-all duration-200 hover:border-[#ed8796] hover:text-[#ed8796] disabled:opacity-50'
                  : 'w-full rounded-xl bg-gradient-to-r from-[#a6da95] to-[#8bd5ca] px-4 py-2 text-sm font-medium text-[#1e2030] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(166,218,149,0.25)] disabled:opacity-50'
              }
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              {isFollowing ? (
                <span>
                  <span className="group-hover:hidden">Following</span>
                  <span className="hidden group-hover:inline">Unfollow</span>
                </span>
              ) : (
                'Follow'
              )}
            </button>
          )}
        </aside>

        {/* ─── Right content ─── */}
        <main className="min-w-0 flex-1">
          {/* Section header */}
          <div className="mb-6 flex items-baseline gap-2">
            <h2 className="text-lg font-semibold text-[#cad3f5]" style={font}>Cards</h2>
            <span className="rounded-lg bg-[#1e2030] px-2.5 py-0.5 text-xs tabular-nums text-[#6e738d]" style={font}>
              {items.length}
            </span>
          </div>

          {/* Empty state */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#363a4f] py-20">
              <div className="rounded-2xl bg-[#1e2030] p-5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#494d64" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                </svg>
              </div>
              <p className="text-sm text-[#494d64]" style={font}>No cards yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item, i) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-4 rounded-2xl border border-[rgba(202,211,245,0.06)] px-4 py-3 transition-all duration-200 hover:border-[rgba(202,211,245,0.12)]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(30,32,48,0.9) 0%, rgba(24,25,38,0.95) 100%)',
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  {/* Card preview */}
                  <div className="flex-shrink-0">
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
                      <SpotifyCard label={item.headline || undefined} />
                    ) : item.type === 'twitch' ? (
                      <TwitchCard
                        label={item.headline || undefined}
                        colorTheme={item.colorTheme as ColorTheme}
                      />
                    ) : item.type === 'kofi' ? (
                      <KofiCard colorTheme={item.colorTheme as ColorTheme} />
                    ) : item.type === 'buymeacoffee' ? (
                      <BmcCard colorTheme={item.colorTheme as ColorTheme} />
                    ) : (
                      <div className="flex h-[120px] w-80 items-center justify-center rounded-md bg-[#24273a] text-xs text-[#6e738d]">
                        Placeholder
                      </div>
                    )}
                  </div>

                  {/* Add to profile — right side, only when logged in */}
                  {user && (
                    <div className="ml-auto flex-shrink-0 opacity-30 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        onClick={() => setAddingItem({ id: item.id, type: item.type })}
                        className="rounded-xl border border-[rgba(166,218,149,0.2)] bg-[rgba(166,218,149,0.06)] px-4 py-2 text-xs font-medium text-[#a6da95] transition-all hover:border-[rgba(166,218,149,0.4)] hover:bg-[rgba(166,218,149,0.12)]"
                        style={font}
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Add to profile modal */}
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
