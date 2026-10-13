import { sql } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

/**
 * A news story can be on a page twice over: as an item in News & Events, and
 * as a "story" typed into a Latest news block when the site was built. The
 * Kindergarten's seven are all both — the block was written first, and the
 * items were made from it so that teachers had something to edit.
 *
 * The typed copy is the one the page shows (it carries the order and the
 * "when" somebody chose; the item only knows the day it was created), and the
 * item is the one a teacher can reach. So the page has to answer to the item,
 * or the panel's Unpublish and Delete do nothing a visitor can see — SIWS,
 * 2026-10-13: "not able to unpublish the published news from the admin panel".
 * It unpublished. The story was still on the Kindergarten's News page.
 *
 * Two halves. A typed story whose item exists and is NOT live is left off the
 * page (`hiddenTwins`, used by the block when it renders). A typed story whose
 * item is DELETED is taken out of the page (`removeTypedTwins`, from the
 * collection's delete hook) — there is no item left to ask, and a teacher who
 * deletes a story has no way to edit a page.
 */

/** Titles are matched as people retype them: without case or stray spaces. */
export const sameTitle = (value: unknown): string => String(value ?? '').trim().toLowerCase()

interface Twin {
  title?: string | null
  _status?: string | null
  publishAt?: string | null
  unpublishAt?: string | null
}

/** Published, and inside the dates it was scheduled for — what a visitor can see. */
const isLive = (item: Twin, now: number): boolean =>
  item._status === 'published' &&
  (!item.publishAt || new Date(item.publishAt).getTime() <= now) &&
  (!item.unpublishAt || new Date(item.unpublishAt).getTime() > now)

/**
 * The typed titles that must not be shown: those with an item of the same name
 * in the same school, none of which is live.
 *
 * A title with no item at all is not in the answer. That story exists only on
 * the page, and the page is where it is managed.
 */
export const hiddenTwins = (typedTitles: unknown[], items: Twin[]): Set<string> => {
  const now = Date.now()
  const live = new Set<string>()
  const known = new Set<string>()
  for (const item of items) {
    const title = sameTitle(item.title)
    if (!title) continue
    known.add(title)
    if (isLive(item, now)) live.add(title)
  }

  return new Set(
    typedTitles.map(sameTitle).filter((title) => title && known.has(title) && !live.has(title)),
  )
}

/** The slice of the Postgres adapter this file uses. */
interface SqlRunner {
  execute: (query: ReturnType<typeof sql>) => Promise<{ rowCount?: number | null }>
}
interface SqlAdapter {
  drizzle: SqlRunner
  sessions?: Record<string, { db: SqlRunner } | undefined>
}

interface RemoveArgs {
  req: PayloadRequest
  /** The school the deleted item belonged to; null for the institution's own. */
  unitId: number | string | null
  title: unknown
}

/**
 * Takes the typed copies of a deleted item out of its school's pages.
 *
 * In the database rather than by saving each page, for the reason the gallery
 * rows are (`media-usage.ts`): a save writes a new version of the page over
 * whatever draft was in progress. Saved versions are cleared with the live
 * page, because the editor opens the latest version and would put the story
 * back on the next save.
 *
 * Runs inside the delete's own transaction.
 */
export const removeTypedTwins = async ({ req, unitId, title }: RemoveArgs): Promise<number> => {
  const wanted = sameTitle(title)
  if (!wanted) return 0

  const adapter = req.payload.db as unknown as SqlAdapter
  const transactionID = await req.transactionID
  const db =
    (transactionID !== undefined && adapter.sessions?.[String(transactionID)]?.db) ||
    adapter.drizzle

  const ofSchool = (column: ReturnType<typeof sql>) =>
    unitId === null ? sql`${column} is null` : sql`${column} = ${unitId}`

  const live = await db.execute(sql`
    delete from pages_blocks_news_grid_items item
    using pages_blocks_news_grid block, pages page
    where item._parent_id = block.id
      and block._parent_id = page.id
      and ${ofSchool(sql`page.unit_id`)}
      and lower(trim(item.title)) = ${wanted}
  `)
  const versions = await db.execute(sql`
    delete from _pages_v_blocks_news_grid_items item
    using _pages_v_blocks_news_grid block, _pages_v version
    where item._parent_id = block.id
      and block._parent_id = version.id
      and ${ofSchool(sql`version.version_unit_id`)}
      and lower(trim(item.title)) = ${wanted}
  `)

  return (live.rowCount ?? 0) + (versions.rowCount ?? 0)
}
