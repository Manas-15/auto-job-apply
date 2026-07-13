'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, type AtsScore, type Job, type OptimizeResponse } from '@/lib/api';
import { Badge, Button, Card, ScoreRing } from '@/components/ui';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeErr, setAnalyzeErr] = useState<string | null>(null);

  const [resumeId, setResumeId] = useState('seed-master-resume');
  const [score, setScore] = useState<AtsScore | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreErr, setScoreErr] = useState<string | null>(null);

  const [optimizing, setOptimizing] = useState(false);
  const [opt, setOpt] = useState<OptimizeResponse | null>(null);
  const [optErr, setOptErr] = useState<string | null>(null);

  const load = () => {
    api
      .getJob(id)
      .then(setJob)
      .catch((e) => setError(e.message));
  };
  useEffect(load, [id]);

  // Default the resume to your saved master résumé (falls back to the seed).
  useEffect(() => {
    api
      .listResumes()
      .then((rs) => {
        const master = rs.find((r) => r.isMaster);
        if (master) setResumeId(master.id);
      })
      .catch(() => undefined);
  }, []);

  const optimize = async () => {
    setOptimizing(true);
    setOptErr(null);
    try {
      setOpt(await api.optimizeResume(resumeId, id));
    } catch (e) {
      setOptErr((e as Error).message);
    } finally {
      setOptimizing(false);
    }
  };

  const analyze = async () => {
    setAnalyzing(true);
    setAnalyzeErr(null);
    try {
      await api.analyzeJob(id);
      load();
    } catch (e) {
      setAnalyzeErr((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const runScore = async () => {
    setScoring(true);
    setScoreErr(null);
    try {
      setScore(await api.scoreResume(resumeId, id));
    } catch (e) {
      setScoreErr((e as Error).message);
    } finally {
      setScoring(false);
    }
  };

  if (error) return <p className="text-sm text-[var(--color-bad)]">{error}</p>;
  if (!job) return <p className="text-sm text-[var(--color-muted)]">Loading…</p>;

  const a = job.analysis;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/jobs" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
        ← Back to jobs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{job.title}</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {job.company?.name ?? 'Unknown company'}
            {job.location ? ` · ${job.location}` : ''}
            {job.salaryText ? ` · ${job.salaryText}` : ''}
          </p>
        </div>
        <Button onClick={analyze} disabled={analyzing}>
          {analyzing ? 'Analyzing…' : a ? 'Re-analyze' : 'Analyze with AI'}
        </Button>
      </div>

      {analyzeErr && (
        <Card className="p-3 text-sm text-[var(--color-bad)]">
          {analyzeErr}
          {analyzeErr.includes('API_KEY') && (
            <span className="text-[var(--color-muted)]">
              {' '}
              — set a free GEMINI_API_KEY in .env to enable AI analysis.
            </span>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: description + analysis */}
        <div className="space-y-6">
          {a ? (
            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">AI analysis</h2>
                {a.model && <Badge tone="brand">{a.model}</Badge>}
              </div>
              {a.summary && <p className="text-sm text-[var(--color-muted)]">{a.summary}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-[var(--color-muted)]">
                {a.seniority && <span>Seniority: {a.seniority}</span>}
                {(a.minYears != null || a.maxYears != null) && (
                  <span>
                    Experience: {a.minYears ?? '?'}
                    {a.maxYears ? `–${a.maxYears}` : '+'} yrs
                  </span>
                )}
              </div>
              <KeywordGroup title="Required skills" items={a.requiredSkills} tone="brand" />
              <KeywordGroup title="Nice to have" items={a.niceToHaveSkills} />
              <KeywordGroup title="ATS keywords" items={a.atsKeywords} />
              {a.responsibilities.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-[var(--color-muted)]">
                    Responsibilities
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {a.responsibilities.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-5 text-sm text-[var(--color-muted)]">
              Not analyzed yet. Click <span className="text-[var(--color-text)]">Analyze with AI</span>{' '}
              to extract skills, ATS keywords, and responsibilities.
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-3 font-medium">Job description</h2>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-[var(--color-muted)]">
              {job.descriptionRaw}
            </pre>
          </Card>
        </div>

        {/* Right: ATS scoring */}
        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <h2 className="font-medium">ATS match</h2>
            <p className="text-xs text-[var(--color-muted)]">
              Score a resume against this job&apos;s keywords. Requires an analysis first.
            </p>
            <input
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              placeholder="Resume ID"
            />
            <Button variant="ghost" onClick={runScore} disabled={scoring || !a}>
              {scoring ? 'Scoring…' : 'Score resume'}
            </Button>
            {scoreErr && <p className="text-sm text-[var(--color-bad)]">{scoreErr}</p>}
            {score && (
              <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
                <div className="flex items-center justify-center">
                  <ScoreRing score={score.score} />
                </div>
                <KeywordGroup
                  title={`Matched (${score.matchedKeywords.length})`}
                  items={score.matchedKeywords}
                  tone="good"
                />
                <KeywordGroup
                  title={`Missing (${score.missingKeywords.length})`}
                  items={score.missingKeywords}
                  tone="bad"
                />
              </div>
            )}
          </Card>

          {/* Resume Optimizer (M3) */}
          <Card className="space-y-4 p-5">
            <h2 className="font-medium">Tailor résumé</h2>
            <p className="text-xs text-[var(--color-muted)]">
              AI rewrites your master résumé for this job to lift the ATS score — using only your
              real experience. Requires an analysis first.
            </p>
            <Button onClick={optimize} disabled={optimizing || !a}>
              {optimizing ? 'Tailoring…' : 'Tailor résumé for this job'}
            </Button>
            {optErr && (
              <p className="text-sm text-[var(--color-bad)]">
                {optErr}
                {optErr.includes('API_KEY') && (
                  <span className="text-[var(--color-muted)]"> — set a Gemini key to enable AI.</span>
                )}
                {optErr.includes('no text') && (
                  <span className="text-[var(--color-muted)]">
                    {' '}
                    — add your master résumé on the Résumés tab first.
                  </span>
                )}
              </p>
            )}
            {opt && (
              <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="text-center">
                    <ScoreRing score={opt.atsBefore} size={72} />
                    <p className="mt-1 text-[10px] text-[var(--color-muted)]">before</p>
                  </div>
                  <span className="text-[var(--color-muted)]">→</span>
                  <div className="text-center">
                    <ScoreRing score={opt.atsAfter} size={92} />
                    <p className="mt-1 text-[10px] text-[var(--color-muted)]">after</p>
                  </div>
                </div>
                <KeywordGroup
                  title={`Surfaced keywords (${opt.addedKeywords.length})`}
                  items={opt.addedKeywords}
                  tone="good"
                />
                {opt.gaps.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-[var(--color-muted)]">
                      Gaps (not added — you don&apos;t have these)
                    </p>
                    <ul className="space-y-1 text-xs">
                      {opt.gaps.map((g, i) => (
                        <li key={i}>
                          <span className="text-[var(--color-bad)]">{g.keyword}</span>
                          <span className="text-[var(--color-muted)]"> — {g.note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {opt.changesSummary.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-[var(--color-muted)]">Changes</p>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--color-muted)]">
                      {opt.changesSummary.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-medium text-[var(--color-muted)]">
                    Tailored résumé
                  </p>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--color-bg)] p-3 text-xs">
                    {opt.tailoredText}
                  </pre>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function KeywordGroup({
  title,
  items,
  tone = 'default',
}: {
  title: string;
  items: string[];
  tone?: 'default' | 'good' | 'bad' | 'brand';
}) {
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
