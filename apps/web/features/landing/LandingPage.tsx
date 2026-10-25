'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

import WebThreads from '@/components/WebThreads';
import { buttonVariants } from '@/components/ui/button';
import { useSurface } from '@/hooks/useSurface';
import { WORKSPACE_PATH } from '@/lib/routes';
import { THEMES } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

import styles from './landing.module.css';
import { ThemeSwitcher } from './ThemeSwitcher';
import { TodayPreview } from './TodayPreview';

const GITHUB_URL = 'https://github.com/Mars9563/cadence';
const LINKEDIN_URL = 'https://www.linkedin.com/in/mradulrajsingh';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED_MOTION);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * A short burst (1 -> 0 over ~1.2 s) each time `fire` is called. Drives the
 * threads' brightness so a tick in the preview sends light along them.
 */
function usePulse(disabled: boolean) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);

  const fire = useCallback(() => {
    if (disabled) return;

    const start = performance.now();
    if (frame.current) cancelAnimationFrame(frame.current);

    const step = (now: number) => {
      const t = Math.min((now - start) / 1200, 1);
      setValue(1 - t * t * (3 - 2 * t));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
  }, [disabled]);

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
  }, []);

  return [value, fire] as const;
}

const DAY: { time: string; title: string; text: string; closes?: boolean }[] = [
  {
    time: '07:00',
    title: 'Habits',
    text: 'Every day, or only on the days you choose. Tick them off as you go.',
  },
  {
    time: '11:00',
    title: 'Tasks',
    text: 'Things with a date, and a time when they need one.',
  },
  {
    time: '15:00',
    title: 'Notes',
    text: 'Folders and Markdown for everything you want to keep, open in tabs.',
  },
  {
    time: '22:30',
    title: 'Daily note',
    text: 'One page for the day. What happened, what mattered.',
  },
  {
    time: '04:00',
    title: 'The day closes',
    text: 'Late nights still count as the day before. Then it’s locked: no backfilling. Look back at any day in the calendar.',
    closes: true,
  },
];

function PrimaryAction({ signedIn, className }: { signedIn: boolean; className?: string }) {
  return (
    <Link
      href={signedIn ? WORKSPACE_PATH : '/auth/sign-up'}
      className={buttonVariants({ className: cn('h-11 px-5 text-(length:--cd-text-control)', className) })}
    >
      {signedIn ? 'Open workspace' : 'Create account'}
    </Link>
  );
}

export function LandingPage({ signedIn }: { signedIn: boolean }) {
  useSurface('workspace');

  const reducedMotion = useReducedMotion();
  const [pulse, firePulse] = usePulse(reducedMotion);
  const [share, setShare] = useState(0.3);
  const threads = THEMES[useTheme()].threads;

  return (
    <div className="bg-background text-foreground min-h-dvh overflow-x-clip">
      {/* Header */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1.25rem)] sm:px-8">
        <Link href="/" className="font-serif text-xl font-semibold">
          Cadence
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <ThemeSwitcher className="mr-1 sm:mr-2" />
          {signedIn ? null : (
            <Link
              href="/auth/sign-in"
              className="text-muted-foreground hover:text-foreground px-2 text-(length:--cd-text-control)"
            >
              Sign in
            </Link>
          )}
          <PrimaryAction signedIn={signedIn} className="h-9 px-4" />
        </nav>
      </header>

      {/* Hero: the headline, and a working Today view the threads run into */}
      <section className="relative">
        {/*
          The threads always gather at their canvas's right edge. On wide
          screens the canvas stops just inside the Today card, so the lines
          run into it; on phones they fan across the top behind the headline.
        */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-0 -top-20 bottom-0 lg:right-[39%] lg:[mask-image:linear-gradient(to_right,black_82%,transparent)]',
            styles.fadeIn,
          )}
        >
          <WebThreads
            {...threads}
            speed={reducedMotion ? 0 : 0.35}
            threadCount={7}
            frequency={3.6}
            spread={0.2}
            taper={0.55}
            position={0.5}
            fanMode="right"
            glow={0.012 + pulse * 0.008}
            falloff={0.62}
            thickness={1}
            brightness={0.42 + share * 0.22 + pulse * 0.26}
            opacity={0.85}
            mirror={false}
            shimmer={!reducedMotion}
            grain
            grainIntensity={0.03}
            mouseInteraction={false}
          />
          <div className="from-background absolute inset-x-0 bottom-0 h-40 bg-linear-to-t to-transparent" />
        </div>

        {/* A soft shade so lines never cross the headline at full strength. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-full bg-[radial-gradient(ellipse_55%_60%_at_22%_48%,var(--background)_35%,transparent_100%)] opacity-80 lg:w-[62%]"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-16 pb-24 sm:px-8 lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[1.1fr_0.9fr] lg:pt-8">
          <div>
            <h1 className="font-serif text-[clamp(3.25rem,9vw,6.75rem)] leading-[0.92] font-semibold tracking-[-0.035em]">
              {['A calm', 'daily', 'workspace.'].map((line, index) => (
                <span
                  key={line}
                  className={cn('block', styles.rise)}
                  style={{ animationDelay: `${120 + index * 140}ms` }}
                >
                  {line}
                </span>
              ))}
            </h1>
            <p
              className={cn(
                'text-muted-foreground mt-7 max-w-[34ch] text-lg leading-relaxed',
                styles.rise,
              )}
              style={{ animationDelay: '560ms' }}
            >
              Habits, tasks, a daily journal and notes in one quiet place. It keeps working when
              you’re offline.
            </p>
            <div
              className={cn('mt-9 flex flex-wrap items-center gap-4', styles.rise)}
              style={{ animationDelay: '680ms' }}
            >
              <PrimaryAction signedIn={signedIn} />
              {signedIn ? null : (
                <Link
                  href="/auth/sign-in"
                  className="text-muted-foreground hover:text-foreground text-(length:--cd-text-control) underline-offset-4 hover:underline"
                >
                  I already have an account
                </Link>
              )}
            </div>
          </div>

          <div className={cn('flex justify-center lg:justify-end', styles.rise)} style={{ animationDelay: '420ms' }}>
            <TodayPreview onTick={firePulse} onProgress={setShare} />
          </div>
        </div>
      </section>

      {/* A day in Cadence: a real sequence, so it reads as a timeline */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <h2 className="font-serif text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
          A day in Cadence
        </h2>
        <p className="text-muted-foreground mt-4 max-w-[52ch] text-lg leading-relaxed">
          Everything lives on the same day, and the day ends when you say it does.
        </p>

        <ol className="relative mt-14 grid gap-10 lg:grid-cols-5 lg:gap-6">
          <span
            aria-hidden="true"
            className="from-border via-border to-[var(--cd-warning)] absolute top-[0.9rem] left-[0.45rem] h-[calc(100%-1rem)] w-px bg-linear-to-b lg:top-[0.45rem] lg:left-0 lg:h-px lg:w-full lg:bg-linear-to-r"
          />
          {DAY.map((stop) => (
            <li key={stop.time} className="relative pl-8 lg:pt-8 lg:pl-0">
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-[0.55rem] left-0 grid size-[0.95rem] place-items-center rounded-full border-2 lg:top-0',
                  stop.closes
                    ? 'border-[var(--cd-warning)] bg-background'
                    : 'border-primary bg-background',
                )}
              />
              <p
                className={cn(
                  'font-serif text-3xl font-semibold tabular-nums',
                  stop.closes && 'text-[var(--cd-warning)]',
                )}
              >
                {stop.time}
              </p>
              <h3 className="mt-2 flex items-center gap-1.5 font-medium">
                {stop.closes ? <Lock className="size-3.5" aria-hidden="true" /> : null}
                {stop.title}
              </h3>
              <p className="text-muted-foreground mt-1.5 text-(length:--cd-text-control) leading-relaxed">
                {stop.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Anywhere */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
            Works offline. Fits your phone.
          </h2>
          <p className="text-muted-foreground mt-5 max-w-[46ch] text-lg leading-relaxed">
            Every change is saved on your device first and syncs when you’re back online, so a bad
            connection never costs you a tick. On a phone, Cadence gets its own layout: a tab bar
            for your day, and a swipe for your folders.
          </p>
          <p className="text-muted-foreground mt-4 max-w-[46ch] text-lg leading-relaxed">
            And it follows your time zone, so “today” is always your today.
          </p>
        </div>

        <PhoneMock />
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-28 text-center sm:px-8">
        <h2 className="font-serif text-[clamp(3rem,8vw,5.5rem)] leading-none font-semibold tracking-[-0.03em]">
          Start today.
        </h2>
        <p className="text-muted-foreground mx-auto mt-5 max-w-[40ch] text-lg">
          Free, and your data is yours: download it or delete it whenever you like.
        </p>
        <div className="mt-9 flex justify-center">
          <PrimaryAction signedIn={signedIn} />
        </div>
      </section>

      <footer className="border-border/60 border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-(length:--cd-text-ui) sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            Built by Mradul Raj Singh ·{' '}
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-foreground underline-offset-4 hover:underline">
              GitHub
            </a>{' '}
            ·{' '}
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="hover:text-foreground underline-offset-4 hover:underline">
              LinkedIn
            </a>
          </p>
          <p className="flex gap-5">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** A still of the phone layout (decorative; the live preview is in the hero). */
function PhoneMock() {
  const rows = [
    ['Stretch', true],
    ['Read for 20 minutes', true],
    ['Send the weekly report', false],
    ['Water the plants', false],
  ] as const;

  return (
    <div aria-hidden="true" className="flex justify-center lg:justify-end">
      <div className="border-border/80 bg-surface-raised relative w-[17.5rem] rounded-[2.6rem] border p-3 shadow-[var(--cd-shadow-popover)]">
        <div className="bg-background overflow-hidden rounded-[2.1rem]">
          <div className="flex justify-center pt-3">
            <span className="bg-surface-raised h-5 w-24 rounded-full" />
          </div>
          <div className="px-5 pt-5 pb-4">
            <p className="font-serif text-2xl font-semibold">Today</p>
            <p className="text-faint-foreground text-(length:--cd-text-meta)">2 of 4 done</p>
            <ul className="mt-4 grid gap-1">
              {rows.map(([title, done]) => (
                <li key={title} className="flex items-center gap-3 py-2">
                  <span
                    className={cn(
                      'size-4 rounded-full border',
                      done ? 'border-primary bg-primary' : 'border-muted-foreground/60',
                    )}
                  />
                  <span
                    className={cn(
                      'text-(length:--cd-text-ui)',
                      done && 'text-muted-foreground line-through',
                    )}
                  >
                    {title}
                  </span>
                </li>
              ))}
            </ul>
            <div className="bg-fill-hover mt-5 rounded-xl p-3">
              <p className="text-(length:--cd-text-meta) font-medium">Daily note</p>
              <p className="text-muted-foreground mt-1 text-(length:--cd-text-meta) leading-relaxed">
                Slow morning. Finished the report draft before lunch…
              </p>
            </div>
          </div>
          <div className="border-border/70 flex justify-around border-t py-3">
            {['Dashboard', 'Notes', 'Settings'].map((tab, index) => (
              <span
                key={tab}
                className={cn(
                  'text-(length:--cd-text-meta)',
                  index === 0 ? 'text-foreground' : 'text-faint-foreground',
                )}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
