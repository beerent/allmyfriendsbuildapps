'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Login() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
      router.refresh();
    }
  }, [user, loading, router]);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim());
    }
    setSubmitting(false);
  }

  if (loading || user) return null;

  const font = { fontFamily: 'var(--font-family-display)' };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center">
      <Link href="/" className="mb-8 flex items-center gap-3 text-2xl font-extrabold" style={font}>
        <svg viewBox="0 0 32 32" className="h-8 w-8">
          <rect x="8" y="12" width="16" height="10" rx="2" fill="#363a4f" transform="rotate(-6 16 16)"/>
          <rect x="8" y="12" width="16" height="10" rx="2" fill="#494d64" transform="rotate(-3 16 16)"/>
          <rect x="8" y="12" width="16" height="10" rx="2" fill="#a6da95" transform="rotate(0 16 16)"/>
          <circle cx="12" cy="17" r="2" fill="#1e2030"/>
        </svg>
        <span className="text-[#cad3f5]">thosewho<span className="text-[#a6da95]">.build</span></span>
      </Link>

      <div className="glass w-full max-w-sm rounded-2xl p-7">
        <h2 className="mb-6 text-center text-lg font-semibold" style={font}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h2>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="rounded-lg border border-[rgba(202,211,245,0.05)] bg-[rgba(24,25,38,0.7)] px-4 py-3 text-sm text-[#cad3f5] placeholder-[#494d64] outline-none transition-all focus:border-[#a6da95] focus:ring-1 focus:ring-[#a6da95]"
            style={font}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="rounded-lg border border-[rgba(202,211,245,0.05)] bg-[rgba(24,25,38,0.7)] px-4 py-3 text-sm text-[#cad3f5] placeholder-[#494d64] outline-none transition-all focus:border-[#a6da95] focus:ring-1 focus:ring-[#a6da95]"
            style={font}
          />
          {error && <p className="text-sm text-[#ed8796]">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-lg bg-gradient-to-r from-[#a6da95] to-[#8bd5ca] px-6 py-3 text-sm font-semibold text-[#181926] transition-all hover:shadow-[0_0_20px_rgba(166,218,149,0.25)] disabled:opacity-50"
            style={font}
          >
            {submitting ? '...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="text-xs text-[#494d64] transition-colors hover:text-[#b8c0e0]"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-grow bg-[rgba(202,211,245,0.04)]" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#3e4055]">or</span>
          <div className="h-px flex-grow bg-[rgba(202,211,245,0.04)]" />
        </div>

        <button
          onClick={signInWithGoogle}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[rgba(202,211,245,0.05)] bg-[rgba(24,25,38,0.5)] px-6 py-3 text-sm font-medium text-[#b8c0e0] transition-all hover:border-[rgba(202,211,245,0.1)] hover:text-[#cad3f5]"
          style={font}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <p className="mt-6 text-center text-[10px] text-[#494d64]">
        Free to use. No credit card required.
      </p>
    </div>
  );
}
