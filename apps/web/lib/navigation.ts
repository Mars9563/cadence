/**
 * A full page load (not client-side routing) to an app path.
 *
 * Used where the whole in-memory app must go: signing out, or a session
 * that is gone. A reload drops the socket, every store and timer, so nothing
 * of the previous account survives in memory.
 */
export function hardNavigate(path: string) {
  window.location.assign(new URL(path, window.location.origin).href);
}
