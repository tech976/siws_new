import { loadEnv } from '@/utilities/load-env'

loadEnv()

const fs = await import('node:fs')
const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Applies a curated photograph placement plan to the site.
 *
 * The plan is produced by agents that OPEN each photograph and judge what it
 * shows, rather than inferring from the folder name. Earlier passes matched
 * folder names as substrings, which put trophies on Facilities and washrooms
 * in galleries about learning — the folder labels SIWS used are prospectus
 * headings as often as they are subjects.
 *
 * Each page in the plan gets:
 *   - a section divider carrying one wide atmospheric photograph, and
 *   - a gallery of the images curated for that page.
 *
 * Plan file: /tmp/placement.json
 *   { "pages": [ { "unit": "primary", "campus": "wadala"|null,
 *                  "page": "facilities",
 *                  "galleryImages": ["<abs path>", ...],
 *                  "dividerImage": "<abs path>" } ] }
 *
 * Run with:  npm run seed:apply-placement
 */

interface PlanPage {
  unit: string
  campus?: string | null
  page: string
  galleryImages: string[]
  dividerImage?: string | null
}

const PLAN = '/tmp/placement.json'

const run = async () => {
  if (!fs.existsSync(PLAN)) {
    console.error(`No plan at ${PLAN}. Run the curation workflow first.`)
    process.exit(1)
  }

  const payload = await getPayload({ config })
  const plan: { pages: PlanPage[] } = JSON.parse(fs.readFileSync(PLAN, 'utf8'))

  const { docs: media } = await payload.find({
    collection: 'media',
    sort: 'id',
    limit: 600,
    depth: 0,
    overrideAccess: true,
  })

  /*
   * The plan names files by their path on disk; the library knows them by the
   * name the importer wrote, which flattens the whole inbox-relative path:
   * `secondary/students-life/9.jpg` becomes `secondary-students-life-9.jpg`.
   *
   * Matching on the BASENAME alone is wrong and would have shipped the wrong
   * photographs silently — `1.jpg` exists 24 times across these folders, and
   * 40 basenames collide in total. The path has to be flattened the same way
   * the importer flattened it.
   */
  const byName = new Map<string, number>()
  for (const m of media) {
    if (m.withdrawn?.isWithdrawn === true) continue
    if (typeof m.filename === 'string') byName.set(m.filename.toLowerCase(), m.id)
  }

  /** Mirrors `libraryName()` in scripts/photos.ts exactly. */
  const libraryName = (relative: string): string =>
    `${relative
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9/]+/g, '-')
      .replace(/\//g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')}.jpg`

  const INBOX = 'photos-inbox/'

  const resolve = (p: string): number | null => {
    const norm = p.replace(/\\/g, '/')
    const i = norm.indexOf(INBOX)
    // Accept an absolute path, an inbox-relative path, or the library name.
    const rel = i >= 0 ? norm.slice(i + INBOX.length) : norm.replace(/^\/+/, '')
    return byName.get(libraryName(rel)) ?? byName.get(norm.toLowerCase()) ?? null
  }

  const { docs: pages } = await payload.find({
    collection: 'pages',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  const { docs: units } = await payload.find({
    collection: 'units',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  const unitIdBySlug = new Map(units.map((u) => [u.slug, String(u.id)]))
  const unitOf = (v: unknown) =>
    typeof v === 'object' && v !== null ? String((v as { id: number }).id) : v ? String(v) : null

  let applied = 0
  const unresolved: string[] = []
  const noPage: string[] = []

  for (const entry of plan.pages) {
    const wantUnit = unitIdBySlug.get(entry.unit)
    const page = pages.find((p) => p.slug === entry.page && unitOf(p.unit) === wantUnit)
    if (!page) {
      noPage.push(`${entry.unit}/${entry.page}`)
      continue
    }

    const galleryIds = entry.galleryImages
      .map((f) => {
        const id = resolve(f)
        if (!id) unresolved.push(f)
        return id
      })
      .filter((id): id is number => id !== null)

    /*
     * Trimmed to a multiple of three so the grid always ends on a complete
     * row. Ten images left one tile hanging alone beneath a full row, which
     * reads as a mistake rather than as a gallery.
     */
    const trimmed = galleryIds.slice(0, Math.floor(galleryIds.length / 3) * 3 || galleryIds.length)

    const dividerId = entry.dividerImage ? resolve(entry.dividerImage) : null

    if (trimmed.length === 0 && !dividerId) continue

    const layout = [...((page.layout ?? []) as unknown as Record<string, unknown>[])]
    /*
     * Strip what previous passes added so a re-run refreshes rather than
     * stacking a third gallery on the page.
     */
    const kept = layout.filter((b) => {
      if (b.blockType === 'divider' && b.placedBySeed === true) return false
      if (b.blockType !== 'gallery') return true
      const h = String(b.heading ?? '')
      return !(h.startsWith('Photographs') || h.startsWith('Life at'))
    })

    const additions: Record<string, unknown>[] = []
    if (dividerId) {
      additions.push({
        blockType: 'divider',
        image: dividerId,
        overlay: 'brand',
        placedBySeed: true,
        height: 'slim',
      })
    }
    if (trimmed.length > 0) {
      additions.push({
        blockType: 'gallery',
        heading: 'Photographs',
        headingLevel: 'h2',
        background: 'white',
        layout: 'grid',
        perPage: '12',
        images: trimmed.map((id) => ({ image: id, caption: '' })),
      })
    }

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: {
        // Passed back unchanged: `payload.update` replaces the document, so
        // omitting these resets status and strips the page from the menu.
        _status: page._status ?? 'published',
        slug: page.slug,
        unit: page.unit,
        showInNav: page.showInNav ?? false,
        navOrder: page.navOrder ?? 100,
        ...(page.navParent ? { navParent: page.navParent } : {}),
        layout: [...kept, ...additions],
      } as never,
      overrideAccess: true,
    })

    applied += 1
    payload.logger.info(
      `${entry.unit}/${entry.page}: ${trimmed.length} photo(s)${dividerId ? ' + divider' : ''}`,
    )
  }

  payload.logger.info(`${applied} page(s) updated from the curated plan.`)
  if (unresolved.length > 0) {
    payload.logger.warn(
      `${unresolved.length} planned file(s) not found in the library, skipped: ${[...new Set(unresolved)].slice(0, 8).join(', ')}`,
    )
  }
  if (noPage.length > 0) {
    payload.logger.warn(`No such page, skipped: ${[...new Set(noPage)].join(', ')}`)
  }

  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
