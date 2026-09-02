import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Deletes the Secondary Section's Admissions page and its Admissions FAQ.
 *
 * SIWS asked on 2026-09-01 for the section to carry no admissions tab, no
 * admissions button and no admissions FAQ. Both page definitions have been
 * removed from `src/seed/secondary.ts`, but the seeds only ever create or
 * update — nothing in them removes a page they no longer define, which is
 * deliberate: a seed that deleted whatever it did not recognise would wipe
 * every page an editor had added in the admin panel.
 *
 * So dropping the two definitions leaves both pages published in the database,
 * still reachable by URL and still linked from anywhere that had not been
 * updated. This removes them. Written as a one-off script rather than folded
 * into the seed for the same reason as `remove:primary-campus-pages`: it names
 * exactly the two pages it deletes, and it is run once. It is left in the
 * repository so the same removal can be applied to another database — a
 * colleague's, or the live one — without anybody reconstructing it.
 *
 * Safe to run twice. A page that is already gone is reported and skipped.
 *
 *   npm run remove:secondary-admissions
 */

const SLUGS = ['admissions', 'admissions-faq']

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'secondary' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const unit = units[0]
  if (!unit) throw new Error('No unit with slug "secondary" — nothing to do.')

  let removed = 0

  for (const slug of SLUGS) {
    /*
     * `draft: true` so a page whose latest version is a draft is still found.
     * Without it a page an editor had unpublished would survive this script
     * and stay in the database as the one thing nobody could see but everybody
     * could still reach.
     */
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { unit: { equals: unit.id } }] },
      limit: 10,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })

    if (docs.length === 0) {
      payload.logger.info(`No Secondary page with slug "${slug}" — already gone.`)
      continue
    }

    for (const doc of docs) {
      await payload.delete({
        collection: 'pages',
        id: doc.id,
        overrideAccess: true,
      })
      removed += 1
      payload.logger.info(`Deleted page: ${doc.title} (/secondary/${slug})`)
    }
  }

  payload.logger.info(`Done — ${removed} page(s) deleted.`)
  /*
   * The menu is rebuilt from whatever pages remain, so it has to run after
   * this or it will still be holding the Admissions entry and its child.
   */
  if (removed > 0) payload.logger.warn('Now run `npm run seed:nav` to rebuild the menu.')

  process.exit(0)
}

await main()
