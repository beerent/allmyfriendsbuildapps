'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { AdCard } from '@/components/ad-card';
import { SpotifyCard } from '@/components/spotify-card';

type OverlayItem = {
  id: string;
  type: 'ad' | 'spotify' | 'placeholder';
  headline: string | null;
  subtext: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  displayDuration: number;
};

export default function OverlayPage() {
  const params = useParams();
  const profileId = params.profileId as string;
  const [items, setItems] = useState<OverlayItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch items
  async function fetchItems() {
    try {
      const res = await fetch(`/api/overlay/${profileId}`);
      if (res.ok) {
        const newItems = await res.json();
        setItems((prev) => {
          // Reset index if item count changed
          if (prev.length !== newItems.length) setCurrentIndex(0);
          return newItems;
        });
      }
    } catch {
      // Silently fail — don't break OBS
    }
  }

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchItems();
    const pollInterval = setInterval(fetchItems, 30000);
    return () => clearInterval(pollInterval);
  }, [profileId]);

  // Rotation engine
  useEffect(() => {
    if (items.length === 0) return;

    const current = items[currentIndex % items.length];
    const duration = (current.displayDuration || 10) * 1000;

    timerRef.current = setTimeout(() => {
      // Fade out
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 500); // fade duration
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, items]);

  if (items.length === 0) return null;

  const current = items[currentIndex % items.length];

  // Placeholder renders nothing
  if (current.type === 'placeholder') return null;

  return (
    <div
      className="mx-auto mt-5"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      {current.type === 'ad' ? (
        <AdCard
          imageUrl={current.imageUrl}
          headline={current.headline || ''}
          subtext={current.subtext}
          brandUrl={current.brandUrl}
        />
      ) : current.type === 'spotify' ? (
        <SpotifyCard />
      ) : null}
    </div>
  );
}
