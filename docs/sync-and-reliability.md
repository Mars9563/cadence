# Offline sync, reconnection and the first-load screen

Branch: `feat/offline-sync-and-loader` (on top of `feat/cadence-frontend-redesign`).

This document covers four things that shipped together:

1. A new first-load screen built from Thinking Orbs.
2. "Load once": the full-screen loader only ever appears on the first load;
   losing the connection later never unmounts the app.
3. Offline use with durable local changes that sync when the connection is
   back (outbox + drafts, persisted per user).
4. A pass over the frontend and backend for logic bugs, using the database
   schema (`database-schema.txt`, migrations 001/002) as the source of truth.

No database migration is needed. Every rule the code relies on already exists
in the schema; the server now checks some of them up front to return precise
errors.

---

## 1. First-load screen

`apps/web/features/LoadingScreen/loadingScreen.tsx` + `.css`

- A 132px orb in the accent colour over a large, slow, faint halftone orb
  (same sphere, engraved) for depth. Wordmark in Literata, one status line,
  and one dot per loading step.
- The orb's state follows the real steps instead of spinning for show:

  | Step | Orb state | Line |
  |---|---|---|
  | session | `searching` | Checking your session |
  | profile | `working` | Finding your day |
  | data | `background` (spiral) | Gathering habits, tasks and notes |
  | sync | `compacting` | Syncing changes from this device |
  | done | `base` | Ready, then the screen fades out over the app |
  | offline | `waiting`, grey | You're offline. Cadence opens as soon as the connection is back. |
  | error | `retrying`, red | message + Try again |

- The status line fades in when it changes (keyed), the step dots fill as
  steps complete. The hand-over is a 420 ms fade/lift while the app is
  already rendered underneath, not a flash.
- `prefers-reduced-motion`: orbs hold still (library behaviour) and the
  transitions are disabled.
- `useSurface` is now reference-counted, because the loader and the app both
  hold the workspace surface while the loader fades out.

## 2. Bootstrap: load once, never block again

`apps/web/features/AppBootstrap.tsx`, `store/slices/uiSlice.ts` (`appReady`)

Before: `isAppReady` required the socket to be connected and every collection
to be `ready`. Any disconnect replaced the whole app with the loading screen.
That unmounted the editors, and their remount treated the mirrored text as
already saved, so **unsaved edits were silently dropped**. A failed fetch,
or a failed `ensureTodayDailyNote`, left the app on the loader forever.

Now:

1. **session**: Supabase session (none: sign-in page); the socket starts.
2. **profile**: required (the day boundary drives everything). A network
   failure shows the offline loader, which retries on the browser's `online`
   event and every 15 s. A 401 goes to sign-in. Anything else shows an error
   with Try again.
3. **data**: items, habit completions, notes tree, daily notes, in parallel.
   Each records its own error; none blocks the app. Sections show their
   error state and the next reconnect re-reads them.
4. **sync**: the device's unsynced changes are laid over the data
   (`loadSync`) and sent; today's Daily Note is ensured.

`appReady` then becomes true and **never goes back** in that page session.
The app no longer requires the socket to be connected to render.

`AppClock` (new) is mounted once for the whole session:

- It ticks `currentDateTime` every minute and when the tab becomes visible
  again (timers stall during sleep). Before, the ticker lived inside the
  Dashboard clock card, so the Notes view never saw the date change.
- When the Cadence day rolls over, it ensures the new day's Daily Note
  exists. Before, that only happened at page load.

## 3. Reconnection

`apps/web/store/slices/socketSlice.ts`

- Reconnects forever with backoff (1 s up to 10 s). The handshake `auth`
  callback fetches a fresh token every time, as before.
- `io server disconnect` (server restart or kick) is not retried by
  Socket.IO itself. It now reconnects after 2 s.
- The browser's `online` event and the tab becoming visible trigger an
  immediate reconnect instead of waiting for the backoff timer.
- First connect: flush the queue. Every reconnect: flush, then **reconcile**
  (re-read server state, so changes made on another device show up).
- `connect_error` with an auth message sets `sessionExpired`, so the sidebar
  shows "Sign in again".
- Fixed: the socket URL read `process.env.PUBLIC_BACKEND_URL`. That is not a
  `NEXT_PUBLIC_` variable, so it was always undefined in the browser and fell
  back to localhost. It now uses `NEXT_PUBLIC_BACKEND_URL` (shared
  `BACKEND_URL`).

## 4. Offline sync

### Model

`apps/web/lib/sync/types.ts`, `store/slices/syncSlice.ts`

Every write is applied to the store immediately (optimistic) and recorded
durably as one of two things:

- **SyncOp**: a discrete operation in a FIFO **outbox**, replayed in order:
  `item.create`, `item.complete`, `folder.create|update|delete`,
  `note.create|update|delete`, `daily.create`. Order matters: a note
  created inside a folder that was itself created offline.
- **Draft**: the latest unsaved text of a document (`note:<id>` or
  `daily:<id>`). Content is last-write-wins, so only the newest text per
  document is kept, with a revision number.

Both are persisted per user in `localStorage` (`cadence:sync:v1:<userId>`,
`lib/sync/storage.ts`) on every change, synchronously. A reload, a closed
tab or a crash cannot lose work. Entries are removed only when the server
confirmed them. If the browser refuses the write (quota, private mode), the
sidebar says so.

**Client-generated ids.** Every create carries a UUID made on the client
(`lib/uuid.ts`, with a fallback for non-secure contexts). An item, folder or
note made offline can be renamed, moved, completed or used as a parent
straight away. Replaying a create is idempotent on the server, so anything
whose response was lost is simply sent again.

### Engine

`flushSync` runs when the socket connects, after every enqueue or draft, and
on a backoff timer after failures:

1. Outbox ops, strictly in order, one at a time. Ops coming straight from a
   user action while online (`runOrQueue`) share the same lock, so "create
   folder, then rename it" can never reach the server reversed.
2. Then drafts, once no create they depend on is still queued, over the
   socket with an acknowledgement (`emitWithAck`, 15 s timeout).
3. Then, if needed, `reconcile`: re-read all collections and replace the
   store, re-apply anything still pending on top, and sweep drafts whose
   document is gone.

"Online" means the Socket.IO connection is up: it is the one signal that the
backend itself, not just the network, is reachable.

**Failure classes** (`lib/api/request.ts` `ApiError`, socket ack codes):

| Class | Examples | Behaviour |
|---|---|---|
| retryable | offline, timeout, 5xx, 401/408/429, DB hiccup | stop, keep everything, back off (1 s → 30 s), retry |
| permanent | `DAY_ENDED`, `ITEM_LOCKED`, `HABIT_NOT_DUE_TODAY`, `TASK_NOT_YET_DUE`, `*_NOT_FOUND`, validation | drop that one change, undo it on screen, say why in plain words, reconcile |

User-facing wording is in `lib/sync/messages.ts`. Every message says what
happened to the change, for example: "“Morning pages” wasn't marked done:
that day ended before Cadence could reach the server."

### What works offline

| Action | Offline behaviour |
|---|---|
| Write in a note or the Daily Note | Saved on this device; the indicator says "On this device" |
| Tick a normal item, task or habit | Shown done at once; sent with the Cadence date it was ticked on |
| Add a habit, task or normal item | Appears at once under a client id |
| Create, rename, move or delete folders and notes | All of it, in order |
| Open a note not opened before this session | Not possible (content isn't cached); it opens by itself when back online |
| New Cadence day while offline | Today's Daily Note is created locally and merged with the server's on sync |

### Conflict and edge-case policy

- **Note content edited on two devices**: last write wins (per document).
- **Note deleted on another device while edited here**: the latest text is
  kept as a new note "<title> (recovered)" in the top folder, with a notice.
  A note the user deleted *here* is just dropped.
- **Daily Note created independently on two devices** (the day rolled over
  while offline): the local note adopts the server's id. If both have text,
  both are kept, server text first. Neither device ever saw the other's
  text.
- **Ticked offline, synced after the day ended**: the server refuses it
  (`DAY_ENDED`). The schema only allows completing *today's* habit
  occurrence, and a task only on its date. The tick is undone, with a
  notice. Normal items have no date and are accepted (timestamped at sync).
- **Drafts for a document whose list failed to load** are kept, not
  dropped, until a reconcile can tell whether the document exists.
- **Sign-out with unsynced changes**: the dialog says how many. Sign-out
  tries one last sync (up to 4 s), then does a full page load to the
  sign-in page. Unsynced changes stay in this browser under that account and
  sync at the next sign-in here.

### Status in the UI

- Editors: `dirty` (typing), `saving`, `saved`, **`offline`** ("On this
  device"), `error`.
- Sidebar and rail (`features/sync/SyncStatus.tsx`), shown only when
  something needs saying: Offline (with the pending count), Syncing (queued
  operations), Sync paused (select to retry now), Sign in again, Not stored
  on device.
- Dashboard top band: Live / Syncing / Reconnecting / Offline.

## 5. Server changes (API contract)

All backwards compatible: existing clients keep working.

- **Optional `id` on creates**: `createNormal/Task/HabitItemSchema`,
  `createFolderSchema`, `createNoteSchema`, and the new
  `createTodayDailyNoteSchema` (`packages/validation`). On a unique
  violation with that id, the existing row is returned (same user and kind),
  otherwise `*_ID_CONFLICT` (409).
- **`POST /daily-notes/create` is idempotent**: if today's note exists,
  it is returned instead of failing on `daily_notes_user_date_key`.
- **Socket acknowledgements**: `item:complete`, `note:update`,
  `daily-note:update` and `daily-note:create` accept an ack callback and
  answer `{ ok: true, data } | { ok: false, code }`
  (`realtime/ack.ts`). The broadcast events are still emitted.
- **`item:complete`** now:
  - validates `itemId` (uuid);
  - accepts an optional `expectedDate`, rejecting `DAY_ENDED` when the day
    it was ticked on is over;
  - returns `TASK_NOT_YET_DUE`, `ITEM_LOCKED` (task dated in the past, or
    RLS refused the update) and `HABIT_NOT_DUE_TODAY` (mirrors
    `habit_occurs_on` / `habit_completions_insert_own`) instead of a generic
    failure.
- **Item creates** map RLS rejection to `ITEM_LOCKED` (422).
- **Error codes** instead of sentences in the daily-notes service
  (`DAILY_NOTE_NOT_FOUND` is a 404).
- **CORS origin** from `CORS_ORIGIN` (comma-separated), default
  `http://localhost:3000`, for both Express and Socket.IO.
- Shared Postgres codes and `isoWeekday` in `apps/server/src/lib/postgres.ts`.

## 6. Bugs found and fixed

Severity: **H** = data loss or broken core flow, **M** = wrong behaviour the
user notices, **L** = minor.

| # | Sev | Where | Problem | Fix |
|---|---|---|---|---|
| 1 | H | `AppBootstrap` | Any socket drop replaced the app with the loader. Remounted editors treated mirrored text as saved and never sent it: edits lost | `appReady` latch; app never unmounts for connectivity |
| 2 | H | autosave hooks | Edits made while disconnected were lost if the tab or note closed before reconnecting (in-memory state only) | Drafts persisted to localStorage, sent when online |
| 3 | H | `socketSlice.completeItem` | Ticking while disconnected did nothing (console error only) | Optimistic, queued, synced |
| 4 | H | `AppBootstrap` | Profile, items or daily-note failures left the loader up forever with no message | Per-step error and offline states with retry; only the profile is required |
| 5 | M | `HabitRow` | Weekly habits on off days and not-yet-started habits were tickable; the DB rejects them, so the click failed silently | Disabled with the reason ("Not today") |
| 6 | M | `item:complete` | Offline ticks synced after midnight would have been recorded against the next day | `expectedDate` check (`DAY_ENDED`) |
| 7 | M | `lib/cadenceDay` | "Day ends at / time left" computed in the browser's timezone, not Asia/Kolkata like `app_today` | `getCadenceDayEndInstant` in IST |
| 8 | M | `ClockUpdater` | Only ticked while the Dashboard was mounted; "today" went stale in Notes | App-wide `AppClock` |
| 9 | M | Daily notes | A new Cadence day never got its Daily Note until a reload; the view showed the latest note, not today's | Rollover in `AppClock`; view selects today's note |
| 10 | M | `daily-notes.services` | Creating today's note when it already existed (second tab, retry) failed on the unique key | Idempotent: returns the existing note |
| 11 | M | `socketSlice` | Socket URL read a non-public env var (always undefined in the browser) | `NEXT_PUBLIC_BACKEND_URL` |
| 12 | M | `socketSlice` | No reconnect after a server-initiated disconnect | Manual reconnect, plus `online`/visibility triggers |
| 13 | M | `SignOutDialog` | Sign-out left the app on screen with live data and an open socket | Final sync, then full navigation to sign-in |
| 14 | M | `NormalItemsSection` | Completed normal items from past days stayed in today's list forever, though the DB locks them after their day | Today shows open items plus those completed today |
| 15 | M | `FileSystemPanel` | A failed notes load showed "No notes yet", as if the account were empty | Error state with retry |
| 16 | M | `item:complete` | Past tasks, off-day habits and completion races all came back as a generic `*_FAILED` | Explicit codes, matching RLS |
| 17 | L | items/tasks/habits | Checked items stayed clickable (no-op) | Disabled once complete |
| 18 | L | server | CORS origin hardcoded | `CORS_ORIGIN` |
| 19 | L | `items.service` | A leftover "replace this section" instruction comment | Removed |

Found and fixed during this work (in the new code, before it shipped):

- Concurrent direct operations could reorder (now one lock).
- Drafts could be sent before their note's create (now gated).
- A save for a note just deleted locally triggered recovery (now dropped).
- A tab closing after a delete re-created an orphan draft that could never
  sync (now ignored).
- Adopting the server's Daily Note preferred empty local text over the
  server's (now server text, merged with the local draft).
- The first-load 401 path showed "offline" (now sign-in).

## 7. Verification

Ran against the real code with a harness page (deleted before finishing).
REST was faked by patching `fetch` in the page, and socket acks by a fake
socket, with one in-page fake backend so reconciles read back what was
synced. The real backend needs a login that was not available.

| Scenario | Result |
|---|---|
| Offline: tick a normal item and a habit, add an item through the dialog, edit a note | Optimistic UI; 3 ops + 1 draft persisted; band, sidebar and editor show offline |
| Reload while still offline | Ops, drafts and the optimistic overlay all restored |
| Back online | Completions, create and content synced in order; server state correct; queue and localStorage cleared; reconcile ran |
| Off-day weekly habit | Checkbox disabled, "Not today" |
| Server refuses (`DAY_ENDED`) | Both ticks undone, two clear notices, queue cleared |
| Offline: create folder, note in it, rename, type; delete another note mid-typing | Server got folder, note (in that folder), rename, delete, content, in that order; no orphan or recovered note |
| Online saves; disconnect mid-typing; reconnect | Draft held the full text; saved after reconnect |
| Note deleted on another device while edited offline | Kept as "Weekly review (recovered)" with the full text, notice shown, old tab closed |
| Daily Note created offline while another device made one | Merged into the server's id; both texts kept |
| Loader phases (data, offline, error) | Screenshots reviewed |

Checks:

- `tsc` passes for web and server.
- `next build` passes.
- `pnpm lint` (web): no new problems. The 2 errors (`WebThreads.tsx`,
  `SignInForm.tsx`) and 6 warnings were there before; one old warning
  (unused `reason` in `socketSlice`) is gone.
- The real server was smoke-tested after the change: health, 401 guard and
  body validation.

Already broken before this work (not changed):

- `apps/server` `pnpm lint` fails: eslint is not installed in that package.
- `packages/validation` `test` script exits 1 ("no test specified"), so
  `turbo test` fails.

## 8. Known limits and follow-ups

- **Cold start offline**: the page itself needs the network (no service
  worker), so "offline" means losing the connection after load, or reloading
  once the network is back with pending changes. A PWA service worker plus a
  cached store snapshot would add true offline start.
- **Storage**: drafts live in localStorage (~5 MB per origin). Very large
  notes across many documents could hit the quota. The UI warns, and the
  text stays in memory. IndexedDB would lift this.
- **Note content conflicts** are last-write-wins per document. Real merging
  would need versions on `notes.updated_at` (compare-and-set) or CRDTs.
- **Notes not opened in this session** can't be opened offline; their content
  is not cached.
- **Normal items ticked offline** are timestamped when they sync, not when
  ticked: the DB refuses backdated `completed_at` (`item_is_editable`).
- **Client clock**: the `expectedDate` of a tick comes from the browser
  clock. A badly wrong clock gets a `DAY_ENDED` refusal (safe, never a
  wrong-day record).
- **Daily Note adoption race**: keystrokes made in the exact moment the
  local note is merged can overwrite the merged text with the local one.
- **Multi-tab**: two tabs of the same account share the localStorage outbox
  key but not memory. Each tab flushes its own copy, which is safe (creates
  and completions are idempotent) but can briefly double-send. A
  BroadcastChannel leader would tidy this up.

## 9. Testing it yourself

1. Sign in, open DevTools, Network, set to **Offline** (or stop the server
   with Ctrl+C in its terminal).
2. Tick something, add an item, write in a note, create a folder.
   The sidebar says Offline (n changes); the editor says On this device.
3. Reload while offline: the page won't load without the network, so instead
   restart the server or turn the network back on, then reload. Everything
   reappears and syncs.
4. Back online: changes sync, the status disappears, and the data matches
   the database (check in Supabase).
5. For the day-ended path: tick a habit offline just before the day boundary,
   reconnect after it. The tick is undone with a notice.
