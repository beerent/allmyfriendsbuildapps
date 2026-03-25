import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'thosewho.stream — Stream overlays, alerts, and widgets',
  description: 'Stream overlays, alerts, and widgets for your community. Show your friends\' ads, Spotify now playing, Twitch events, and more.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'thosewho.stream',
    description: 'Stream overlays, alerts, and widgets for your community.',
    url: 'https://thosewho.build',
    siteName: 'thosewho.stream',
    images: [
      {
        url: 'https://thosewho.build/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'thosewho.stream',
    description: 'Stream overlays, alerts, and widgets for your community.',
    images: ['https://thosewho.build/og-image.png'],
  },
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
