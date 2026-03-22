type LogoProps = {
  className?: string;
};

export function Logo({ className = 'h-6 w-6' }: LogoProps) {
  return (
    <svg viewBox="2 6 28 22" className={className}>
      <rect x="4" y="10" width="24" height="14" rx="3" fill="#363a4f" transform="rotate(-6 16 17)"/>
      <rect x="4" y="10" width="24" height="14" rx="3" fill="#494d64" transform="rotate(-3 16 17)"/>
      <rect x="4" y="10" width="24" height="14" rx="3" fill="#a6da95" transform="rotate(0 16 17)"/>
      <circle cx="10" cy="17" r="2.5" fill="#1e2030"/>
    </svg>
  );
}
