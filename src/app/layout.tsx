import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StreamAds',
  description: 'Run ads on your friends streams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#24273a] text-[#cad3f5]">
        {children}
      </body>
    </html>
  );
}
