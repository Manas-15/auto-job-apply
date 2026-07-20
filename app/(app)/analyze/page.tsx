'use client';

import { useEffect, useState } from 'react';
import { api, type Analysis, type Resume } from '@/lib/api';
import { AnalysisResult } from '@/components/AnalysisResult';
import { Button, Card, ErrorNotice, Input, Label, Spinner, Textarea } from '@/components/ui';

export default function AnalyzePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState<string>(''); // '' = paste new
  const [resumeText, setResumeText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobText, setJobText] = useState('');

  const [saveAfter, setSaveAfter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<Analysis | null>(null);

  useEffect(() => {
    api.listResumes().then(setResumes).catch(() => {});
  }, []);

  function onPickResume(id: string) {
    setResumeId(id);
    const picked = resumes.find((r) => r.id === id);
    setResumeText(picked ? picked.content : '');
  }

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      let linkedId = resumeId || undefined;

      // Optionally save a freshly pasted résumé as a new version.
      if (!resumeId && saveAfter && resumeText.trim()) {
        const saved = await api.createResume({
          label: jobTitle ? `Résumé for ${jobTitle}`.slice(0, 60) : 'My résumé',
          content: resumeText,
        });
        linkedId = saved.id;
        setResumes((prev) => [saved, ...prev]);
      }

      const analysis = await api.analyze({
        resumeText,
        jobText,
        jobTitle: jobTitle || undefined,
        resumeId: linkedId,
      });
      setResult(analysis);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analyze</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Paste your résumé and a job description. We extract the ATS keywords, score your fit, and can rewrite honestly.
        </p>
      </div>

      <Card className="p-5">
        <form onSubmit={analyze} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="resume-select">Résumé</Label>
              <select
                id="resume-select"
                value={resumeId}
                onChange={(e) => onPickResume(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
              >
                <option value="">Paste new résumé…</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="job-title">Job title (optional)</Label>
              <Input
                id="job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Senior Frontend Engineer"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="resume-text">Résumé text</Label>
            <Textarea
              id="resume-text"
              rows={10}
              required
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your résumé as plain text…"
            />
            {!resumeId && (
              <label className="mt-2 flex items-center gap-2 text-xs text-[var(--color-muted)]">
                <input
                  type="checkbox"
                  checked={saveAfter}
                  onChange={(e) => setSaveAfter(e.target.checked)}
                />
                Save this résumé for reuse
              </label>
            )}
          </div>

          <div>
            <Label htmlFor="job-text">Job description</Label>
            <Textarea
              id="job-text"
              rows={10}
              required
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Paste the full job description…"
            />
          </div>

          <ErrorNotice error={error} />

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Analyzing…' : 'Analyze fit'}
            </Button>
            {busy && <Spinner label="Extracting keywords and scoring…" />}
          </div>
        </form>
      </Card>

      {result && <AnalysisResult initial={result} />}
    </div>
  );
}
