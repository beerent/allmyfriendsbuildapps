'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { AdCard } from '@/components/ad-card';
import { CustomCard } from '@/components/custom-card';
import { SpotifyCard } from '@/components/spotify-card';
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';

type OverlayItem = {
  id: string;
  type: 'ad' | 'card' | 'spotify' | 'placeholder' | 'twitch';
  headline: string | null;
  subtext: string | null;
  subtext2: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  displayDuration: number;
  colorTheme: string;
  colorStyle: string;
};

export default function OverlayPage() {
  const params = useParams();
  const profileId = params.profileId as string;
  const [items, setItems] = useState<OverlayItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchItems() {
    try {
      const res = await fetch(`/api/overlay/${profileId}`);
      if (res.ok) {
        const newItems = await res.json();
        setItems((prev) => {
          if (prev.length !== newItems.length) setCurrentIndex(0);
          return newItems;
        });
      }
    } catch {
      // Silently fail — don't break OBS
    }
  }

  useEffect(() => {
    fetchItems();
    const pollInterval = setInterval(fetchItems, 30000);
    return () => clearInterval(pollInterval);
  }, [profileId]);

  useEffect(() => {
    if (items.length === 0) return;

    const current = items[currentIndex % items.length];
    const duration = (current.displayDuration || 10) * 1000;

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 500);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, items]);

  if (items.length === 0) return null;

  const current = items[currentIndex % items.length];

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
          colorTheme={current.colorTheme as ColorTheme}
          colorStyle={current.colorStyle as ColorStyle}
        />
      ) : current.type === 'card' ? (
        <CustomCard
          imageUrl={current.imageUrl}
          headline={current.headline || ''}
          subtext={current.subtext}
          subtext2={current.subtext2}
          colorTheme={current.colorTheme as ColorTheme}
          colorStyle={current.colorStyle as ColorStyle}
        />
      ) : current.type === 'spotify' ? (
        <SpotifyCard />
      ) : null}
    </div>
  );
}
