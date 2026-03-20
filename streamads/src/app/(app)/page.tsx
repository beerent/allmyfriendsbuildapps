'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-6 pt-24">
      <h1 className="text-4xl font-bold">StreamAds</h1>
      <p className="text-lg text-[#b8c0e0]">
        Run ads on your friends&apos; streams with OBS browser sources
      </p>
      <button
        onClick={signInWithGoogle}
        className="rounded-md bg-[#f5bde6] px-6 py-3 text-lg font-medium text-[#24273a] hover:bg-[#c6a0f6]"
      >
        Get Started with Google
      </button>
    </div>
  );
}
