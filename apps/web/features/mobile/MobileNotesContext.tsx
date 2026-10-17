'use client';

import { createContext, useContext } from 'react';

type MobileNotesContextValue = {
  openTree: () => void;
  closeTree: () => void;
};

export const MobileNotesContext = createContext<MobileNotesContextValue | null>(
  null,
);

/**
 * Non-null only inside the phone Notes layout (MobileNotes). Lets the
 * editor header, the empty state and the tree add their phone-only bits
 * (the folders button, closing the drawer when a note opens) without prop
 * drilling.
 */
export function useMobileNotes() {
  return useContext(MobileNotesContext);
}
