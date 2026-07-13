'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function StatusBar() {
  const [health, setHealth] = useState<{ db: string; aiProvider: string } | null>(null);
  const [down, setDown] = useState(false);

  useEffect(() => {
    api
      .health()
      .then((h) => setHealth(h))
      .catch(() => setDown(true));
  }, []);

  return (
    <div className="flex items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-2 text-xs text-[var(--color-muted)]">
      {down ? (
        <span className="text-[var(--color-bad)]">● API unreachable — is the backend running on :4000?</span>
      ) : health ? (
        <>
          <span>
            <span className={health.db === 'up' ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]'}>
              ●
            </span>{' '}
            DB {health.db}
          </span>
          <span>AI provider: {health.aiProvider}</span>
        </>
      ) : (
        <span>Connecting…</span>
      )}
    </div>
  );
}
