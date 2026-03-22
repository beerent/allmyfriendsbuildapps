import { OverlayCard } from './overlay-card';
import type { ColorTheme } from '@/lib/color-themes';

type GoalCardProps = {
  title?: string;
  current?: number;
  target?: number;
  unit?: 'subs' | 'bits';
  daily?: boolean;
  status?: 'connected' | 'not-connected';
  colorTheme?: ColorTheme;
};

export function GoalCard({
  title = 'Stream Goal',
  current = 0,
  target = 100,
  unit = 'subs',
  daily = false,
  status,
  colorTheme,
}: GoalCardProps) {
  if (status === 'not-connected') {
    return (
      <OverlayCard colorTheme={colorTheme}>
        <div className="h-16 w-16 rounded-full bg-[#363a4f] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#494d64" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-4" />
          </svg>
        </div>
        <div className="flex-grow pl-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[#6e738d]">Goal Tracker</h2>
            <p className="text-xs text-[#6e738d]">Not configured</p>
            <p className="text-xs text-[#494d64]">Set up in integrations</p>
          </div>
        </div>
      </OverlayCard>
    );
  }

  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isBits = unit === 'bits';
  const accentColor = isBits ? '#c6a0f6' : '#a6da95';
  const gradientFrom = isBits ? '#c6a0f6' : '#a6da95';
  const gradientTo = isBits ? '#f5bde6' : '#8bd5ca';
  const formattedCurrent = isBits ? current.toLocaleString() : current;
  const formattedTarget = isBits ? target.toLocaleString() : target;

  return (
    <OverlayCard colorTheme={colorTheme}>
      <div
        className="h-16 w-16 rounded-full flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
      >
        {isBits ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#181926" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#181926" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        )}
      </div>
      <div className="flex-grow pl-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{title}</h2>
            {daily && (
              <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                Daily
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-[rgba(255,255,255,0.1)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
                boxShadow: `0 0 8px ${accentColor}60`,
              }}
            />
          </div>
          <p className="text-xs text-[#b8c0e0]">
            <span className="font-semibold" style={{ color: accentColor }}>{formattedCurrent}</span>
            <span className="text-[#6e738d]"> / {formattedTarget} {unit}</span>
            {progress >= 100 && <span className="ml-1.5" style={{ color: accentColor }}>Complete!</span>}
          </p>
        </div>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ml-auto w-6 flex-shrink-0 opacity-60">
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-4" />
      </svg>
    </OverlayCard>
  );
}
