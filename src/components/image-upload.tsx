'use client';

import { useState, useRef } from 'react';
import { uploadImage } from '@/lib/firebase/storage';

type ImageUploadProps = {
  onUpload: (url: string) => void;
  onClear?: () => void;
  currentUrl?: string;
  isFavicon?: boolean;
  loading?: boolean;
};

export function ImageUpload({ onUpload, onClear, currentUrl, isFavicon, loading: externalLoading }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      onUpload(url);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md bg-[#363a4f] hover:bg-[#494d64]"
        >
          {currentUrl ? (
            <img src={currentUrl} alt="Logo" className="h-16 w-16 rounded-md object-cover" />
          ) : uploading || externalLoading ? (
            <span className="text-xs text-[#b8c0e0]">...</span>
          ) : (
            <span className="text-2xl text-[#6e738d]">+</span>
          )}
        </div>
        {currentUrl && !isFavicon && onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#ed8796] text-xs text-[#24273a] hover:bg-[#ee99a0]"
          >
            &times;
          </button>
        )}
      </div>
      {isFavicon && (
        <span className="text-xs text-[#6e738d]">Auto-detected from URL</span>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
