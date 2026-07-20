'use client';

import { useState } from 'react';
import { api, type Analysis } from '@/lib/api';
import { Badge, Button, Card, Chips, ErrorNotice, ScoreRing, Spinner } from '@/components/ui';

export function AnalysisResult({ initial }: { initial: Analysis }) {
  const [analysis, setAnalysis] = useState<Analysis>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);

  async function optimize() {
    setError(null);
    setBusy(true);
    try {
      setAnalysis(await api.rewrite(analysis.id));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function copyRewrite() {
    if (!analysis.rewrittenText) return;
    await navigator.clipboard.writeText(analysis.rewrittenText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const after = analysis.atsScoreAfter;

  return (
    <div className="space-y-5">
      {/* Score + keyword gap */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-center">
            <ScoreRing score={analysis.atsScore} />
            <p className="mt-1 text-xs text-[var(--color-muted)]">ATS match</p>
          </div>
          {after != null && (
            <div className="text-center">
              <ScoreRing score={after} />
              <p className="mt-1 text-xs text-[var(--color-muted)]">After rewrite</p>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{analysis.jobTitle || 'Job description'}</p>
            {analysis.jdSummary && (
              <p className="mt-1 text-sm text-[var(--color-muted)]">{analysis.jdSummary}</p>
            )}
            {analysis.notes && (
              <p className="mt-2 text-xs text-[var(--color-muted)]">{analysis.notes}</p>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium">
            Matched keywords <Badge tone="good">{analysis.matchedKeywords.length}</Badge>
          </h3>
          <Chips items={analysis.matchedKeywords} tone="good" />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium">
            Missing keywords <Badge tone="bad">{analysis.missingKeywords.length}</Badge>
          </h3>
          <Chips items={analysis.missingKeywords} tone="bad" />
        </Card>
      </div>

      {/* AI rewrite */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">AI resume rewrite</h3>
            <p className="text-xs text-[var(--color-muted)]">
              Tailors your résumé to this job using only experience you already have — no invented skills.
            </p>
          </div>
          {!analysis.rewrittenText && (
            <Button onClick={optimize} disabled={busy}>
              {busy ? 'Rewriting…' : 'Optimize with AI'}
            </Button>
          )}
        </div>

        {busy && <Spinner label="Asking the model to tailor your résumé…" />}
        <ErrorNotice error={error} />

        {analysis.rewrittenText && (
          <div className="space-y-4">
            {analysis.changesSummary.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-[var(--color-muted)]">What changed</p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {analysis.changesSummary.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.gaps.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-[var(--color-muted)]">
                  Honest gaps (not added to your résumé)
                </p>
                <ul className="space-y-1 text-sm">
                  {analysis.gaps.map((g, i) => (
                    <li key={i}>
                      <span className="font-medium">{g.keyword}</span>
                      <span className="text-[var(--color-muted)]"> — {g.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-[var(--color-muted)]">Optimized résumé</p>
                <button
                  type="button"
                  onClick={copyRewrite}
                  className="text-xs text-[#a5b4fc] hover:underline"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-[13px] leading-relaxed">
                {analysis.rewrittenText}
              </pre>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
