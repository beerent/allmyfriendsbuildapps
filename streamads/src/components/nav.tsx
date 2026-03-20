'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';

export function Nav() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <nav className="flex items-center justify-between border-b border-[#363a4f] bg-[#1e2030] px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold text-[#cad3f5]">
          StreamAds
        </Link>
        {user && (
          <>
            <Link href="/dashboard" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
              Dashboard
            </Link>
            <Link href="/marketplace" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
              Marketplace
            </Link>
            <Link href="/create/ad" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
              Create Ad
            </Link>
            <Link href="/create/card" className="text-sm text-[#b8c0e0] hover:text-[#cad3f5]">
              Create Card
            </Link>
          </>
        )}
      </div>
      <div>
        {loading ? null : user ? (
          <button
            onClick={signOut}
            className="rounded-md bg-[#363a4f] px-4 py-2 text-sm text-[#cad3f5] hover:bg-[#494d64]"
          >
            Sign Out
          </button>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="rounded-md bg-[#f5bde6] px-4 py-2 text-sm font-medium text-[#24273a] hover:bg-[#c6a0f6]"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
