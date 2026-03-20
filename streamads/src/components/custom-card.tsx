import { OverlayCard } from './overlay-card';
import { colorThemes, type ColorTheme, type ColorStyle } from '@/lib/color-themes';

type CustomCardProps = {
  imageUrl: string | null;
  headline: string;
  subtext: string | null;
  subtext2: string | null;
  colorTheme?: ColorTheme;
  colorStyle?: ColorStyle;
};

export function CustomCard({
  imageUrl,
  headline,
  subtext,
  subtext2,
  colorTheme = 'blue',
  colorStyle = 'matched',
}: CustomCardProps) {
  const theme = colorThemes[colorTheme];
  const secondaryColor = colorStyle === 'fulltint' ? theme.accent : '#b8c0e0';

  return (
    <OverlayCard colorTheme={colorTheme}>
      {imageUrl ? (
        <img
          src={imageUrl}
          width={64}
          height={64}
          alt="Card image"
          className="rounded-md object-cover"
          style={{ aspectRatio: '1 / 1' }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            img.parentElement?.insertAdjacentHTML(
              'afterbegin',
              `<div class="h-16 w-16 rounded-md flex items-center justify-center" style="background:${theme.surface}"><span class="text-[#6e738d] text-xs">IMG</span></div>`
            );
          }}
        />
      ) : (
        <div
          className="h-16 w-16 rounded-md"
          style={{ backgroundColor: theme.surface }}
        />
      )}
      <div className="flex-grow pl-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">{headline}</h2>
          {subtext && (
            <p className="text-xs" style={{ color: secondaryColor }}>{subtext}</p>
          )}
          {subtext2 && (
            <p className="text-xs" style={{ color: secondaryColor }}>{subtext2}</p>
          )}
        </div>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke={theme.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-auto w-7 flex-shrink-0"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
      </svg>
    </OverlayCard>
  );
}
