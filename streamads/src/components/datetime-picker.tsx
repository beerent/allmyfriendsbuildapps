'use client';

import { useState } from 'react';

const font = { fontFamily: 'var(--font-family-display)' };

const PRESETS = [
  { label: '1h', ms: 1 * 60 * 60 * 1000 },
  { label: '2h', ms: 2 * 60 * 60 * 1000 },
  { label: '4h', ms: 4 * 60 * 60 * 1000 },
  { label: '8h', ms: 8 * 60 * 60 * 1000 },
  { label: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '3d', ms: 3 * 24 * 60 * 60 * 1000 },
  { label: '1w', ms: 7 * 24 * 60 * 60 * 1000 },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
];

type DateTimePickerProps = {
  value: string;
  onChange: (isoString: string) => void;
};

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>(value ? 'custom' : 'preset');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'America/New_York';
    }
  });

  // Parse existing value into date and time inputs
  const existingDate = value ? new Date(value) : null;
  const [dateValue, setDateValue] = useState(() => {
    if (!existingDate) return '';
    return existingDate.toISOString().split('T')[0];
  });
  const [timeValue, setTimeValue] = useState(() => {
    if (!existingDate) return '';
    return existingDate.toTimeString().slice(0, 5);
  });

  function handlePreset(preset: typeof PRESETS[number]) {
    setSelectedPreset(preset.label);
    setMode('preset');
    const target = new Date(Date.now() + preset.ms);
    onChange(target.toISOString());
  }

  function handleCustomChange(date: string, time: string) {
    setDateValue(date);
    setTimeValue(time);
    if (date && time) {
      const dt = new Date(`${date}T${time}`);
      if (!isNaN(dt.getTime())) {
        onChange(dt.toISOString());
      }
    }
  }

  // Format the selected time for display
  function formatPreview(): string {
    if (!value) return '';
    try {
      const d = new Date(value);
      return d.toLocaleString('en-US', {
        timeZone: timezone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return '';
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Quick presets */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#494d64]" style={font}>Quick set</span>
          <div className="h-px flex-1 bg-[rgba(202,211,245,0.04)]" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => handlePreset(p)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                backgroundColor: selectedPreset === p.label && mode === 'preset'
                  ? 'rgba(245,169,127,0.15)'
                  : 'rgba(54,58,79,0.5)',
                color: selectedPreset === p.label && mode === 'preset'
                  ? '#f5a97f'
                  : '#6e738d',
                border: `1px solid ${selectedPreset === p.label && mode === 'preset' ? 'rgba(245,169,127,0.3)' : 'transparent'}`,
                ...font,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date/time */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#494d64]" style={font}>Or set exact</span>
          <div className="h-px flex-1 bg-[rgba(202,211,245,0.04)]" />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateValue}
            onChange={(e) => {
              setMode('custom');
              setSelectedPreset(null);
              handleCustomChange(e.target.value, timeValue);
            }}
            className="flex-1 rounded-lg border border-[rgba(202,211,245,0.06)] bg-[rgba(24,25,38,0.6)] px-3 py-2 text-xs text-[#cad3f5] outline-none focus:border-[rgba(245,169,127,0.3)]"
            style={font}
          />
          <input
            type="time"
            value={timeValue}
            onChange={(e) => {
              setMode('custom');
              setSelectedPreset(null);
              handleCustomChange(dateValue, e.target.value);
            }}
            className="w-28 rounded-lg border border-[rgba(202,211,245,0.06)] bg-[rgba(24,25,38,0.6)] px-3 py-2 text-xs text-[#cad3f5] outline-none focus:border-[rgba(245,169,127,0.3)]"
            style={font}
          />
        </div>
      </div>

      {/* Timezone */}
      <select
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        className="rounded-lg border border-[rgba(202,211,245,0.06)] bg-[rgba(24,25,38,0.6)] px-3 py-2 text-xs text-[#6e738d] outline-none"
        style={font}
      >
        {TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>{tz.label}</option>
        ))}
      </select>

      {/* Preview */}
      {value && (
        <div className="rounded-lg bg-[rgba(24,25,38,0.4)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#494d64]" style={font}>Countdown ends</p>
          <p className="mt-0.5 text-xs font-medium text-[#f5a97f]" style={font}>{formatPreview()}</p>
        </div>
      )}
    </div>
  );
}
