'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { MdSpaceDashboard } from 'react-icons/md';

import WebThreads from '@/components/WebThreads';
import { useSurface } from '@/hooks/useSurface';

type AuthShellProps = {
  /** Serif line over the threads (large screens). */
  headline: string;
  /** One supporting sentence under the headline. */
  lede: string;
  children: ReactNode;
};

/*
 * Thread palette: deep sage into the accent, with the primary text colour
 * where threads overlap. Kept in sync with the --cd-* tokens by hand because
 * the WebGL shader takes hex values, not CSS variables.
 */
const THREADS = {
  color1: '#6F8468',
  color2: '#B8C5B0',
  color3: '#D3DCCB',
} as const;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** True when the user asked for reduced motion (false on the server). */
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * Sign-in / sign-up frame.
 *
 * Large screens: the threads fill the left side and converge on the seam
 * where the form panel begins, so the lines lead into the form. Small
 * screens: the same threads as a short band above the form.
 */
export function AuthShell({ headline, lede, children }: AuthShellProps) {
  useSurface('workspace');

  const reducedMotion = useReducedMotion();
  const speed = reducedMotion ? 0 : 0.05;

  return (
    <main className="bg-background text-foreground grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(420px,34rem)]">
      {/* Art (large screens) */}
      <section
        aria-hidden="true"
        className="relative hidden overflow-hidden lg:block"
      >
        <div className="absolute inset-0">
          <WebThreads
            {...THREADS}
            speed={speed}
            threadCount={6}
            frequency={4.2}
            spread={0.26}
            taper={0.55}
            position={0.52}
            fanMode="right"
            glow={0.016}
            falloff={0.62}
            thickness={1}
            brightness={0.55}
            opacity={0.9}
            mirror={false}
            shimmer={!reducedMotion}
            grain
            grainIntensity={0.03}
            mouseInteraction={!reducedMotion}
            mouseStrength={0.14}
          />
        </div>

        {/* Keep the brand and headline legible where threads pass behind. */}
        <div className="from-background/90 pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b to-transparent" />
        <div className="from-background via-background/70 pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t to-transparent" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Brand />

          <div className="max-w-md">
            <p className="font-serif text-[2.5rem] leading-[1.1] font-semibold tracking-[-0.015em] text-balance xl:text-5xl">
              {headline}
            </p>
            <p className="text-muted-foreground mt-4 max-w-sm text-(length:--cd-text-control) leading-relaxed">
              {lede}
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="bg-sidebar flex min-h-dvh flex-col lg:border-l lg:border-border/70">
        {/* Threads band (small screens) */}
        <div aria-hidden="true" className="relative h-48 shrink-0 overflow-hidden lg:hidden">
          <WebThreads
            {...THREADS}
            speed={speed}
            threadCount={5}
            frequency={2.6}
            spread={0.42}
            taper={0.5}
            position={0.5}
            fanMode="center"
            glow={0.014}
            falloff={0.62}
            brightness={0.5}
            opacity={0.85}
            mirror
            shimmer={false}
            grain={false}
            mouseInteraction={false}
          />
          <div className="from-sidebar pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t to-transparent" />
          <div className="absolute top-[calc(env(safe-area-inset-top)+1.25rem)] left-6">
            <Brand />
          </div>
        </div>

        <div className="flex flex-1 justify-center px-6 pt-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-10 lg:items-center lg:py-10">
          <div className="w-full max-w-[22rem]">
            {children}

            <p className="text-faint-foreground mt-10 flex gap-4 text-(length:--cd-text-meta)">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-surface-raised text-primary flex size-7 items-center justify-center rounded-md">
        <MdSpaceDashboard size={16} aria-hidden="true" />
      </div>
      <span className="text-(length:--cd-text-control) font-semibold">Cadence</span>
    </div>
  );
}
