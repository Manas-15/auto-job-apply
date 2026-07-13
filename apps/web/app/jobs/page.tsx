'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type Job } from '@/lib/api';
import { Badge, Button, Card, EmptyState } from '@/components/ui';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('react developer');
  const [discovering, setDiscovering] = useState(false);
  const [discoverMsg, setDiscoverMsg] = useState<string | null>(null);

  const [naukriBusy, setNaukriBusy] = useState(false);
  const [naukriMsg, setNaukriMsg] = useState<string | null>(null);
  const [naukriErr, setNaukriErr] = useState<string | null>(null);

  // Location filter — pre-filled with the user's target cities.
  const [locFilter, setLocFilter] = useState(
    'Bengaluru, Bangalore, Mumbai, Pune, Hyderabad, Kolkata, Bhubaneswar',
  );
  const [locOn, setLocOn] = useState(true);

  const load = () => {
    api
      .listJobs()
      .then(setJobs)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const discover = async () => {
    setDiscovering(true);
    setDiscoverMsg(null);
    setError(null);
    try {
      const r = await api.discoverJobs({ query, limit: 25 });
      setDiscoverMsg(
        `Found ${r.fetched} jobs for “${r.query}” — ${r.created} new, ${r.updated} updated.`,
      );
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDiscovering(false);
    }
  };

  const scrapeNaukri = async () => {
    setNaukriBusy(true);
    setNaukriMsg(null);
    setNaukriErr(null);
    try {
      const r = await api.scrapeNaukri({ query, limit: 25 });
      setNaukriMsg(
        `Naukri: ${r.fetched} jobs for “${r.query}” — ${r.created} new, ${r.updated} updated.`,
      );
      load();
    } catch (e) {
      setNaukriErr((e as Error).message);
    } finally {
      setNaukriBusy(false);
    }
  };

  const cities = locFilter
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  const visibleJobs = (jobs ?? []).filter((j) => {
    if (!locOn || cities.length === 0) return true;
    const loc = (j.location ?? '').toLowerCase();
    if (!loc) return false;
    return cities.some((c) => loc.includes(c));
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Discover real jobs from free sources, or paste one manually.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : '+ Add manually'}
        </Button>
      </div>

      {/* Job Finder (M1) */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm font-medium">Discover jobs</span>
        <input
          className="min-w-48 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. react developer, frontend, next.js"
          onKeyDown={(e) => e.key === 'Enter' && discover()}
        />
        <Button onClick={discover} disabled={discovering || !query.trim()}>
          {discovering ? 'Searching…' : 'Search sources'}
        </Button>
        <span className="w-full text-xs text-[var(--color-muted)]">
          Free sources (Remotive, RemoteOK) — no login needed.
        </span>
        {discoverMsg && (
          <span className="w-full text-xs text-[var(--color-good)]">{discoverMsg}</span>
        )}
      </Card>

      {/* Naukri (M1) — session-based scrape of your own account */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm font-medium">Scrape Naukri</span>
        <span className="flex-1 text-xs text-[var(--color-muted)]">
          Uses the query above and your saved Naukri login session.
        </span>
        <Button variant="ghost" onClick={scrapeNaukri} disabled={naukriBusy || !query.trim()}>
          {naukriBusy ? 'Scraping…' : 'Scrape Naukri'}
        </Button>
        <span className="w-full text-xs text-[var(--color-muted)]">
          Run{' '}
          <code className="rounded bg-[var(--color-surface-2)] px-1">
            npm run naukri:login --workspace @aja/api
          </code>{' '}
          once to sign in. Your password is never stored. Automating your account may violate
          Naukri&apos;s ToS.
        </span>
        {naukriMsg && (
          <span className="w-full text-xs text-[var(--color-good)]">{naukriMsg}</span>
        )}
        {naukriErr && (
          <span className="w-full text-xs text-[var(--color-bad)]">
            {naukriErr}
            {naukriErr.includes('session') && (
              <span className="text-[var(--color-muted)]">
                {' '}
                — run the login command above first.
              </span>
            )}
          </span>
        )}
      </Card>

      {error && <Card className="p-4 text-sm text-[var(--color-bad)]">{error}</Card>}

      {showForm && (
        <AddJobForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {/* Location filter */}
      {jobs && jobs.length > 0 && (
        <Card className="flex flex-wrap items-center gap-3 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={locOn}
              onChange={(e) => setLocOn(e.target.checked)}
              className="accent-[var(--color-brand)]"
            />
            Filter by location
          </label>
          <input
            className="min-w-64 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-brand)] disabled:opacity-50"
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            disabled={!locOn}
            placeholder="Comma-separated cities"
          />
          <span className="text-xs text-[var(--color-muted)]">
            {visibleJobs.length} of {jobs.length} shown
          </span>
        </Card>
      )}

      {jobs === null ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : jobs.length === 0 ? (
        <EmptyState title="No jobs yet" hint="Click “Add job” to paste a description." />
      ) : visibleJobs.length === 0 ? (
        <EmptyState
          title="No jobs in those locations"
          hint="Adjust or turn off the location filter above."
        />
      ) : (
        <div className="grid gap-3">
          {visibleJobs.map((j) => (
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
