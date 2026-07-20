import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Badge, Card, EmptyState, ScoreRing } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();

  const [resumeCount, analyses] = await Promise.all([
    prisma.resume.count({ where: { userId: user.id } }),
    prisma.analysis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        jobTitle: true,
        atsScore: true,
        atsScoreAfter: true,
        rewrittenText: true,
        createdAt: true,
      },
    }),
  ]);

  const total = await prisma.analysis.count({ where: { userId: user.id } });
  const best = await prisma.analysis.aggregate({
    where: { userId: user.id },
    _max: { atsScore: true, atsScoreAfter: true },
  });
  const bestScore = Math.max(best._max.atsScore ?? 0, best._max.atsScoreAfter ?? 0);

  const stats = [
    { label: 'Résumés saved', value: resumeCount },
    { label: 'Analyses run', value: total },
    { label: 'Best ATS score', value: `${bestScore}%` },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Welcome{user.name ? `, ${user.name}` : ''}. Analyze a résumé against a job to get started.
          </p>
        </div>
        <Link
          href="/analyze"
          className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          New analysis
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-[var(--color-muted)]">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Recent analyses</h2>
          <Link href="/history" className="text-sm text-[#a5b4fc] hover:underline">
            View all →
          </Link>
        </div>
        {analyses.length === 0 ? (
          <EmptyState title="No analyses yet" hint="Head to Analyze to score your first résumé." />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {analyses.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/history/${a.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition hover:opacity-80"
                >
                  <div className="flex items-center gap-4">
                    <ScoreRing score={a.atsScoreAfter ?? a.atsScore} size={52} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.jobTitle || 'Untitled job'}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {a.rewrittenText ? <Badge tone="brand">Optimized</Badge> : <Badge>Scored</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
