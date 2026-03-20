export const colorThemes = {
  blue:    { bg: '#24273a', surface: '#363a4f', accent: '#7dc4e4' },
  purple:  { bg: '#2a2440', surface: '#3d3555', accent: '#c6a0f6' },
  magenta: { bg: '#302438', surface: '#45354d', accent: '#f5bde6' },
  red:     { bg: '#302428', surface: '#453535', accent: '#ed8796' },
  orange:  { bg: '#302a24', surface: '#453d35', accent: '#f5a97f' },
  green:   { bg: '#243028', surface: '#354540', accent: '#a6da95' },
  teal:    { bg: '#243038', surface: '#354550', accent: '#8bd5ca' },
  slate:   { bg: '#282a2e', surface: '#3e4045', accent: '#939ab7' },
} as const;

export type ColorTheme = keyof typeof colorThemes;
export type ColorStyle = 'matched' | 'fulltint';

export const COLOR_THEME_KEYS = Object.keys(colorThemes) as ColorTheme[];
export const COLOR_STYLE_KEYS: ColorStyle[] = ['matched', 'fulltint'];
