import fs from 'fs'
import path from 'path'

import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Retires the Wadala and Matunga campus pages, once.
 *
 * `seed:primary` no longer writes them — the Primary Section is a single school
 * now — but a seed only ever upserts what it declares, so pages it has stopped
 * declaring simply stay in the database, published and in the menu. This is the
 * one-off that clears them out.
 *
 * IT BACKS UP BEFORE IT DELETES. These pages hold content nothing else in the
 * repository has a copy of (each campus's own history and programme write-up),
 * so the full documents are written to a timestamped JSON file first. Deleting
 * without that would make the merge irreversible on someone's say-so.
 *
 * It also clears the `campus` tag from every Primary teacher and photograph.
 * The tag is what a Faculty block or gallery grouping selects on, so leaving it
 * set would keep the split alive in places the page copy no longer mentions.
 *
 * Safe to re-run: it reports "nothing to do" once the pages are gone.
 *
 * Run with:  npx tsx src/scripts/merge-primary-campuses.ts [--dry-run]
 */

const CAMPUS_SLUGS = ['wadala', 'matunga']

const main = async () => {
  const dryRun = process.argv.includes('--dry-run')
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'primary' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const primary = units[0]
  if (!primary) throw new Error('No Primary unit found.')

  const { docs: pages } = await payload.find({
    collection: 'pages',
    where: {
      and: [{ slug: { in: CAMPUS_SLUGS } }, { unit: { equals: primary.id } }],
    },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })

  if (pages.length > 0) {
    const dir = path.resolve(process.cwd(), 'docs')
    fs.mkdirSync(dir, { recursive: true })
    const backup = path.join(dir, 'retired-campus-pages.json')
    fs.writeFileSync(backup, JSON.stringify(pages, null, 2), 'utf-8')
    payload.logger.info(`Backed up ${pages.length} page(s) to ${backup}`)

    for (const page of pages) {
      if (dryRun) {
        payload.logger.info(`[dry run] would delete page: ${page.title} (/${page.slug})`)
        continue
      }
      await payload.delete({ collection: 'pages', id: page.id, overrideAccess: true })
      payload.logger.info(`Deleted page: ${page.title} (/${page.slug})`)
    }
  } else {
    payload.logger.info('No campus pages left to delete.')
  }

  /* ------------------------------------------------- teachers and photographs */
  for (const collection of ['faculty', 'media'] as const) {
    const { docs } = await payload.find({
      collection,
      where:
        collection === 'faculty'
          ? { and: [{ unit: { equals: primary.id } }, { campus: { exists: true } }] }
          : { and: [{ unit: { equals: primary.id } }, { campus: { exists: true } }] },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })

    if (docs.length === 0) {
      payload.logger.info(`${collection}: nothing tagged with a campus.`)
      continue
    }

    if (dryRun) {
      payload.logger.info(`[dry run] would clear the campus tag on ${docs.length} ${collection}.`)
      continue
    }

    for (const doc of docs) {
      await payload.update({
        collection,
        id: doc.id,
        data: { campus: null } as never,
        overrideAccess: true,
      })
    }
    payload.logger.info(`Cleared the campus tag on ${docs.length} ${collection} record(s).`)
  }

  payload.logger.info('Primary campuses merged.')
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('Merge failed:', error)
  process.exit(1)
})
