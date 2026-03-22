'use client';

import { useAuth } from '@/lib/auth/context';
import { useEffect, useState, useRef } from 'react';

type ServiceStatus = {
  connected: boolean;
  name?: string | null;
  username?: string | null;
};

type IntegrationStatus = {
  spotify: ServiceStatus;
  twitch: ServiceStatus;
  kofi: ServiceStatus;
  buymeacoffee: ServiceStatus;
};

const font = { fontFamily: 'var(--font-family-display)' };

export default function Integrations() {
  const { getIdToken } = useAuth();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [kofiUsername, setKofiUsername] = useState('');
  const [bmcUsername, setBmcUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/integrations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setKofiUsername(data.kofi?.username || '');
        setBmcUsername(data.buymeacoffee?.username || '');
      }
      setLoading(false);
    }
    fetchStatus();
  }, [getIdToken]);

  async function handleConnect(service: 'spotify' | 'twitch') {
    const token = await getIdToken();
    if (!token) return;
    window.location.href = `/api/${service}/auth?token=${encodeURIComponent(token)}`;
  }

  async function handleDisconnect(service: 'spotify' | 'twitch') {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`/api/${service}/auth`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setStatus((prev) => prev ? { ...prev, [service]: { connected: false, name: null } } : null);
    }
  }

  async function saveSupport(kofi: string, bmc: string) {
    setSaving(true);
    const token = await getIdToken();
    if (!token) return;
    await fetch('/api/integrations', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ kofiUsername: kofi, bmcUsername: bmc }),
    });
    setStatus((prev) => prev ? {
      ...prev,
      kofi: { connected: !!kofi.trim(), username: kofi.trim() || null },
      buymeacoffee: { connected: !!bmc.trim(), username: bmc.trim() || null },
    } : null);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleSupportChange(service: 'kofi' | 'bmc', value: string) {
    if (service === 'kofi') setKofiUsername(value);
    else setBmcUsername(value);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSupport(
        service === 'kofi' ? value : kofiUsername,
        service === 'bmc' ? value : bmcUsername,
      );
    }, 800);
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#a6da95] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold text-[#cad3f5]" style={font}>Integrations</h1>
      <p className="mt-1 mb-8 text-sm text-[#494d64]">
        Connect accounts and services to power your overlay cards.
      </p>

      {/* OAuth Integrations */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#494d64]" style={font}>
        Stream Tools
      </h2>
      <div className="flex flex-col gap-3 mb-10">
        {/* Spotify */}
        <div className="flex items-center justify-between rounded-xl border border-[#363a4f] bg-[#1e2030] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1DB954]/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1DB954" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold" style={font}>Spotify</h2>
              {status?.spotify.connected && status.spotify.name ? (
                <p className="text-sm text-[#1DB954]">{status.spotify.name}</p>
              ) : (
                <p className="text-sm text-[#494d64]">Now Playing and queue</p>
              )}
            </div>
          </div>
          {status?.spotify.connected ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#a6da95]/10 px-3 py-1 text-xs font-medium text-[#a6da95]">Connected</span>
              <button onClick={() => handleDisconnect('spotify')} className="rounded-lg border border-[#363a4f] px-4 py-2 text-sm text-[#ed8796] hover:bg-[#ed8796]/10">
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={() => handleConnect('spotify')} className="rounded-lg bg-[#1DB954] px-4 py-2 text-sm font-medium text-white hover:bg-[#1ed760]">
              Connect
            </button>
          )}
        </div>

        {/* Twitch */}
        <div className="flex items-center justify-between rounded-xl border border-[#363a4f] bg-[#1e2030] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#9146FF]/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9146FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold" style={font}>Twitch</h2>
              {status?.twitch.connected && status.twitch.name ? (
                <p className="text-sm text-[#9146FF]">{status.twitch.name}</p>
              ) : (
                <p className="text-sm text-[#494d64]">Followers and subscribers</p>
              )}
            </div>
          </div>
          {status?.twitch.connected ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#a6da95]/10 px-3 py-1 text-xs font-medium text-[#a6da95]">Connected</span>
              <button onClick={() => handleDisconnect('twitch')} className="rounded-lg border border-[#363a4f] px-4 py-2 text-sm text-[#ed8796] hover:bg-[#ed8796]/10">
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={() => handleConnect('twitch')} className="rounded-lg bg-[#9146FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#772CE8]">
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Support Integrations */}
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#494d64]" style={font}>
        Support Links
      </h2>
      <p className="mb-4 text-xs text-[#494d64]">
        Enter your username to enable support cards in the marketplace. Changes save automatically.
      </p>
      <div className="flex flex-col gap-3">
        {/* Ko-fi */}
        <div className="flex items-center overflow-hidden rounded-xl border border-[#363a4f] bg-[#1e2030] transition-all" style={{ borderColor: kofiUsername.trim() ? '#FF5E5B30' : undefined }}>
          <div className="flex h-full items-center justify-center px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: kofiUsername.trim() ? '#FF5E5B15' : '#363a4f30' }}>
              <img src="/kofi-logo.svg" alt="Ko-fi" className="h-7 w-7" style={{ opacity: kofiUsername.trim() ? 1 : 0.3 }} />
            </div>
          </div>
          <div className="h-8 w-px bg-[rgba(202,211,245,0.06)]" />
          <div className="flex flex-1 items-center gap-3 px-4">
            <span className="text-xs text-[#494d64] min-w-[40px]" style={font}>Ko-fi</span>
            <span className="text-xs text-[#363a4f]">ko-fi.com/</span>
            <input
              type="text"
              value={kofiUsername}
              onChange={(e) => handleSupportChange('kofi', e.target.value)}
              placeholder="username"
              className="flex-1 bg-transparent py-4 text-sm text-[#cad3f5] placeholder-[#363a4f] outline-none"
              style={font}
            />
          </div>
          {kofiUsername.trim() && (
            <span className="mr-4 rounded-full bg-[#a6da95]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#a6da95]">Active</span>
          )}
        </div>

        {/* Buy Me a Coffee */}
        <div className="flex items-center overflow-hidden rounded-xl border border-[#363a4f] bg-[#1e2030] transition-all" style={{ borderColor: bmcUsername.trim() ? '#FFDD0030' : undefined }}>
          <div className="flex h-full items-center justify-center px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: bmcUsername.trim() ? '#FFDD0015' : '#363a4f30' }}>
              <img src="/bmc-logo.svg" alt="Buy Me a Coffee" className="h-7 w-7" style={{ opacity: bmcUsername.trim() ? 1 : 0.3 }} />
            </div>
          </div>
          <div className="h-8 w-px bg-[rgba(202,211,245,0.06)]" />
          <div className="flex flex-1 items-center gap-3 px-4">
            <span className="text-xs text-[#494d64] min-w-[40px]" style={font}>BMC</span>
            <span className="text-xs text-[#363a4f]">buymeacoffee.com/</span>
            <input
              type="text"
              value={bmcUsername}
              onChange={(e) => handleSupportChange('bmc', e.target.value)}
              placeholder="username"
              className="flex-1 bg-transparent py-4 text-sm text-[#cad3f5] placeholder-[#363a4f] outline-none"
              style={font}
            />
          </div>
          {bmcUsername.trim() && (
            <span className="mr-4 rounded-full bg-[#a6da95]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#a6da95]">Active</span>
          )}
        </div>
      </div>

      {/* Auto-save indicator */}
      {(saving || saved) && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#494d64]" style={font}>
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
