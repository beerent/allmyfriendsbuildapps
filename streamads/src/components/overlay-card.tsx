import type { ReactNode } from 'react';
import { colorThemes, type ColorTheme } from '@/lib/color-themes';

type OverlayCardProps = {
  children: ReactNode;
  colorTheme?: ColorTheme;
};

export function OverlayCard({ children, colorTheme = 'blue' }: OverlayCardProps) {
  const theme = colorThemes[colorTheme];
  return (
    <div
      className="flex h-[120px] w-80 items-center rounded-md p-2 text-[#cad3f5] shadow-lg"
      style={{ backgroundColor: theme.bg }}
    >
      {children}
    </div>
  );
}
