export function demoAlbumArt() {
  const colors = [
    { c1: '#e74856', c2: '#1e1e2e' },
    { c1: '#f5a97f', c2: '#3d1f00' },
    { c1: '#c6a0f6', c2: '#2a1f3d' },
    { c1: '#8bd5ca', c2: '#1a2f2b' },
    { c1: '#7dc4e4', c2: '#1a2a3d' },
  ];
  const pick = colors[Math.floor(Math.random() * colors.length)];
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${pick.c1}"/><stop offset="50%" stop-color="${pick.c2}"/><stop offset="100%" stop-color="${pick.c1}"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g)"/><rect x="8" y="10" width="20" height="3" rx="1.5" fill="${pick.c1}" opacity="0.4"/><rect x="8" y="16" width="30" height="2" rx="1" fill="${pick.c1}" opacity="0.2"/><circle cx="32" cy="32" r="6" fill="${pick.c2}"/><circle cx="32" cy="32" r="2" fill="${pick.c1}" opacity="0.5"/></svg>`)}`;
}
