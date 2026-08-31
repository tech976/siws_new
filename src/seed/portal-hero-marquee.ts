import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Replaces the portal's opening banner with the drifting photograph wall.
 *
 * WHERE THE PHOTOGRAPHS COME FROM
 * -------------------------------
 * The media library, filtered the same way `seed/galleries.ts` filters it, and
 * for the same reasons: nothing withdrawn (FR-SW-05), nothing showing an
 * identifiable child without a completed permission record (FR-PRV-11), and
 * nothing marked as page furniture — posters, certificates, video thumbnails.
 * A banner is a published page like any other, so the same rules bind it.
 *
 * The list is NOT written out here. Hard-coding forty filenames would mean a
 * photograph imported next term never reaches the banner until somebody
 * remembers this file, and a photograph withdrawn next term stays on the front
 * page until somebody remembers it twice. Reading the library means re-running
 * this after an import is the whole maintenance story.
 *
 * INTERLEAVED BY SECTION. The library comes back grouped — sixteen Kindergarten
 * photographs, then eleven Primary, and so on — and feeding that order straight
 * in would give a banner that is all one school for its first thirty seconds.
 * The photographs are dealt round-robin across the sections instead, so a row
 * shows a different school every few tiles. That is the argument the portal
 * banner exists to make.
 *
 * The words are carried over from the `hero` block it replaces, unchanged.
 *
 * Run with:  npm run seed:portal-marquee
 */

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: pages } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'home' } }, { unit: { exists: false } }] },
    limit: 1,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })

  const home = pages[0]
  if (!home) throw new Error('Portal home page not found. Run `npm run seed:institution` first.')

  /* ---------------------------------------------------- the photograph pool */

  const { docs: media } = await payload.find({
    collection: 'media',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    sort: 'filename',
  })

  const publishable = media.filter((item) => {
    if (item.withdrawn?.isWithdrawn) return false
    if (item.depictsChildren && !item.parentalConsent?.obtained) return false
    if (item.showInGallery === false) return false
    /*
     * A tile derives its width from the stored dimensions, so a record without
     * them would be laid out at the 3:2 fallback and jump when the file
     * arrives. Every current upload has them; this is a guard, not a filter
     * anybody expects to bite.
     */
    if (typeof item.width !== 'number' || typeof item.height !== 'number') return false
    return true
  })

  if (publishable.length < 8) {
    throw new Error(
      `Only ${publishable.length} publishable photographs — too few for a banner. Import more, or record the outstanding permissions, before running this.`,
    )
  }

  /* ------------------------------------------------- interleave by section */

  const bySection = new Map<string, typeof publishable>()
  for (const item of publishable) {
    const key = String(item.unit ?? 'shared')
    const bucket = bySection.get(key)
    if (bucket) bucket.push(item)
    else bySection.set(key, [item])
  }

  const buckets = [...bySection.values()]
  const interleaved: typeof publishable = []
  for (let round = 0; interleaved.length < publishable.length; round += 1) {
    for (const bucket of buckets) {
      const item = bucket[round]
      if (item) interleaved.push(item)
    }
  }

  /* ------------------------------------------------------------ the banner */

  const existingHero = (home.layout ?? []).find(
    (b: { blockType?: string }) => b.blockType === 'hero' || b.blockType === 'heroMarquee',
  ) as Record<string, unknown> | undefined

  if (!existingHero) {
    throw new Error('The portal home page has no opening banner to replace.')
  }

  /*
   * The words are the existing banner's, carried across field by field rather
   * than retyped — the heading, its accent, the ladder of subtitle and intro,
   * the figures and the button have all been argued over already, and this
   * change is about the picture.
   */
  const marquee = {
    blockType: 'heroMarquee',
    title: existingHero.title ?? 'Excellence at Every Stage',
    accentWord: existingHero.accentWord ?? undefined,
    subtitle: existingHero.subtitle ?? undefined,
    intro: existingHero.intro ?? undefined,
    highlights: existingHero.highlights ?? undefined,
    links: existingHero.links ?? undefined,
    /*
     * White, like the banner it replaces. The photographs are the colour on
     * this page; putting them on brand blue would give the eye two things
     * competing to be the loudest object above the fold.
     */
    background: 'white',
    rows: '2',
    speed: 'calm',
    images: interleaved.map((item) => ({ image: item.id })),
  }

  const layout = (home.layout ?? []).map((block: { blockType?: string }) =>
    block.blockType === 'hero' || block.blockType === 'heroMarquee' ? marquee : block,
  )

  await payload.update({
    collection: 'pages',
    id: home.id,
    data: { layout } as never,
    overrideAccess: true,
  })

  const perRow = Math.ceil(interleaved.length / 2)
  payload.logger.info(
    `Portal banner rebuilt — ${interleaved.length} photographs across ${bySection.size} sections, ${perRow} per row.`,
  )

  const setAside = media.length - publishable.length
  if (setAside > 0) {
    payload.logger.info(
      `${setAside} picture(s) were left out: withdrawn, awaiting a permission record, or marked as page furniture rather than photographs of the school.`,
    )
  }

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
