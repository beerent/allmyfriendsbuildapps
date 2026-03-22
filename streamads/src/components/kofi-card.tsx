import { OverlayCard } from './overlay-card';
import type { ColorTheme } from '@/lib/color-themes';

type KofiCardProps = {
  username?: string | null;
  status?: 'connected' | 'not-connected';
  colorTheme?: ColorTheme;
};

export function KofiCard({
  username,
  status,
  colorTheme,
}: KofiCardProps) {
  if (status === 'not-connected') {
    return (
      <OverlayCard colorTheme={colorTheme}>
        <div className="h-16 w-16 rounded-full bg-[#363a4f] flex items-center justify-center opacity-40">
          <img src="/kofi-logo.svg" alt="Ko-fi" className="h-10 w-10" />
        </div>
        <div className="flex-grow pl-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[#6e738d]">Ko-fi</h2>
            <p className="text-xs text-[#6e738d]">Not connected</p>
            <p className="text-xs text-[#494d64]">Configure in integrations</p>
          </div>
        </div>
      </OverlayCard>
    );
  }

  return (
    <OverlayCard colorTheme={colorTheme}>
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#FF5E5B] to-[#FF9472] flex items-center justify-center">
        <img src="/kofi-logo.svg" alt="Ko-fi" className="h-10 w-10" />
      </div>
      <div className="flex-grow pl-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Support on Ko-fi</h2>
          {username && <p className="text-xs text-[#b8c0e0]">ko-fi.com/{username}</p>}
        </div>
      </div>
      <img src="/kofi-logo.svg" alt="" className="ml-auto w-7 flex-shrink-0 opacity-60" />
    </OverlayCard>
  );
}
