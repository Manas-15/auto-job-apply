'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type Job } from '@/lib/api';
import { Badge, Card, EmptyState } from '@/components/ui';

export default function OverviewPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listJobs()
      .then(setJobs)
      .catch((e) => setError(e.message));
  }, []);

  const total = jobs?.length ?? 0;
  const analyzed = jobs?.filter((j) => j.analysis).length ?? 0;
  const recent = jobs?.slice(0, 6) ?? [];

  const stats = [
    { label: 'Jobs found', value: total },
    { label: 'Analyzed', value: analyzed },
    { label: 'Pending analysis', value: total - analyzed },
    { label: 'Applications', value: 0, hint: 'M6 coming soon' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Your AI career assistant. Add jobs, analyze their descriptions, and score your resume.
        </p>
      </div>

      {error && (
        <Card className="p-4 text-sm text-[var(--color-bad)]">
          Couldn&apos;t reach the API: {error}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-[var(--color-muted)]">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold">{s.value}</p>
            {s.hint && <p className="mt-1 text-[10px] text-[var(--color-muted)]">{s.hint}</p>}
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Recent jobs</h2>
          <Link href="/jobs" className="text-sm text-[#a5b4fc] hover:underline">
            View all →
          </Link>
        </div>
        {jobs === null ? (
          <p className="text-sm text-[var(--color-muted)]">Loading…</p>
        ) : recent.length === 0 ? (
          <EmptyState title="No jobs yet" hint="Add one from the Jobs tab to get started." />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {recent.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/jobs/${j.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition hover:opacity-80"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{j.title}</p>
                    <p className="truncate text-xs text-[var(--color-muted)]">
                      {j.company?.name ?? 'Unknown company'}
                      {j.location ? ` · ${j.location}` : ''}
                    </p>
                  </div>
                  {j.analysis ? (
                    <Badge tone="good">Analyzed</Badge>
                  ) : (
                    <Badge tone="warn">Needs analysis</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
