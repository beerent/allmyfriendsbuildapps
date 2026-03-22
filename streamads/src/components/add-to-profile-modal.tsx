'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { isConfigurable, getConfigFields, validateConfig, type ConfigField } from '@/lib/card-config';
import { DateTimePicker } from './datetime-picker';

type Profile = { id: string; name: string };

type AddToProfileModalProps = {
  itemId: string;
  itemType: string;
  onClose: () => void;
};

const font = { fontFamily: 'var(--font-family-display)' };

function ConfigForm({ fields, values, onChange }: {
  fields: ConfigField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="mb-1 block text-xs text-[#b8c0e0]" style={font}>{field.label}</label>
          {field.type === 'select' ? (
            <select
              value={(values[field.key] as string) ?? field.options?.[0]?.value ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-full rounded-lg border border-[rgba(202,211,245,0.06)] bg-[rgba(24,25,38,0.6)] px-3 py-2.5 text-sm text-[#cad3f5] outline-none"
              style={font}
            >
              {field.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : field.type === 'datetime' ? (
            <DateTimePicker
              value={(values[field.key] as string) ?? ''}
              onChange={(val) => onChange(field.key, val)}
            />
          ) : (
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              value={(values[field.key] as string) ?? ''}
              onChange={(e) => onChange(field.key, field.type === 'number' ? e.target.value : e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-lg border border-[rgba(202,211,245,0.06)] bg-[rgba(24,25,38,0.6)] px-3 py-2.5 text-sm text-[#cad3f5] placeholder-[#494d64] outline-none"
              style={font}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export { ConfigForm };

export function AddToProfileModal({ itemId, itemType, onClose }: AddToProfileModalProps) {
  const { getIdToken } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const needsConfig = isConfigurable(itemType);
  const fields = getConfigFields(itemType);
  const [configValues, setConfigValues] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (f.type === 'select' && f.options?.[0]) defaults[f.key] = f.options[0].value;
    });
    return defaults;
  });

  useEffect(() => {
    async function load() {
      const token = await getIdToken();
      const res = await fetch('/api/profiles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
        if (data.length === 1) {
          if (needsConfig) {
            setSelectedProfile(data[0].id);
          } else {
            addToProfile(data[0].id, null);
          }
        }
      }
    }
    load();
  }, [getIdToken]);

  function handleConfigChange(key: string, value: unknown) {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  }

  async function addToProfile(profileId: string, config: Record<string, unknown> | null) {
    setAdding(profileId);
    const token = await getIdToken();

    const profileRes = await fetch(`/api/profiles/${profileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!profileRes.ok) return;
    const profile = await profileRes.json();

    const currentItems = (profile.items || []).map((i: { itemId: string; displayDuration?: number; config?: unknown }) => ({
      itemId: i.itemId,
      displayDuration: i.displayDuration,
      config: i.config,
    }));

    const planRes = await fetch('/api/username', {
      headers: { Authorization: `Bearer ${token}` },
    });
    let userPlan = 'free';
    if (planRes.ok) {
      const pd = await planRes.json();
      userPlan = pd.plan || 'free';
    }

    if (userPlan === 'free' && currentItems.length >= 3) {
      setLimitReached(true);
      setAdding(null);
      return;
    }

    currentItems.push({ itemId, config });

    await fetch(`/api/profiles/${profileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: currentItems }),
    });

    setAdding(null);
    onClose();
  }

  function handleSubmit() {
    if (!selectedProfile) return;
    if (needsConfig && !validateConfig(itemType, configValues)) return;
    const config = needsConfig ? { ...configValues } : null;
    // Convert datetime values to ISO strings
    if (config?.endDate && typeof config.endDate === 'string') {
      config.endDate = new Date(config.endDate as string).toISOString();
    }
    if (config?.target) {
      config.target = parseInt(config.target as string);
    }
    addToProfile(selectedProfile, config);
  }

  const configValid = !needsConfig || validateConfig(itemType, configValues);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-96 rounded-2xl border border-[rgba(202,211,245,0.06)] bg-[#1e2030] p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'linear-gradient(135deg, rgba(30,32,48,0.98) 0%, rgba(24,25,38,0.99) 100%)' }}
      >
        <h3 className="mb-4 text-lg font-semibold" style={font}>
          {needsConfig ? 'Configure & Add' : 'Add to Profile'}
        </h3>

        {limitReached ? (
          <div className="text-center py-4">
            <p className="mb-4 text-sm text-[#b8c0e0]" style={font}>
              You've reached the free plan limit of 3 cards per profile.
            </p>
            <button
              onClick={async () => {
                const token = await getIdToken();
                const res = await fetch('/api/stripe/checkout', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                  const { url } = await res.json();
                  window.location.href = url;
                }
              }}
              className="rounded-xl bg-gradient-to-r from-[#a6da95] to-[#8bd5ca] px-5 py-2.5 text-sm font-semibold text-[#181926]"
              style={font}
            >
              Upgrade to Pro — $5/mo
            </button>
          </div>
        ) : (
          <>
            {/* Config form */}
            {needsConfig && (
              <div className="mb-5">
                <ConfigForm fields={fields} values={configValues} onChange={handleConfigChange} />
                <div className="mt-4 h-px bg-[rgba(202,211,245,0.06)]" />
              </div>
            )}

            {/* Profile selection */}
            {profiles.length === 0 ? (
              <p className="text-sm text-[#b8c0e0]">No profiles yet. Create one on the dashboard.</p>
            ) : needsConfig ? (
              <>
                <p className="mb-2 text-xs text-[#494d64]" style={font}>Add to profile:</p>
                <div className="flex flex-col gap-2 mb-4">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProfile(p.id)}
                      className="rounded-lg px-4 py-2 text-left text-sm transition-all"
                      style={{
                        backgroundColor: selectedProfile === p.id ? 'rgba(166,218,149,0.1)' : '#363a4f',
                        border: `1px solid ${selectedProfile === p.id ? 'rgba(166,218,149,0.3)' : 'transparent'}`,
                        color: selectedProfile === p.id ? '#a6da95' : '#cad3f5',
                        ...font,
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedProfile || !configValid || adding !== null}
                  className="w-full rounded-lg bg-gradient-to-r from-[#a6da95] to-[#8bd5ca] py-2.5 text-sm font-semibold text-[#181926] disabled:opacity-40"
                  style={font}
                >
                  {adding ? 'Adding...' : 'Add to Profile'}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToProfile(p.id, null)}
                    disabled={adding === p.id}
                    className="rounded-lg bg-[#363a4f] px-4 py-2 text-left text-sm hover:bg-[#494d64] disabled:opacity-50"
                    style={font}
                  >
                    {adding === p.id ? 'Adding...' : p.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-[#363a4f] px-4 py-2 text-sm hover:bg-[#494d64]"
          style={font}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
