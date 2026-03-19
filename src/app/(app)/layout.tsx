import { AuthProvider } from '@/lib/auth/context';
import { Nav } from '@/components/nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </AuthProvider>
  );
}
