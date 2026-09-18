import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Moves the quick links out of the code and into Configuration → Quick links,
 * exactly as they are today, and puts the Data Protection Officer section on
 * the privacy page.
 *
 * QUICK LINKS. They were derived from six page addresses listed in code. This
 * creates one link per page that exists and is published, per scope, in the
 * same order — so the header panel looks the same the moment the new code goes
 * live, and from then on the school edits it. A scope that already has links is
 * left alone, so this never undoes somebody's edits.
 *
 * PRIVACY PAGE. The "Data Protection Officer and grievance redressal" section
 * is replaced by the live DPO block only while it still says "To be supplied
 * by SIWS". The policy's other sections are the school's text and untouched.
 *
 * Run with:  npm run seed:quick-links
 */

const LEGACY = [
  { slug: 'admissions', icon: 'admissions' },
  { slug: 'scholarships', icon: 'scholarship' },
  { slug: 'annual-calendar', icon: 'calendar' },
  { slug: 'download-centre', icon: 'download' },
  { slug: 'careers', icon: 'arrow' },
  { slug: 'contact', icon: 'contact' },
]

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })

  const scopes: { id: number | null; name: string }[] = [
    { id: null, name: 'SIWS portal' },
    ...(units as unknown as { id: number; name: string }[]).map((unit) => ({ id: unit.id, name: unit.name })),
  ]

  for (const scope of scopes) {
    const existing = await payload.count({
      collection: 'quick-links',
      where: scope.id === null ? { unit: { exists: false } } : { unit: { equals: scope.id } },
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) {
      payload.logger.info(`${scope.name}: already has ${existing.totalDocs} quick links — left alone.`)
      continue
    }

    const { docs: pages } = await payload.find({
      collection: 'pages',
      where: {
        and: [
          { slug: { in: LEGACY.map((entry) => entry.slug) } },
          { _status: { equals: 'published' } },
          scope.id === null ? { unit: { exists: false } } : { unit: { equals: scope.id } },
        ],
      },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    })

    let made = 0
    for (const entry of LEGACY) {
      const page = (pages as unknown as { id: number; slug: string; title: string; navLabel?: string }[]).find(
        (doc) => doc.slug === entry.slug,
      )
      if (!page) continue
      await payload.create({
        collection: 'quick-links',
        overrideAccess: true,
        data: {
          label: page.navLabel || page.title,
          linkType: 'page',
          page: page.id,
          icon: entry.icon,
          ...(scope.id !== null ? { unit: scope.id } : {}),
        } as never,
      })
      made += 1
    }
    payload.logger.info(`${scope.name}: ${made} quick links created.`)
  }

  // ---- Privacy page: the DPO section ---------------------------------------
  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'privacy' } }, { unit: { exists: false } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = docs[0] as unknown as { id: number; layout?: Record<string, unknown>[] } | undefined

  if (page) {
    let changed = false
    const layout = (page.layout ?? []).map((block) => {
      const placeholder = JSON.stringify(block.content ?? '').includes('To be supplied by SIWS')
      if (
        block.blockType === 'richText' &&
        block.heading === 'Data Protection Officer and grievance redressal' &&
        placeholder
      ) {
        changed = true
        return {
          blockType: 'dpoContact',
          heading: 'Data Protection Officer and grievance redressal',
          background: 'white',
        }
      }
      return block
    })
    if (changed) {
      await payload.update({ collection: 'pages', id: page.id, data: { layout } as never, overrideAccess: true })
      payload.logger.info('Privacy page: DPO section now shows the live contact block.')
    } else {
      payload.logger.info('Privacy page: DPO section already filled in — left alone.')
    }
  }

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
