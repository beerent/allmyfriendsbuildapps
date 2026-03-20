'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { AdCard } from '@/components/ad-card';
import { SpotifyCard } from '@/components/spotify-card';
import { TwitchCard } from '@/components/twitch-card';
import { colorThemes, type ColorTheme, type ColorStyle } from '@/lib/color-themes';

type DemoCard = {
  type: 'ad' | 'spotify' | 'twitch';
  colorTheme: ColorTheme;
  colorStyle: ColorStyle;
  headline?: string;
  subtext?: string;
  brandUrl?: string;
  icon?: string;
  spotifyLabel?: string;
  trackName?: string;
  artistName?: string;
  twitchLabel?: string;
  username?: string;
};

function demoSvg(bg: string, fg: string, path: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${bg}"/><g transform="translate(16,16)" stroke="${fg}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">${path}</g></svg>`)}`;
}

const icons = {
  tag:      demoSvg('#f5bde6', '#24273a', '<path d="M4 2h10l14 14-10 10L4 12V2z"/><circle cx="9" cy="7" r="2"/>'),
  shirt:    demoSvg('#a6da95', '#24273a', '<path d="M8 2l-6 4 4 2v18h20V8l4-2-6-4-4 4h-8z"/>'),
  bolt:     demoSvg('#f5a97f', '#24273a', '<path d="M18 2L6 16h8l-2 14 12-14h-8z"/>'),
  code:     demoSvg('#7dc4e4', '#24273a', '<path d="M10 8L2 16l8 8"/><path d="M22 8l8 8-8 8"/>'),
  mic:      demoSvg('#939ab7', '#24273a', '<rect x="8" y="2" width="16" height="20" rx="8"/><path d="M4 18c0 8 24 8 24 0"/><path d="M16 26v6"/>'),
  shield:   demoSvg('#c6a0f6', '#24273a', '<path d="M16 2L2 8v8c0 10 14 14 14 14s14-4 14-14V8z"/>'),
  grid:     demoSvg('#8bd5ca', '#24273a', '<rect x="2" y="2" width="10" height="10" rx="2"/><rect x="20" y="2" width="10" height="10" rx="2"/><rect x="2" y="20" width="10" height="10" rx="2"/><rect x="20" y="20" width="10" height="10" rx="2"/>'),
  chair:    demoSvg('#ed8796', '#24273a', '<path d="M8 2v12h16V2"/><path d="M4 14h24v4H4z"/><path d="M8 18v10"/><path d="M24 18v10"/>'),
  sparkle:  demoSvg('#f5bde6', '#24273a', '<path d="M16 2v28M2 16h28M6 6l20 20M26 6L6 26"/>'),
  keyboard: demoSvg('#a6da95', '#24273a', '<rect x="2" y="6" width="28" height="20" rx="3"/><path d="M6 12h4m4 0h4m4 0h4M8 18h16"/>'),
};

const DEMO_CARDS: DemoCard[] = [
  { type: 'ad', colorTheme: 'magenta', colorStyle: 'matched', headline: 'Use Code: FRIEND20', subtext: '20% off your first order', brandUrl: 'coolbrand.com', icon: icons.tag },
  { type: 'spotify', colorTheme: 'purple', colorStyle: 'matched', spotifyLabel: 'Now Playing', trackName: 'Bohemian Rhapsody', artistName: 'Queen' },
  { type: 'ad', colorTheme: 'green', colorStyle: 'fulltint', headline: 'New Merch Drop', subtext: 'Limited edition hoodies', brandUrl: 'streammerch.co', icon: icons.shirt },
  { type: 'twitch', colorTheme: 'blue', colorStyle: 'matched', twitchLabel: 'Latest Follower', username: 'coolgamer42' },
  { type: 'ad', colorTheme: 'orange', colorStyle: 'matched', headline: 'Energy Drinks', subtext: 'Fuel your stream', brandUrl: 'gofuel.gg', icon: icons.bolt },
  { type: 'spotify', colorTheme: 'teal', colorStyle: 'matched', spotifyLabel: 'Next Up', trackName: 'Stairway to Heaven', artistName: 'Led Zeppelin' },
  { type: 'twitch', colorTheme: 'red', colorStyle: 'matched', twitchLabel: 'Latest Sub', username: 'superfan99' },
  { type: 'ad', colorTheme: 'blue', colorStyle: 'fulltint', headline: 'Learn to Code', subtext: 'Free bootcamp for streamers', brandUrl: 'codecamp.dev', icon: icons.code },
  { type: 'spotify', colorTheme: 'magenta', colorStyle: 'matched', spotifyLabel: 'Now Playing', trackName: 'Blinding Lights', artistName: 'The Weeknd' },
  { type: 'ad', colorTheme: 'slate', colorStyle: 'matched', headline: 'Premium Mic', subtext: 'Crystal clear audio', brandUrl: 'audiopro.com', icon: icons.mic },
  { type: 'twitch', colorTheme: 'green', colorStyle: 'matched', twitchLabel: 'Latest Follower', username: 'pixelwarrior' },
  { type: 'ad', colorTheme: 'purple', colorStyle: 'matched', headline: 'VPN Deal', subtext: '80% off annual plan', brandUrl: 'securevpn.io', icon: icons.shield },
  { type: 'spotify', colorTheme: 'blue', colorStyle: 'matched', spotifyLabel: 'Now Playing', trackName: 'Lose Yourself', artistName: 'Eminem' },
  { type: 'ad', colorTheme: 'teal', colorStyle: 'fulltint', headline: 'Stream Deck', subtext: 'Automate your setup', brandUrl: 'elgato.com', icon: icons.grid },
  { type: 'twitch', colorTheme: 'purple', colorStyle: 'matched', twitchLabel: 'Latest Sub', username: 'nightowl_ttv' },
  { type: 'ad', colorTheme: 'red', colorStyle: 'matched', headline: 'Gaming Chair', subtext: 'Ergonomic comfort', brandUrl: 'sitright.co', icon: icons.chair },
  { type: 'spotify', colorTheme: 'green', colorStyle: 'matched', spotifyLabel: 'Next Up', trackName: 'Circles', artistName: 'Post Malone' },
  { type: 'ad', colorTheme: 'magenta', colorStyle: 'fulltint', headline: 'Custom Emotes', subtext: 'Stand out on Twitch', brandUrl: 'emotelab.art', icon: icons.sparkle },
  { type: 'twitch', colorTheme: 'orange', colorStyle: 'matched', twitchLabel: 'Latest Follower', username: 'retrogamer88' },
  { type: 'ad', colorTheme: 'green', colorStyle: 'matched', headline: 'Keyboard Sale', subtext: 'Mechanical switches', brandUrl: 'keysgo.shop', icon: icons.keyboard },
];

const STEPS = [
  { num: '01', title: 'Create', desc: 'Build ads or connect Spotify & Twitch' },
  { num: '02', title: 'Share', desc: 'Friends add your cards to their overlays' },
  { num: '03', title: 'Stream', desc: 'One OBS link, everything rotates live' },
];

function DemoPreview() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % DEMO_CARDS.length);
        setVisible(true);
      }, 500);
    }, 4000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex]);

  const card = DEMO_CARDS[currentIndex];
  const theme = colorThemes[card.colorTheme];

  const CHAT_MESSAGES = [
    { user: 'rustacean42', color: '#f5bde6', msg: 'what editor theme is that?' },
    { user: 'js_ninja', color: '#a6da95', msg: 'clean code!' },
    { user: 'typeScript_fan', color: '#7dc4e4', msg: 'use zod for that' },
    { user: 'vim_btw', color: '#f5a97f', msg: 'nice refactor' },
    { user: 'react_dev', color: '#c6a0f6', msg: 'love the overlay!' },
    { user: 'devdad', color: '#8bd5ca', msg: 'check my friends app ^' },
  ];

  function renderCard() {
    if (card.type === 'ad') {
      return (
        <AdCard
          imageUrl={card.icon || null}
          headline={card.headline || ''}
          subtext={card.subtext || null}
          brandUrl={card.brandUrl || null}
          colorTheme={card.colorTheme}
          colorStyle={card.colorStyle}
        />
      );
    }
    if (card.type === 'spotify') {
      return (
        <SpotifyCard
          label={card.spotifyLabel}
          trackName={card.trackName}
          artistName={card.artistName}
          colorTheme={card.colorTheme}
        />
      );
    }
    return (
      <TwitchCard
        label={card.twitchLabel}
        username={card.username}
        colorTheme={card.colorTheme}
      />
    );
  }

  return (
    <div className="w-full max-w-3xl">
      {/* Stream frame */}
      <div className="overflow-hidden rounded-xl border border-[rgba(202,211,245,0.06)] shadow-2xl shadow-black/40">

        {/* Title bar */}
        <div className="flex items-center gap-2 bg-[#181926] px-3 py-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ed8796]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#f5a97f]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#a6da95]" />
          </div>
          <div className="flex-1 text-center text-[10px] text-[#494d64]">OBS Studio — Live</div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#ed8796] animate-pulse" />
            <span className="text-[10px] font-medium text-[#ed8796]">REC</span>
          </div>
        </div>

        {/* Stream content */}
        <div className="relative flex" style={{ aspectRatio: '16 / 9' }}>

          {/* Code editor area */}
          <div className="relative flex-1 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1e1e2e 0%, #181825 50%, #1e1e2e 100%)',
            }}
          >
            {/* Fake code editor */}
            <div className="absolute inset-0 px-4 pt-8 font-mono text-[7px] leading-[13px] opacity-40">
              {/* Tab bar */}
              <div className="absolute left-0 top-0 flex gap-px">
                <div className="rounded-t bg-[#1e1e2e] px-3 py-1 text-[7px] text-[#a6da95]">app.tsx</div>
                <div className="rounded-t bg-[#181825] px-3 py-1 text-[7px] text-[#6e738d]">utils.ts</div>
                <div className="rounded-t bg-[#181825] px-3 py-1 text-[7px] text-[#6e738d]">api.ts</div>
              </div>
              {/* Line numbers + code */}
              <div className="flex gap-3">
                <div className="flex flex-col text-[#494d64]">
                  {Array.from({ length: 18 }, (_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
                <div className="flex flex-col">
                  <span><span className="text-[#c6a0f6]">import</span> <span className="text-[#cad3f5]">{'{ useState }'}</span> <span className="text-[#c6a0f6]">from</span> <span className="text-[#a6da95]">&apos;react&apos;</span></span>
                  <span><span className="text-[#c6a0f6]">import</span> <span className="text-[#cad3f5]">{'{ db }'}</span> <span className="text-[#c6a0f6]">from</span> <span className="text-[#a6da95]">&apos;@/lib/db&apos;</span></span>
                  <span />
                  <span><span className="text-[#7dc4e4]">export function</span> <span className="text-[#f5a97f]">Dashboard</span><span className="text-[#cad3f5]">() {'{'}</span></span>
                  <span>  <span className="text-[#c6a0f6]">const</span> <span className="text-[#cad3f5]">[items, setItems]</span> = <span className="text-[#f5a97f]">useState</span><span className="text-[#cad3f5]">([])</span></span>
                  <span />
                  <span>  <span className="text-[#7dc4e4]">async function</span> <span className="text-[#f5a97f]">fetchData</span><span className="text-[#cad3f5]">() {'{'}</span></span>
                  <span>    <span className="text-[#c6a0f6]">const</span> <span className="text-[#cad3f5]">res</span> = <span className="text-[#c6a0f6]">await</span> <span className="text-[#f5a97f]">fetch</span><span className="text-[#cad3f5]">(&apos;/api/profiles&apos;)</span></span>
                  <span>    <span className="text-[#c6a0f6]">const</span> <span className="text-[#cad3f5]">data</span> = <span className="text-[#c6a0f6]">await</span> <span className="text-[#cad3f5]">res.</span><span className="text-[#f5a97f]">json</span><span className="text-[#cad3f5]">()</span></span>
                  <span>    <span className="text-[#f5a97f]">setItems</span><span className="text-[#cad3f5]">(data)</span></span>
                  <span>  <span className="text-[#cad3f5]">{'}'}</span></span>
                  <span />
                  <span>  <span className="text-[#c6a0f6]">return</span> <span className="text-[#cad3f5]">(</span></span>
                  <span>    <span className="text-[#cad3f5]">{'<'}</span><span className="text-[#7dc4e4]">div</span><span className="text-[#cad3f5]">{'>'}</span></span>
                  <span>      <span className="text-[#cad3f5]">{'<'}</span><span className="text-[#f5a97f]">ProfileList</span> <span className="text-[#7dc4e4]">items</span><span className="text-[#cad3f5]">=</span><span className="text-[#cad3f5]">{'{items}'}</span> <span className="text-[#cad3f5]">/{'>'}</span></span>
                  <span>    <span className="text-[#cad3f5]">{'</'}</span><span className="text-[#7dc4e4]">div</span><span className="text-[#cad3f5]">{'>'}</span></span>
                  <span>  <span className="text-[#cad3f5]">)</span></span>
                  <span><span className="text-[#cad3f5]">{'}'}</span></span>
                </div>
              </div>
            </div>

            {/* Webcam */}
            <div className="absolute bottom-3 right-3 h-[72px] w-[96px] overflow-hidden rounded-lg border border-[rgba(202,211,245,0.1)]"
              style={{ background: 'linear-gradient(135deg, #2a2440 0%, #1e2030 100%)' }}
            >
              {/* Silhouette */}
              <div className="flex h-full items-end justify-center">
                <div className="relative">
                  <div className="h-6 w-6 rounded-full bg-[#363a4f]" style={{ marginBottom: '-2px' }} />
                  <div className="h-5 w-10 rounded-t-full bg-[#363a4f]" />
                </div>
              </div>
            </div>

            {/* Overlay card - the product */}
            <div className="absolute left-3 top-3 origin-top-left scale-[0.55]"
              style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}
            >
              {renderCard()}
            </div>

            {/* Viewer count */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-[rgba(0,0,0,0.5)] px-2 py-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-[#ed8796]" />
              <span className="text-[8px] text-[#cad3f5]">1,247 viewers</span>
            </div>
          </div>

          {/* Chat panel */}
          <div className="flex w-[180px] flex-col border-l border-[rgba(202,211,245,0.06)] bg-[#181926]">
            <div className="border-b border-[rgba(202,211,245,0.06)] px-3 py-2">
              <span className="text-[10px] font-semibold text-[#6e738d]">STREAM CHAT</span>
            </div>
            <div className="flex flex-1 flex-col justify-end gap-1.5 px-3 py-2">
              {CHAT_MESSAGES.map((m, i) => (
                <div key={i} className="text-[10px] leading-tight">
                  <span className="font-semibold" style={{ color: m.color }}>{m.user}</span>
                  <span className="text-[#8087a2]">: {m.msg}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[rgba(202,211,245,0.06)] px-3 py-2">
              <div className="rounded bg-[rgba(54,58,79,0.3)] px-2 py-1 text-[9px] text-[#494d64]">Send a message...</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-auto mt-5 flex max-w-[200px] justify-center gap-1">
        {DEMO_CARDS.slice(0, 10).map((_, i) => (
          <div
            key={i}
            className="h-[3px] flex-1 rounded-full transition-all duration-500"
            style={{
              backgroundColor: i === currentIndex % 10 ? theme.accent : 'rgba(202,211,245,0.08)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;

  const font = { fontFamily: 'var(--font-family-display)' };

  return (
    <div className="relative -mx-[calc(50vw-50%)] -mt-8 min-h-screen px-[calc(50vw-50%)] pt-8">
      <div className="relative mx-auto max-w-4xl px-6">

        {/* ── Top bar ── */}
        <div className="animate-fade-in-up flex items-center justify-between py-4">
          <span className="text-sm font-bold text-[#cad3f5]" style={font}>AMFBA</span>
          <Link
            href="/login"
            className="rounded-full border border-[rgba(202,211,245,0.08)] px-5 py-1.5 text-sm font-medium text-[#b8c0e0] transition-all hover:border-[rgba(202,211,245,0.15)] hover:text-[#cad3f5]"
            style={font}
          >
            Log In
          </Link>
        </div>

        {/* ── Hero ── */}
        <div className="animate-fade-in-up flex flex-col items-center pb-14 pt-16 text-center" style={{ animationDelay: '100ms' }}>
          <h1
            className="text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl"
            style={font}
          >
            Your friends build
            <br />
            <span className="bg-gradient-to-r from-[#a6da95] via-[#8bd5ca] to-[#7dc4e4] bg-clip-text text-transparent">
              cool stuff.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#8087a2] md:text-lg" style={font}>
            Put it on your stream. One rotating overlay for
            friend&nbsp;ads, now&nbsp;playing, and&nbsp;alerts.
          </p>
        </div>

        {/* ── Demo ── */}
        <div className="animate-fade-in-up relative flex justify-center pb-16" style={{ animationDelay: '250ms' }}>
          {/* Hand-drawn annotation pointing at the overlay card */}
          <div className="pointer-events-none absolute -left-28 -top-2 hidden lg:block">
            <svg width="160" height="120" viewBox="0 0 160 120" fill="none" style={{ opacity: 0.55 }}>
              {/* "this is it!" text */}
              <text x="2" y="18" fill="#a6da95" fontSize="13" fontStyle="italic" fontFamily="Outfit, sans-serif">your friends ads here</text>
              {/* Curved arrow from text down-right to card */}
              <path
                d="M45 28C50 40 60 55 80 70C95 80 115 88 135 90"
                stroke="#a6da95"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              {/* Arrowhead */}
              <path
                d="M128 84L137 91L130 98"
                stroke="#a6da95"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <DemoPreview />
        </div>

        {/* ── How it works ── */}
        <div className="animate-fade-in-up pb-20" style={{ animationDelay: '400ms' }}>
          <div className="grid grid-cols-3 gap-4">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="glass-subtle group rounded-xl px-5 py-6 transition-all hover:border-[rgba(202,211,245,0.1)]"
              >
                <span className="text-xs font-bold text-[#a6da95]" style={font}>{step.num}</span>
                <h3 className="mt-2 text-base font-semibold" style={font}>{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#6e738d]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
