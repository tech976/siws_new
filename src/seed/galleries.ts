import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('./lexical')

/**
 * Builds a gallery page for every section, plus one institution-wide.
 *
 * Contents come from the media library rather than being listed here, so the
 * page is a view of what the school has actually uploaded. Re-run it after
 * `npm run photos:import` and the new pictures appear.
 *
 * WHICH PHOTOGRAPHS APPEAR
 * ------------------------
 * A section's gallery shows images tagged to that section, plus untagged ones
 * (which are shared across all four). The institution-wide gallery shows only
 * untagged images — a picture of a Kindergarten classroom does not belong on
 * the group's front-door gallery unless someone says it does.
 *
 * WHAT IS LEFT OUT, AND WHY IT IS NOT A BUG
 * -----------------------------------------
 * Photographs of identifiable students without a completed permission record
 * are excluded. They stay in the library — staff need to see what they have —
 * but a gallery is a published page, and FR-PRV-11 forbids publishing them.
 * Including them would simply make the page unpublishable: the consent hook
 * rejects the save. Each run reports how many were held back.
 *
 * Withdrawn images are excluded too, wherever they are used (FR-SW-05).
 *
 * Run with:  npm run seed:galleries
 */

interface MediaDoc {
  id: number
  alt?: string | null
  caption?: string | null
  campus?: string | null
  category?: string | null
  unit?: number | null
  filename?: string | null
  showInGallery?: boolean | null
  depictsChildren?: boolean | null
  parentalConsent?: { obtained?: boolean | null } | null
  withdrawn?: { isWithdrawn?: boolean | null } | null
}

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    sort: 'order',
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })

  const { docs } = await payload.find({
    collection: 'media',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  const all = docs as unknown as MediaDoc[]

  /**
   * Publishable: not withdrawn, consented if a student is recognisable, and
   * not marked as page furniture. `showInGallery` is undefined on everything
   * uploaded before the field existed, which has to read as YES — the default
   * is to include, and a missing value must not quietly empty the galleries.
   */
  const publishable = all.filter((item) => {
    if (item.withdrawn?.isWithdrawn) return false
    if (item.depictsChildren && !item.parentalConsent?.obtained) return false
    if (item.showInGallery === false) return false
    return true
  })

  /*
   * Counted apart, because they are not the same problem. One is paperwork
   * that somebody has to complete; the other is a deliberate setting, and
   * reporting the two together made three video thumbnails look like three
   * consent failures.
   */
  const heldBack = all.filter(
    (item) =>
      item.showInGallery !== false &&
      (item.withdrawn?.isWithdrawn || (item.depictsChildren && !item.parentalConsent?.obtained)),
  ).length
  const setAside = all.filter((item) => item.showInGallery === false).length

  /**
   * Categories a section's gallery does not show, by unit slug.
   *
   * Not a way of hiding photographs — every one of these is published, and each
   * is somewhere better.
   *
   * PRIMARY'S ONAM PICTURES USED TO BE LISTED HERE, on the reasoning that
   * they were the whole of the section's Events page already and repeating
   * them made the gallery read as an overflow of it. That was wrong about
   * where a reader goes next: the Onam card on the Events page is a LINK TO
   * THIS GALLERY, so the one place the pictures were promised was the one
   * place they had been taken out of, and the card led to a wall without a
   * single photograph of the day on it.
   *
   * The invitation banner is not among them. It is `showInGallery: false` on
   * the media record — a poster rather than a photograph of the day — so it
   * stays on the Events card and out of the wall without needing a rule here.
   *
   * A category named here that the unit does not have is simply ignored.
   */
  const OMIT_CATEGORY: Record<string, string[]> = {}

  /**
   * Individual photographs a section's wall does not show, keyed by unit slug.
   *
   * `OMIT_CATEGORY` above takes out a whole subject; this takes out one
   * picture. The #SwachhtaMonitor certificate is the case it was added for:
   * it is a document rather than a photograph of the school, and a gallery is
   * for seeing the place. It is still published — at full size, and read
   * rather than cropped — in "Recognised by the State" on the Secondary home
   * page, and it is still on the portal's own wall under Prizes and honours.
   */
  const OMIT_FILE: Record<string, string[]> = {
    secondary: ['secondary-swachhta-2023.jpg'],
  }

  /**
   * Sections whose wall is the FILTERED library rather than a stack of
   * titled bands, keyed by unit slug.
   *
   * The two presentations answer different questions. A stack of bands says
   * "here is the classroom work, and here is the prize-giving" — it reads
   * top to bottom and is right for a section with one long run of pictures.
   * The library puts the same categories on a row of tabs above one wall, so
   * a visitor picks a subject and the wall rearranges under it, and any tile
   * opens full size with the arrow keys stepping through what is on screen.
   *
   * Opt-in rather than automatic, because it is a real change of behaviour
   * for a page somebody has already looked at. Adding a slug here is the
   * whole of what it takes.
   */
  const PHOTO_LIBRARY = new Set(['secondary', 'junior-college'])

  /**
   * One photograph per section that earns the 2x2 tile.
   *
   * A wall of evenly sized tiles has no focus, and the bento pattern alone
   * cannot know which picture is the one worth stopping on. Named here by
   * filename so the choice survives a re-import.
   */
  const FEATURED: Record<string, string> = {
    'secondary-toppers-2026-close.jpg': 'secondary',
    'jc-independence-day-2026.jpg': 'junior-college',
  }

  const gallery = (item: MediaDoc) => ({
    image: item.id,
    // The library's caption if it has one; otherwise nothing. The alt text is
    // not reused as a caption — it is written for someone who cannot see the
    // picture, and reads oddly printed beside it.
    caption: item.caption || undefined,
  })

  const upsert = async (
    unitId: number | null,
    slug: string,
    title: string,
    intro: string,
    supplied: MediaDoc[],
    /** Unit slug, so the wall can honour `OMIT_CATEGORY`. Null for the portal. */
    unitSlug: string | null = null,
  ) => {
    /*
     * Done here rather than inside the layout, so that the count in the meta
     * description and the count in the log both mean the number of pictures a
     * visitor will actually find on the page.
     */
    const omitted = new Set(unitSlug ? (OMIT_CATEGORY[unitSlug] ?? []) : [])
    const omittedFiles = new Set(unitSlug ? (OMIT_FILE[unitSlug] ?? []) : [])
    const images = supplied.filter(
      (item) =>
        !omitted.has((item.category ?? '').trim()) && !omittedFiles.has(String(item.filename)),
    )

    if (images.length === 0) {
      /*
       * Returning here used to leave whatever the page last held, which was
       * fine while every section had something and wrong the moment one did
       * not: Junior College kept showing the single borrowed photograph that
       * the change above just took away from it — one Secondary craft class,
       * published as life at the Junior College.
       *
       * An empty gallery is unpublished rather than emptied or deleted. The
       * document stays in the admin panel with whatever is on it, so nothing
       * an editor did by hand is lost, and the public address stops serving a
       * page that has nothing to show. It republishes itself the moment a
       * photograph is tagged to the section and this is re-run.
       *
       * Taking it out of the MENU is a separate job and cannot be done from
       * here: `seed:nav` runs last and switches `showInNav` back on for every
       * page its template names. That exception is recorded in `UNIT_OMIT` in
       * `seed/nav.ts`, beside the others.
       */
      const stale = await payload.find({
        collection: 'pages',
        where: {
          and: [
            { slug: { equals: slug } },
            unitId === null ? { unit: { exists: false } } : { unit: { equals: unitId } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })

      if (stale.docs[0] && stale.docs[0]._status === 'published') {
        await payload.update({
          collection: 'pages',
          id: stale.docs[0].id,
          data: { _status: 'draft', showInNav: false } as never,
          overrideAccess: true,
        })
        payload.logger.warn(
          `${title}: no photographs are tagged to this section, so the page has been unpublished rather than left showing another section's. Tag some in the media library and re-run this to publish it again.`,
        )
        return
      }

      payload.logger.info(`Skipped ${title} — no publishable photographs yet.`)
      return
    }

    const page = {
      slug,
      title,
      intro,
      /*
       * OFF the menu here, and `seed:nav` puts it back inside About.
       *
       * A unit gallery is a CHILD entry in the shared menu template. Setting
       * this true made it a TOP-LEVEL item, and whichever script ran last
       * won — so running this seed after `seed:nav` climbed Gallery out of
       * the About drop-down and into the top row, which is what pushed the
       * Secondary menu onto a second line.
       *
       * Omitting the field is NOT enough: `payload.update` keeps the existing
       * `show_in_nav` while clearing `nav_parent_id`, which promotes the page
       * rather than leaving it alone. The same convention is followed by every
       * child page in the section seeds.
       *
       * The PORTAL gallery below keeps `showInNav: true`, because there it is
       * a top-level entry in its own right.
       */
      showInNav: false,
      navLabel: 'Gallery',
      _status: 'published',
      reviewStatus: 'approved',
      metaDescription: `${intro} ${images.length} photographs.`,
      unit: unitId ?? undefined,
      /**
       * One gallery block per category, in alphabetical order, with anything
       * uncategorised last. Schools sort photographs by occasion — Sports,
       * Festivals, Annual Day — and a single 70-image grid throws that away,
       * leaving a parent to scroll looking for the sports day.
       */
      layout: (() => {
        /**
         * Grouped by CAMPUS first, then category.
         *
         * The Primary Section runs at Wadala and Matunga and they are separate
         * schools to a parent — different head teacher, different roster,
         * different house rules. Merging their photographs into one grid would
         * show a family the wrong campus. The campus prefix is added only when
         * a unit actually has more than one, so single-campus sections read as
         * they did before.
         */
        const campuses = new Set(images.map((item) => (item.campus ?? '').trim()).filter(Boolean))
        const label: Record<string, string> = {
          wadala: 'Wadala',
          matunga: 'Matunga',
        }

        const groups = new Map<string, MediaDoc[]>()
        for (const item of images) {
          const cat = (item.category ?? '').trim() || 'Other photographs'
          const camp = (item.campus ?? '').trim()
          const key = campuses.size > 1 && camp ? `${label[camp] ?? camp} campus — ${cat}` : cat
          const bucket = groups.get(key)
          if (bucket) bucket.push(item)
          else groups.set(key, [item])
        }

        /*
         * A CATEGORY OF ONE IS NOT A CATEGORY.
         *
         * Grouping by occasion is right when there is an occasion's worth of
         * photographs. Primary had a "Classrooms" heading over a single tile
         * and an "Other photographs" heading over one more — two full sections,
         * each a lone picture under its own title, on a page that is meant to
         * read as a wall. Anything with fewer than two is folded into the
         * catch-all at the end instead, which is where a stray photograph
         * belonged in the first place.
         */
        const MIN_GROUP = 2
        const strays: MediaDoc[] = [...(groups.get('Other photographs') ?? [])]

        const named = [...groups.entries()]
          .filter(([key]) => key !== 'Other photographs')
          .filter(([, group]) => {
            if (group.length >= MIN_GROUP) return true
            strays.push(...group)
            return false
          })
          .sort(([a], [b]) => a.localeCompare(b))

        /*
         * ONE GROUP IS NOT A SET OF GROUPS.
         *
         * Splitting by occasion earns its keep when there are several
         * occasions. Primary came down to "Achievements" over five tiles and
         * "More photographs" over one — two headings, a colour change and a
         * band of padding, to divide six pictures. That is furniture around a
         * wall small enough to take in at a glance.
         *
         * So below two named groups the whole thing is emitted as a single
         * untitled wall. The page's own title and intro are already above it,
         * and `hasOwnHeading` leaves them alone because no block heading
         * matches. Add a second occasion's worth of photographs and the
         * sections come back on their own.
         */
        if (named.length < 2) {
          const wall = [...named.flatMap(([, group]) => group), ...strays]
          if (wall.length === 0) return []
          return [
            {
              blockType: 'gallery',
              headingLevel: 'h2',
              layout: 'bento',
              background: 'white',
              images: wall.map(gallery),
            },
          ]
        }

        const ordered =
          strays.length > 0 ? [...named, ['More photographs', strays] as const] : named

        /*
         * A CATEGORY OF ONE IS FINE ON A TABBED WALL.
         *
         * `MIN_GROUP` folds a lone photograph into "More photographs",
         * because a heading and a band of padding over a single tile reads as
         * a section that failed. A tab is not a section: "Recognition" beside
         * "In the classroom" is a filter, and a filter that matches one
         * picture is behaving correctly.
         *
         * So the library takes the raw categories. Without this, taking the
         * certificate off the wall above would have left the 2026 toppers
         * alone under "Recognition", folded them into "More photographs", and
         * put a tab on the page holding one photograph and a vague name.
         */
        if (unitSlug && PHOTO_LIBRARY.has(unitSlug)) {
          /*
           * SMALLEST FIRST, so the counts on the tabs climb left to right.
           *
           * Alphabetical put "Recognition 1" at the end after two twos, and a
           * row of numbers in no order reads as though it is in some order the
           * reader has failed to spot. Ascending gives the row a direction:
           * the narrowest filter is nearest the "Everything" tab it was just
           * widened from, and the counts themselves become the ordering rather
           * than an accident of the alphabet.
           *
           * Ties fall back to the label, so two categories of the same size
           * keep a stable, predictable order between re-runs.
           */
          const tabs = [...groups.entries()].sort(
            ([labelA, a], [labelB, b]) => a.length - b.length || labelA.localeCompare(labelB),
          )
          return [
            {
              blockType: 'photoLibrary',
              headingLevel: 'h2',
              background: 'white',
              allLabel: 'Everything',
              intro: richText([intro]),
              groups: tabs.map(([label, group]) => ({
                label,
                images: group.map((item) => ({
                  ...gallery(item),
                  feature: FEATURED[String(item.filename)] === unitSlug,
                })),
              })),
            },
          ]
        }

        return ordered.map(([heading, group], index) => ({
          blockType: 'gallery',
          heading,
          headingLevel: 'h2',
          /*
           * A COLLAGE, not an even grid.
           *
           * This is the gallery page — the photographs are the point of it,
           * not an illustration beside something else — and that is exactly
           * the case the bento layout exists for. An even chequerboard of
           * identical tiles is right for an album a visitor pages through and
           * flat for a wall meant to show a school off. The mixed sizes give
           * the wall a shape, and `grid-flow-dense` backfills so it still
           * finishes square.
           */
          layout: 'bento',
          // Alternating so the groups read as separate sections.
          background: index % 2 === 0 ? 'white' : 'sea',
          ...(index === 0 ? { intro: richText([intro]) } : {}),
          images: group.map(gallery),
        }))
      })(),
    }

    const existing = await payload.find({
      collection: 'pages',
      where: {
        and: [
          { slug: { equals: slug } },
          unitId === null ? { unit: { exists: false } } : { unit: { equals: unitId } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (existing.docs[0]) {
      await payload.update({
        collection: 'pages',
        id: existing.docs[0].id,
        data: page as never,
        overrideAccess: true,
      })
      payload.logger.info(`Updated ${title} — ${images.length} photograph(s).`)
    } else {
      await payload.create({
        collection: 'pages',
        data: page as never,
        overrideAccess: true,
      })
      payload.logger.info(`Created ${title} — ${images.length} photograph(s).`)
    }
  }

  /*
   * THE PORTAL'S GALLERY IS CURATED BY HAND, and it is the only one that is.
   *
   * A section's gallery shows that section's photographs, which is a question
   * the `unit` field answers. The portal's cannot work that way for two
   * reasons. The first is that it should show the best of all four schools,
   * not the one picture that happens to be tagged to none of them. The second
   * is that the `unit` field is not trustworthy for this: `media.ts` files
   * every photograph it seeds under Kindergarten, so `secondary-toppers` and
   * `siws-natya-tarang` are both recorded as Kindergarten pictures. Grouping
   * this page by section would put the SSC toppers under Kindergarten.
   *
   * So the walls below are filed by what the photograph SHOWS, which is a
   * judgement somebody has to make and which is therefore written down here in
   * full rather than guessed from a field. Two pictures are deliberately left
   * out — `secondary-toppers-2026` and `secondary-swachhta-certificate` are
   * the uncropped originals of two that follow, and a gallery should not show
   * the same moment twice.
   */
  const LIBRARY: { label: string; files: string[]; feature?: string }[] = [
    {
      label: 'Prizes and honours',
      feature: 'natya-tarang-2026-first-prize.jpg',
      files: [
        'natya-tarang-2026-first-prize.jpg',
        'natya-tarang-2026-trophy.jpg',
        'natya-tarang-2026-company.jpg',
        'natya-tarang-2026-performance.jpg',
        'ignited-mind-lab-2026.jpg',
        'secondary-toppers-2026-close.jpg',
        'secondary-swachhta-2023.jpg',
        'siws-award-andhra.jpg',
      ],
    },
    {
      label: 'Celebrations',
      feature: 'onam-2026-assembly.jpg',
      files: [
        'onam-2026-assembly.jpg',
        'onam-2026-pookalam.jpg',
        'onam-2026-lighting-the-lamp.jpg',
        'onam-2026-teachers.jpg',
        'onam-2026-display-board.jpg',
        'siws-natya-tarang.jpg',
        'siws-dance-competition.jpg',
        'siws-fancy-dress-environment.jpg',
      ],
    },
    {
      label: 'In the classroom',
      feature: 'primary-classroom.jpg',
      files: [
        'primary-classroom.jpg',
        'kg-activity-table.jpg',
        'kg-smart-board.jpg',
        'kg-classroom-activity.jpg',
        'kg-classroom-group.jpg',
        'kg-classroom-seated.jpg',
        'kg-activity-literacy.jpg',
        'kg-drawing-class.jpg',
        'secondary-craft-class.jpg',
        'secondary-activity-class.jpg',
        'portal-vision-background.jpg',
      ],
    },
    {
      label: 'Around the school',
      feature: 'kg-play-area.jpg',
      files: [
        'kg-play-area.jpg',
        'kg-children-together.jpg',
        'kg-teacher-with-children.jpg',
        // 'kg-canteen-meal.jpg' and 'kg-handwashing.jpg' are off this wall at
        // SIWS's request. They are still in the media library and still on the
        // Kindergarten section's own gallery — taking them off that one too is
        // a matter of unticking "Include in the photo gallery" on each.
        'kg-activity-creative.jpg',
        'kg-activity-motor.jpg',
        'siws-green-skills.jpg',
        'siws-yoga-meditation.jpg',
      ],
    },
  ]

  const byFilename = new Map(publishable.map((item) => [item.filename, item]))
  const missing: string[] = []

  const groups = LIBRARY.map((group) => ({
    label: group.label,
    images: group.files
      .map((file) => {
        const item = byFilename.get(file)
        if (!item) {
          missing.push(file)
          return null
        }
        return {
          image: item.id,
          caption: item.caption || undefined,
          feature: file === group.feature,
        }
      })
      .filter((entry) => entry !== null),
  })).filter((group) => group.images.length > 0)

  const total = groups.reduce((sum, group) => sum + group.images.length, 0)

  const existingLibrary = await payload.find({
    collection: 'pages',
    where: {
      and: [{ slug: { equals: 'gallery' } }, { unit: { exists: false } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const libraryPage = {
    slug: 'gallery',
    title: 'Gallery',
    intro: 'Photographs from across the SIWS Group of Institutions.',
    showInNav: true,
    navLabel: 'Gallery',
    navOrder: 45,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription: `Photographs from across the SIWS Group of Institutions — ${total} pictures of classrooms, celebrations, prizes and school life.`,
    layout: [
      {
        blockType: 'photoLibrary',
        heading: 'Life at SIWS',
        accentWord: 'SIWS',
        headingLevel: 'h2',
        background: 'white',
        allLabel: 'Everything',
        intro: richText([
          'Four schools on one campus, photographed as they are. Choose a subject to narrow the wall, or open any picture to see it whole.',
        ]),
        groups,
      },
    ],
  }

  if (existingLibrary.docs[0]) {
    await payload.update({
      collection: 'pages',
      id: existingLibrary.docs[0].id,
      data: libraryPage as never,
      overrideAccess: true,
    })
    payload.logger.info(
      `Updated the SIWS gallery — ${total} photographs in ${groups.length} categories.`,
    )
  } else {
    await payload.create({
      collection: 'pages',
      data: libraryPage as never,
      overrideAccess: true,
    })
    payload.logger.info(
      `Created the SIWS gallery — ${total} photographs in ${groups.length} categories.`,
    )
  }

  if (missing.length > 0) {
    payload.logger.warn(
      `The SIWS gallery lists ${missing.length} photograph(s) that are not in the library, or are not publishable: ${missing.join(', ')}. They are skipped; the wall is built from the rest.`,
    )
  }

  /*
   * A SECTION'S WALL IS ITS OWN PHOTOGRAPHS, AND NOTHING ELSE.
   *
   * It used to append `shared` — everything with no `unit` — to all four,
   * on the reasonable-sounding theory that an untagged picture belongs to
   * the institution and therefore to everybody. In practice exactly one
   * photograph is untagged, `portal-vision-background.jpg`, which
   * `vision-background.ts` generates as the backdrop for the portal's
   * vision panel and which happens to show a Secondary craft class.
   *
   * So every section was carrying one picture of another section: it sat
   * under "More photographs" on Primary and Kindergarten, and on Junior
   * College — which has no photographs of its own yet — it WAS the gallery,
   * a single Secondary classroom presented as life at the Junior College.
   *
   * It is still on the portal's own wall, which is curated by filename in
   * `LIBRARY` above and is the one place it belongs.
   */
  for (const unit of units) {
    const own = publishable.filter((item) => item.unit === unit.id)
    await upsert(
      unit.id as number,
      'gallery',
      'Gallery',
      `Photographs from ${unit.name}.`,
      own,
      unit.slug as string,
    )
  }

  /*
   * There used to be a second pass here, building a gallery on each Primary
   * campus page from the photographs tagged to that campus. Those pages —
   * /primary/wadala and /primary/matunga — no longer exist, so the pass found
   * nothing and did nothing. Removed rather than left as a no-op pointing at
   * deleted pages. The photographs themselves are untouched and still appear
   * in the unit's own gallery above.
   */

  if (heldBack > 0) {
    payload.logger.warn(
      `${heldBack} photograph(s) were left out: either a student is recognisable and no permission record exists, or the image has been withdrawn. They stay in the media library. Complete the permission record and re-run this to include them.`,
    )
  }

  if (setAside > 0) {
    payload.logger.info(
      `${setAside} picture(s) are marked as page furniture rather than gallery photographs — posters, notices and video thumbnails — and were skipped on purpose.`,
    )
  }

  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) {
    console.error('Gallery seed failed. Field errors:')
    for (const item of nested) console.error('  •', JSON.stringify(item))
  } else {
    console.error('Gallery seed failed:', error)
  }
  process.exit(1)
})
