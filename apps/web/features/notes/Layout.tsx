'use client';

import { useEffect } from 'react';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useIsPhone } from '@/hooks/useIsPhone';
import { useSurface } from '@/hooks/useSurface';
import { useRestoreNoteTabs } from '@/store/selectors';

import { Sidebar } from '../dashboard/Sidebar/Sidebar';
import { MobileNotes } from '../mobile/MobileNotes';
import { NotesWorkspace } from './Editor/NotesWorkspace';
import { FileSystemPanel } from './FileSystem/FileSystemPanel';
import { NoteTreeProvider } from './NoteTreeContext';

/*
 * File-tree column width, in pixels (react-resizable-panels v4 reads plain
 * numbers as pixels). Not persisted: every visit starts at the default.
 */
const TREE_DEFAULT_WIDTH = 272;
const TREE_MIN_WIDTH = 200;
const TREE_MAX_WIDTH = 480;

/**
 * Notes view: icon rail | file-system tree (resizable) | tabbed editor.
 *
 * Edge-to-edge panes on the workspace surface: the rail and tree share the
 * sidebar tone, the editor sits on the quieter canvas, and 1px lines
 * separate them.
 */
export function NotesLayout() {
  const restoreNoteTabs = useRestoreNoteTabs();

  useSurface('workspace');

  const isPhone = useIsPhone();

  /*
   * AppBootstrap only renders the app once the profile and the notes have
   * loaded, so both are available here. Restoring is a no-op after the
   * first time.
   */
  useEffect(() => {
    restoreNoteTabs();
  }, [restoreNoteTabs]);

  // Phones: one note full-screen, the tree in a swipe-out drawer.
  if (isPhone) {
    return (
      <NoteTreeProvider>
        <Sidebar collapsed />
        <MobileNotes />
      </NoteTreeProvider>
    );
  }

  return (
    <NoteTreeProvider>
      <div className="bg-background text-foreground flex h-dvh min-h-0 overflow-hidden">
        <Sidebar collapsed />

        <ResizablePanelGroup orientation="horizontal" className="min-w-0 flex-1">
          <ResizablePanel
            defaultSize={TREE_DEFAULT_WIDTH}
            minSize={TREE_MIN_WIDTH}
            maxSize={TREE_MAX_WIDTH}
          >
            <FileSystemPanel />
          </ResizablePanel>

          {/*
           * The pane divider is the drag handle: a 1px line with a wider
           * invisible hit area (::after) that tints on hover and drag.
           */}
          <ResizableHandle
            aria-label="Resize notes sidebar"
            className="bg-border/70 hover:bg-primary/40 focus-visible:bg-primary/60 data-[separator=active]:bg-primary/60 transition-colors duration-(--cd-duration-fast) after:w-2 focus-visible:ring-0"
          />

          <ResizablePanel minSize={320}>
            <NotesWorkspace />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </NoteTreeProvider>
  );
}
