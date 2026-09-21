import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Makes each published page's latest version carry the same menu settings as
 * the page itself.
 *
 * WHY IT MATTERS. `seed:nav` used to set menu positions with SQL on the
 * `pages` table only, leaving every page's latest version with the settings
 * from before — often "not in the menu". Payload's update operation starts
 * from that version, not the page, whenever the version is at least as new
 * (`getLatestCollectionVersion`). So any save that did not send the menu
 * fields — a script adding a photograph, a story or a form to a page — wrote
 * the old settings back, and the page fell out of the menu. Nine did, between
 * 9 and 21 September 2026 (see `restore-dropped-menu-items.ts`).
 *
 * An admin-panel save sends every field and is unaffected, and the admin form
 * shows the page's own values — which is why this went unnoticed.
 *
 * WHAT IT DOES. Copies the five menu fields from each published page onto its
 * latest version, where that version is the published one. A page with
 * unpublished edits waiting is left alone and listed: those are someone's
 * work. Nothing the public sees changes; the site reads the pages table.
 *
 * Run with:  npm run nav:sync-versions [-- --dry-run]
 */

const dryRun = process.argv.includes('--dry-run')

const MISMATCH = `(
  p.show_in_nav IS DISTINCT FROM v.version_show_in_nav OR
  p.nav_order IS DISTINCT FROM v.version_nav_order OR
  p.nav_parent_id IS DISTINCT FROM v.version_nav_parent_id OR
  p.nav_label IS DISTINCT FROM v.version_nav_label OR
  p.nav_mirror_parent_id IS DISTINCT FROM v.version_nav_mirror_parent_id
)`

const main = async () => {
  const payload = await getPayload({ config })
  const pool = (
    payload.db as unknown as {
      pool: {
        query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }>
      }
    }
  ).pool

  const { rows } = await pool.query(`
    SELECT COALESCE(u.slug, 'portal') AS scope, p.slug, v.version__status AS latest_status
    FROM pages p
    JOIN _pages_v v ON v.parent_id = p.id AND v.latest = TRUE
    LEFT JOIN units u ON u.id = p.unit_id
    WHERE p._status = 'published' AND ${MISMATCH}
    ORDER BY 1, 2`)

  const fixable = rows.filter((row) => row.latest_status === 'published')
  const waiting = rows.filter((row) => row.latest_status !== 'published')

  payload.logger.info(`${fixable.length} published pages have a latest version with stale menu settings.`)
  for (const row of waiting) {
    payload.logger.warn(
      `${row.scope}/${row.slug}: has unpublished edits waiting — left alone. Check its menu settings before publishing them.`,
    )
  }

  if (dryRun) {
    for (const row of fixable) payload.logger.info(`  would align ${row.scope}/${row.slug}`)
    process.exit(0)
  }

  const { rowCount } = await pool.query(`
    UPDATE _pages_v v SET
      version_show_in_nav = p.show_in_nav,
      version_nav_order = p.nav_order,
      version_nav_parent_id = p.nav_parent_id,
      version_nav_label = p.nav_label,
      version_nav_mirror_parent_id = p.nav_mirror_parent_id
    FROM pages p
    WHERE v.parent_id = p.id AND v.latest = TRUE
      AND p._status = 'published' AND v.version__status = 'published'
      AND ${MISMATCH}`)

  payload.logger.info(`Aligned ${rowCount} pages. A save that leaves the menu alone now leaves it alone.`)
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
