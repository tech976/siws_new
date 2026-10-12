import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Puts Sports and Fine Arts on the main SIWS menu, each with a page of its own
 * (SIWS, 2026-10-12: "just create tabs, don't add information yet").
 *
 * EMPTY BUT NOT BLANK. Each page carries the one line every placeholder on
 * this site carries — "We are preparing this page" — because a published page
 * with nothing on it reads as broken to a parent who clicks the tab. Whoever
 * writes the real page replaces that line; nothing else is invented here.
 *
 * WHERE THEY SIT: after Scholarships, before Contact. The four sections have
 * their own Sports pages on their own menus; these two belong to the
 * institution, which is what this menu is.
 *
 * For the LIVE site: `seed:nav` makes the same change on a seeded database but
 * rewrites every menu position from the template, which would undo whatever
 * the schools have changed in the panel. This adds two pages and places two
 * entries, and leaves everything else alone.
 *
 * Usage:  npx tsx src/scripts/add-portal-sports-fine-arts.ts [--apply]
 * Without --apply it prints what it would do and writes nothing. Safe to
 * repeat: a tab already in place is left as it is.
 */

const APPLY = process.argv.includes('--apply')

/** The line every placeholder page on this site carries. */
const PLACEHOLDER = 'We are preparing this page. Please check back soon.'

const TABS = [
  { slug: 'sports', title: 'Sports', order: 26 },
  { slug: 'fine-arts', title: 'Fine Arts', order: 29 },
]

type Page = {
  id: number
  slug: string
  _status?: string
  showInNav?: boolean | null
  navOrder?: number | null
  navLabel?: string | null
}

const main = async () => {
  const payload = await getPayload({ config })

  for (const tab of TABS) {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: tab.slug } }, { unit: { exists: false } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const page = docs[0] as unknown as Page | undefined

    if (!page) {
      console.log(`  ${tab.title.padEnd(10)} ${APPLY ? 'creating' : 'would create'} the page and the tab (position ${tab.order})`)
      if (!APPLY) continue
      await payload.create({
        collection: 'pages',
        overrideAccess: true,
        data: {
          title: tab.title,
          slug: tab.slug,
          intro: PLACEHOLDER,
          showInNav: true,
          navLabel: tab.title,
          navOrder: tab.order,
          _status: 'published',
          reviewStatus: 'approved',
        } as never,
      })
      console.log(`  ${tab.title.padEnd(10)} done`)
      continue
    }

    const inPlace =
      page.showInNav === true && page.navOrder === tab.order && (page.navLabel ?? '') === tab.title
    if (inPlace) {
      console.log(`  ${tab.title.padEnd(10)} already on the menu`)
      continue
    }

    console.log(`  ${tab.title.padEnd(10)} ${APPLY ? 'putting' : 'would put'} the existing page on the menu (position ${tab.order})`)
    if (!APPLY) continue
    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { showInNav: true, navLabel: tab.title, navOrder: tab.order } as never,
      overrideAccess: true,
    })
    console.log(`  ${tab.title.padEnd(10)} done`)
  }

  if (!APPLY) console.log('\n  Nothing was written. Re-run with --apply to do it.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
