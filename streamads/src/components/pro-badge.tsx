'use client';

type ProBadgeProps = {
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Pro badge — two variants based on size:
 * - sm: compact pill with premium logo + "PRO" text
 * - md/lg: larger pill with logo + "PRO" text
 *
 * The logo uses a premium color scheme (gold top card) to
 * distinguish from the regular green logo.
 */
export function ProBadge({ size = 'sm' }: ProBadgeProps) {
  const sizes = {
    sm: { icon: 'h-3 w-3', text: 'text-[7px]', gap: 'gap-[3px]', px: 'px-1.5 py-[2px]' },
    md: { icon: 'h-3.5 w-3.5', text: 'text-[8px]', gap: 'gap-1', px: 'px-2 py-[3px]' },
    lg: { icon: 'h-4 w-4', text: 'text-[9px]', gap: 'gap-1', px: 'px-2.5 py-1' },
  };

  const s = sizes[size];

  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.px} rounded-full`}
      style={{
        background: 'linear-gradient(135deg, rgba(125,196,228,0.12) 0%, rgba(166,218,149,0.08) 100%)',
        border: '1px solid rgba(125,196,228,0.2)',
      }}
      title="Pro member"
    >
      <svg viewBox="2 6 28 22" className={`${s.icon} flex-shrink-0`}>
        <rect x="4" y="10" width="24" height="14" rx="3" fill="#494d64" transform="rotate(-6 16 17)"/>
        <rect x="4" y="10" width="24" height="14" rx="3" fill="#7dc4e4" transform="rotate(-3 16 17)"/>
        <rect x="4" y="10" width="24" height="14" rx="3" fill="#a6da95" transform="rotate(0 16 17)"/>
        <circle cx="10" cy="17" r="2.5" fill="#1e2030"/>
      </svg>
      <span
        className={`${s.text} font-bold uppercase tracking-[0.08em] leading-none`}
        style={{
          color: '#7dc4e4',
          fontFamily: 'var(--font-family-display)',
        }}
      >
        PRO
      </span>
    </span>
  );
}
