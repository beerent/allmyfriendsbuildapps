'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { AdCard } from '@/components/ad-card';
import { CustomCard } from '@/components/custom-card';
import { SpotifyCard } from '@/components/spotify-card';
import { TwitchCard } from '@/components/twitch-card';
import { KofiCard } from '@/components/kofi-card';
import { BmcCard } from '@/components/bmc-card';
import { GoalCard } from '@/components/goal-card';
import { CountdownCard } from '@/components/countdown-card';
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';

type OverlayItem = {
  id: string;
  type: 'ad' | 'card' | 'spotify' | 'placeholder' | 'twitch' | 'kofi' | 'buymeacoffee';
  headline: string | null;
  subtext: string | null;
  subtext2: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  displayDuration: number;
  colorTheme: string;
  colorStyle: string;
  ownerId?: string | null;
  ownerKofi?: string | null;
  ownerBmc?: string | null;
  twitchUsername?: string | null;
  twitchAvatarUrl?: string | null;
  goalTitle?: string | null;
  goalCurrent?: number;
  goalTarget?: number;
  goalUnit?: 'subs' | 'bits';
  goalDaily?: boolean;
  countdownLabel?: string | null;
  countdownEndDate?: string | null;
  config?: unknown;
};

export default function OverlayPage() {
  const params = useParams();
  const profileId = params.profileId as string;
  const [items, setItems] = useState<OverlayItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [spotifyData, setSpotifyData] = useState<{ playing: boolean; trackName?: string; artistName?: string; albumArtUrl?: string | null }>({ playing: false });
  const [queueData, setQueueData] = useState<{ hasNext: boolean; trackName?: string; artistName?: string; albumArtUrl?: string | null }>({ hasNext: false });

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

  // Poll Spotify now-playing and queue
  useEffect(() => {
    const spotifyItem = items.find((i) => i.type === 'spotify');
    if (!spotifyItem?.ownerId) return;

    const ownerId = spotifyItem.ownerId;
    const hasQueueCard = items.some((i) => i.type === 'spotify' && i.headline?.toLowerCase().includes('next'));

    async function fetchSpotify() {
      try {
        const [npRes, qRes] = await Promise.all([
          fetch(`/api/spotify/now-playing?userId=${ownerId}`),
          hasQueueCard ? fetch(`/api/spotify/queue?userId=${ownerId}`) : Promise.resolve(null),
        ]);
        if (npRes.ok) setSpotifyData(await npRes.json());
        if (qRes?.ok) setQueueData(await qRes.json());
      } catch { /* silent */ }
    }

    fetchSpotify();
    const interval = setInterval(fetchSpotify, 10000);
    return () => clearInterval(interval);
  }, [items]);

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
        current.headline?.toLowerCase().includes('next') ? (
          <SpotifyCard
            label="Next Up"
            trackName={queueData.hasNext ? queueData.trackName : 'Nothing queued'}
            artistName={queueData.hasNext ? queueData.artistName : ''}
            albumArtUrl={queueData.hasNext ? queueData.albumArtUrl || undefined : undefined}
          />
        ) : (
          <SpotifyCard
            label={spotifyData.playing ? 'Now Playing' : current.headline || 'Now Playing'}
            trackName={spotifyData.playing ? spotifyData.trackName : 'Not Playing'}
            artistName={spotifyData.playing ? spotifyData.artistName : ''}
            albumArtUrl={spotifyData.playing ? spotifyData.albumArtUrl || undefined : undefined}
          />
        )
      ) : current.type === 'twitch' ? (
        <TwitchCard
          label={current.headline || undefined}
          username={current.twitchUsername || undefined}
          avatarUrl={current.twitchAvatarUrl || undefined}
          colorTheme={current.colorTheme as ColorTheme}
        />
      ) : current.type === 'kofi' ? (
        <KofiCard username={current.ownerKofi} colorTheme={current.colorTheme as ColorTheme} />
      ) : current.type === 'buymeacoffee' ? (
        <BmcCard username={current.ownerBmc} colorTheme={current.colorTheme as ColorTheme} />
      ) : current.type === 'goal' ? (
        <GoalCard
          title={current.goalTitle || undefined}
          current={current.goalCurrent}
          target={current.goalTarget}
          unit={current.goalUnit}
          daily={current.goalDaily}
          colorTheme={current.colorTheme as ColorTheme}
        />
      ) : current.type === 'countdown' ? (
        <CountdownCard
          label={current.countdownLabel || undefined}
          endDate={current.countdownEndDate}
          colorTheme={current.colorTheme as ColorTheme}
        />
      ) : null}
    </div>
  );
}
