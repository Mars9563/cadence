# Workspace redesign: audit and design foundation

Scope: the Notes workspace (icon rail, folder/note tree, tabbed editor) and
the Dashboard (sidebar, day page, time/calendar column, Daily Note, item
dialogs). Both call `useSurface('workspace')`; the auth pages and the loading
screen keep their current styling until they opt in.

## Dashboard notes

- Same shell as Notes: edge-to-edge sidebar, 40px top band (view tabs left,
  connection + user right), canvas below.
- Day page: Literata greeting, then Habits / Tasks / Normal items as hairline
  lists (no cards) on a 768px column. Time and calendar sit in a 288–312px
  context column (stacked below the lists under 1024px).
- Calendar dots use `--cd-series-habit|task|normal`, muted hues that sit with
  the palette; dot position still encodes the series.
- The Daily Note reuses the note editor's surface (`note-editor-pane`):
  header row, Literata date title, column-aligned toolbar.
- Removed: the "Weather: coming soon" placeholder, the decorative "Your
  workspace" sidebar card, and the user chip's chevron (it had no menu).

## Stack (as found)

- Next.js 16.3 (App Router, single route `/`; view switching via `uiSlice.ViewMode`),
  React 19.2, TypeScript, Tailwind CSS v4 with shadcn (`base-vega`, Base UI primitives).
- State: Zustand slices; tree data is flat `folders` / `notes` arrays, the tree is
  derived on render with `buildNoteTree` + `toNoteTreeEntries`.
- Tree: `react-arborist` (virtualised; owns selection, keyboard, drag and drop, rename).
- Editor: `@mdxeditor/editor` (Lexical) with socket autosave (`useNoteAutosave`).
- Layout: `react-resizable-panels` v4 via `components/ui/resizable`.
- Icons: `lucide-react` (shadcn default) in the tree/editor, `react-icons/md` in the rail.
- No unit/e2e tests in `apps/web`; checks are `eslint` and `tsc`.

## 1. Strengths worth keeping

- Clean data flow: one source of truth (flat arrays), derived tree, optimistic
  rename/move with rollback, explicit delete confirmation for non-empty folders.
- Mature editor plumbing: tabs stay mounted (undo/scroll survive), content mirror,
  ack-based autosave, inline Obsidian-style title, reading mode.
- Good keyboard coverage from react-arborist, plus F2 rename.
- Shared writing-surface CSS with careful scroll/sticky-toolbar mechanics.

## 2. Most important visual problems (observed in the rendered UI)

1. **Three typefaces fighting.** UI chrome is JetBrains Mono, body is Geist, and
   in-document headings are mono again. Mono chrome reads as a terminal, not a
   writing tool, and mono headings break the document's rhythm.
2. **Loud, off-direction accent.** The dark theme's `--primary` is a saturated red,
   used on folder icons, the brand tile, blockquote rules and links.
3. **Card-on-card shell.** Rail, tree and editor are three floating rounded-2xl
   cards with shadows and 12px gutters; the editor surface feels boxed in.
4. **Tree overflow bug.** react-arborist sets `min-width: max-content` on rows, so
   long names never truncate and the tree grows a horizontal scrollbar.
5. **Selected vs. open is ambiguous.** Clicking a folder moves the highlight off the
   note that is open in the editor; nothing marks the open note.
6. **Chrome stack before the first word:** 44px tabs + 40px breadcrumb + 46px
   full-bleed toolbar. The breadcrumb repeats the title at the root level.
7. **Inconsistent states.** Uppercase tracked labels ("NOTES"), mixed icon sets,
   bright emerald/amber save colors, inverted (light) tooltips on a dark UI, no
   visible keyboard-focus indicator on tree rows.

## 3. Components and libraries to preserve

react-arborist, MDXEditor, react-resizable-panels, Base UI/shadcn primitives
(Button, Tooltip, DropdownMenu, AlertDialog, ScrollArea), lucide-react, sonner,
the Orb save indicator. No library is added or replaced. One web font (Literata)
is loaded through the existing `next/font/google`.

## 4. Design tokens

Primitives live in `app/globals.css` as `--cd-*` (the proposed palette names,
prefixed because shadcn already owns `--background` / `--accent` with different
meanings). A screen opts in with `useSurface('workspace')`, which sets
`data-surface="workspace"` on `<html>` and remaps shadcn's semantic tokens to the
palette. Because it sits on `<html>`, portalled menus, tooltips and dialogs follow.

| Token | Value | Use |
|---|---|---|
| `--cd-background` | `#101112` | editor canvas, app background |
| `--cd-surface-sidebar` | `#161718` | rail, tree, tab strip |
| `--cd-surface-raised` | `#1D1F20` | popovers, tooltips, dialogs |
| `--cd-border-subtle` | `#303234` | separators, popover outline |
| `--cd-text-primary` | `#EAE9E5` | text |
| `--cd-text-secondary` | `#A4A49F` | tree rows, metadata (7.5:1 on canvas, 6.6:1 on raised) |
| `--cd-text-tertiary` | `#71726D` | icons, chevrons, separators, placeholders (3.2–3.9:1; never body or meta text) |
| `--cd-accent` | `#B8C5B0` | open note marker, caret, selection, focus, links |
| `--cd-fill-hover` / `-selected` | text-primary at 5% / 8% | row and control fills |

- **Type:** Geist Sans for interface (13px rows, 12px meta, 14px controls);
  Literata (variable, optical sizing) for the note title and body, 17px / 1.7,
  using the pane's full width (wrapping at its edge); JetBrains Mono for code only.
- **Spacing:** Tailwind's 4px scale; steps 1, 2, 3, 4, 6, 8 for chrome.
- **Radius:** 4px (kbd/badges), 6px (rows, tabs, buttons), 8px (popovers, dialogs).
  No radius on panes.
- **Elevation:** flat panes separated by 1px lines; only popovers get a shadow
  (`--cd-shadow-popover`).
- **Icons:** lucide, 16px default, 14px inline/meta, 18px rail.
- **Motion:** 120ms (hover/color) and 180ms (disclosure) with
  `cubic-bezier(0.2, 0, 0, 1)`; disabled under `prefers-reduced-motion`.
- **Focus:** 2px accent ring (inset on rows) on keyboard focus.
- **Breakpoints:** Tailwind defaults; workspace targets ≥768px.

## 5. Component structure

```
NotesLayout            useSurface('workspace'); edge-to-edge shell
├─ Sidebar (rail)      40px brand band, nav with aria-current + accent marker
├─ FileSystemPanel     40px header band, react-arborist tree, empty state
│  └─ NoteTreeRow      hover / selected / open-note / focus / drop states
└─ NotesWorkspace      tab strip (40px band) + per-tab NoteEditor
   └─ NoteEditor       path + save state + reading toggle; column-aligned toolbar
```

All three columns share a 40px top band so their headers line up.

## 6. Implementation plan (priority order)

1. Tokens + surface opt-in + font (foundation, no visual change elsewhere).
2. Shell: remove cards/gutters, 1px resizable separator.
3. Tree: fix overflow, open-note marker, focus ring, quieter icons, empty state.
4. Tabs + editor header, editor typography, column-aligned toolbar.
5. States: loading/error/empty workspace, save indicator tones, tooltips/menus.

## 7. Risks

- `data-surface` remaps tokens globally while Notes is mounted; it is removed on
  unmount, so Dashboard keeps its look. The workspace is dark even when the
  system theme is light (the chosen direction), which can feel abrupt when switching views.
- `dark:` variants are extended to the workspace surface so shadcn components
  render their dark styles there.
- MDXEditor/react-arborist internals are styled through stable class names and
  attributes; upgrades could change them.
- Daily Note shares `dailyNote.css`; workspace overrides are scoped to
  `.note-editor-pane` so the Daily Note is unchanged.
- Narrow phones (<640px) are not a supported layout for this three-pane view yet.

## Phones (below 768px)

Tablets and up keep the desktop layout; below `md` (768px):

- **Navigation:** the sidebar is hidden; a bottom tab bar (`features/mobile/MobileTabBar.tsx`)
  has Dashboard, Notes and Settings (sign out is in Settings).
- **Notes (Obsidian-style, `features/mobile/MobileNotes.tsx`):** one note full-screen,
  no tab strip (tabs stay remembered for desktop). A mostly-horizontal right
  swipe anywhere on the note, or the folders button at top-left, pulls the
  tree in from the left and pushes the note aside; the drawer follows the
  finger and settles open/closed on release (35% or a flick). Tapping the
  visible strip of note, or opening a note, closes it. Swipes that start in
  something scrolling sideways (code blocks) are left alone. The bottom tab
  bar lives inside the drawer, so writing stays full-screen.
- **Editor toolbar:** hidden while reading; while typing (text focused AND the
  on-screen keyboard up) it is one sideways-scrolling row pinned above the
  keyboard (`hooks/useWritingFocus.ts`, `hooks/useKeyboardInset.ts`). Toolbar
  taps keep focus, so the keyboard stays up.
- **Settings:** a full-screen sheet.
- **Dashboard:** lists full width; clock and calendar below them.
- **Touch screens** (`touch:` variant = `@media (hover: none)`): the tree's ⋯
  menu and tab close buttons are always visible.
- **Safe areas:** `viewport-fit=cover`; the top bands, bottom bar, drawer,
  settings sheet, toasts and auth pages keep clear of the notch and the home
  indicator with `env(safe-area-inset-*)`.
