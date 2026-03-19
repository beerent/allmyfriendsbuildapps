import { OverlayCard } from './overlay-card';

type SpotifyCardProps = {
  trackName?: string;
  artistName?: string;
  albumArtUrl?: string;
  requester?: string;
};

export function SpotifyCard({
  trackName = 'Not Playing',
  artistName = '',
  albumArtUrl,
  requester,
}: SpotifyCardProps) {
  return (
    <OverlayCard>
      {albumArtUrl ? (
        <img
          src={albumArtUrl}
          width={64}
          height={64}
          alt="Album Art"
          className="animate-spin-slow rounded-full"
        />
      ) : (
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#f5bde6] to-[#c6a0f6]" />
      )}
      <div className="flex-grow pl-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Now Playing</h2>
          <p className="text-xs">{trackName}</p>
          {artistName && <p className="text-xs text-[#b8c0e0]">{artistName}</p>}
          {requester && (
            <p className="text-xs text-[#b8c0e0]">Requested by @{requester}</p>
          )}
        </div>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f5bde6"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-auto w-7 flex-shrink-0"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </OverlayCard>
  );
}
