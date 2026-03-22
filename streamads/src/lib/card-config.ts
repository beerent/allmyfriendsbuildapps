export type ConfigFieldType = 'text' | 'number' | 'select' | 'datetime';

export type ConfigField = {
  key: string;
  type: ConfigFieldType;
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
};

/**
 * Registry of configurable card types.
 * If a card type is listed here, the add-to-profile modal will show a config form.
 * If not listed, the card is added directly with no config.
 */
export const CARD_CONFIG: Record<string, ConfigField[]> = {
  goal: [
    {
      key: 'goalType',
      type: 'select',
      label: 'Goal Type',
      required: true,
      options: [
        { value: 'long_sub', label: 'Sub Goal (long-term)' },
        { value: 'long_bits', label: 'Bits Goal (long-term)' },
        { value: 'daily_sub', label: 'Daily Sub Goal (resets daily)' },
        { value: 'daily_bits', label: 'Daily Bits Goal (resets daily)' },
      ],
    },
    { key: 'title', type: 'text', label: 'Goal Name', placeholder: 'New mic fund', required: true },
    { key: 'target', type: 'number', label: 'Target', placeholder: '100', required: true },
  ],
  countdown: [
    { key: 'label', type: 'text', label: 'Event Name', placeholder: 'Subathon starts!', required: true },
    { key: 'endDate', type: 'datetime', label: 'End Date & Time', required: true },
  ],
};

export function isConfigurable(itemType: string): boolean {
  return itemType in CARD_CONFIG;
}

export function getConfigFields(itemType: string): ConfigField[] {
  return CARD_CONFIG[itemType] ?? [];
}

export function validateConfig(itemType: string, config: Record<string, unknown>): boolean {
  const fields = getConfigFields(itemType);
  return fields.every((f) => !f.required || (config[f.key] !== undefined && config[f.key] !== '' && config[f.key] !== null));
}
