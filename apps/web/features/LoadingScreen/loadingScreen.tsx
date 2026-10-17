'use client';

import { Orb } from '@yogesharc/thinking-orbs';
import { halftone } from '@yogesharc/thinking-orbs/renders';
import { RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useSurface } from '@/hooks/useSurface';
import { cn } from '@/lib/utils';

import './loadingScreen.css';

/** The real steps of the first load, in order (see AppBootstrap). */
export type LoadStep = 'session' | 'profile' | 'data' | 'sync' | 'done';

export type LoadPhase =
  | { kind: 'step'; step: LoadStep }
  | { kind: 'offline' }
  | { kind: 'error'; message: string };

type OrbState = React.ComponentProps<typeof Orb>['state'];

/*
 * Each step has its own orb behaviour, so the animation says what is
 * actually happening rather than spinning for its own sake.
 */
const STEPS: Record<
  LoadStep,
  { orb: OrbState; speed: number; label: string }
> = {
  session: { orb: 'searching', speed: 0.9, label: 'Checking your session' },
  profile: { orb: 'working', speed: 0.9, label: 'Finding your day' },
  data: { orb: 'background', speed: 0.8, label: 'Gathering habits, tasks and notes' },
  sync: { orb: 'compacting', speed: 0.9, label: 'Syncing changes from this device' },
  done: { orb: 'base', speed: 0.6, label: 'Ready' },
};

const ORDER: LoadStep[] = ['session', 'profile', 'data', 'sync'];

type LoadingScreenProps = {
  phase: LoadPhase;

  /** Fading out over the app that is now ready underneath. */
  exiting?: boolean;

  onRetry?: () => void;
};

/**
 * First-load screen: a large orb whose state follows the real loading
 * steps, over a slow halftone orb for depth, with one quiet status line.
 * Only ever shown before the app's first successful load.
 */
export function LoadingScreen({ phase, exiting = false, onRetry }: LoadingScreenProps) {
  useSurface('workspace');

  const step = phase.kind === 'step' ? phase.step : null;

  const orb: { state: OrbState; speed: number; paused?: boolean } =
    phase.kind === 'offline'
      ? { state: 'waiting', speed: 0.5 }
      : phase.kind === 'error'
        ? { state: 'retrying', speed: 0.7 }
        : { state: STEPS[phase.step].orb, speed: STEPS[phase.step].speed };

  const message =
    phase.kind === 'offline'
      ? 'You’re offline. Cadence opens as soon as the connection is back.'
      : phase.kind === 'error'
        ? phase.message
        : STEPS[phase.step].label;

  const currentIndex = step ? ORDER.indexOf(step) : -1;

  return (
    <div
      className={cn('cd-loader', exiting && 'is-exiting')}
      aria-busy={!exiting}
    >
      <div className="cd-loader-stage" aria-hidden="true">
        {/* Depth: a large, slow, faint engraving of the same sphere. */}
        <Orb
          state="background"
          render={halftone}
          size={340}
          speed={0.35}
          density={1.2}
          tilt={28}
          className="cd-loader-backdrop"
        />

        <Orb
          state={orb.state}
          size={132}
          speed={orb.speed}
          density={1.6}
          dotSize={1.15}
          tilt={22}
          className={cn(
            'cd-loader-orb',
            phase.kind === 'error' && 'is-error',
            phase.kind === 'offline' && 'is-offline',
          )}
        />
      </div>

      <div className="cd-loader-copy">
        <p className="cd-loader-wordmark">Cadence</p>

        {/* Keyed so each new step's line fades in. */}
        <p key={message} className="cd-loader-status" role="status" aria-live="polite">
          {message}
        </p>

        {phase.kind === 'step' && phase.step !== 'done' ? (
          <ol className="cd-loader-steps" aria-label="Loading progress">
            {ORDER.map((name, index) => (
              <li
                key={name}
                aria-label={STEPS[name].label}
                aria-current={index === currentIndex ? 'step' : undefined}
                data-state={
                  index < currentIndex
                    ? 'done'
                    : index === currentIndex
                      ? 'current'
                      : 'pending'
                }
              />
            ))}
          </ol>
        ) : null}

        {phase.kind === 'error' && onRetry ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 text-(length:--cd-text-ui)"
            onClick={onRetry}
          >
            <RotateCw aria-hidden="true" />
            Try again
          </Button>
        ) : null}
      </div>
    </div>
  );
}
