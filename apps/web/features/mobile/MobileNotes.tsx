'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useActiveNoteId } from '@/store/selectors';
import { cn } from '@/lib/utils';

import { NotesWorkspace } from '../notes/Editor/NotesWorkspace';
import { FileSystemPanel } from '../notes/FileSystem/FileSystemPanel';
import { MobileNotesContext } from './MobileNotesContext';
import { MobileTabBar } from './MobileTabBar';

/* ── gesture tuning ────────────────────────────────────────────────────── */

/** Movement before deciding whether a touch is a swipe or a scroll. */
const DECIDE_DISTANCE = 10;

/** A swipe must be this much more horizontal than vertical. */
const HORIZONTAL_BIAS = 1.2;

/** Release past this share of the drawer (or flick faster) to settle open. */
const OPEN_THRESHOLD = 0.35;
const FLICK_VELOCITY = 0.45; // px per ms

/** True when the touch starts in something that scrolls sideways itself. */
function startsInHorizontalScroller(target: EventTarget | null, stop: Element) {
  for (
    let element = target instanceof Element ? target : null;
    element && element !== stop;
    element = element.parentElement
  ) {
    const { overflowX } = getComputedStyle(element);

    if (
      (overflowX === 'auto' || overflowX === 'scroll') &&
      element.scrollWidth > element.clientWidth + 1
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Notes on phones, Obsidian-style: the note fills the screen; swiping right
 * anywhere on it (or the folders button) pulls the tree in from the left,
 * pushing the note aside. The drawer follows the finger and settles open
 * or closed on release. Tapping the visible strip of note, or opening a
 * note, closes it. The bottom tab bar lives inside the drawer, so writing
 * stays full-screen.
 */
export function MobileNotes() {
  const activeNoteId = useActiveNoteId();

  const containerRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  /** Drawer offset in px while a finger drags it; null when settled. */
  const [drag, setDrag] = useState<number | null>(null);
  const [width, setWidth] = useState(320);

  const openTree = useCallback(() => setOpen(true), []);
  const closeTree = useCallback(() => setOpen(false), []);

  // Drawer width: most of the screen, like Obsidian, capped on large phones.
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const measure = () =>
      setWidth(Math.min(Math.round(container.clientWidth * 0.86), 360));

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Opening (or creating) a note closes the drawer.
  const lastActive = useRef(activeNoteId);

  useEffect(() => {
    if (activeNoteId !== lastActive.current) {
      lastActive.current = activeNoteId;
      setOpen(false);
    }
  }, [activeNoteId]);

  /*
   * Swipe tracking. Native listeners (not React's) because touchmove must be
   * non-passive to stop the page scrolling once a horizontal swipe is
   * recognised.
   */
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let mode: 'undecided' | 'swipe' | 'ignore' = 'ignore';
    let openAtStart = false;
    let offset = 0;

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        mode = 'ignore';
        return;
      }

      const touch = event.touches[0]!;

      startX = touch.clientX;
      startY = touch.clientY;
      startTime = event.timeStamp;
      openAtStart = container.dataset.open === 'true';
      offset = openAtStart ? width : 0;

      mode = startsInHorizontalScroller(event.target, container)
        ? 'ignore'
        : 'undecided';
    };

    const onMove = (event: TouchEvent) => {
      if (mode === 'ignore') return;

      const touch = event.touches[0]!;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (mode === 'undecided') {
        if (Math.abs(dx) < DECIDE_DISTANCE && Math.abs(dy) < DECIDE_DISTANCE) {
          return;
        }

        const horizontal = Math.abs(dx) > Math.abs(dy) * HORIZONTAL_BIAS;
        // Closed: only a rightward swipe opens. Open: only leftward closes.
        const rightWay = openAtStart ? dx < 0 : dx > 0;

        mode = horizontal && rightWay ? 'swipe' : 'ignore';

        if (mode === 'ignore') return;
      }

      event.preventDefault();

      offset = Math.min(Math.max((openAtStart ? width : 0) + dx, 0), width);
      setDrag(offset);
    };

    const onEnd = (event: TouchEvent) => {
      if (mode !== 'swipe') {
        mode = 'ignore';
        return;
      }

      const elapsed = Math.max(event.timeStamp - startTime, 1);
      const velocity = (offset - (openAtStart ? width : 0)) / elapsed;

      const settleOpen =
        velocity > FLICK_VELOCITY ||
        (velocity > -FLICK_VELOCITY && offset > width * OPEN_THRESHOLD);

      setOpen(settleOpen);
      setDrag(null);
      mode = 'ignore';
    };

    container.addEventListener('touchstart', onStart, { passive: true });
    container.addEventListener('touchmove', onMove, { passive: false });
    container.addEventListener('touchend', onEnd);
    container.addEventListener('touchcancel', onEnd);

    return () => {
      container.removeEventListener('touchstart', onStart);
      container.removeEventListener('touchmove', onMove);
      container.removeEventListener('touchend', onEnd);
      container.removeEventListener('touchcancel', onEnd);
    };
  }, [width]);

  const offset = drag ?? (open ? width : 0);
  const dragging = drag !== null;
  const revealed = offset > 0;

  return (
    <MobileNotesContext.Provider value={{ openTree, closeTree }}>
      <div
        ref={containerRef}
        data-open={open}
        className="bg-background relative h-dvh overflow-hidden"
      >
        {/* Folder tree (drawer), sliding in from the left */}
        <aside
          aria-label="Folders"
          aria-hidden={!open && !dragging}
          inert={!open && !dragging}
          style={{ width, transform: `translateX(${offset - width}px)` }}
          className={cn(
            'bg-sidebar absolute inset-y-0 left-0 z-10 flex flex-col border-r border-border/70 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]',
            !dragging && 'transition-transform duration-(--cd-duration-base) ease-(--cd-ease)',
          )}
        >
          <div className="min-h-0 flex-1">
            <FileSystemPanel />
          </div>

          <MobileTabBar />
        </aside>

        {/* The note, pushed aside while the drawer is out */}
        <div
          ref={noteRef}
          style={{ transform: `translateX(${offset}px)` }}
          className={cn(
            'absolute inset-0 flex flex-col pt-[env(safe-area-inset-top)]',
            !dragging && 'transition-transform duration-(--cd-duration-base) ease-(--cd-ease)',
          )}
        >
          <div className="min-h-0 flex-1">
            <NotesWorkspace />
          </div>

          {/* Visible strip of note: tap to close the drawer */}
          {revealed ? (
            <button
              type="button"
              aria-label="Close folders"
              onClick={closeTree}
              className="absolute inset-0 z-20 cursor-default bg-transparent"
            />
          ) : null}
        </div>
      </div>
    </MobileNotesContext.Provider>
  );
}
