'use client';

import { useState, useRef } from 'react';

type ImageUploadProps = {
  onUpload: (url: string) => void;
  currentUrl?: string;
};

export function ImageUpload({ onUpload, currentUrl }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onUpload(dataUrl);
        setUploading(false);
      };
      reader.onerror = () => {
        console.error('Failed to read file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploading(false);
    }
  }

  return (
    <div>
      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md bg-[#363a4f] hover:bg-[#494d64]"
      >
        {currentUrl ? (
          <img src={currentUrl} alt="Logo" className="h-16 w-16 rounded-md object-cover" />
        ) : uploading ? (
          <span className="text-xs text-[#b8c0e0]">...</span>
        ) : (
          <span className="text-2xl text-[#6e738d]">+</span>
        )}
      </div>
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
