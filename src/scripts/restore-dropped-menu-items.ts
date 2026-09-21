import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Puts back nine menu entries that content scripts knocked out of the live
 * menus between 9 and 21 September 2026 — none of them on purpose.
 *
 * HOW THEY FELL OUT. `seed:nav` sets menu positions with SQL on the `pages`
 * table only, so each page's latest VERSION kept the menu settings from before
 * the menu was built — often "not in the menu". Payload's update operation
 * starts from the latest version, not the page (`getLatestCollectionVersion`),
 * whenever the version is at least as new. A script that saved just `layout`
 * therefore wrote those old menu settings back over the live ones: the News &
 * Events migration (9 Sep), the parent-feedback form (10 Sep), the July Natya
 * Tarang story (11 Sep), and the Ganesh Chaturthi and Abacus additions (today).
 * An admin-panel save sends every field and never did this.
 * `npm run nav:sync-versions` stops it happening again.
 *
 * WHAT IT RESTORES. Each entry's menu settings as they were on 7 September,
 * from the backup taken that morning (`backup-before-campus-removal`); the
 * Primary three changed today match the 11:32 backup too. Only the menu fields
 * are written — nothing on the pages themselves.
 *
 * Usage:  npx tsx src/scripts/restore-dropped-menu-items.ts [--apply]
 * Without --apply it prints what it would do and writes nothing. Safe to
 * repeat: an entry already in place is left alone.
 */

const APPLY = process.argv.includes('--apply')

interface Entry {
  unit: string
  slug: string
  /** The slug of the drop-down it sits in, or null for the top row. */
  parent: string | null
  order: number
  label: string
}

const ENTRIES: Entry[] = [
  { unit: 'primary', slug: 'achievements', parent: null, order: 34, label: 'Achievements' },
  { unit: 'primary', slug: 'gallery', parent: 'about', order: 12, label: 'Campus Gallery' },
  { unit: 'primary', slug: 'news', parent: 'updates', order: 45, label: 'News' },
  { unit: 'primary', slug: 'events', parent: 'updates', order: 47, label: 'Events' },
  { unit: 'primary', slug: 'parent-feedback', parent: 'contact', order: 80, label: 'Parent Feedback' },
  { unit: 'secondary', slug: 'news', parent: 'updates', order: 45, label: 'News' },
  { unit: 'secondary', slug: 'parent-feedback', parent: 'contact', order: 81, label: 'Parent Feedback' },
  { unit: 'junior-college', slug: 'news', parent: 'updates', order: 45, label: 'News' },
  { unit: 'junior-college', slug: 'parent-feedback', parent: 'contact', order: 81, label: 'Parent Feedback' },
]

type Page = {
  id: number
  slug: string
  _status?: string
  showInNav?: boolean | null
  navOrder?: number | null
  navParent?: number | { id: number } | null
  navLabel?: string | null
}

const idOf = (value: Page['navParent']) =>
  value === null || value === undefined ? null : typeof value === 'object' ? value.id : value

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({ collection: 'units', limit: 20, depth: 0, overrideAccess: true })
  const unitId = new Map((units as unknown as { id: number; slug: string }[]).map((u) => [u.slug, u.id]))

  const pageOf = async (unit: string, slug: string) => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { unit: { equals: unitId.get(unit) } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return docs[0] as unknown as Page | undefined
  }

  let changed = 0
  for (const entry of ENTRIES) {
    const where = `${entry.unit}/${entry.slug}`
    const page = await pageOf(entry.unit, entry.slug)
    if (!page) {
      console.log(`  ${where} — no such page, skipped`)
      continue
    }
    if (page._status !== 'published') {
      console.log(`  ${where} — not published, skipped (it would not show in the menu anyway)`)
      continue
    }
    const parent = entry.parent ? await pageOf(entry.unit, entry.parent) : null
    if (entry.parent && !parent) {
      console.log(`  ${where} — its drop-down "${entry.parent}" is missing, skipped`)
      continue
    }
    const parentId = parent?.id ?? null

    const already =
      page.showInNav === true &&
      idOf(page.navParent) === parentId &&
      page.navOrder === entry.order &&
      (page.navLabel ?? '') === entry.label
    if (already) {
      console.log(`  ${where} — already in place`)
      continue
    }

    const place = entry.parent ? `under ${entry.parent}` : 'on the top row'
    console.log(`  ${where} — ${APPLY ? 'restoring' : 'would restore'} "${entry.label}" ${place} at ${entry.order}`)
    changed += 1
    if (!APPLY) continue

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: {
        showInNav: true,
        navParent: parentId,
        navOrder: entry.order,
        navLabel: entry.label,
      } as never,
      overrideAccess: true,
    })
  }

  console.log(`\n  ${changed} ${APPLY ? 'restored' : 'to restore'}.${APPLY ? '' : ' Re-run with --apply to do it.'}`)
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
