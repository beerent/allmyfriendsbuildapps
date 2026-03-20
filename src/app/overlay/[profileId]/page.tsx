'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { AdCard } from '@/components/ad-card';
import { SpotifyCard } from '@/components/spotify-card';
import { TwitchCard } from '@/components/twitch-card';

type OverlayItem = {
  id: string;
  type: 'ad' | 'spotify' | 'placeholder' | 'twitch';
  variant: string | null;
  headline: string | null;
  subtext: string | null;
  brandUrl: string | null;
  imageUrl: string | null;
  displayDuration: number;
};

type OverlayData = {
  ownerId: string | null;
  items: OverlayItem[];
};

type SpotifyData = {
  connected: boolean;
  playing?: boolean;
  track?: { name: string; artist: string; albumArtUrl: string | null };
};

type TwitchData = {
  connected: boolean;
  hasData?: boolean;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
};

type IntegrationData = {
  spotify: SpotifyData | null;
  twitch: TwitchData | null;
};

export default function OverlayPage() {
  const params = useParams();
  const profileId = params.profileId as string;
  const [data, setData] = useState<OverlayData>({ ownerId: null, items: [] });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [integrationData, setIntegrationData] = useState<IntegrationData>({ spotify: null, twitch: null });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchItems() {
    try {
      const res = await fetch(`/api/overlay/${profileId}`);
      if (res.ok) {
        const newData: OverlayData = await res.json();
        setData((prev) => {
          if (prev.items.length !== newData.items.length) setCurrentIndex(0);
          return newData;
        });
      }
    } catch {}
  }

  useEffect(() => {
    fetchItems();
    const pollInterval = setInterval(fetchItems, 30000);
    return () => clearInterval(pollInterval);
  }, [profileId]);

  // Fetch integration data when a spotify/twitch item is current
  useEffect(() => {
    if (data.items.length === 0 || !data.ownerId) return;
    const current = data.items[currentIndex % data.items.length];

    if (current.type === 'spotify') {
      const endpoint = current.variant === 'next-up'
        ? `/api/spotify/queue/${data.ownerId}`
        : `/api/spotify/now-playing/${data.ownerId}`;

      fetch(endpoint)
        .then((res) => res.ok ? res.json() : { connected: false })
        .then((d) => setIntegrationData((prev) => ({ ...prev, spotify: d })))
        .catch(() => setIntegrationData((prev) => ({ ...prev, spotify: { connected: false } })));
    } else if (current.type === 'twitch') {
      const endpoint = current.variant === 'latest-sub'
        ? `/api/twitch/latest-sub/${data.ownerId}`
        : `/api/twitch/latest-follower/${data.ownerId}`;

      fetch(endpoint)
        .then((res) => res.ok ? res.json() : { connected: false })
        .then((d) => setIntegrationData((prev) => ({ ...prev, twitch: d })))
        .catch(() => setIntegrationData((prev) => ({ ...prev, twitch: { connected: false } })));
    } else {
      setIntegrationData({ spotify: null, twitch: null });
    }
  }, [currentIndex, data.ownerId, data.items]);

  // Rotation engine
  useEffect(() => {
    if (data.items.length === 0) return;
    const current = data.items[currentIndex % data.items.length];
    const duration = (current.displayDuration || 10) * 1000;

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        // Clear stale integration data before advancing
        setIntegrationData({ spotify: null, twitch: null });
        setCurrentIndex((i) => (i + 1) % data.items.length);
        setVisible(true);
      }, 500);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, data.items]);

  if (data.items.length === 0) return null;

  const current = data.items[currentIndex % data.items.length];

  if (current.type === 'placeholder') return null;
  if (current.type === 'spotify' && integrationData.spotify?.connected && !integrationData.spotify?.playing) return null;
  if (current.type === 'twitch' && integrationData.twitch?.connected && !integrationData.twitch?.hasData) return null;

  const spotifyLabel = current.variant === 'next-up' ? 'Next Up' : 'Now Playing';
  const twitchLabel = current.variant === 'latest-sub' ? 'Latest Sub' : 'Latest Follower';

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
        integrationData.spotify?.connected === false ? (
          <SpotifyCard status="not-connected" />
        ) : integrationData.spotify?.playing && integrationData.spotify.track ? (
          <SpotifyCard
            label={spotifyLabel}
            trackName={integrationData.spotify.track.name}
            artistName={integrationData.spotify.track.artist}
            albumArtUrl={integrationData.spotify.track.albumArtUrl ?? undefined}
          />
        ) : null
      ) : current.type === 'twitch' ? (
        integrationData.twitch?.connected === false ? (
          <TwitchCard status="not-connected" />
        ) : integrationData.twitch?.hasData ? (
          <TwitchCard
            label={twitchLabel}
            username={integrationData.twitch.displayName}
            avatarUrl={integrationData.twitch.avatarUrl ?? undefined}
          />
        ) : null
      ) : null}
    </div>
  );
}
