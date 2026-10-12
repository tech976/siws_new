import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/** The collections whose items can be picked for the main homepage. */
export const MAIN_HOMEPAGE_COLLECTIONS = ['posts', 'announcements'] as const
export type MainHomepageCollection = (typeof MAIN_HOMEPAGE_COLLECTIONS)[number]

/** The slice of the Postgres adapter this file uses. */
interface SqlRunner {
  execute: (query: ReturnType<typeof sql>) => Promise<{ rowCount?: number | null }>
}
interface SqlAdapter {
  drizzle: SqlRunner & { transaction: <T>(run: (tx: SqlRunner) => Promise<T>) => Promise<T> }
}

interface SetArgs {
  payload: Payload
  collection: MainHomepageCollection
  id: number | string
  show: boolean
}

/**
 * Ticks or unticks one item, without saving it.
 *
 * WHY NOT `payload.update`. These collections keep drafts, and a save starts
 * from the item's LATEST VERSION rather than from what is live. Ticking a
 * published story whose author has a half-written edit waiting would publish
 * that edit — or, if it was saved as a draft, take the story off the site.
 * An administrator choosing what runs on the front page must never be able to
 * change what a story says.
 *
 * So the tick is written to the item and to every saved version of it, in one
 * transaction. Every version, because the next save from the panel starts from
 * the latest one, and a version still carrying the old answer would quietly put
 * it back.
 *
 * Returns false when there is no such item.
 */
export const setOnMainHomepage = async ({
  payload,
  collection,
  id,
  show,
}: SetArgs): Promise<boolean> => {
  const adapter = payload.db as unknown as SqlAdapter

  return adapter.drizzle.transaction(async (tx) => {
    const item = await tx.execute(
      sql`update ${sql.identifier(collection)} set show_on_home = ${show} where id = ${id}`,
    )
    if (!item.rowCount) return false

    await tx.execute(
      sql`update ${sql.identifier(`_${collection}_v`)} set version_show_on_home = ${show} where parent_id = ${id}`,
    )
    return true
  })
}
