'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Logo } from '@/components/logo';

const font = { fontFamily: 'var(--font-family-display)' };

const GRADIENT_COLORS = ['#f5bde6', '#c6a0f6', '#7dc4e4', '#a6da95', '#f5a97f', '#ed8796', '#8bd5ca'];

function hashUsername(username: string): [string, string] {
  let h = 0;
  for (let i = 0; i < username.length; i++) {
    h = (h * 31 + username.charCodeAt(i)) | 0;
  }
  const i1 = Math.abs(h) % GRADIENT_COLORS.length;
  const i2 = Math.abs(h * 7 + 3) % GRADIENT_COLORS.length;
  return [GRADIENT_COLORS[i1], GRADIENT_COLORS[i2 === i1 ? (i2 + 1) % GRADIENT_COLORS.length : i2]];
}

const PLATFORM_COLORS: Record<string, string> = {
  twitch: '#9146FF',
  youtube: '#FF0000',
  kick: '#53FC18',
  x: '#cad3f5',
  tiktok: '#ff0050',
  username: '#a6da95',
};

function PlatformIcon({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform] || '#6e738d';

  if (platform === 'username') {
    return <Logo className="h-3.5 w-3.5" />;
  }

  if (platform === 'twitch') {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
      </svg>
    );
  }

  if (platform === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
      </svg>
    );
  }

  if (platform === 'kick') {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={color}>
        <path d="M3 3h6v6h3V6h3V3h6v6h-3v3h-3v3h3v3h3v6h-6v-3h-3v-3H9v6H3v-6h3v-3h3v-3H6V9H3V3z" />
      </svg>
    );
  }

  if (platform === 'x') {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={color}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  if (platform === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={color}>
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.51a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.18 8.18 0 004.76 1.52V7.05a4.84 4.84 0 01-1-.36z" />
      </svg>
    );
  }

  return null;
}

type SearchResult = {
  id: string;
  username: string;
  displayName: string;
  matchedPlatforms: string[];
  isFollowing: boolean;
};

export function SearchDropdown() {
  const { user, getIdToken } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch current user's username on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const token = await getIdToken();
      if (!token || cancelled) return;
      try {
        const res = await fetch('/api/username', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setMyUsername(data.username);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [user, getIdToken]);

  const searchUsers = useCallback(async (q: string) => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const url = q.length >= 2 ? `/api/search?q=${encodeURIComponent(q)}` : '/api/search';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setIsOpen(true);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [getIdToken]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      searchUsers(val.trim());
    }, val.trim().length >= 2 ? 400 : 0);
  };

  const handleFocus = () => {
    if (results.length > 0) {
      setIsOpen(true);
    } else {
      searchUsers('');
    }
  };

  const handleFollow = async (resultId: string) => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: resultId }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults((prev) =>
          prev.map((r) =>
            r.id === resultId ? { ...r, isFollowing: data.following } : r,
          ),
        );
      }
    } catch {
      // ignore
    }
  };

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [close]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative" style={font}>
      {/* Search input */}
      <div className="flex items-center gap-2 rounded-lg border border-[rgba(202,211,245,0.06)] bg-[#1e2030] px-3 py-1.5 transition-colors focus-within:border-[#494d64]">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 flex-shrink-0 text-[#6e738d]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="Search users..."
          className="w-40 bg-transparent text-sm text-[#cad3f5] placeholder-[#6e738d] outline-none"
        />
        {isLoading && (
          <div className="h-3 w-3 animate-spin rounded-full border border-[#6e738d] border-t-[#a6da95]" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[rgba(202,211,245,0.06)] bg-[#24273a] shadow-2xl shadow-black/40"
          style={{ backdropFilter: 'blur(16px)' }}
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[#6e738d]">
              No results
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {results.map((result) => {
                const [c1, c2] = hashUsername(result.username || '');
                const isSelf = myUsername && result.username === myUsername;
                return (
                  <div
                    key={result.id}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[#1e2030]"
                  >
                    {/* Avatar */}
                    <button
                      onClick={() => {
                        router.push(`/u/${result.username}`);
                        close();
                        setQuery('');
                      }}
                      className="flex flex-shrink-0 items-center justify-center"
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-[#1e2030]"
                        style={{
                          background: `linear-gradient(135deg, ${c1}, ${c2})`,
                        }}
                      >
                        {(result.username || '?')[0].toUpperCase()}
                      </div>
                    </button>

                    {/* Name + platforms */}
                    <button
                      onClick={() => {
                        router.push(`/u/${result.username}`);
                        close();
                        setQuery('');
                      }}
                      className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="truncate text-sm font-semibold text-[#cad3f5]">
                          {result.username || result.displayName}
                        </span>
                        {result.displayName && result.displayName !== result.username && !result.displayName.includes('@') && (
                          <span className="truncate text-xs text-[#6e738d]">
                            {result.displayName}
                          </span>
                        )}
                      </div>
                      {result.matchedPlatforms.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {result.matchedPlatforms.map((p) => (
                            <PlatformIcon key={p} platform={p} />
                          ))}
                        </div>
                      )}
                    </button>

                    {/* Follow button */}
                    {!isSelf && (
                      <button
                        onClick={() => handleFollow(result.id)}
                        className={`flex-shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          result.isFollowing
                            ? 'border border-[#363a4f] text-[#6e738d] hover:border-[#ed8796] hover:text-[#ed8796]'
                            : 'bg-[#a6da95]/15 text-[#a6da95] hover:bg-[#a6da95]/25'
                        }`}
                      >
                        {result.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
