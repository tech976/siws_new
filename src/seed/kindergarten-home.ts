import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Rebuilds the Kindergarten home page so photographs run THROUGH it.
 *
 * The page had ten consecutive text-only bands between its banner and its
 * gallery — roughly six hundred words with nothing to look at — and then
 * dumped every photograph in a 1,400px block at the bottom. A parent scrolling
 * it met a wall of prose and gave up before the pictures.
 *
 * This interleaves them: a picture-and-text band, a bento grid mixing
 * photographs with short claims, photographic dividers between long stretches,
 * and a shorter showcase at the end rather than a dump.
 *
 * NO PROSE IS WRITTEN HERE. Every band reuses a section the page already had;
 * the only new text is tile headings lifted verbatim from those sections. A
 * section with no photograph to pair with stays exactly as it was.
 *
 * Idempotent — it strips its own previous output before rebuilding.
 *
 * Run with:  npm run seed:kg-home
 */

/** Categories that read as "this is the place" behind type. */
const ATMOSPHERIC = ['classroom', 'campus', 'activities', 'sports']

/**
 * Categories that must NEVER appear on this page.
 *
 * The picnic set was photographed at commercial play centres — Xeno's and
 * JumbleTumble — not on school premises. One of those frames (a costumed
 * mascot in front of a soft-play rig) reached the "Why Parents Choose SIWS"
 * grid, where it reads as the school's own facility. The image curation had
 * already flagged the whole set as off-limits for home, about and facilities;
 * this enforces it in code rather than relying on the picking order.
 */
const OFF_LIMITS = ['picnic']

const run = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'kindergarten' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const unit = units[0]
  if (!unit) {
    console.error('No kindergarten unit.')
    process.exit(1)
  }

  const { docs: pages } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'home' } }, { unit: { equals: unit.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = pages[0]
  if (!page) {
    console.error('No kindergarten home page.')
    process.exit(1)
  }

  const { docs: allMedia } = await payload.find({
    collection: 'media',
    sort: 'id',
    limit: 600,
    depth: 0,
    overrideAccess: true,
  })
  const unitOf = (v: unknown) =>
    typeof v === 'object' && v !== null ? String((v as { id: number }).id) : v ? String(v) : null
  const mine = allMedia.filter(
    (m) =>
      unitOf(m.unit) === String(unit.id) &&
      m.withdrawn?.isWithdrawn !== true &&
      !OFF_LIMITS.some((c) => (m.category ?? '').toLowerCase().includes(c)),
  )

  const atmospheric = mine.filter((m) =>
    ATMOSPHERIC.some((c) => (m.category ?? '').toLowerCase().includes(c)),
  )

  const used = new Set<number>()
  const take = (pool: typeof mine) => {
    const hit = pool.find((m) => !used.has(m.id))
    if (hit) used.add(hit.id)
    return hit ?? null
  }

  const stripIds = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(stripIds)
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (k === 'id') continue
        out[k] = stripIds(val)
      }
      return out
    }
    return v
  }

  const raw = [...((page.layout ?? []) as unknown as Record<string, unknown>[])]

  /*
   * Strip this script's own previous output — but CONVERT IT BACK first.
   *
   * A bento grid and a card grid are both built by consuming a feature list,
   * which destroys the original. Simply dropping them on a re-run therefore
   * deleted the sections outright: "Why Parents Choose SIWS" and "Why
   * play-based learning works" disappeared from the page entirely, because
   * there was no longer a list left to rebuild them from.
   *
   * Reversing them restores the source material, so this script can be run any
   * number of times without ever losing a section.
   */
  const source: Record<string, unknown>[] = []
  for (const b of raw) {
    if (b.blockType === 'divider' && b.placedBySeed === true) continue

    if ((b.blockType === 'bento' || b.blockType === 'cardGrid') && b.placedBySeed === true) {
      const rows = ((b.tiles ?? b.cards ?? []) as Record<string, unknown>[]).filter(
        (t) => t.title || t.body || t.description,
      )
      source.push({
        blockType: 'featureList',
        heading: b.heading ?? null,
        accentWord: b.accentWord ?? null,
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2',
        background: 'white',
        items: rows.map((t) => ({
          title: t.title ?? '',
          description: (t.body ?? t.description ?? '') as string,
        })),
      })
      continue
    }

    source.push(b)
  }

  const hero = source.find((b) => b.blockType === 'hero')
  if (hero && typeof hero.image === 'number') used.add(hero.image)

  const body = source.filter((b) => b.blockType !== 'hero')

  /*
   * A feature list is a set of short claims — exactly what a bento grid is
   * for. The first one on the page becomes the grid, its items becoming tiles
   * with their own wording, and photographs dropped in between them so the
   * claims and the school appear together rather than in separate bands.
   */
  /*
   * EXACTLY ONE bento grid on the page.
   *
   * Two of them turned a device into a pattern — the second read as "another
   * one of those" rather than as a deliberate arrangement, which is the whole
   * value of the form. The first qualifying list becomes the grid; every other
   * list is given a different frame below, so the page changes shape as it
   * goes instead of repeating.
   */
  const featureLists = body.filter(
    (b) => b.blockType === 'featureList' && Array.isArray(b.items) && b.items.length >= 3,
  )
  const theBento = featureLists[0] ?? null
  const otherLists = new Set(featureLists.slice(1))

  /*
   * Which prose sections are long enough to sit beside a picture. Measured
   * from the Lexical tree rather than guessed: a section under ~35 words
   * leaves a photograph stranded next to two lines of text.
   */
  const wordCount = (node: unknown): number => {
    if (!node || typeof node !== 'object') return 0
    const n = node as Record<string, unknown>
    if (typeof n.text === 'string') return n.text.trim().split(/\s+/).filter(Boolean).length
    const kids = (n.children ?? (n.root as Record<string, unknown>)?.children) as unknown[] | undefined
    return Array.isArray(kids) ? kids.reduce((sum: number, k) => sum + wordCount(k), 0) : 0
  }
  const convertible = new Set(
    body.filter((b) => b.blockType === 'richText' && wordCount(b.content) >= 35),
  )
  let proseCount = 0
  let gridCount = 0
  let dividersPlaced = 0

  const out: Record<string, unknown>[] = []
  if (hero) out.push(hero)

  const divider = (overlay: string) => {
    const img = take(atmospheric.length > 0 ? atmospheric : mine)
    if (!img) return null
    return {
      blockType: 'divider',
      image: img.id,
      overlay,
      placedBySeed: true,
      height: 'slim',
      ...(unit.tagline ? { text: unit.tagline } : {}),
    }
  }

  body.forEach((block, i) => {
    if (block === theBento) {
      const items = (block.items ?? []) as { title?: string; description?: string }[]
      const tiles: Record<string, unknown>[] = []

      /*
       * A LARGE PHOTOGRAPH leads the grid.
       *
       * The lead tile used to be a flat brand-coloured slab running the full
       * width — 175px of solid blue carrying two lines of text, which read as
       * a gap rather than as emphasis. A picture anchors a bento; a colour
       * block only fills it.
       */
      const anchor = take(atmospheric.length > 0 ? atmospheric : mine)
      if (anchor) tiles.push({ size: 'large', tone: 'photo', image: anchor.id })

      items.slice(0, 6).forEach((item, n) => {
        /*
         * Every third tile is a photograph, so pictures are threaded between
         * the claims instead of sitting in a row of their own.
         */
        /*
         * A picture tile and nothing else — no heading, no caption. It shows
         * the school beside the claims rather than pretending to prove any one
         * of them.
         */
        /*
         * One further picture, drawn from a DIFFERENT category to the anchor.
         * Both tiles previously came off the top of the same queue, so the
         * grid showed two frames of the same Sports Day with the same banner
         * in shot.
         */
        if (n === 2) {
          const differs = mine.filter(
            (m) => (m.category ?? '') !== (anchor?.category ?? '') && !used.has(m.id),
          )
          const img = take(differs.length > 0 ? differs : mine)
          if (img) tiles.push({ size: 'tall', tone: 'photo', image: img.id })
        }
        /*
         * The first tile is wide and on brand — a grid of identical tiles is
         * a list with rounded corners. One tile carrying the weight is what
         * makes the arrangement read as deliberate.
         */
        /* One tile on brand for emphasis — the rest quiet, so it stands out. */
        tiles.push({
          size: 'small',
          tone: n === 0 ? 'brand' : 'plain',
          title: item.title ?? '',
          body: item.description ?? '',
        })
      })

      gridCount += 1
      out.push({
        blockType: 'bento',
        heading: block.heading ?? null,
        accentWord: block.accentWord ?? null,
        headingLevel: 'h2',
        background: 'white',
        placedBySeed: true,
        tiles,
      })
      return
    }

    /*
     * A long prose section becomes picture-beside-text, sides alternating.
     *
     * This is where the wall of words actually was: eight richText bands in a
     * row, each a heading over a paragraph. Pairing each with a photograph and
     * flipping the side gives the eye something to track down the page, and
     * costs no new copy — the same words, beside a picture instead of alone.
     *
     * Only sections long enough to fill a column are converted; a two-line
     * band beside a photograph leaves the picture stranded.
     */
    /*
     * Any further list becomes cards WITH photographs — a different frame
     * from the grid above and from the picture-beside-text below, so three
     * consecutive sections never share a shape.
     */
    if (otherLists.has(block)) {
      const items = (block.items ?? []) as { title?: string; description?: string }[]
      /*
       * NO photograph on these cards.
       *
       * A card here says "Boosts language skills" or "Develops critical
       * thinking" — claims no photograph in the library depicts. Pairing them
       * with whatever image came next put Sports Day beside all five points of
       * a play-based-learning list, and a picnic beside an achievement won at
       * another school. An unrelated picture next to a specific claim does not
       * merely fail to help; it asserts something untrue.
       *
       * The photographs stay where they can be honest: in the bento's own
       * picture tiles, in the bands between sections, and in the gallery.
       */
      const cards = items.slice(0, 6).map((item) => ({
        title: item.title ?? '',
        description: item.description ?? '',
      }))
      out.push({
        blockType: 'cardGrid',
        heading: block.heading ?? null,
        accentWord: block.accentWord ?? null,
        headingLevel: 'h2',
        columns: cards.length >= 4 ? '3' : '2',
        background: 'tint',
        placedBySeed: true,
        cards,
      })
      return
    }

    const isProse = block.blockType === 'richText' && block.width !== 'narrow'
    if (isProse && convertible.has(block)) {
      const img = take(mine)
      if (img) {
        out.push({
          blockType: 'mediaText',
          heading: block.heading ?? null,
          accentWord: block.accentWord ?? null,
          headingLevel: 'h2',
          background: block.background ?? 'white',
          image: img.id,
          imagePosition: proseCount++ % 2 === 0 ? 'right' : 'left',
          imageShape: 'rounded',
          content: block.content,
        })
        return
      }
    }

    out.push(block)

    /*
     * A photographic band after every third section, to break the longest
     * runs of prose. Not after the last one — the gallery follows there.
     */
    /*
     * A photographic band after a section that carries no picture of its own.
     *
     * Removing the false card pairings left two list sections and several
     * prose sections completely bare, so the page swung from misleading to
     * text-heavy. A band beneath them shows the school WITHOUT attaching a
     * photograph to any single claim — the picture belongs to the section, not
     * to a bullet point.
     */
    const justAdded = out[out.length - 1]
    const bare =
      justAdded &&
      !justAdded.image &&
      justAdded.blockType !== 'divider' &&
      justAdded.blockType !== 'gallery' &&
      justAdded.blockType !== 'bento'
    const nearEnd = i >= body.length - 2

    if (bare && !nearEnd && dividersPlaced < 3) {
      const d = divider(dividersPlaced % 2 === 0 ? 'brand' : 'sea')
      if (d) {
        out.push(d)
        dividersPlaced += 1
      }
    }
  })

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
      layout: stripIds(out),
    } as never,
    overrideAccess: true,
  })

  payload.logger.info(
    `Kindergarten home rebuilt — ${out.length} bands, ${used.size} photograph(s) threaded through.`,
  )

  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
