import { describe, it, expect } from 'vitest';
import {
  colorThemes,
  COLOR_THEME_KEYS,
  COLOR_STYLE_KEYS,
  type ColorTheme,
  type ColorStyle,
} from '@/lib/color-themes';

describe('color themes', () => {
  it('defines 8 themes', () => {
    expect(COLOR_THEME_KEYS).toHaveLength(8);
    expect(COLOR_THEME_KEYS).toEqual([
      'blue', 'purple', 'magenta', 'red', 'orange', 'green', 'teal', 'slate',
    ]);
  });

  it('defines 2 styles', () => {
    expect(COLOR_STYLE_KEYS).toEqual(['matched', 'fulltint']);
  });

  it('each theme has bg, surface, and accent hex colors', () => {
    const hexPattern = /^#[0-9a-f]{6}$/;
    for (const key of COLOR_THEME_KEYS) {
      const theme = colorThemes[key];
      expect(theme.bg).toMatch(hexPattern);
      expect(theme.surface).toMatch(hexPattern);
      expect(theme.accent).toMatch(hexPattern);
    }
  });

  it('blue theme matches Catppuccin Macchiato base', () => {
    expect(colorThemes.blue.bg).toBe('#24273a');
  });
});
