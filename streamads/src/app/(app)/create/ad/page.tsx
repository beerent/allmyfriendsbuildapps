'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ImageUpload } from '@/components/image-upload';
import { AdCard } from '@/components/ad-card';
import { ColorPicker } from '@/components/color-picker';
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';
import { CATEGORIES } from '@/lib/categories';

export default function CreateAd() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('blue');
  const [colorStyle, setColorStyle] = useState<ColorStyle>('matched');
  const [publishing, setPublishing] = useState(false);
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  async function publish() {
    if (!headline.trim()) return;
    setPublishing(true);
    const token = await getIdToken();
    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        headline,
        subtext: subtext || null,
        brandUrl: brandUrl || null,
        imageUrl,
        colorTheme,
        colorStyle,
        category: category || null,
        tags: tags.length > 0 ? tags : null,
      }),
    });
    if (res.ok) {
      router.push('/marketplace');
    }
    setPublishing(false);
  }

  if (loading || !user) return null;

  const font = { fontFamily: 'var(--font-family-display)' };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold text-[#cad3f5]" style={font}>Create Ad</h1>
      <p className="mt-1 mb-8 text-sm text-[#494d64]" style={font}>Create an ad card for the marketplace</p>

      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]" style={font}>Logo / Image</label>
            <ImageUpload onUpload={setImageUrl} currentUrl={imageUrl ?? undefined} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]" style={font}>Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Use Code: FRIEND20"
              style={font}
              className="w-full rounded-xl border border-[rgba(202,211,245,0.06)] bg-[rgba(30,32,48,0.8)] px-5 py-3 text-sm text-[#cad3f5] placeholder-[#494d64] outline-none transition-all focus:border-[rgba(166,218,149,0.3)] focus:shadow-[0_0_0_3px_rgba(166,218,149,0.08)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]" style={font}>Subtext</label>
            <input
              type="text"
              value={subtext}
              onChange={(e) => setSubtext(e.target.value)}
              placeholder="20% off your first order"
              style={font}
              className="w-full rounded-xl border border-[rgba(202,211,245,0.06)] bg-[rgba(30,32,48,0.8)] px-5 py-3 text-sm text-[#cad3f5] placeholder-[#494d64] outline-none transition-all focus:border-[rgba(166,218,149,0.3)] focus:shadow-[0_0_0_3px_rgba(166,218,149,0.08)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]" style={font}>Brand URL</label>
            <input
              type="text"
              value={brandUrl}
              onChange={(e) => setBrandUrl(e.target.value)}
              placeholder="coolbrand.com"
              style={font}
              className="w-full rounded-xl border border-[rgba(202,211,245,0.06)] bg-[rgba(30,32,48,0.8)] px-5 py-3 text-sm text-[#cad3f5] placeholder-[#494d64] outline-none transition-all focus:border-[rgba(166,218,149,0.3)] focus:shadow-[0_0_0_3px_rgba(166,218,149,0.08)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-[#b8c0e0]" style={font}>Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className="rounded-xl px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    background: category === cat.key ? 'linear-gradient(135deg, #a6da95, #8bd5ca)' : 'rgba(30,32,48,0.8)',
                    color: category === cat.key ? '#1e2030' : '#b8c0e0',
                    border: `1px solid ${category === cat.key ? 'transparent' : 'rgba(202,211,245,0.06)'}`,
                    fontFamily: 'var(--font-family-display)',
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <ColorPicker
              selectedTheme={colorTheme}
              selectedStyle={colorStyle}
              onThemeChange={setColorTheme}
              onStyleChange={setColorStyle}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]" style={font}>Tags (up to 10)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-xl bg-[#363a4f] px-2 py-1 text-xs text-[#cad3f5]">
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-[#6e738d] hover:text-[#ed8796]">&times;</button>
                </span>
              ))}
            </div>
            {tags.length < 10 && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                    e.preventDefault();
                    const newTag = tagInput.trim().toLowerCase().replace(/,/g, '');
                    if (newTag && !tags.includes(newTag)) setTags([...tags, newTag]);
                    setTagInput('');
                  }
                }}
                placeholder="Type and press Enter"
                style={font}
                className="w-full rounded-xl border border-[rgba(202,211,245,0.06)] bg-[rgba(30,32,48,0.8)] px-5 py-3 text-sm text-[#cad3f5] placeholder-[#494d64] outline-none transition-all focus:border-[rgba(166,218,149,0.3)] focus:shadow-[0_0_0_3px_rgba(166,218,149,0.08)]"
              />
            )}
          </div>

          <button
            onClick={publish}
            disabled={publishing || !headline.trim()}
            style={font}
            className="mt-4 rounded-xl bg-gradient-to-r from-[#a6da95] to-[#8bd5ca] px-6 py-3 text-sm font-semibold text-[#181926] shadow-[0_2px_12px_rgba(166,218,149,0.2)] transition-all hover:shadow-[0_4px_20px_rgba(166,218,149,0.3)] disabled:opacity-40"
          >
            {publishing ? 'Publishing...' : 'Publish to Marketplace'}
          </button>
        </div>

        <div>
          <label className="mb-3 block text-sm text-[#b8c0e0]" style={font}>Live Preview</label>
          <div className="flex items-start justify-center rounded-md bg-[#181926] p-8">
            <AdCard
              imageUrl={imageUrl}
              headline={headline || 'Your Headline'}
              subtext={subtext || null}
              brandUrl={brandUrl || null}
              colorTheme={colorTheme}
              colorStyle={colorStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
