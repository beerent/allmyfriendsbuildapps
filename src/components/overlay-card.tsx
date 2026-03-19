import type { ReactNode } from 'react';

export function OverlayCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[120px] w-80 items-center rounded-md bg-[#24273a] p-2 text-[#cad3f5] shadow-lg">
      {children}
    </div>
  );
}
