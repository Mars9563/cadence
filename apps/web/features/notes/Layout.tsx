'use client';

import { useEffect } from 'react';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useRestoreNoteTabs } from '@/store/selectors';

import { Sidebar } from '../dashboard/Sidebar/Sidebar';
import { NotesWorkspace } from './Editor/NotesWorkspace';
import { FileSystemPanel } from './FileSystem/FileSystemPanel';
import { NoteTreeProvider } from './NoteTreeContext';

/*
 * File-tree column width, in pixels (react-resizable-panels v4 reads plain
 * numbers as pixels). Not persisted: every visit starts at the default.
 */
const TREE_DEFAULT_WIDTH = 288;
const TREE_MIN_WIDTH = 200;
const TREE_MAX_WIDTH = 480;

/**
 * Notes view: icon rail | file-system tree (resizable) | tabbed editor.
 */
export function NotesLayout() {
  const restoreNoteTabs = useRestoreNoteTabs();

  /*
   * AppBootstrap only renders the app once the profile and the notes have
   * loaded, so both are available here. Restoring is a no-op after the
   * first time.
   */
  useEffect(() => {
    restoreNoteTabs();
  }, [restoreNoteTabs]);

  return (
    <NoteTreeProvider>
      <div className="bg-background flex h-dvh min-h-0 gap-3 overflow-hidden p-3">
        <Sidebar collapsed />

        <ResizablePanelGroup orientation="horizontal" className="min-w-0 flex-1">
          <ResizablePanel
            defaultSize={TREE_DEFAULT_WIDTH}
            minSize={TREE_MIN_WIDTH}
            maxSize={TREE_MAX_WIDTH}
          >
            <FileSystemPanel />
          </ResizablePanel>

          {/* A 12px gap that doubles as the drag handle. */}
          <ResizableHandle
            withHandle
            className="w-3 bg-transparent [&>div]:opacity-0 hover:[&>div]:opacity-100 data-[separator=active]:[&>div]:opacity-100"
          />

          <ResizablePanel minSize={320}>
            <NotesWorkspace />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </NoteTreeProvider>
  );
}
