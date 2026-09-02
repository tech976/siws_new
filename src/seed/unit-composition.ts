import { loadEnv } from '@/utilities/load-env'

import { hasAuthoredHome } from './authored-home-pages'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * THE SHARED HOME-PAGE COMPOSITION.
 *
 * One definition of how a SIWS home page is built, applied to every unit. The
 * portal's own home page established the pattern — a banner, then alternating
 * bands of picture-and-text separated by photographic dividers, a figures band
 * over a photograph, and a gallery — and the unit sites were not following it:
 * they had the banner and then ran as unbroken text.
 *
 * WHY A SCRIPT RATHER THAN FOUR HAND-BUILT PAGES.
 *
 * Layouts live per page in the CMS, so "change the portal and the units
 * follow" cannot happen by itself. This file is the mechanism: the sequence
 * below is the single place the pattern is written down. Change `COMPOSITION`,
 * re-run, and all four unit sites move together. That is the propagation.
 *
 * WHAT IT WILL NOT DO.
 *
 * It writes no prose. Every band is filled from what the unit already holds —
 * its own description, its own existing sections, its own photographs. A unit
 * with nothing to say in a slot simply does not get that band, rather than
 * getting invented copy. A unit with no photograph of its own gets the text
 * treatment instead of another school's picture.
 *
 * Run with:  npm run seed:unit-composition
 */

/**
 * The pattern, in order. Each entry names a band and how it is filled.
 *
 * `source` says where the content comes from:
 *   keep      — an existing block on the page, matched by blockType
 *   unit      — a field on the unit record
 *   photos    — drawn from that unit's own media library
 */
const COMPOSITION = [
  { band: 'hero', source: 'keep', blockType: 'hero' },
  /*
   * NO BAND BETWEEN THE BANNER AND "ABOUT". There used to be a `divider` here
   * — a wide photograph under a solid brand wash — and SIWS asked on
   * 2026-09-02 for it to come off both the sections this file composes.
   *
   * It was the SECOND blue-washed photograph in a row. The banner above it is
   * already type over a picture behind a brand gradient, so the page opened on
   * one wash, then another slimmer wash of a different picture, before saying
   * anything at all. The two read as one long blue block with a seam in it,
   * and the first thing a visitor actually had to read was pushed a screen
   * further down.
   *
   * `divider2` further down is kept: by then the page has had a figures band,
   * a list and a stretch of prose, which is the "long stretch that needs
   * breaking" the pattern was written for — and it carries the lighter `sea`
   * wash rather than a second `brand` one.
   */
  { band: 'about', source: 'unit', field: 'description', image: 'right' },
  { band: 'figures', source: 'keep', blockType: 'statistics', image: 'background' },
  { band: 'sections', source: 'keep', blockType: 'featureList' },
  { band: 'cards', source: 'keep', blockType: 'cardGrid' },
  { band: 'prose', source: 'keep', blockType: 'richText' },
  /*
   * `divider2` HAS NOW GONE TOO, at SIWS's request (2026-09-02).
   *
   * It sat between "About South Indians' Welfare Society" and the photograph
   * wall below it — a wide picture under a wash, immediately above a band of
   * pictures. The note above records why it was kept when the first divider
   * came off: by that point the page has had figures, a list and a stretch of
   * prose, which is the long stretch the pattern was written to break.
   *
   * What that reasoning missed is what follows it. The showcase is already a
   * photographic band, so the page ran prose, one washed photograph, then a
   * wall of them — the divider was breaking a stretch that ended a line later
   * anyway, and reading as a preamble to the gallery rather than as a rest.
   *
   * Neither band is deleted from the pattern's vocabulary; both are simply not
   * placed. A section that wants one can still carry a `divider` of its own.
   */
  { band: 'showcase', source: 'photos', role: 'gallery' },
] as const

/**
 * Categories that make a good wide band behind text, in preference order.
 * Campus and classroom scenes read as "this is the place"; prize-givings and
 * close-ups do not.
 */
const ATMOSPHERIC = ['campus', 'classroom', 'facility', 'facilities', 'ground', 'play']

/**
 * Removes `id` at every level of a block.
 *
 * Reordering a page's blocks re-sends each one with the row id it currently
 * holds, and Payload rejects the document because the order no longer matches
 * — and nested arrays (ticked items, cards, figures, gallery rows) each carry
 * their own id too. Stripping them all makes the write a clean replacement.
 */
const stripIds = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripIds)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'id') continue
      out[k] = stripIds(v)
    }
    return out
  }
  return value
}

const run = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  const { docs: allMedia } = await payload.find({
    collection: 'media',
    /*
     * SORTED, and this is the one that mattered most.
     *
     * This page's banner, its About photograph and its nine gallery tiles are
     * all taken from this list — the first atmospheric match for the banner,
     * `.slice(0, 9)` for the gallery. Unsorted, the list came back in whatever
     * order the database felt like, which is insertion order and therefore
     * different on every machine. Two people running the same seed against the
     * same photographs got different pictures on the home page, and each
     * concluded the other had changed them.
     *
     * `id` is stable and shared, so the same library now composes the same page
     * everywhere. It also means the oldest photographs are preferred, which is
     * what a reader expects: adding a new set for one event should not silently
     * re-cast the banner of every unit.
     */
    sort: 'id',
    limit: 600,
    depth: 0,
    overrideAccess: true,
  })
  /*
   * Withdrawn images out (FR-SW-05), and posters out too.
   *
   * An event invitation is artwork the school made to announce a day, not a
   * photograph of it. It belongs on the event's own page; in the home page's
   * gallery it sat among pictures taken at the celebration and read as a
   * mistake. `showInGallery` is the flag staff clear for exactly this, and
   * this gallery was not reading it.
   */
  const usable = allMedia.filter(
    (m) => m.withdrawn?.isWithdrawn !== true && m.showInGallery !== false,
  )

  const unitOf = (v: unknown) =>
    typeof v === 'object' && v !== null ? String((v as { id: number }).id) : v ? String(v) : null

  let rebuilt = 0
  const notes: string[] = []

  for (const unit of units) {
    /* As in `unit-home`: an authored home page is not re-composed. */
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

    const raw = [...((page.layout ?? []) as unknown as Record<string, unknown>[])]

    /*
     * IDEMPOTENCE. Everything a previous run of this script produced is
     * removed before composing, so a re-run REPLACES its own work instead of
     * treating it as source content and appending another copy. Without this
     * the figures band appeared three times after three runs.
     *
     * Only this script's own output is stripped — an editor's blocks and the
     * unit's seeded content are matched by nothing here and survive untouched.
     */
    const composerMade = (b: Record<string, unknown>) => {
      if (b.blockType === 'divider' && b.placedBySeed === true) return true
      if (b.blockType === 'gallery' && String(b.heading ?? '').startsWith('Life at')) return true
      const about = `About ${unit.shortName ?? unit.name}`
      if (
        (b.blockType === 'mediaText' || b.blockType === 'richText') &&
        String(b.heading ?? '') === about
      ) {
        return true
      }
      return false
    }

    const deduped: Record<string, unknown>[] = []
    const seenType = new Set<string>()
    for (const b of raw) {
      if (composerMade(b)) continue
      /*
       * A page should carry one figures band, not the copies earlier runs
       * left behind. First wins; the rest are dropped.
       */
      if (b.blockType === 'statistics') {
        if (seenType.has('statistics')) continue
        seenType.add('statistics')
      }
      deduped.push(b)
    }
    const existing = deduped
    const mine = usable.filter((m) => unitOf(m.unit) === String(unit.id))

    if (mine.length === 0) {
      notes.push(`${unit.slug}: no photographs of its own — left as text`)
    }

    /** Photographs whose category suits a wide band behind type. */
    const atmospheric = mine.filter((m) =>
      ATMOSPHERIC.some((c) => (m.category ?? '').toLowerCase().includes(c)),
    )
    const pick = (pool: typeof mine, used: Set<number>) => pool.find((m) => !used.has(m.id)) ?? null

    const used = new Set<number>()
    /*
     * A banner is `hero` or `heroMarquee` — one photograph or a set that
     * dissolves between them. Both belong in the hero band; matching only
     * `hero` left a section that had moved to a marquee with no block for that
     * band, so its banner fell through to the leftovers and was rebuilt
     * twelfth, below the whole page.
     */
    const BANNERS = ['hero', 'heroMarquee']
    const heroBlock = existing.find((b) => BANNERS.includes(String(b.blockType)))
    if (heroBlock && typeof heroBlock.image === 'number') used.add(heroBlock.image)

    const take = (b: string) =>
      b === 'hero'
        ? existing.filter((x) => BANNERS.includes(String(x.blockType)))
        : existing.filter((x) => x.blockType === b)

    const out: Record<string, unknown>[] = []
    /*
     * The SOURCE blocks consumed by the pattern, tracked separately from the
     * output. Giving the figures band a photograph produces a NEW object, so
     * checking membership of the output could not tell that the original had
     * been used — and it was appended a second time as a leftover, printing
     * "A legacy parents trust" twice on three of the four units.
     */
    const consumed = new Set<Record<string, unknown>>()

    for (const step of COMPOSITION) {
      if (step.source === 'keep') {
        const blocks = take(step.blockType)
        for (const block of blocks) {
          if (step.band === 'figures' && !block.image) {
            /*
             * The figures band reads as the page's proof, and on the portal it
             * sits over a photograph behind a deep wash. Give it one here too
             * where the unit has a spare.
             */
            const bg = pick(atmospheric.length > 0 ? atmospheric : mine, used)
            if (bg) {
              used.add(bg.id)
              consumed.add(block)
              out.push({ ...block, image: bg.id })
              continue
            }
          }
          consumed.add(block)
          out.push(block)
        }
        continue
      }

      if (step.source === 'unit') {
        /*
         * The school in its own words, beside a photograph — the portal's
         * "About" band. Skipped entirely when the unit has no description,
         * because the alternative is writing one.
         */
        const text = (unit as unknown as Record<string, unknown>)[step.field] as string | undefined
        if (!text || !text.trim()) {
          notes.push(`${unit.slug}: no description — About band skipped`)
          continue
        }
        const img = pick(mine, used)
        if (img) used.add(img.id)

        /*
         * The picture-and-text band REQUIRES a picture, so a unit with none
         * gets the same words as plain prose rather than a block that cannot
         * save. Junior College has no photographs at all in this delivery.
         */
        const body = {
          root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            direction: 'ltr',
            children: [
              {
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                direction: 'ltr',
                textFormat: 0,
                children: [
                  {
                    type: 'text',
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text,
                    version: 1,
                  },
                ],
              },
            ],
          },
        }

        if (!img) {
          out.push({
            blockType: 'richText',
            heading: `About ${unit.shortName ?? unit.name}`,
            headingLevel: 'h2',
            width: 'normal',
            background: 'white',
            content: body,
          })
          continue
        }

        out.push({
          blockType: 'mediaText',
          heading: `About ${unit.shortName ?? unit.name}`,
          headingLevel: 'h2',
          background: 'white',
          imagePosition: step.image === 'right' ? 'right' : 'left',
          imageShape: 'rounded',
          image: img.id,
          content: body,
        })
        continue
      }

      /*
       * step.source === 'photos'
       *
       * NO COMPOSITION STEP ASKS FOR AN ATMOSPHERIC BAND ANY MORE — both
       * dividers came off at SIWS's request — so this branch places nothing
       * today. It is kept rather than deleted because the pattern still knows
       * how to lay one: put a `divider` step back above and it works, without
       * anybody having to write this again.
       */
      if ((step as { role?: string }).role === 'atmospheric') {
        const img = pick(atmospheric.length > 0 ? atmospheric : mine, used)
        if (!img) continue
        used.add(img.id)
        out.push({
          blockType: 'divider',
          image: img.id,
          overlay: 'sea',
          placedBySeed: true,
          height: 'slim',
          ...(unit.tagline ? { text: unit.tagline } : {}),
        })
        continue
      }

      if (step.role === 'gallery') {
        /*
         * The showcase. Deliberately the images at full strength rather than
         * behind a wash — a gallery is the one place the photographs should be
         * seen plainly, which is what "showcase" means.
         */
        /*
         * Nine, not twelve — and always a multiple of three, so the grid ends
         * on a complete row. Ten images left a row of one hanging under a full
         * row of three, which reads as a mistake rather than as a gallery.
         */
        const shown = mine.filter((m) => !used.has(m.id)).slice(0, 9)
        if (shown.length === 0) continue
        out.push({
          blockType: 'gallery',
          heading: `Life at ${unit.shortName ?? unit.name}`,
          accentWord: unit.shortName ?? undefined,
          headingLevel: 'h2',
          background: 'white',
          layout: 'grid',
          perPage: '12',
          images: shown.map((m) => ({ image: m.id, caption: '' })),
        })
      }
    }

    /*
     * Anything the pattern did not name is kept, so no content is lost — but
     * dividers and galleries from a previous run are dropped, since this run
     * has just written fresh ones.
     */
    const keptLeftovers = existing.filter(
      (b) =>
        !consumed.has(b) &&
        !BANNERS.includes(String(b.blockType)) &&
        b.blockType !== 'divider' &&
        b.blockType !== 'gallery',
    )

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: {
        _status: page._status ?? 'published',
        slug: page.slug,
        unit: unit.id,
        showInNav: page.showInNav ?? false,
        navOrder: page.navOrder ?? 100,
        ...(page.navParent ? { navParent: page.navParent } : {}),
        layout: stripIds([...out, ...keptLeftovers]),
      } as never,
      overrideAccess: true,
    })

    rebuilt += 1
    payload.logger.info(
      `${unit.slug}: composed — ${out.length} bands, ${used.size} photograph(s) placed.`,
    )
  }

  payload.logger.info(`${rebuilt} unit home page(s) composed from the shared pattern.`)
  for (const n of notes) payload.logger.warn(n)

  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
