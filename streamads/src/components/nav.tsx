'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { SearchDropdown } from './search-dropdown';
import { NotificationBell } from './notification-bell';
import { ProBadge } from './pro-badge';
import { Logo } from '@/components/logo';

const font = { fontFamily: 'var(--font-family-display)' };

export function Nav() {
  const { user, loading, signOut, getIdToken } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [plan, setPlan] = useState('free');

  useEffect(() => {
    async function fetchUsername() {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/username', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.username) setUsername(data.username);
        setPlan(data.plan || 'free');
      }
    }
    if (user) fetchUsername();
  }, [user, getIdToken]);

  if (!user) return null;

  return (
    <nav className="flex items-center justify-between border-b border-[#363a4f] bg-[#1e2030] px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold">
          <Logo className="h-8 w-8" />
          <span className="text-[#cad3f5]" style={font}>thosewho<span className="text-[#a6da95]">.stream</span></span>
        </Link>
        {user && (
          <>
            <Link href="/dashboard" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]" style={font}>
              Dashboard
            </Link>
            <Link href="/marketplace" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]" style={font}>
              Marketplace
            </Link>
            <Link href="/create/ad" className="rounded-xl bg-gradient-to-r from-[#a6da95] to-[#8bd5ca] px-3 py-1 text-sm font-medium text-[#1e2030]" style={font}>
              + Create Card
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <SearchDropdown />
        <NotificationBell />
        {username ? (
          <Link
            href={`/u/${username}`}
            className="flex items-center gap-1.5 rounded-xl bg-[#363a4f] px-3 py-2 text-sm text-[#cad3f5] hover:bg-[#494d64]"
            style={font}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {username}
            {plan === 'pro' && <ProBadge size="sm" />}
          </Link>
        ) : (
          <Link
            href="/settings"
            className="flex items-center gap-1.5 rounded-xl bg-[#363a4f] px-3 py-2 text-sm text-[#cad3f5] hover:bg-[#494d64]"
            style={font}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </Link>
        )}
        {!loading && user && (
          <button
            onClick={signOut}
            className="rounded-xl bg-[#363a4f] px-4 py-2 text-sm text-[#cad3f5] hover:bg-[#494d64]"
            style={font}
          >
            Sign Out
          </button>
        )}
      </div>
    </nav>
  );
}
