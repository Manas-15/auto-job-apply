'use client';

import { useState } from 'react';
import { api, type AtsPreview } from '@/lib/api';
import { Badge, Button, Card, ScoreRing } from '@/components/ui';

export default function AtsToolPage() {
  const [resumeText, setResumeText] = useState('');
  const [required, setRequired] = useState('React, Next.js, TypeScript, REST APIs, Jest');
  const [niceToHave, setNiceToHave] = useState('GraphQL, Webpack, CI/CD');
  const [result, setResult] = useState<AtsPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      setResult(
        await api.previewAts({
          resumeText,
          required: splitList(required),
          niceToHave: splitList(niceToHave),
          ats: [],
        }),
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ATS Tool</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Paste resume text and target keywords to get an instant ATS match score. No AI key needed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Resume text
            </label>
            <textarea
              className={`${input} min-h-52 font-mono text-xs`}
              placeholder="Paste your resume text…"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Required keywords (comma-separated)
            </label>
            <input className={input} value={required} onChange={(e) => setRequired(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
              Nice-to-have keywords
            </label>
            <input
              className={input}
              value={niceToHave}
              onChange={(e) => setNiceToHave(e.target.value)}
            />
          </div>
          {err && <p className="text-sm text-[var(--color-bad)]">{err}</p>}
          <div className="flex justify-end">
            <Button onClick={run} disabled={busy || !resumeText}>
              {busy ? 'Scoring…' : 'Compute ATS score'}
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="font-medium">Result</h2>
          {!result ? (
            <p className="text-sm text-[var(--color-muted)]">Run a score to see results.</p>
          ) : (
            <>
              <div className="flex items-center justify-center">
                <ScoreRing score={result.score} size={110} />
              </div>
              <p className="text-center text-xs text-[var(--color-muted)]">{result.notes}</p>
              <Group title={`Matched (${result.matchedKeywords.length})`} items={result.matchedKeywords} tone="good" />
              <Group title={`Missing (${result.missingKeywords.length})`} items={result.missingKeywords} tone="bad" />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function splitList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function Group({ title, items, tone }: { title: string; items: string[]; tone: 'good' | 'bad' }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[var(--color-muted)]">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <Badge key={it} tone={tone}>
            {it}
          </Badge>
        ))}
      </div>
    </div>
  );
}
