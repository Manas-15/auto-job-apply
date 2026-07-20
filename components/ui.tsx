import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';
import { ApiError } from '@/lib/api';

/**
 * Renders an error. When the failure is an AI provider running out of quota, it
 * shows a distinct, actionable callout telling the user to switch AI providers
 * rather than a generic red line.
 */
export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Something went wrong';
  const isQuota = error instanceof ApiError && error.isQuota;
  const isAuth = error instanceof ApiError && error.code === 'AI_AUTH';

  if (isQuota || isAuth) {
    return (
      <div className="rounded-lg border border-[var(--color-warn)] bg-[color-mix(in_oklab,var(--color-warn)_12%,transparent)] p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-warn)]">
          <span aria-hidden>⚠️</span>
          {isQuota ? 'AI quota exceeded' : 'AI key rejected'}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text)]">{message}</p>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Switch AI provider: set <code className="rounded bg-[var(--color-surface-2)] px-1">AI_PROVIDER</code>{' '}
          in <code className="rounded bg-[var(--color-surface-2)] px-1">.env</code> to{' '}
          <code className="rounded bg-[var(--color-surface-2)] px-1">openai</code> (or{' '}
          <code className="rounded bg-[var(--color-surface-2)] px-1">gemini</code>), add that
          provider&apos;s API key, and restart the app.
        </p>
      </div>
    );
  }

  return <p className="text-sm text-[var(--color-bad)]">{message}</p>;
}

const fieldClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-brand)]';

export function Label({ children, className = '', ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`mb-1 block text-xs font-medium text-[var(--color-muted)] ${className}`} {...rest}>
      {children}
    </label>
  );
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClass} resize-y font-mono text-[13px] leading-relaxed ${className}`} {...rest} />;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)]">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}

export function Chips({ items, tone = 'default' }: { items: string[]; tone?: 'good' | 'bad' | 'default' }) {
  if (items.length === 0) return <p className="text-xs text-[var(--color-muted)]">—</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <Badge key={it} tone={tone === 'default' ? 'default' : tone}>
          {it}
        </Badge>
      ))}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] ${className}`}
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
