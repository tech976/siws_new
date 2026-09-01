import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Deletes the Primary pages SIWS asked to drop: Student Wall and Transport.
 *
 * Same reason this exists as a script rather than as part of `seed:primary`:
 * the seeds only ever create or update. Nothing in them removes a page they no
 * longer define, which is deliberate — a seed that deleted whatever it did not
 * recognise would wipe every page an editor had added in the admin panel. So
 * taking the two out of the seed leaves them published in the database, still
 * in the menu and still reachable by URL. This removes them.
 *
 * Transport is the page `institution.ts` warns about: SIWS has supplied no
 * operator, no route and no fare, so it never carried anything a parent could
 * act on. Student Wall was still the placeholder.
 *
 * `UNIT_OMIT` in `seed/nav.ts` is the other half of the job — the menu
 * template names both slugs, and without that entry `seed:nav` creates them
 * again as empty placeholders the next time it runs.
 *
 *   npm run remove:primary-pages
 */

const SLUGS = ['student-wall', 'transport']

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
