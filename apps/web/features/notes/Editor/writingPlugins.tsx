'use client';

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeMirrorEditor,
  CreateLink,
  ListsToggle,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor';

/** Languages offered in a code block's language picker. */
const CODE_BLOCK_LANGUAGES: Record<string, string> = {
  '': 'Plain text',
  txt: 'Plain text',
  js: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  tsx: 'TSX',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  md: 'Markdown',
  sh: 'Shell',
  bash: 'Bash',
  py: 'Python',
  sql: 'SQL',
};

/**
 * The plugin set shared by the note editor and the Daily Note.
 *
 * Code blocks: codeBlockPlugin only parses ``` fences; something must also
 * be registered to *render* them. Without an editor for a block, MDXEditor
 * silently stops at the first fence and drops everything after it, and the
 * next autosave would have written that truncated document back. CodeMirror
 * handles the listed languages, and a lowest-priority catch-all handles any
 * other tag (```rust, ```mermaid, ...), so no fence can break a note again.
 */
export function createWritingPlugins() {
  return [
    headingsPlugin(),
    listsPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    codeBlockPlugin({
      defaultCodeBlockLanguage: '',
      codeBlockEditorDescriptors: [
        { priority: -10, match: () => true, Editor: CodeMirrorEditor },
      ],
    }),
    codeMirrorPlugin({ codeBlockLanguages: CODE_BLOCK_LANGUAGES }),
    markdownShortcutPlugin(),
    toolbarPlugin({
      toolbarClassName: 'daily-note-toolbar',
      toolbarContents: () => (
        <>
          <BlockTypeSelect />
          <Separator />
          <BoldItalicUnderlineToggles />
          <Separator />
          <ListsToggle />
          <CreateLink />
          <Separator />
          <UndoRedo />
        </>
      ),
    }),
  ];
}
