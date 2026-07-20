import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Nav } from '@/components/Nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <Nav user={user} />
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
