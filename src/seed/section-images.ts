import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Puts each photograph on the page it actually belongs to.
 *
 * SIWS filed every image under a descriptive folder — "Facility Images",
 * "Parents Testimonials", "Award And Recognition", "Extra Co Curricular
 * Activities" — and the import carried that folder name onto each record as
 * its category. This uses those categories to place photographs on the
 * matching section page, instead of pooling them all into one gallery on the
 * home page.
 *
 * The school's own filing is the authority. Nothing here re-interprets what a
 * picture shows: a photograph in "Facility Images" goes to Facilities because
 * SIWS put it there, not because anything inspected the image.
 *
 * A page only ever receives photographs belonging to ITS OWN unit, so no
 * school shows another's students.
 *
 * Run with:  npm run seed:section-images
 */

/**
 * Page slug → the category fragments whose photographs belong on it, matched
 * case-insensitively as substrings so a folder named "Facility Images Labs
 * Library Sports Play Area" still lands on Facilities.
 */
const PLACEMENT: Record<string, string[]> = {
  facilities: ['facility', 'facilities', 'campus', 'classroom', 'safe and secure', 'modern'],
  academics: [
    'handson',
    'hands on',
    'story telling',
    'art integrated',
    'grade ',
    'remedial',
    'development of communication',
    'beyond academics',
    'strengthening',
    'prepare for higher',
    'building story',
  ],
  teachers: ['experienced and dedicated teachers', 'teachers achievements'],
  achievements: [
    'award',
    'recognition',
    'competition',
    'teachers achievements',
    'certification',
    'press mentions',
  ],
  'student-life': [
    'student activities',
    'students life',
    'student life',
    'extra co curricular',
    'sports',
    'picnic',
    'social awareness',
    'environmental awareness',
  ],
  events: ['festival', 'annual day', 'cultural', 'dance competition'],
  updates: ['festival', 'annual day', 'cultural'],
  gallery: [], // takes everything belonging to the unit
}

const run = async () => {
  const payload = await getPayload({ config })

  const { docs: media } = await payload.find({
    collection: 'media',
    sort: 'id',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  const usable = media.filter((m) => m.withdrawn?.isWithdrawn !== true)

  const { docs: pages } = await payload.find({
    collection: 'pages',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  const unitOf = (v: unknown) =>
    typeof v === 'object' && v !== null ? String((v as { id: number }).id) : v ? String(v) : null

  let updated = 0
  const empty: string[] = []

  for (const page of pages) {
    const fragments = PLACEMENT[page.slug]
    if (!fragments) continue

    const pageUnit = unitOf(page.unit)
    // Institution-wide pages have no unit of their own to draw from.
    if (!pageUnit) continue

    const matches = usable.filter((m) => {
      if (unitOf(m.unit) !== pageUnit) return false
      if (fragments.length === 0) return true
      const cat = (m.category ?? '').toLowerCase()
      return fragments.some((f) => cat.includes(f))
    })

    if (matches.length === 0) {
      empty.push(`${page.slug} (unit ${pageUnit})`)
      continue
    }

    const layout = [...((page.layout ?? []) as unknown as Record<string, unknown>[])]
    /*
     * Replace any gallery this script previously added rather than appending a
     * second one, so re-running refreshes the set instead of stacking copies.
     */
    const kept = layout.filter(
      (b) => !(b.blockType === 'gallery' && String(b.heading ?? '').startsWith('Photographs')),
    )

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: {
        // Passed back unchanged — `payload.update` replaces the document, and
        // omitting these resets status and strips the page from the menu.
        _status: page._status ?? 'published',
        slug: page.slug,
        unit: page.unit,
        showInNav: page.showInNav ?? false,
        navOrder: page.navOrder ?? 100,
        ...(page.navParent ? { navParent: page.navParent } : {}),
        layout: [
          ...kept,
          {
            blockType: 'gallery',
            heading: `Photographs`,
            headingLevel: 'h2',
            background: 'tint',
            layout: 'grid',
            perPage: '12',
            images: matches.slice(0, 24).map((m) => ({ image: m.id, caption: '' })),
          },
        ],
      } as never,
      overrideAccess: true,
    })

    updated += 1
    payload.logger.info(`${page.slug}: ${Math.min(matches.length, 24)} photograph(s) placed.`)
  }

  payload.logger.info(`${updated} page(s) given their own photographs.`)
  if (empty.length > 0) {
    payload.logger.warn(`No matching photographs, left as they were: ${empty.join(', ')}`)
  }

  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
