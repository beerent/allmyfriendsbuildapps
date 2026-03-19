'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ImageUpload } from '@/components/image-upload';
import { AdCard } from '@/components/ad-card';

export default function CreateAd() {
  const { user, loading, getIdToken } = useAuth();
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [subtext, setSubtext] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [displayDuration, setDisplayDuration] = useState(10);
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
        headline,
        subtext: subtext || null,
        brandUrl: brandUrl || null,
        imageUrl,
        displayDuration,
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
      <h1 className="mb-6 text-2xl font-bold">Create Ad</h1>

      <div className="grid grid-cols-2 gap-8">
        {/* Form */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Logo / Image</label>
            <ImageUpload onUpload={setImageUrl} currentUrl={imageUrl ?? undefined} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Use Code: FRIEND20"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Subtext</label>
            <input
              type="text"
              value={subtext}
              onChange={(e) => setSubtext(e.target.value)}
              placeholder="20% off your first order"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">Brand URL</label>
            <input
              type="text"
              value={brandUrl}
              onChange={(e) => setBrandUrl(e.target.value)}
              placeholder="coolbrand.com"
              className="w-full rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] placeholder-[#6e738d] outline-none focus:ring-2 focus:ring-[#f5bde6]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-[#b8c0e0]">
              Display Duration (seconds)
            </label>
            <input
              type="number"
              value={displayDuration}
              onChange={(e) => setDisplayDuration(Number(e.target.value))}
              min={3}
              max={60}
              className="w-24 rounded-md bg-[#363a4f] px-4 py-2 text-[#cad3f5] outline-none focus:ring-2 focus:ring-[#f5bde6]"
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

        {/* Live Preview */}
        <div>
          <label className="mb-3 block text-sm text-[#b8c0e0]">Live Preview</label>
          <div className="flex items-start justify-center rounded-md bg-[#181926] p-8">
            <AdCard
              imageUrl={imageUrl}
              headline={headline || 'Your Headline'}
              subtext={subtext || null}
              brandUrl={brandUrl || null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
