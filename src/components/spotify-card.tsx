import { OverlayCard } from './overlay-card';
import type { ColorTheme } from '@/lib/color-themes';

type SpotifyCardProps = {
  label?: string;
  trackName?: string;
  artistName?: string;
  albumArtUrl?: string;
  requester?: string;
  status?: 'playing' | 'not-connected';
  colorTheme?: ColorTheme;
};

export function SpotifyCard({
  label = 'Now Playing',
  trackName = 'Not Playing',
  artistName = '',
  albumArtUrl,
  requester,
  status,
  colorTheme,
}: SpotifyCardProps) {
  if (status === 'not-connected') {
    return (
      <OverlayCard colorTheme={colorTheme}>
        <div className="h-16 w-16 rounded-full bg-[#363a4f]" />
        <div className="flex-grow pl-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[#6e738d]">Spotify</h2>
            <p className="text-xs text-[#6e738d]">Not connected</p>
            <p className="text-xs text-[#494d64]">Configure in dashboard</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#494d64" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ml-auto w-7 flex-shrink-0">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </OverlayCard>
    );
  }

  return (
    <OverlayCard colorTheme={colorTheme}>
      {albumArtUrl ? (
        <img src={albumArtUrl} width={64} height={64} alt="Album Art" className="animate-spin-slow rounded-full" />
      ) : (
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#f5bde6] to-[#c6a0f6]" />
      )}
      <div className="flex-grow pl-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">{label}</h2>
          <p className="text-xs">{trackName}</p>
          {artistName && <p className="text-xs text-[#b8c0e0]">{artistName}</p>}
          {requester && <p className="text-xs text-[#b8c0e0]">Requested by @{requester}</p>}
        </div>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f5bde6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ml-auto w-7 flex-shrink-0">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </OverlayCard>
  );
}
