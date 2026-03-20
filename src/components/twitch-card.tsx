import { OverlayCard } from './overlay-card';
import type { ColorTheme } from '@/lib/color-themes';

type TwitchCardProps = {
  label?: string;
  username?: string;
  avatarUrl?: string;
  status?: 'connected' | 'not-connected';
  colorTheme?: ColorTheme;
};

export function TwitchCard({
  label = 'Latest Follower',
  username,
  avatarUrl,
  status,
  colorTheme,
}: TwitchCardProps) {
  if (status === 'not-connected') {
    return (
      <OverlayCard colorTheme={colorTheme}>
        <div className="h-16 w-16 rounded-full bg-[#363a4f]" />
        <div className="flex-grow pl-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[#6e738d]">Twitch</h2>
            <p className="text-xs text-[#6e738d]">Not connected</p>
            <p className="text-xs text-[#494d64]">Configure in dashboard</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#494d64" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ml-auto w-7 flex-shrink-0">
          <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
        </svg>
      </OverlayCard>
    );
  }

  return (
    <OverlayCard colorTheme={colorTheme}>
      {avatarUrl ? (
        <img src={avatarUrl} width={64} height={64} alt="User avatar" className="h-16 w-16 rounded-full object-cover" />
      ) : (
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#9146FF] to-[#772CE8] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
            <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
          </svg>
        </div>
      )}
      <div className="flex-grow pl-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">{label}</h2>
          {username ? (
            <p className="text-xs text-[#cad3f5]">{username}</p>
          ) : (
            <p className="text-xs text-[#6e738d]">None yet</p>
          )}
        </div>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9146FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ml-auto w-7 flex-shrink-0">
        <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
      </svg>
    </OverlayCard>
  );
}
