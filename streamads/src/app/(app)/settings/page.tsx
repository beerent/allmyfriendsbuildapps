'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Logo } from '@/components/logo';

const PLATFORMS = [
  {
    id: 'twitch',
    name: 'Twitch',
    color: '#9146FF',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
      </svg>
    ),
    placeholder: 'your_twitch_username',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
      </svg>
    ),
    placeholder: 'your_channel_name',
  },
  {
    id: 'kick',
    name: 'Kick',
    color: '#53FC18',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M3 3h6v6h3V6h3V3h6v6h-3v3h-3v3h3v3h3v6h-6v-3h-3v-3H9v6H3v-6h3v-3h3v-3H6V9H3V3z" />
      </svg>
    ),
    placeholder: 'your_kick_username',
  },
  {
    id: 'x',
    name: 'X',
    color: '#cad3f5',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    placeholder: 'your_handle',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#ff0050',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.18 8.18 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z" />
      </svg>
    ),
    placeholder: 'your_tiktok_username',
  },
] as const;

const font = { fontFamily: 'var(--font-family-display)' };

type SocialLink = {
  platform: string;
  username: string;
  isPrimary: number;
};

export default function Settings() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [links, setLinks] = useState<Record<string, string>>({
    twitch: '', youtube: '', kick: '', x: '', tiktok: '',
  });
  const [primary, setPrimary] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const initialLoadDone = useRef(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const [plan, setPlan] = useState('free');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'saved'>('idle');
  const usernameCheckTimer = useRef<NodeJS.Timeout | null>(null);
  const savedUsername = useRef('');

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchData() {
      const token = await getIdToken();
      if (!token) return;

      const [linksRes, usernameRes] = await Promise.all([
        fetch('/api/social-links', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/username', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (linksRes.ok) {
        const data: SocialLink[] = await linksRes.json();
        const linkMap: Record<string, string> = { twitch: '', youtube: '', kick: '', x: '', tiktok: '' };
        let primaryPlatform: string | null = null;
        for (const link of data) {
          linkMap[link.platform] = link.username;
          if (link.isPrimary) primaryPlatform = link.platform;
        }
        setLinks(linkMap);
        setPrimary(primaryPlatform);
        initialLoadDone.current = true;
      }

      if (usernameRes.ok) {
        const uData = await usernameRes.json();
        setPlan(uData.plan || 'free');
        if (uData.username) {
          setUsername(uData.username);
          savedUsername.current = uData.username;
          setUsernameStatus('saved');
        }
      }

      setLoadingData(false);
    }
    if (user) fetchData();
  }, [user, getIdToken]);

  const handleUsernameChange = useCallback((value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);

    if (cleaned === savedUsername.current) {
      setUsernameStatus('saved');
      return;
    }

    if (!cleaned || cleaned.length < 3) {
      setUsernameStatus(cleaned ? 'invalid' : 'idle');
      return;
    }

    setUsernameStatus('checking');
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    usernameCheckTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/username?check=${cleaned}`);
      if (res.ok) {
        const { available } = await res.json();
        setUsernameStatus(available ? 'available' : 'taken');
      }
    }, 400);
  }, []);

  async function saveUsername() {
    if (usernameStatus !== 'available') return;
    const token = await getIdToken();
    const res = await fetch('/api/username', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username }),
    });
    if (res.ok) {
      savedUsername.current = username;
      setUsernameStatus('saved');
    }
  }

  async function handleUpgrade() {
    const token = await getIdToken();
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
  }

  async function handleManage() {
    const token = await getIdToken();
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
  }

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      save();
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [links, primary]);

  async function save() {
    setSaving(true);
    const token = await getIdToken();
    if (!token) return;

    await fetch('/api/social-links', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        links: Object.entries(links).map(([platform, username]) => ({ platform, username })),
        primaryPlatform: primary,
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading || !user) return null;

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#a6da95] border-t-transparent" />
      </div>
    );
  }

  const linkedPlatforms = PLATFORMS.filter((p) => links[p.id]?.trim());

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold text-[#cad3f5]" style={font}>Profile</h1>
      <p className="mt-1 mb-8 text-sm text-[#494d64]">
        Link your socials and choose how you appear on the marketplace.
      </p>

      {/* Plan */}
      {plan === 'pro' ? (
        <div className="mb-8 rounded-2xl border border-[rgba(166,218,149,0.15)] p-6" style={{ background: 'rgba(30,32,48,0.8)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#cad3f5]" style={font}>Pro Plan</h2>
                <span className="rounded-full bg-[rgba(166,218,149,0.15)] px-2 py-0.5 text-[10px] font-bold text-[#a6da95]">PRO</span>
              </div>
              <p className="mt-1 text-xs text-[#494d64]">Unlimited profiles · Unlimited cards</p>
            </div>
            <button
              onClick={handleManage}
              className="rounded-xl border border-[rgba(202,211,245,0.1)] px-4 py-2 text-sm text-[#b8c0e0] transition-all hover:bg-[#363a4f]"
              style={font}
            >
              Manage Subscription
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-2xl border border-[rgba(202,211,245,0.06)] p-6" style={{ background: 'rgba(30,32,48,0.8)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#cad3f5]" style={font}>Free Plan</h2>
                <span className="rounded-full bg-[#363a4f] px-2 py-0.5 text-[10px] text-[#6e738d]">Current</span>
              </div>
              <p className="mt-1 text-xs text-[#494d64]">1 profile · 3 cards per profile</p>
            </div>
            <button
              onClick={handleUpgrade}
              className="rounded-xl bg-gradient-to-r from-[#a6da95] to-[#8bd5ca] px-5 py-2.5 text-sm font-semibold text-[#181926] shadow-[0_2px_12px_rgba(166,218,149,0.2)] transition-all hover:shadow-[0_4px_20px_rgba(166,218,149,0.3)]"
              style={font}
            >
              Upgrade to Pro — $5/mo
            </button>
          </div>
        </div>
      )}

      {/* Username */}
      <div className="mb-8">
        <h2 className="mb-1 text-sm font-semibold text-[#cad3f5]" style={font}>Username</h2>
        <p className="mb-3 text-xs text-[#494d64]">Your unique identity on thosewho.stream</p>
        <div
          className="flex items-center overflow-hidden rounded-xl border transition-all duration-200"
          style={{
            borderColor: usernameStatus === 'saved' ? 'rgba(166,218,149,0.2)' : usernameStatus === 'taken' ? 'rgba(237,135,150,0.3)' : 'rgba(202,211,245,0.06)',
            background: 'rgba(30,32,48,0.8)',
          }}
        >
          <div className="flex items-center justify-center px-4 py-4" style={{ color: usernameStatus === 'saved' ? '#a6da95' : '#6e738d' }}>
            <Logo className="h-5 w-5" />
          </div>
          <div className="h-6 w-px bg-[rgba(202,211,245,0.06)]" />
          <input
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="choose_a_username"
            maxLength={20}
            className="flex-1 bg-transparent px-4 py-4 text-sm text-[#cad3f5] placeholder-[#363a4f] outline-none"
            style={font}
          />
          <div className="flex items-center gap-2 pr-4">
            {usernameStatus === 'checking' && (
              <div className="h-3 w-3 animate-spin rounded-full border border-[#494d64] border-t-transparent" />
            )}
            {usernameStatus === 'available' && (
              <button
                onClick={saveUsername}
                className="rounded-md bg-[#a6da95] px-3 py-1 text-xs font-medium text-[#1e2030] hover:bg-[#8bd5ca]"
                style={font}
              >
                Claim
              </button>
            )}
            {usernameStatus === 'taken' && (
              <span className="text-xs text-[#ed8796]" style={font}>Taken</span>
            )}
            {usernameStatus === 'invalid' && (
              <span className="text-xs text-[#f5a97f]" style={font}>3+ chars</span>
            )}
            {usernameStatus === 'saved' && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a6da95" strokeWidth={2} className="h-4 w-4">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Social link inputs */}
      <div className="flex flex-col gap-3">
        {PLATFORMS.map((platform) => {
          const isLinked = links[platform.id]?.trim();

          return (
            <div
              key={platform.id}
              className="flex items-center overflow-hidden rounded-xl border transition-all duration-200"
              style={{
                borderColor: isLinked ? `${platform.color}20` : 'rgba(202,211,245,0.06)',
                background: 'rgba(30,32,48,0.8)',
              }}
            >
              {/* Icon */}
              <div
                className="flex items-center justify-center px-4 py-4 transition-colors duration-200"
                style={{ color: isLinked ? platform.color : '#363a4f' }}
              >
                {platform.icon}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-[rgba(202,211,245,0.06)]" />

              {/* Input */}
              <div className="flex flex-1 items-center gap-2 px-4">
                <span className="text-xs text-[#494d64] min-w-[60px]" style={font}>{platform.name}</span>
                <input
                  type="text"
                  value={links[platform.id]}
                  onChange={(e) => setLinks({ ...links, [platform.id]: e.target.value })}
                  placeholder={platform.placeholder}
                  className="flex-1 bg-transparent py-4 text-sm text-[#cad3f5] placeholder-[#363a4f] outline-none"
                  style={font}
                />
              </div>

              {/* Clear button when linked */}
              {isLinked && (
                <button
                  onClick={() => {
                    setLinks({ ...links, [platform.id]: '' });
                    if (primary === platform.id) setPrimary(null);
                  }}
                  className="px-3 text-[#494d64] transition-colors hover:text-[#ed8796]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Primary identity selector */}
      {(usernameStatus === 'saved' || linkedPlatforms.length > 0) && (
        <div className="mt-8">
          <h2 className="mb-1 text-sm font-semibold text-[#cad3f5]" style={font}>
            Display Identity
          </h2>
          <p className="mb-4 text-xs text-[#494d64]">
            Choose which identity appears next to your cards on the marketplace
          </p>

          <div className="flex flex-col gap-2">
            {/* Username option */}
            {usernameStatus === 'saved' && username && (() => {
              const isPrimary = primary === 'username';
              const color = '#a6da95';
              return (
                <button
                  onClick={() => setPrimary(isPrimary ? null : 'username')}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200"
                  style={{
                    background: isPrimary
                      ? `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`
                      : 'rgba(54,58,79,0.3)',
                    border: `1px solid ${isPrimary ? `${color}40` : 'rgba(202,211,245,0.06)'}`,
                    boxShadow: isPrimary ? `0 0 20px ${color}15, inset 0 0 20px ${color}05` : 'none',
                  }}
                >
                  <div
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200"
                    style={{
                      borderColor: isPrimary ? color : '#494d64',
                      backgroundColor: isPrimary ? color : 'transparent',
                      boxShadow: isPrimary ? `0 0 10px ${color}50` : 'none',
                    }}
                  >
                    {isPrimary && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#181926" strokeWidth={3} className="h-3 w-3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{ color: isPrimary ? color : '#6e738d' }} className="transition-colors duration-200">
                    <Logo className="h-5 w-5" />
                  </span>
                  <span
                    className="text-sm font-medium transition-colors duration-200"
                    style={{ color: isPrimary ? color : '#b8c0e0', ...font }}
                  >
                    {username}
                  </span>
                  {isPrimary && (
                    <span
                      className="ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ backgroundColor: `${color}20`, color, ...font }}
                    >
                      Active
                    </span>
                  )}
                </button>
              );
            })()}

            {linkedPlatforms.map((platform) => {
              const isPrimary = primary === platform.id;

              return (
                <button
                  key={platform.id}
                  onClick={() => setPrimary(isPrimary ? null : platform.id)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200"
                  style={{
                    background: isPrimary
                      ? `linear-gradient(135deg, ${platform.color}15 0%, ${platform.color}08 100%)`
                      : 'rgba(54,58,79,0.3)',
                    border: `1px solid ${isPrimary ? `${platform.color}40` : 'rgba(202,211,245,0.06)'}`,
                    boxShadow: isPrimary ? `0 0 20px ${platform.color}15, inset 0 0 20px ${platform.color}05` : 'none',
                  }}
                >
                  {/* Radio */}
                  <div
                    className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200"
                    style={{
                      borderColor: isPrimary ? platform.color : '#494d64',
                      backgroundColor: isPrimary ? platform.color : 'transparent',
                      boxShadow: isPrimary ? `0 0 10px ${platform.color}50` : 'none',
                    }}
                  >
                    {isPrimary && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#181926" strokeWidth={3} className="h-3 w-3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>

                  {/* Platform icon */}
                  <span style={{ color: isPrimary ? platform.color : '#6e738d' }} className="transition-colors duration-200">
                    {platform.icon}
                  </span>

                  {/* Username */}
                  <span
                    className="text-sm font-medium transition-colors duration-200"
                    style={{
                      color: isPrimary ? platform.color : '#b8c0e0',
                      ...font,
                    }}
                  >
                    {links[platform.id]}
                  </span>

                  {/* Active badge */}
                  {isPrimary && (
                    <span
                      className="ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{
                        backgroundColor: `${platform.color}20`,
                        color: platform.color,
                        ...font,
                      }}
                    >
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Preview */}
          {primary && (
            <div className="mt-4 rounded-lg bg-[rgba(24,25,38,0.6)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#494d64] mb-2" style={font}>
                Marketplace preview
              </p>
              <p className="flex items-center gap-1.5 text-xs" style={font}>
                {primary === 'username' ? (
                  <>
                    <Logo className="h-4 w-4" />
                    <span className="text-[#a6da95]">{username}</span>
                  </>
                ) : (() => {
                  const p = PLATFORMS.find((pl) => pl.id === primary);
                  if (!p) return null;
                  return (
                    <>
                      <span style={{ color: p.color }}>{p.icon}</span>
                      <span style={{ color: p.color }}>{links[p.id]}</span>
                    </>
                  );
                })()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Auto-save indicator */}
      {(saving || saved) && (
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#494d64]" style={font}>
          {saving ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border border-[#494d64] border-t-transparent" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a6da95" strokeWidth={2} className="h-3 w-3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[#a6da95]">Saved</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
