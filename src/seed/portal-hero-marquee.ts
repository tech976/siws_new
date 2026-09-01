import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Gives the portal's opening banner a background that slides.
 *
 * FOUR PHOTOGRAPHS, IN A DELIBERATE ORDER: something being made, something
 * being learnt, something being performed, and the place all three happen.
 * They are named in this file rather than selected from the library, because
 * that sequence is an editorial decision and no filter produces it.
 *
 * Each is still checked against the rules the galleries use — nothing
 * withdrawn (FR-SW-05), nothing showing an identifiable child without a
 * permission record (FR-PRV-11), nothing upright — so the front page cannot
 * end up carrying a picture that should not be published, and the run says
 * which one it dropped and why.
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

  /* ------------------------------------------------- the four photographs */
  /*
   * NAMED, NOT SELECTED.
   *
   * An earlier version read the whole library and dealt it round-robin across
   * the sections. That is the right instinct for a wall of forty tiles and the
   * wrong one for four, because these four are a sequence with a meaning:
   * something being made, something being learnt, something being performed,
   * and the place it all happens. No filter produces that ordering, and a
   * filter that happened to today would stop producing it the next time
   * somebody uploaded a photograph.
   *
   * Each is checked against the same rules the galleries use before it is
   * published, so a withdrawal or a missing permission record still takes a
   * picture out rather than putting an unpublishable one on the front page.
   */
  const WANTED: { filename: string; shows: string }[] = [
    { filename: 'kg-activity-creative.jpg', shows: 'student activity' },
    { filename: 'primary-classroom.jpg', shows: 'a classroom' },
    { filename: 'natya-tarang-2026-performance.jpg', shows: 'an extracurricular performance' },
    { filename: 'jc-independence-day-2026.jpg', shows: 'the campus' },
  ]

  const chosen: { id: number }[] = []
  for (const want of WANTED) {
    const { docs } = await payload.find({
      collection: 'media',
      where: { filename: { equals: want.filename } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const item = docs[0]
    if (!item) {
      payload.logger.warn(
        `Hero: ${want.filename} (${want.shows}) is not in the library — the banner is one photograph shorter. Run npm run seed:media.`,
      )
      continue
    }

    if (item.withdrawn?.isWithdrawn) {
      payload.logger.warn(`Hero: ${want.filename} has been withdrawn and is left off the banner.`)
      continue
    }

    if (item.depictsChildren && !item.parentalConsent?.obtained) {
      payload.logger.warn(
        `Hero: ${want.filename} shows identifiable children and has no permission record, so it cannot go on the front page (FR-PRV-11).`,
      )
      continue
    }

    if (
      typeof item.width === 'number' &&
      typeof item.height === 'number' &&
      item.width < item.height
    ) {
      payload.logger.warn(
        `Hero: ${want.filename} is upright. Across a banner it crops to a band through its middle, so it is left off.`,
      )
      continue
    }

    chosen.push({ id: item.id as number })
  }

  if (chosen.length === 0) {
    throw new Error(
      'None of the four hero photographs are usable — the banner would have no picture.',
    )
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
    /*
     * The banner paints its own brand gradient over the photographs, so the
     * section ground underneath is never seen. Recorded as brand so the value
     * is not misleading to anyone reading it in the admin panel.
     */
    background: 'brand',
    speed: 'calm',
    images: chosen.map((item) => ({ image: item.id })),
  }

  const layout = (home.layout ?? []).map((block: { blockType?: string }) =>
    block.blockType === 'hero' || block.blockType === 'heroMarquee' ? marquee : block,
  )

  /*
   * `_status` IS PASSED BACK, AND IT SAYS PUBLISHED.
   *
   * Two things went wrong here and they pull in opposite directions.
   *
   * Omitting the field entirely — which is what this did — makes Payload reset
   * it to its default on any update outside draft mode. Rebuilding the banner
   * therefore took the portal's front page offline and reported success, and
   * the site went on serving an older published version with no banner at all.
   *
   * Handing back whatever status the page already had is the usual fix, and it
   * is the wrong one here: it preserves a draft that an earlier run left
   * behind, so the front page stays dark and every subsequent run faithfully
   * keeps it that way.
   *
   * Published, then — and this seed is entitled to say so. The consent gate
   * above drops any photograph showing identifiable children without a
   * permission record (FR-PRV-11), so a banner that exists at all is one whose
   * pictures may be shown. There is nothing else holding this page back.
   */
  await payload.update({
    collection: 'pages',
    id: home.id,
    data: { layout, _status: 'published' } as never,
    overrideAccess: true,
  })

  payload.logger.info(
    `Portal banner rebuilt — ${chosen.length} photographs, one every 4.5 seconds.`,
  )

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
