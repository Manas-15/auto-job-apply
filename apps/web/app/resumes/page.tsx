'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type Resume } from '@/lib/api';
import { Badge, Button, Card, EmptyState } from '@/components/ui';

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api
      .listResumes()
      .then((r) => {
        setResumes(r);
        // Pre-fill the editor with the current master résumé, if any.
        const master = r.find((x) => x.isMaster);
        if (master?.rawText && !text) setText(master.rawText);
      })
      .catch((e) => setError(e.message));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await api.saveMasterResume({ rawText: text });
      setMsg('Master résumé saved.');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const master = resumes?.find((r) => r.isMaster);
  const tailored = resumes?.filter((r) => !r.isMaster) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Résumés</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Paste your master résumé once. The optimizer tailors it per job (from a job&apos;s page)
          without inventing skills.
        </p>
      </div>

      {error && <Card className="p-4 text-sm text-[var(--color-bad)]">{error}</Card>}

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Master résumé</h2>
          {master && <Badge tone="good">saved</Badge>}
        </div>
        <textarea
          className="min-h-64 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--color-brand)]"
          placeholder="Paste your full résumé as plain text…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-muted)]">{text.length} characters</span>
          <div className="flex items-center gap-3">
            {msg && <span className="text-xs text-[var(--color-good)]">{msg}</span>}
            <Button onClick={save} disabled={busy || !text.trim()}>
              {busy ? 'Saving…' : master ? 'Update master' : 'Save master'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-medium">Tailored résumés</h2>
        {resumes === null ? (
          <p className="text-sm text-[var(--color-muted)]">Loading…</p>
        ) : tailored.length === 0 ? (
          <EmptyState
            title="No tailored résumés yet"
            hint="Open a job → Analyze → “Tailor résumé” to generate one."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {tailored.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                {r.tailoredForJob && (
                  <Link
                    href={`/jobs/${r.tailoredForJob.id}`}
                    className="shrink-0 text-xs text-[#a5b4fc] hover:underline"
                  >
                    View job →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
