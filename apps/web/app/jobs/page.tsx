'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type Job } from '@/lib/api';
import { Badge, Button, Card, EmptyState } from '@/components/ui';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api
      .listJobs()
      .then(setJobs)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Manually added for now — the Job Finder (M1) will feed these automatically.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : '+ Add job'}</Button>
      </div>

      {error && <Card className="p-4 text-sm text-[var(--color-bad)]">{error}</Card>}

      {showForm && (
        <AddJobForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {jobs === null ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : jobs.length === 0 ? (
        <EmptyState title="No jobs yet" hint="Click “Add job” to paste a description." />
      ) : (
        <div className="grid gap-3">
          {jobs.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`}>
              <Card className="flex items-center justify-between gap-4 p-4 transition hover:border-[var(--color-brand)]">
                <div className="min-w-0">
                  <p className="truncate font-medium">{j.title}</p>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {j.company?.name ?? 'Unknown'}
                    {j.location ? ` · ${j.location}` : ''}
                    {j.salaryText ? ` · ${j.salaryText}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{j.source}</Badge>
                  {j.analysis ? <Badge tone="good">Analyzed</Badge> : <Badge tone="warn">New</Badge>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddJobForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [descriptionRaw, setDescriptionRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.createJob({
        title,
        descriptionRaw,
        companyName: companyName || undefined,
        location: location || undefined,
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]';

  return (
    <Card className="space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          className={input}
          placeholder="Job title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className={input}
          placeholder="Company"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <input
          className={input}
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <textarea
        className={`${input} min-h-40 font-mono text-xs`}
        placeholder="Paste the full job description here *"
        value={descriptionRaw}
        onChange={(e) => setDescriptionRaw(e.target.value)}
      />
      {err && <p className="text-sm text-[var(--color-bad)]">{err}</p>}
      <div className="flex justify-end">
        <Button onClick={submit} disabled={busy || !title || !descriptionRaw}>
          {busy ? 'Saving…' : 'Save job'}
        </Button>
      </div>
    </Card>
  );
}
