export const CATEGORIES = [
  { key: 'coding', label: 'Coding', emoji: '💻' },
  { key: 'monetize', label: 'Monetize', emoji: '💰' },
  { key: 'gear', label: 'Gear', emoji: '🎧' },
  { key: 'gaming', label: 'Gaming', emoji: '🎮' },
  { key: 'food', label: 'Food', emoji: '🍔' },
  { key: 'merch', label: 'Merch', emoji: '👕' },
  { key: 'music', label: 'Music', emoji: '🎵' },
  { key: 'learning', label: 'Learning', emoji: '📚' },
  { key: 'other', label: 'Other', emoji: '✨' },
] as const;

export type CategoryKey = typeof CATEGORIES[number]['key'];
