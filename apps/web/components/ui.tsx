import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'brand';
}) {
  const tones: Record<string, string> = {
    default: 'bg-[var(--color-surface-2)] text-[var(--color-muted)]',
    good: 'bg-[color-mix(in_oklab,var(--color-good)_18%,transparent)] text-[var(--color-good)]',
    warn: 'bg-[color-mix(in_oklab,var(--color-warn)_18%,transparent)] text-[var(--color-warn)]',
    bad: 'bg-[color-mix(in_oklab,var(--color-bad)_18%,transparent)] text-[var(--color-bad)]',
    brand: 'bg-[color-mix(in_oklab,var(--color-brand)_20%,transparent)] text-[#a5b4fc]',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function scoreTone(score: number): 'good' | 'warn' | 'bad' {
  if (score >= 85) return 'good';
  if (score >= 60) return 'warn';
  return 'bad';
}

export function ScoreRing({ score, size = 92 }: { score: number; size?: number }) {
  const tone = scoreTone(score);
  const color = `var(--color-${tone})`;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xl font-semibold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  type?: 'button' | 'submit';
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary:
      'bg-[var(--color-brand)] text-white hover:bg-[color-mix(in_oklab,var(--color-brand)_88%,white)]',
    ghost:
      'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid place-items-center gap-1 rounded-xl border border-dashed border-[var(--color-border)] p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}
