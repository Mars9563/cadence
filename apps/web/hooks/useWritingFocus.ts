'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Focus inside the document text, the toolbar, or one of its popups. */
function isWriting(pane: HTMLElement, element: Element | null) {
  if (!element) return false;

  if (element.closest('.mdxeditor-popup-container')) return true;

  return (
    pane.contains(element) &&
    (element.closest('[contenteditable="true"]') !== null ||
      element.closest('.mdxeditor-toolbar') !== null)
  );
}

/**
 * True while the user is writing in this editor pane (the document body has
 * focus, or its toolbar / a toolbar popup does). Phones use it to show the
 * formatting toolbar above the keyboard only while typing.
 *
 * Also keeps the keyboard up: tapping a toolbar button would move focus to
 * the button and close the on-screen keyboard, so the mousedown that would
 * take focus is cancelled (the click still runs the command). The block
 * type picker is left alone; it needs focus for its list.
 */
export function useWritingFocus(paneRef: RefObject<HTMLElement | null>) {
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    const pane = paneRef.current;

    if (!pane) return;

    const check = () => setWriting(isWriting(pane, document.activeElement));

    // On focusout the next element is not focused yet: check after it is.
    const onFocusOut = () => setTimeout(check, 0);

    const keepFocus = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest(
        '.mdxeditor-toolbar button',
      );

      if (button && button.getAttribute('role') !== 'combobox') {
        event.preventDefault();
      }
    };

    document.addEventListener('focusin', check);
    document.addEventListener('focusout', onFocusOut);
    pane.addEventListener('mousedown', keepFocus, true);

    return () => {
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', onFocusOut);
      pane.removeEventListener('mousedown', keepFocus, true);
    };
  }, [paneRef]);

  return writing;
}
