'use client';

import { useState, type ComponentProps, type ReactNode } from 'react';
import { CircleAlert, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { FaGithub, FaGoogle } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type OAuthProvider = 'google' | 'github';

/* ── header ─────────────────────────────────────────────────────────────── */

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-8">
      <h1 className="font-serif text-[1.75rem] leading-tight font-semibold tracking-[-0.01em]">
        {title}
      </h1>
      <p className="text-muted-foreground mt-2 text-(length:--cd-text-control) leading-relaxed">
        {subtitle}
      </p>
    </header>
  );
}

/* ── text field ─────────────────────────────────────────────────────────── */

type AuthTextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  /** Adds a show/hide toggle (password fields). */
  revealable?: boolean;
};

/**
 * Label above, icon inside, error below (linked with aria-describedby).
 * Spreads input props, so it works with react-hook-form's `field`.
 */
export function AuthTextField({
  id,
  label,
  icon: Icon,
  error,
  revealable = false,
  type = 'text',
  className,
  ...inputProps
}: AuthTextFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-foreground text-(length:--cd-text-ui) font-medium">
        {label}
      </label>

      <div className="relative">
        <Icon
          aria-hidden="true"
          className="text-faint-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />

        <Input
          {...inputProps}
          id={id}
          type={revealable && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'bg-background/60 h-10 pl-9 text-(length:--cd-text-control)',
            revealable && 'pr-10',
            className,
          )}
        />

        {revealable ? (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className="text-faint-foreground hover:text-foreground focus-visible:ring-primary/60 absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm outline-none focus-visible:ring-1"
          >
            {revealed ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} className="text-destructive text-(length:--cd-text-meta)">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ── feedback ───────────────────────────────────────────────────────────── */

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="bg-destructive/10 text-destructive flex gap-2.5 rounded-md px-3 py-2.5 text-(length:--cd-text-ui) leading-relaxed"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

/* ── oauth ──────────────────────────────────────────────────────────────── */

export function AuthDivider() {
  return (
    <div className="text-faint-foreground flex items-center gap-3 text-(length:--cd-text-meta)">
      <span className="bg-border/70 h-px flex-1" />
      or
      <span className="bg-border/70 h-px flex-1" />
    </div>
  );
}

export function OAuthButtons({
  busy,
  pending,
  onSelect,
}: {
  busy: boolean;
  pending: OAuthProvider | null;
  onSelect: (provider: OAuthProvider) => void;
}) {
  const providers: { id: OAuthProvider; label: string; icon: ReactNode }[] = [
    { id: 'google', label: 'Google', icon: <FaGoogle aria-hidden="true" /> },
    { id: 'github', label: 'GitHub', icon: <FaGithub aria-hidden="true" /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="outline"
          className="h-10 gap-2 text-(length:--cd-text-ui)"
          disabled={busy}
          onClick={() => onSelect(provider.id)}
        >
          {provider.icon}
          {pending === provider.id ? 'Opening…' : provider.label}
        </Button>
      ))}
    </div>
  );
}
