'use client';

import { useEffect, useState } from 'react';
import { api, type Resume } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Input, Label, Textarea } from '@/components/ui';

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[] | null>(null);
  const [label, setLabel] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    api.listResumes().then(setResumes).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await api.createResume({ label: label || 'My résumé', content });
      setResumes((prev) => [created, ...(prev ?? [])]);
      setLabel('');
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save résumé');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setResumes((prev) => (prev ?? []).filter((r) => r.id !== id));
    await api.deleteResume(id).catch(() => load());
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Résumés</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Save multiple versions to reuse when analyzing against different jobs.
        </p>
      </div>

      <Card className="p-5">
        <form onSubmit={add} className="space-y-3">
          <div>
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Master, Senior Frontend"
            />
          </div>
          <div>
            <Label htmlFor="content">Résumé text</Label>
            <Textarea
              id="content"
              rows={8}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your résumé as plain text…"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-bad)]">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save résumé'}
          </Button>
        </form>
      </Card>

      {resumes === null ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : resumes.length === 0 ? (
        <EmptyState title="No résumés saved" hint="Add one above to reuse it in analyses." />
      ) : (
        <div className="space-y-3">
          {resumes.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {r.label}
                    {r.isTailored && <Badge tone="brand">Tailored</Badge>}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">
                    {r.content.slice(0, 200)}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    Updated {new Date(r.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="shrink-0 text-xs text-[var(--color-bad)] hover:underline"
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
