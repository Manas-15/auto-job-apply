import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Badge, Card, EmptyState, ScoreRing } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const user = await requireUser();
  const analyses = await prisma.analysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      jobTitle: true,
      jdSummary: true,
      atsScore: true,
      atsScoreAfter: true,
      rewrittenText: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-sm text-[var(--color-muted)]">Every résumé/JD analysis you've run.</p>
      </div>

      {analyses.length === 0 ? (
        <EmptyState title="No analyses yet" hint="Run one from the Analyze tab." />
      ) : (
        <div className="space-y-3">
          {analyses.map((a) => (
            <Link key={a.id} href={`/history/${a.id}`}>
              <Card className="p-4 transition hover:opacity-90">
                <div className="flex items-center gap-4">
                  <ScoreRing score={a.atsScoreAfter ?? a.atsScore} size={56} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {a.jobTitle || 'Untitled job'}
                      {a.rewrittenText ? <Badge tone="brand">Optimized</Badge> : <Badge>Scored</Badge>}
                    </p>
                    {a.jdSummary && (
                      <p className="truncate text-xs text-[var(--color-muted)]">{a.jdSummary}</p>
                    )}
                    <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                      {new Date(a.createdAt).toLocaleString()}
                      {a.atsScoreAfter != null && ` · ${a.atsScore}% → ${a.atsScoreAfter}%`}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
