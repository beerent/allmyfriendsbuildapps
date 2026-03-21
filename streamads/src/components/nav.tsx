'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';

export function Nav() {
  const { user, loading, signOut } = useAuth();

  if (!user) return null;

  return (
    <nav className="flex items-center justify-between border-b border-[#363a4f] bg-[#1e2030] px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <svg viewBox="0 0 32 32" className="h-6 w-6">
            <rect x="8" y="12" width="16" height="10" rx="2" fill="#363a4f" transform="rotate(-6 16 16)"/>
            <rect x="8" y="12" width="16" height="10" rx="2" fill="#494d64" transform="rotate(-3 16 16)"/>
            <rect x="8" y="12" width="16" height="10" rx="2" fill="#a6da95" transform="rotate(0 16 16)"/>
            <circle cx="12" cy="17" r="2" fill="#1e2030"/>
          </svg>
          <span className="text-[#cad3f5]">thosewho<span className="text-[#a6da95]">.build</span></span>
        </Link>
        {user && (
          <>
            <Link href="/dashboard" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
              Dashboard
            </Link>
            <Link href="/marketplace" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
              Marketplace
            </Link>
            <Link href="/create/ad" className="rounded-md bg-[#a6da95] px-3 py-1 text-sm font-medium text-[#1e2030] hover:bg-[#8bd5ca]">
              + Create Ad
            </Link>
          </>
        )}
      </div>
      <div>
        {!loading && user && (
          <button
            onClick={signOut}
            className="rounded-md bg-[#363a4f] px-4 py-2 text-sm text-[#cad3f5] hover:bg-[#494d64]"
          >
            Sign Out
          </button>
        )}
      </div>
    </nav>
  );
}
