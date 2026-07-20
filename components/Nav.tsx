'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, type SessionUser } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analyze', label: 'Analyze' },
  { href: '/resumes', label: 'Résumés' },
  { href: '/history', label: 'History' },
];

export function Nav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api.logout().catch(() => {});
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-2)] text-sm font-bold text-white">
          RB
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Resume Builder</p>
          <p className="text-[10px] text-[var(--color-muted)]">ATS Optimizer</p>
        </div>
      </div>

      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              active
                ? 'bg-[var(--color-surface-2)] font-medium text-[var(--color-text)]'
                : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'
            }`}
          >
            {l.label}
          </Link>
        );
      })}

      <div className="mt-auto space-y-3 px-2 pt-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{user.name ?? 'Signed in'}</p>
            <p className="truncate text-[10px] text-[var(--color-muted)]">{user.email}</p>
          </div>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
