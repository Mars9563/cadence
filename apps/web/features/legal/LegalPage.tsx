'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { useSurface } from '@/hooks/useSurface';

export const LEGAL_OPERATOR = 'Mradul Raj Singh, India';
export const LEGAL_CONTACT = 'support@mrsdev.in';
export const LEGAL_EFFECTIVE_DATE = '27 October 2026';

/** Shared frame for the Privacy Policy and Terms: readable prose, app theme, learning-project notice. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  useSurface('workspace');

  return (
    <main className="bg-background text-foreground min-h-dvh px-5 pt-[max(env(safe-area-inset-top),2.5rem)] pb-16 sm:px-8">
      <article className="mx-auto max-w-2xl">
        <nav className="text-muted-foreground mb-10 flex items-center justify-between text-(length:--cd-text-ui)">
          <Link href="/" className="text-foreground font-medium">
            Cadence
          </Link>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </span>
        </nav>

        <h1 className="font-serif text-4xl font-semibold tracking-[-0.01em]">{title}</h1>
        <p className="text-muted-foreground mt-3 text-(length:--cd-text-ui)">
          Effective {LEGAL_EFFECTIVE_DATE} · Operated by {LEGAL_OPERATOR} · Contact{' '}
          <a href={`mailto:${LEGAL_CONTACT}`} className="text-foreground underline underline-offset-4">
            {LEGAL_CONTACT}
          </a>
        </p>

        <aside className="border-border bg-card text-card-foreground mt-8 rounded-lg border p-4 text-(length:--cd-text-control) leading-relaxed">
          <strong>Cadence is a personal learning and portfolio project</strong>, built and run by one
          developer to practise building a real product. It is not a commercial service. Your data
          is handled with care, but its safety, availability and permanence are not guaranteed: there
          are no backups, and the project may be reset or shut down at any time. Please do not store
          anything sensitive or anything you cannot afford to lose.
        </aside>

        <div className="mt-10 grid gap-8 text-(length:--cd-text-control) leading-relaxed [&_h2]:text-foreground [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul]:mt-2 [&_ul]:grid [&_ul]:gap-1.5 text-muted-foreground">
          {children}
        </div>
      </article>
    </main>
  );
}
