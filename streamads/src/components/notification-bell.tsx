'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';

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

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

type Notification = {
  id: string;
  type: 'follow' | 'card_added' | 'upvote';
  actorUsername: string;
  targetHeadline: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const { user, getIdToken } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll unread count on mount + every 60s
  const fetchCount = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      // ignore
    }
  }, [getIdToken]);

  useEffect(() => {
    if (!user) return;
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [user, fetchCount]);

  // Fetch full notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [getIdToken]);

  const handleBellClick = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      // ignore
    }
  };

  const handleRowClick = (n: Notification) => {
    setIsOpen(false);
    if (n.type === 'follow') {
      router.push(`/u/${n.actorUsername}`);
    } else {
      router.push('/marketplace');
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  if (!user) return null;

  function renderMessage(n: Notification) {
    if (n.type === 'follow') {
      return (
        <>
          <span className="font-semibold text-[#cad3f5]">{n.actorUsername}</span>
          <span className="text-[#b8c0e0]"> followed you</span>
        </>
      );
    }
    if (n.type === 'card_added') {
      return (
        <>
          <span className="font-semibold text-[#cad3f5]">{n.actorUsername}</span>
          <span className="text-[#b8c0e0]"> added </span>
          <span className="font-semibold text-[#cad3f5]">{n.targetHeadline}</span>
        </>
      );
    }
    // upvote
    return (
      <>
        <span className="font-semibold text-[#cad3f5]">{n.actorUsername}</span>
        <span className="text-[#b8c0e0]"> upvoted </span>
        <span className="font-semibold text-[#cad3f5]">{n.targetHeadline}</span>
      </>
    );
  }

  return (
    <div ref={containerRef} className="relative" style={font}>
      {/* Bell button */}
      <button
        onClick={handleBellClick}
        className="relative flex items-center justify-center rounded-lg p-2 text-[#b8c0e0] transition-colors hover:bg-[#363a4f] hover:text-[#cad3f5]"
        aria-label="Notifications"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ed8796] text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[rgba(202,211,245,0.06)] bg-[#24273a] shadow-2xl"
        >
          {/* Header */}
          <div className="border-b border-[rgba(202,211,245,0.06)] px-4 py-3">
            <span className="text-sm font-semibold text-[#cad3f5]">Notifications</span>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#6e738d] border-t-[#a6da95]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#6e738d]">
              No notifications yet
            </div>
          ) : (
            <>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map((n) => {
                  const [c1, c2] = hashUsername(n.actorUsername || '');
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleRowClick(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1e2030] ${
                        !n.read ? 'border-l-2 border-l-[#a6da95]' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      {/* Gradient avatar */}
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#1e2030]"
                        style={{
                          background: `linear-gradient(135deg, ${c1}, ${c2})`,
                        }}
                      >
                        {(n.actorUsername || '?')[0].toUpperCase()}
                      </div>

                      {/* Message + time */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">
                          {renderMessage(n)}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6e738d]">
                          {relativeTime(n.createdAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Mark all read */}
              <div className="border-t border-[rgba(202,211,245,0.06)] px-4 py-2.5">
                <button
                  onClick={handleMarkAllRead}
                  className="w-full rounded-lg py-1.5 text-xs font-medium text-[#a6da95] transition-colors hover:bg-[#a6da95]/10"
                >
                  Mark all read
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
