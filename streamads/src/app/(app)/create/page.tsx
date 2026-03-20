'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function CreateIndex() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Create</h1>
      <div className="grid grid-cols-2 gap-6">
        <Link
          href="/create/ad"
          className="flex flex-col gap-2 rounded-md bg-[#1e2030] p-6 hover:bg-[#363a4f]"
        >
          <h2 className="text-lg font-semibold text-[#cad3f5]">Create Ad</h2>
          <p className="text-sm text-[#b8c0e0]">
            Promote a brand with a logo, headline, subtext, and URL.
          </p>
        </Link>
        <Link
          href="/create/card"
          className="flex flex-col gap-2 rounded-md bg-[#1e2030] p-6 hover:bg-[#363a4f]"
        >
          <h2 className="text-lg font-semibold text-[#cad3f5]">Create Card</h2>
          <p className="text-sm text-[#b8c0e0]">
            Share a custom card with a photo, headline, and text.
          </p>
        </Link>
      </div>
    </div>
  );
}
