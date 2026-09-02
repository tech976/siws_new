import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Drops Next's cached pages when the content behind them changes.
 *
 * WHY THIS IS NEEDED AT ALL
 * -------------------------
 * The site reads through Payload's LOCAL API — a direct database call rather
 * than `fetch` — so Next never sees a request it can attach a cache lifetime
 * to. Left alone it treats a rendered page as good indefinitely, and an edit
 * in the admin or a `seed:refresh` on the command line changes the database
 * without changing anything on screen.
 *
 * `revalidate` on the route sets a ceiling on how long that can last. This
 * closes the gap under it, so an edit appears at once rather than within the
 * minute.
 *
 * WHY IT REVALIDATES THE WHOLE TREE RATHER THAN ONE PATH
 * ------------------------------------------------------
 * A page is not only rendered at its own address. Its title is in the menu on
 * every page, its photographs are on section walls and galleries, and a unit
 * page lists the pages beneath it — so an edit to one document is visible at
 * addresses that document does not know about. Revalidating just the edited
 * page leaves those stale, which is the same confusing half-updated state this
 * exists to prevent, only harder to spot.
 *
 * The cost is a re-render of pages that did not change, which is cheap next to
 * a parent reading a menu entry that no longer matches the page it opens.
 */
const revalidateEverything = (): void => {
  /*
   * `layout` rather than `page`: the header, the menu and the footer are in
   * the layout, and a page-only revalidation leaves the menu holding the old
   * title while the page itself is correct.
   */
  revalidatePath('/', 'layout')
}

/**
 * Attach to a collection whose documents are rendered on the site.
 *
 * Deliberately silent on failure. Revalidation runs after the write has been
 * committed, so throwing here would report a save as failed when it succeeded
 * — the worst possible trade for a cache refresh. Outside a request context
 * (a seed script, a migration) `revalidatePath` has nothing to talk to and is
 * expected to throw; the seeds are followed by a dev-server restart or a
 * rebuild in any case.
 */
export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  try {
    revalidateEverything()
  } catch {
    // Not in a request context — a seed or a migration. Nothing to drop.
  }
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  try {
    revalidateEverything()
  } catch {
    // As above.
  }
  return doc
}
