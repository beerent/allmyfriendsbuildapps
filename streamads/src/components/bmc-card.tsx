import { OverlayCard } from './overlay-card';
import type { ColorTheme } from '@/lib/color-themes';

type BmcCardProps = {
  username?: string | null;
  status?: 'connected' | 'not-connected';
  colorTheme?: ColorTheme;
};

export function BmcCard({
  username,
  status,
  colorTheme,
}: BmcCardProps) {
  if (status === 'not-connected') {
    return (
      <OverlayCard colorTheme={colorTheme}>
        <img src="/bmc-logo.svg" alt="Buy Me a Coffee" className="h-16 w-16 opacity-40 grayscale" />
        <div className="flex-grow pl-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[#6e738d]">Buy Me a Coffee</h2>
            <p className="text-xs text-[#6e738d]">Not connected</p>
            <p className="text-xs text-[#494d64]">Configure in integrations</p>
          </div>
        </div>
      </OverlayCard>
    );
  }

  return (
    <OverlayCard colorTheme={colorTheme}>
      <img src="/bmc-logo.svg" alt="Buy Me a Coffee" className="h-16 w-16" />
      <div className="flex-grow pl-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Buy Me a Coffee</h2>
          {username && <p className="text-xs text-[#b8c0e0]">buymeacoffee.com/{username}</p>}
        </div>
      </div>
      <img src="/bmc-logo.svg" alt="" className="ml-auto w-7 flex-shrink-0 opacity-60" />
    </OverlayCard>
  );
}
