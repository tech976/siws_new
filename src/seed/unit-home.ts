import { loadEnv } from '@/utilities/load-env'

import { hasAuthoredHome } from './authored-home-pages'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Rebuilds each unit's home page in the shape of the SIWS portal home page.
 *
 * The unit sites opened on `heroEnquiry` — a banner whose right half is an
 * admissions form. That asks a visitor to fill something in before the page
 * has told them anything about the school, and it looks nothing like the
 * portal. They now open the way the portal does: a photograph behind the
 * school's name, its own line, one action, and the figures beneath.
 *
 * NOTHING IS INVENTED AND NOTHING IS DISCARDED.
 *
 * The banner is built only from fields the unit already holds — its name, its
 * tagline, its description, its photograph — and the figures are the ones its
 * own statistics band already publishes. Every other block on the page is
 * carried over untouched and in its existing order, so the curriculum, rules,
 * faculty and achievements each unit has are preserved exactly.
 *
 * The enquiry form is not deleted from the site: it keeps its own place lower
 * down the page, where a visitor who has read about the school can use it.
 *
 * Run with:  npm run seed:unit-home
 */

const run = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  const { docs: media } = await payload.find({
    collection: 'media',
    sort: 'id',
    limit: 300,
    depth: 0,
    overrideAccess: true,
  })
  const usable = media.filter((m) => m.withdrawn?.isWithdrawn !== true)

  let rebuilt = 0
  const notes: string[] = []

  for (const unit of units) {
    /*
     * A section that has authored its own home page keeps it. This step
     * REPLACES the layout, so running it over a designed page discards the
     * design — see `authored-home-pages.ts`.
     */
    if (hasAuthoredHome(unit.slug as string)) {
      notes.push(`${unit.slug}: home page is authored in its own seed — left alone`)
      continue
    }

    const { docs: pages } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: 'home' } }, { unit: { equals: unit.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const page = pages[0]
    if (!page) continue

    const layout = [...((page.layout ?? []) as unknown as Record<string, unknown>[])]
    if (layout.length === 0) continue

    // Already rebuilt — the page opens on a banner rather than the form.
    /*
     * A page rebuilt by an earlier run opens on the banner this script wrote.
     * Drop that banner and any gallery it appended, so a re-run refreshes them
     * from the current library instead of stacking a second copy of each.
     */
    const priorGallery = (b: Record<string, unknown>) =>
      b.blockType === 'gallery' && String(b.heading ?? '').startsWith('Life at')
    /*
     * A section may open on either block: `hero` is one photograph, and
     * `heroMarquee` is a set that dissolves between them. Both are recognised
     * here, and whichever the section wrote is what it keeps — rebuilding a
     * marquee as a plain hero would throw away the photographs it was given
     * and leave a section that asked for a changing banner with a still one.
     */
    const isBanner = (b: Record<string, unknown> | undefined) =>
      b?.blockType === 'hero' || b?.blockType === 'heroMarquee'
    const existingHero = isBanner(layout[0]) ? (layout[0] as Record<string, unknown>) : null
    const cleaned = isBanner(layout[0]) ? layout.slice(1).filter((b) => !priorGallery(b)) : layout

    /*
     * THE SECTION'S OWN HEADLINE SURVIVES THIS.
     *
     * This step re-cuts every unit home page into the portal's shape, and it
     * used to title the banner `unit.name` unconditionally. That is the name
     * of the school, not the line the section wrote to open with: the
     * Kindergarten's own seed opens on "Wadala's Most Trusted Kindergarten
     * Since 1934", and this replaced it with "SIWS Kindergarten" on every
     * single run.
     *
     * The failure was invisible in exactly the way that costs a day. This runs
     * at step 18 and the section seed at step 9, so the headline was written
     * correctly, sat correctly in the database for nine steps, and was
     * overwritten before the run finished. Re-seeding to fix it re-broke it.
     *
     * So a headline the section has already written is carried forward, and
     * `unit.name` is only the fallback for a page that has never had one.
     */

    /*
     * The banner photograph: the unit's own hero if it has one, otherwise the
     * first photograph belonging to that unit. Units with no photograph of
     * their own get a banner without one — the block renders type-only, and
     * borrowing another school's picture would misrepresent this one.
     */
    const heroImage =
      (typeof unit.heroImage === 'number' ? unit.heroImage : null) ??
      usable.find((m) => {
        const u = m.unit
        const id = typeof u === 'object' && u !== null ? (u as { id: number }).id : u
        return String(id) === String(unit.id)
      })?.id ??
      null

    if (!heroImage) notes.push(`${unit.slug}: no photograph of its own — banner is type only`)

    /*
     * The figures already published in this unit's own statistics band, lifted
     * into the banner exactly as the portal does. Nothing new is asserted.
     */
    const stats = cleaned.find((b) => b.blockType === 'statistics') as
      { stats?: { value?: string; label?: string }[] } | undefined
    const highlights = (stats?.stats ?? [])
      .slice(0, 3)
      .filter((s) => s.value?.trim())
      .map((s) => ({ value: s.value, label: s.label ?? '' }))

    const { docs: adm } = await payload.find({
      collection: 'pages',
      where: {
        and: [
          { slug: { equals: 'admissions' } },
          { unit: { equals: unit.id } },
          { _status: { equals: 'published' } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const admissionsId = adm[0]?.id ?? null

    /*
     * A gallery of this unit's OWN photographs, drawn from the folders SIWS
     * filed them under. A unit never shows another unit's pictures: a
     * four-year-old on the Secondary page would misrepresent the school a
     * parent is looking at.
     *
     * Twelve fills four rows of three and reads as a complete wall without
     * turning the home page into a contact sheet — the rest stay in the
     * library for the section pages.
     */
    const own = usable.filter((m) => {
      const u = m.unit
      const id = typeof u === 'object' && u !== null ? (u as { id: number }).id : u
      return String(id) === String(unit.id) && m.id !== heroImage
    })
    const gallery =
      own.length > 0
        ? [
            {
              blockType: 'gallery',
              heading: `Life at ${unit.shortName ?? unit.name}`,
              accentWord: unit.shortName ?? undefined,
              headingLevel: 'h2',
              background: 'tint',
              layout: 'grid',
              perPage: '12',
              images: own.slice(0, 12).map((m) => ({ image: m.id, caption: '' })),
            },
          ]
        : []

    const banner: Record<string, unknown> = {
      blockType: existingHero?.blockType === 'heroMarquee' ? 'heroMarquee' : 'hero',
      // Only a marquee has these, and passing them to a `hero` would be
      // silently dropped rather than refused, so they are set conditionally.
      ...(existingHero?.blockType === 'heroMarquee'
        ? {
            ...(existingHero.images ? { images: existingHero.images } : {}),
            ...(existingHero.speed ? { speed: existingHero.speed } : {}),
          }
        : {}),
      title: (existingHero?.title as string) || unit.name,
      ...(existingHero?.accentWord ? { accentWord: existingHero.accentWord } : {}),
      ...(existingHero?.eyebrow ? { eyebrow: existingHero.eyebrow } : {}),
      ...(existingHero?.subtitle ? { subtitle: existingHero.subtitle } : {}),
      background: 'brand',
      /*
       * THE PAGE'S OWN BANNER LINE WINS OVER THE UNIT TAGLINE.
       *
       * This read `unit.tagline` alone, so a line written on the banner in a
       * section's own seed was thrown away every time this step ran — and
       * neither Secondary nor Junior College carries a tagline, so both
       * banners published with no line under the title at all. The sentence
       * each seed had written for it never reached a visitor.
       *
       * The order matches `title` above: what the page already says wins, and
       * the unit record is the fallback for a section that has not said
       * anything. Kindergarten and Primary do not reach this code — their home
       * pages are authored and skipped at the top of the loop.
       */
      ...(existingHero?.intro || unit.tagline
        ? { intro: (existingHero?.intro as string) || (unit.tagline as string) }
        : {}),
      ...(heroImage ? { image: heroImage } : {}),
      ...(highlights.length > 0 ? { highlights } : {}),
      /*
       * Points at this unit's own Admissions page. An `external` link to a
       * same-site path is rejected by the URL validator, which requires an
       * absolute address — correctly, since that field is for other websites.
       * The button is omitted where a unit has no Admissions page rather than
       * pointing somewhere that does not exist.
       */
      ...(admissionsId
        ? {
            links: [
              {
                link: {
                  label: 'Enquire about admission',
                  type: 'internal',
                  appearance: 'primary',
                  reference: { relationTo: 'pages', value: admissionsId },
                },
              },
            ],
          }
        : {}),
    }

    /*
     * The old banner keeps its form but loses its heading, so the page does
     * not announce the school twice — the new banner above already did.
     */
    const rest = cleaned.map((block) =>
      block.blockType === 'heroEnquiry' ? { ...block, id: undefined } : block,
    )

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: {
        // Passed back unchanged: `payload.update` replaces the document, and
        // omitting these resets status and strips the page from the menu.
        _status: page._status ?? 'published',
        slug: page.slug,
        unit: unit.id,
        showInNav: page.showInNav ?? false,
        navOrder: page.navOrder ?? 100,
        ...(page.navParent ? { navParent: page.navParent } : {}),
        layout: [banner, ...rest, ...gallery],
      } as never,
      overrideAccess: true,
    })

    rebuilt += 1
    payload.logger.info(`${unit.slug}: rebuilt in the portal's shape.`)
  }

  payload.logger.info(`${rebuilt} unit home page(s) rebuilt.`)
  for (const note of notes) payload.logger.warn(note)

  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
