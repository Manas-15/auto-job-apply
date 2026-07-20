import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AnalysisResult } from '@/components/AnalysisResult';
import type { Analysis, Gap } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const row = await prisma.analysis.findFirst({ where: { id, userId: user.id } });
  if (!row) notFound();

  // Shape the Prisma row into the client-facing Analysis type (dates → ISO strings).
  const analysis: Analysis = {
    ...row,
    gaps: (row.gaps as unknown as Gap[]) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/history" className="text-sm text-[#a5b4fc] hover:underline">
          ← Back to history
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{analysis.jobTitle || 'Analysis'}</h1>
        <p className="text-sm text-[var(--color-muted)]">
          {new Date(analysis.createdAt).toLocaleString()}
        </p>
      </div>

      <AnalysisResult initial={analysis} />
    </div>
  );
}
