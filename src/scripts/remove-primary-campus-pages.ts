import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Deletes the two Primary campus pages, Wadala and Matunga.
 *
 * The seeds only ever create or update — nothing in `seed:primary` removes a
 * page it no longer defines, which is deliberate: a seed that deleted whatever
 * it did not recognise would wipe every page an editor had added in the admin
 * panel. So dropping the campus split from the seed leaves the two pages
 * published in the database, still in the menu and still reachable by URL.
 * This removes them.
 *
 * Written as a one-off script rather than folded into the seed for the same
 * reason: it names exactly the two pages it deletes, and it is run once. Left
 * in the repository so the same removal can be applied to another database —
 * a colleague's, or the live one — without anybody having to reconstruct it.
 *
 *   npm run remove:primary-campus-pages
 */

const SLUGS = ['wadala', 'matunga']

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'primary' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const unit = units[0]
  if (!unit) throw new Error('No unit with slug "primary" — nothing to do.')

  let removed = 0

  for (const slug of SLUGS) {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { unit: { equals: unit.id } }] },
      limit: 10,
      depth: 0,
      overrideAccess: true,
    })

    if (docs.length === 0) {
      payload.logger.info(`No Primary page with slug "${slug}" — already gone.`)
      continue
    }

    for (const doc of docs) {
      await payload.delete({
        collection: 'pages',
        id: doc.id,
        overrideAccess: true,
      })
      removed += 1
      payload.logger.info(`Deleted page: ${doc.title} (/primary/${slug})`)
    }
  }

  payload.logger.info(`Done — ${removed} page(s) deleted.`)
  /*
   * The menu is rebuilt from whatever pages remain, so it has to run after
   * this or it will still be holding the two entries.
   */
  if (removed > 0) payload.logger.warn('Now run `npm run seed:nav` to rebuild the menu.')

  process.exit(0)
}

await main()
