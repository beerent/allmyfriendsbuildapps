'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ImageUpload } from '@/components/image-upload';
import { CustomCard } from '@/components/custom-card';
import { ColorPicker } from '@/components/color-picker';
import type { ColorTheme, ColorStyle } from '@/lib/color-themes';

export default function CreateCard() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [subtext2, setSubtext2] = useState('');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('blue');
  const [colorStyle, setColorStyle] = useState<ColorStyle>('matched');
  const [publishing, setPublishing] = useState(false);

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
        type: 'card',
        headline,
        subtext: subtext || null,
        subtext2: subtext2 || null,
        imageUrl,
        colorTheme,
        colorStyle,
      }),
    });
    if (res.ok) {
      router.push('/marketplace');
    }
    setPublishing(false);
  }

  if (loading || !user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Create Card</h1>

      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Photo / Image</label>
            <ImageUpload onUpload={setImageUrl} currentUrl={imageUrl ?? undefined} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Your headline here"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Subtext</label>
            <input
              type="text"
              value={subtext}
              onChange={(e) => setSubtext(e.target.value)}
              placeholder="A short description"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Second Subtext (optional)</label>
            <input
              type="text"
              value={subtext2}
              onChange={(e) => setSubtext2(e.target.value)}
              placeholder="Additional info"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <ColorPicker
              selectedTheme={colorTheme}
              selectedStyle={colorStyle}
              onThemeChange={setColorTheme}
              onStyleChange={setColorStyle}
            />
          </div>

          <button
            onClick={publish}
            disabled={publishing || !headline.trim()}
            className="mt-4 rounded-md bg-[#f5bde6] px-6 py-3 font-medium text-[#24273a] hover:bg-[#c6a0f6] disabled:opacity-50"
          >
            {publishing ? 'Publishing...' : 'Publish to Marketplace'}
          </button>
        </div>

        <div>
          <label className="mb-3 block text-sm text-[#b8c0e0]">Live Preview</label>
          <div className="flex items-start justify-center rounded-md bg-[#181926] p-8">
            <CustomCard
              imageUrl={imageUrl}
              headline={headline || 'Your Headline'}
              subtext={subtext || null}
              subtext2={subtext2 || null}
              colorTheme={colorTheme}
              colorStyle={colorStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
