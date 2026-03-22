'use client';

import { useEffect, useState } from 'react';
import { OverlayCard } from './overlay-card';
import type { ColorTheme } from '@/lib/color-themes';

type CountdownCardProps = {
  label?: string;
  endDate?: string | null;
  status?: 'connected' | 'not-connected';
  colorTheme?: ColorTheme;
};

function formatTimeLeft(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  const hours = Math.floor((ms / 1000 / 60 / 60) % 24);
  const days = Math.floor(ms / 1000 / 60 / 60 / 24);
  return { days, hours, minutes, seconds };
}

export function CountdownCard({
  label = 'Countdown',
  endDate,
  status,
  colorTheme,
}: CountdownCardProps) {
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof formatTimeLeft> | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!endDate) return;
    const target = new Date(endDate).getTime();

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setComplete(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft(formatTimeLeft(diff));
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (status === 'not-connected') {
    return (
      <OverlayCard colorTheme={colorTheme}>
        <div className="h-16 w-16 rounded-full bg-[#363a4f] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#494d64" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div className="flex-grow pl-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[#6e738d]">Countdown</h2>
            <p className="text-xs text-[#6e738d]">Not configured</p>
          </div>
        </div>
      </OverlayCard>
    );
  }

  return (
    <OverlayCard colorTheme={colorTheme}>
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#f5a97f] to-[#ed8796] flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#181926" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <div className="flex-grow pl-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold">{label}</h2>
          {complete ? (
            <p className="text-sm font-bold text-[#a6da95]">Now!</p>
          ) : timeLeft ? (
            <div className="flex gap-2">
              {timeLeft.days > 0 && (
                <span className="text-xs">
                  <span className="font-bold text-[#f5a97f]">{timeLeft.days}</span>
                  <span className="text-[#6e738d]">d</span>
                </span>
              )}
              <span className="text-xs">
                <span className="font-bold text-[#f5a97f]">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-[#6e738d]">h</span>
              </span>
              <span className="text-xs">
                <span className="font-bold text-[#f5a97f]">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-[#6e738d]">m</span>
              </span>
              <span className="text-xs">
                <span className="font-bold text-[#f5a97f]">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="text-[#6e738d]">s</span>
              </span>
            </div>
          ) : (
            <p className="text-xs text-[#6e738d]">No date set</p>
          )}
        </div>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f5a97f" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="ml-auto w-6 flex-shrink-0 opacity-60">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    </OverlayCard>
  );
}
