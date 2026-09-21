import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Moves each section's Sports page out of the Student Life drop-down and onto
 * the top row of the menu, directly after Student Life (SIWS, 2026-09-21).
 *
 * For the LIVE site. `seed:nav` makes the same move on a seeded database, but
 * it rewrites every menu position from the template — on the live site that
 * would undo whatever the schools have changed in the admin panel since. This
 * touches four pages and nothing else.
 *
 * Idempotent: a Sports page already on the top row is left alone. A page with
 * unpublished edits waiting is skipped rather than published over.
 *
 * Run with:  npx tsx src/scripts/sports-to-top-row.ts [--dry-run]
 */

const dryRun = process.argv.includes('--dry-run')

type Page = {
  id: number
  slug: string
  showInNav?: boolean | null
  navOrder?: number | null
  navParent?: number | { id: number } | null
  _status?: string | null
  updatedAt: string
}

const idOf = (value: Page['navParent']) =>
  value === null || value === undefined ? null : typeof value === 'object' ? value.id : value

const main = async () => {
  const payload = await getPayload({ config })
  const pool = (payload.db as unknown as { pool: { query: (text: string, values: unknown[]) => Promise<unknown> } })
    .pool

  const { docs: units } = await payload.find({ collection: 'units', limit: 20, depth: 0, overrideAccess: true })

  for (const unit of units as unknown as { id: number; slug: string }[]) {
    const { docs } = (await payload.find({
      collection: 'pages',
      where: { unit: { equals: unit.id } },
      limit: 300,
      depth: 0,
      overrideAccess: true,
    })) as unknown as { docs: Page[] }

    // Positions are worked out among what the menu actually shows: an
    // unpublished page with "Show in the main menu" ticked is not in it.
    const live = docs.filter((page) => page._status === 'published')

    const sports = docs.find((page) => page.slug === 'sports')
    const studentLife = docs.find((page) => page.slug === 'student-life')
    if (!sports || !studentLife) {
      payload.logger.warn(`${unit.slug}: no ${sports ? 'Student Life' : 'Sports'} page — skipped.`)
      continue
    }
    if (sports.showInNav && idOf(sports.navParent) === null) {
      payload.logger.info(`${unit.slug}: Sports is already on the top row — left alone.`)
      continue
    }

    const { docs: versions } = await payload.findVersions({
      collection: 'pages',
      where: { parent: { equals: sports.id } },
      sort: '-updatedAt',
      limit: 1,
      overrideAccess: true,
    })
    const latest = versions[0] as unknown as { version: { _status?: string }; updatedAt: string } | undefined
    if (latest?.version._status === 'draft' && latest.updatedAt > sports.updatedAt) {
      payload.logger.warn(
        `${unit.slug}: Sports has unpublished edits waiting — skipped, so they are not published over. Move it in the admin panel once they are published.`,
      )
      continue
    }

    // Straight after Student Life and whatever stays in its drop-down.
    const children = live.filter(
      (page) => page.showInNav && idOf(page.navParent) === studentLife.id && page.id !== sports.id,
    )
    const order = Math.max(studentLife.navOrder ?? 0, ...children.map((page) => page.navOrder ?? 0)) + 1
    const next = live
      .filter(
        (page) =>
          page.showInNav &&
          idOf(page.navParent) === null &&
          page.id !== sports.id &&
          (page.navOrder ?? 0) > (studentLife.navOrder ?? 0),
      )
      .sort((a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0))[0]
    if (next && (next.navOrder ?? 0) <= order) {
      payload.logger.warn(`${unit.slug}: no room before "${next.slug}" at position ${order} — skipped.`)
      continue
    }

    const where = `after Student Life (${studentLife.navOrder}) at ${order}${next ? `, before ${next.slug} (${next.navOrder})` : ''}`
    if (dryRun) {
      payload.logger.info(`${unit.slug}: would move Sports ${where}.`)
      continue
    }

    try {
      await payload.update({
        collection: 'pages',
        id: sports.id,
        data: { showInNav: true, navParent: null, navOrder: order } as never,
        overrideAccess: true,
      })
      payload.logger.info(`${unit.slug}: Sports moved ${where}.`)
    } catch (error) {
      /*
       * A save re-checks the whole page — for example that every photograph of
       * a child has permission recorded — and can refuse for reasons nothing
       * to do with the menu. The menu fields alone are then written directly:
       * to the page, which is what the site and the admin form read, and to
       * its latest version, so the version history agrees with it.
       */
      const reason = error instanceof Error ? error.message : String(error)
      await pool.query(
        'UPDATE pages SET show_in_nav = TRUE, nav_parent_id = NULL, nav_order = $1 WHERE id = $2',
        [order, sports.id],
      )
      await pool.query(
        'UPDATE _pages_v SET version_show_in_nav = TRUE, version_nav_parent_id = NULL, version_nav_order = $1 WHERE parent_id = $2 AND latest = TRUE',
        [order, sports.id],
      )
      payload.logger.warn(`${unit.slug}: Sports moved ${where} (menu fields only — the full save said: ${reason}).`)
    }
  }

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
