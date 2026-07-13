'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/resumes', label: 'Résumés' },
  { href: '/tools/ats', label: 'ATS Tool' },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-2)] text-sm font-bold text-white">
          AJ
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Auto Job Apply</p>
          <p className="text-[10px] text-[var(--color-muted)]">AI Career Assistant</p>
        </div>
      </div>
      {links.map((l) => {
        const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
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
      <div className="mt-auto px-2 pt-4 text-[10px] leading-relaxed text-[var(--color-muted)]">
        Foundation build — modules M2 &amp; M4 live.
      </div>
    </aside>
  );
}
