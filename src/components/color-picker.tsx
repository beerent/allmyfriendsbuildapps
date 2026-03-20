'use client';

import {
  colorThemes,
  COLOR_THEME_KEYS,
  COLOR_STYLE_KEYS,
  type ColorTheme,
  type ColorStyle,
} from '@/lib/color-themes';

type ColorPickerProps = {
  selectedTheme: ColorTheme;
  selectedStyle: ColorStyle;
  onThemeChange: (theme: ColorTheme) => void;
  onStyleChange: (style: ColorStyle) => void;
};

const styleLabels: Record<ColorStyle, string> = {
  matched: 'Matched',
  fulltint: 'Full Tint',
};

export function ColorPicker({
  selectedTheme,
  selectedStyle,
  onThemeChange,
  onStyleChange,
}: ColorPickerProps) {
  const accent = colorThemes[selectedTheme].accent;

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm text-[#b8c0e0]">Color Theme</label>
      <div className="flex gap-2.5">
        {COLOR_THEME_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onThemeChange(key)}
            className="h-8 w-8 rounded-full transition-all"
            style={{
              backgroundColor: colorThemes[key].accent,
              border: selectedTheme === key ? '2px solid #cad3f5' : '2px solid transparent',
              boxShadow: selectedTheme === key ? '0 0 0 2px #cad3f5' : 'none',
            }}
            aria-label={`${key} theme`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {COLOR_STYLE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onStyleChange(key)}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: selectedStyle === key ? accent : '#363a4f',
              color: selectedStyle === key ? '#24273a' : '#cad3f5',
            }}
          >
            {styleLabels[key]}
          </button>
        ))}
      </div>
    </div>
  );
}
