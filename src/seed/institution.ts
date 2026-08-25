import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('./lexical')

/**
 * Seeds the main SIWS portal with the content SIWS supplied
 * (SIWS School Website Content.pdf).
 *
 * Everything here is the school's own wording, placed verbatim — the tagline,
 * institution overview, history, vision, mission and core values. Nothing has
 * been invented or embellished; where the document is silent, the page simply
 * does not cover that ground.
 *
 * These are ordinary institution-wide pages (no unit), so the front page is now
 * editable by staff like any other. It used to be hard-coded in the route, which
 * meant the single page most likely to need updating was the only one nobody
 * could change.
 *
 * Run with:  npm run seed:institution
 */

const TAGLINE = 'From KG to PG — Inspiring Excellence Since 1934'

/** SRS 4.1 — institution overview, verbatim from the supplied content. */
const OVERVIEW = [
  "South Indians' Welfare Society (SIWS) is one of Mumbai's most respected educational institutions, serving the community with distinction since 1934. Founded with the vision of making quality education accessible to all, SIWS has grown into a comprehensive educational ecosystem that nurtures students from Kindergarten to Postgraduate education.",
  'The SIWS educational group comprises Kindergarten, Primary School, Secondary School, Junior College and Degree College, providing a seamless learning journey under one trusted institution. While firmly rooted in Indian values, SIWS embraces innovation, technology, and modern teaching methodologies to prepare students for a rapidly evolving world.',
  'For nearly a century, SIWS has remained committed to academic excellence, character building, discipline and holistic development. Thousands of students who began their educational journey at SIWS have gone on to become successful professionals, entrepreneurs, academicians and responsible citizens across the world.',
  'Today, SIWS continues to combine its rich heritage with forward-looking education, creating an environment where every learner is encouraged to discover their potential and contribute meaningfully to society.',
]

const HISTORY = [
  "South Indians' Welfare Society (SIWS) was established in 1934 with a modest primary school at Shivaji Park, Dadar, to serve the educational needs of Mumbai's South Indian community.",
  'Guided by a strong commitment to education and community service, SIWS gradually expanded to Matunga and Wadala, introducing Secondary School, Junior College and Degree College programmes. The subsequent addition of Commerce and Science streams, along with an autonomous degree college, reflected its continued pursuit of academic excellence.',
  'Today, SIWS is one of the few educational institutions in Maharashtra offering a complete educational journey — from Kindergarten to Postgraduate studies — within a single institutional family. As it approaches its centenary, SIWS continues to honour its rich legacy while embracing innovation, technology, and global educational standards.',
]

const VISION =
  'To be a leading educational institution that nurtures knowledge, character, innovation, and lifelong learning, empowering every student to become a responsible global citizen and a catalyst for positive societal change.'

const MISSION: { title: string }[] = [
  { title: 'To provide holistic, inclusive, and value-based education in a safe and nurturing environment.' },
  { title: 'To inspire academic excellence through innovative teaching and continuous learning.' },
  { title: 'To develop character, integrity, leadership, and social responsibility among students.' },
  { title: 'To foster creativity, critical thinking, scientific temper, and digital readiness.' },
  { title: 'To empower every learner with the knowledge, skills, and confidence needed to succeed in an ever-changing world.' },
  { title: 'To preserve our rich educational heritage while embracing emerging technologies and global best practices.' },
]

const CORE_VALUES = [
  { title: 'Integrity', description: 'We uphold honesty, ethics and accountability in all that we do.' },
  { title: 'Excellence', description: 'We encourage every learner to strive for their highest potential.' },
  { title: 'Respect', description: 'We value diversity, empathy and mutual respect.' },
  { title: 'Innovation', description: 'We embrace creativity, technology and continuous improvement.' },
  { title: 'Service', description: 'We believe education should inspire meaningful contributions to society.' },
  { title: 'Lifelong Learning', description: 'We cultivate curiosity and a passion for continuous growth.' },
]

const main = async () => {
  const payload = await getPayload({ config })

  /**
   * The banner photograph, looked up rather than hard-coded by id — ids differ
   * between machines. Absent (media not seeded yet) the banner simply renders
   * without a picture, so this script never fails for want of an upload.
   */
  /*
   * Each named photograph is asked for by name, rather than pulled out of a
   * page of results in JavaScript.
   *
   * This used to fetch 100 rows and search them. That worked while the library
   * held eight photographs and silently stopped working at 344: the ones this
   * page names are among the oldest, the default sort returns the newest first,
   * so every lookup fell off the end of the page and returned null. The banner
   * and History pictures vanished from the home page and the only symptom was
   * a warning saying the media had not been seeded, which it had.
   */
  /*
   * Payload appends `-1`, `-2`… when the name it wants to write is already
   * taken on disk, and this repository commits `media/`, so every filename it
   * ships is taken before the first upload runs. A re-seed therefore leaves the
   * library holding `kg-play-area-2.jpg` where this file asks for
   * `kg-play-area.jpg`, and an exact match returns null: the banner, both
   * photographic bands and the History picture all quietly disappear, with only
   * a "media not seeded" warning to show for it — when it had been seeded twice.
   *
   * So the exact name is tried first, and a collision-suffixed variant of the
   * same name accepted if that finds nothing. The suffix is Payload's own
   * counter for one file written repeatedly, not a different photograph.
   */
  /** Strips Payload's collision counter, so `kg-handwashing-2.jpg` matches `kg-handwashing.jpg`. */
  const baseName = (filename: string) => filename.replace(/-\d+(\.[^.]+)$/, "$1")

  const photo = async (filename: string): Promise<number | null> => {
    const exact = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (exact.docs[0]) return exact.docs[0].id as number

    const dot = filename.lastIndexOf('.')
    const stem = dot === -1 ? filename : filename.slice(0, dot)
    const ext = dot === -1 ? '' : filename.slice(dot)

    const { docs } = await payload.find({
      collection: 'media',
      where: { filename: { like: `${stem}-%${ext}` } },
      limit: 10,
      depth: 0,
      overrideAccess: true,
    })
    // `like` also matches `kg-play-area-closeup.jpg`; comparing base names
    // keeps only a numeric counter, which means "the same file, written again".
    const suffixed = docs.find((d) => baseName(String(d.filename)) === filename)
    return (suffixed?.id as number | undefined) ?? null
  }
  /*
   * The banner photograph carries the most weight on the site, so it is the
   * one with people in it looking at each other rather than at a worksheet:
   * a teacher surrounded by her class says "school" in a way that a good
   * photograph of a tidy classroom cannot.
   */
  const heroImage = await photo('siws-natya-tarang.jpg')
  /*
   * The divider photographs are reused from the gallery on purpose. They sit
   * under a 95%-to-70% wash, so what reads is tone and shape, not a
   * recognisable picture — holding two more photographs back from the gallery
   * to avoid a repeat nobody can see would cost more than it saved.
   */
  const dividerOne = await photo('kg-play-area.jpg')
  const dividerTwo = await photo('kg-classroom-group.jpg')
  const overviewImage = await photo('kg-play-area.jpg')
  const historyImage = await photo('kg-classroom-activity.jpg')
  /*
   * The photograph behind the "Our Vision" band, wired up HERE.
   *
   * `seed:vision-bg` uploads it and can attach it too, but this file rebuilds
   * the home page's whole layout — so whichever of the two ran last won, and
   * running them in the documented order (content first, nav last) silently
   * dropped the picture and left the band flat blue again. The layout of this
   * page belongs to this file, so the reference to the picture does too.
   */
  const visionBackground = await photo('portal-vision-background.jpg')
  /*
   * The first three tiles are CHOSEN; the rest of the wall fills itself.
   *
   * It used to be `pool.slice(0, 6)` — whatever the library happened to return
   * first, each tile falling back to the photograph's own library caption. That
   * is fine while the wall is only decoration, but SIWS picked these three and
   * wrote a line for each, and a query ordered by id cannot express "these,
   * in this order, saying this".
   *
   * Named photographs missing from the library are skipped rather than left as
   * a hole, so a run before `seed:media` still produces a full wall.
   */
  const FEATURED: { filename: string; caption: string }[] = [
    {
      filename: 'portal-vision-background.jpg',
      caption: 'Fostering collaboration and hands-on learning every day.',
    },
    {
      filename: 'siws-fancy-dress-environment.jpg',
      caption: 'Showcasing creativity and environmental awareness',
    },
    {
      filename: 'siws-yoga-meditation.jpg',
      caption: 'Practicing mindfulness and focus together.',
    },
    {
      filename: 'siws-green-skills.jpg',
      caption: 'Nurturing nature and building green skills together.',
    },
  ]

  const featured: { image: number; caption: string }[] = []
  for (const entry of FEATURED) {
    const id = await photo(entry.filename)
    if (id) featured.push({ image: id, caption: entry.caption })
  }

  /*
   * Withdrawn photographs are excluded in the query rather than filtered out
   * afterwards. Filtering a fixed page of results means a run of withdrawals
   * quietly shrinks the wall below six, and FR-SW-05 has to hold here as much
   * as anywhere else.
   */
  const { docs: galleryPool } = await payload.find({
    collection: 'media',
    where: { 'withdrawn.isWithdrawn': { not_equals: true } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })

  /*
   * Held back from the filler: the banner and History photographs, everything
   * already placed by hand above, and the two SIWS asked to take off this wall
   * (the washroom tap and the canteen tray). Those two stay in the library —
   * the Kindergarten site still uses them — they simply do not belong on the
   * portal's front page any more.
   */
  const RETIRED_FROM_WALL = [
    'kg-handwashing.jpg',
    'kg-canteen-meal.jpg',
    'kg-children-together.jpg',
  ]
  const usedIds = new Set([heroImage, historyImage].filter(Boolean))
  featured.forEach((f) => usedIds.add(f.image))

  const galleryImages = [
    ...featured,
    ...galleryPool
      .filter((m) => !usedIds.has(m.id))
      .filter((m) => !RETIRED_FROM_WALL.includes(baseName(String(m.filename))))
      .slice(0, Math.max(0, 6 - featured.length))
      .map((m) => ({ image: m.id, caption: '' })),
  ]
  if (!heroImage) {
    payload.logger.warn(
      'No photographs found — run `npm run seed:media` first if you want them.',
    )
  }

  /** Upserts an institution-wide page, matched by slug with no unit. */
  const upsert = async (page: Record<string, unknown> & { slug: string; title: string }) => {
    const existing = await payload.find({
      collection: 'pages',
      // Institution-wide pages carry no unit; `exists: false` is what
      // distinguishes them from a unit page that happens to share the slug.
      where: { and: [{ slug: { equals: page.slug } }, { unit: { exists: false } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (existing.docs[0]) {
      const doc = await payload.update({
        collection: 'pages',
        id: existing.docs[0].id,
        data: page as never,
        overrideAccess: true,
      })
      payload.logger.info(`Updated: ${page.title}`)
      return doc
    }

    const doc = await payload.create({
      collection: 'pages',
      data: page as never,
      overrideAccess: true,
    })
    payload.logger.info(`Created: ${page.title}`)
    return doc
  }

  /*
   * A card grid, not a tick list.
   *
   * The Mission directly above it is already six ticked lines, and two
   * identical six-item lists back to back read as one long list the reader
   * stops distinguishing — the values lost against the commitments. They are
   * also different in kind: a mission is a set of promises, where the ticks
   * are apt, while a value is a single named idea. Cards give each value its
   * own field and let the name carry the weight.
   */
  const coreValuesSection = (background: string) => ({
    blockType: 'cardGrid',
    heading: 'Our Core Values',
    accentWord: 'Core Values',
    headingLevel: 'h2',
    columns: '3',
    background,
    cards: CORE_VALUES.map((value) => ({
      title: value.title,
      description: value.description,
    })),
  })

  const schoolsSection = (intro: string) => ({
    blockType: 'unitLinks',
    heading: 'Our Schools',
    accentWord: 'Schools',
    headingLevel: 'h2',
    background: 'white',
    intro: richText([intro]),
  })

  // -------------------------------------------------------------------- ABOUT
  // Seeded first, because the home page's hero links to it and an internal link
  // needs its target to exist before it can be referenced.
  const about = await upsert({
    slug: 'about',
    title: 'About SIWS',
    intro: TAGLINE,
    showInNav: true,
    navLabel: 'About SIWS',
    navOrder: 10,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      "The story of South Indians' Welfare Society — founded in 1934 at Shivaji Park, Dadar, and now offering education from Kindergarten to Postgraduate studies.",
    layout: [
      {
        blockType: 'richText',
        heading: 'Our History',
        accentWord: 'History',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText(HISTORY),
      },
      {
        blockType: 'richText',
        heading: 'Our Vision',
        accentWord: 'Vision',
        headingLevel: 'h2',
        width: 'narrow',
        background: 'brand',
        content: richText([VISION]),
      },
      {
        blockType: 'featureList',
        heading: 'Our Mission',
        accentWord: 'Mission',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '1',
        background: 'white',
        items: MISSION,
      },
      coreValuesSection('sea'),
      schoolsSection('Explore each school in the SIWS family.'),
    ],
  })

  /*
   * Three of the menu's placeholder pages can be filled from the content SIWS
   * supplied, so they are — with that content and nothing else.
   *
   * The rest of the placeholders are deliberately untouched. SIWS has sent no
   * words for Admissions, Alumni, Careers, Transport, the Download Centre and
   * the others, and a school's public page is the last place to put invented
   * detail: a made-up admission step or bus route outlives the placeholder it
   * replaced and is read as fact. They keep the "we are preparing this page"
   * line until real content arrives.
   */
  await upsert({
    slug: 'history',
    title: 'Our History',
    intro: null,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      "How South Indians' Welfare Society grew from a primary school at Shivaji Park in 1934 into a Kindergarten-to-Postgraduate institution.",
    layout: [
      {
        blockType: 'richText',
        heading: 'Our History',
        accentWord: 'History',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText(HISTORY),
      },
      ...(historyImage
        ? [
            {
              blockType: 'divider',
              image: historyImage,
              overlay: 'brand',
              height: 'slim',
              text: 'From KG to PG — inspiring excellence since 1934.',
            },
          ]
        : []),
    ],
  })

  await upsert({
    slug: 'vision-mission',
    title: 'Vision & Mission',
    intro: null,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      "The vision and mission of South Indians' Welfare Society, and the values they are built on.",
    layout: [
      {
        blockType: 'richText',
        heading: 'Our Vision',
        accentWord: 'Vision',
        headingLevel: 'h2',
        width: 'narrow',
        background: 'brand',
        content: richText([VISION]),
      },
      {
        blockType: 'featureList',
        heading: 'Our Mission',
        accentWord: 'Mission',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2',
        background: 'white',
        items: MISSION,
      },
      coreValuesSection('tint'),
    ],
  })

  /*
   * Contact carries the one piece of contact information SIWS has given: the
   * Wadala address. No telephone number, no email address and no office hours
   * are published, because none were supplied and a wrong number on a school's
   * contact page is worse than no number at all.
   */
  await upsert({
    slug: 'contact',
    title: 'Contact',
    intro: null,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      "Where to find South Indians' Welfare Society — Major R Parameswaran Road, Wadala, Mumbai.",
    layout: [
      {
        blockType: 'map',
        heading: 'Find us',
        accentWord: 'us',
        headingLevel: 'h2',
        background: 'white',
        label: 'South Indians\u2019 Welfare Society, Wadala',
        address:
          'Sewree Estate, 337, Major R Parameswaran Rd, Wadala, Mumbai, Maharashtra 400031',
        height: 'tall',
      },
    ],
  })

  // --------------------------------------------------------------- PORTAL HOME
  await upsert({
    slug: 'home',
    title: "South Indians' Welfare Society",
    _status: 'published',
    reviewStatus: 'approved',
    metaTitle: "South Indians' Welfare Society (SIWS), Mumbai",
    metaDescription:
      'From KG to PG — inspiring excellence since 1934. SIWS offers a complete educational journey from Kindergarten to Postgraduate studies in Mumbai.',
    layout: [
      {
        blockType: 'hero',
        eyebrow: 'Since 1934',
        title: TAGLINE,
        accentWord: 'Inspiring Excellence',
        intro:
          "South Indians' Welfare Society is one of Mumbai's most respected educational institutions, nurturing students from Kindergarten to Postgraduate education.",
        /*
         * White, not deep blue. The brand reads as accent — the highlighted
         * words, the button, the chips — against a white page, which is both
         * what the approved design does and what keeps a page this long from
         * becoming a wall of saturated colour.
         */
        background: 'white',
        ...(heroImage
          ? {
              image: heroImage,
              // The same three facts the statistics band below already carries,
              // so the banner asserts nothing the page does not already say.
              highlights: [
                { value: '1934', label: 'Serving Mumbai since' },
                { value: '90+', label: 'Years of educational legacy' },
                { value: 'KG–PG', label: 'A complete journey' },
              ],
            }
          : {}),
        links: [
          {
            link: {
              label: 'Read our story',
              type: 'internal',
              appearance: 'primary',
              // Polymorphic relationships store `{ relationTo, value }`.
              reference: { relationTo: 'pages', value: about.id },
            },
          },
        ],
      },
      schoolsSection('A seamless learning journey under one trusted institution.'),
      /*
       * Overview and History run as picture-beside-text, on alternating sides.
       * As full-width prose they were four paragraphs in a narrow column with
       * half the screen empty beside them — the text had nothing to sit
       * against, and the reader got no landmark between one section and the
       * next. Alternating the side gives the eye something to track down the
       * page.
       */
      ...(dividerOne
        ? [
            {
              blockType: 'divider',
              image: dividerOne,
              overlay: 'brand',
              height: 'slim',
              // Verbatim from the tagline SIWS supplied; nothing new is claimed.
              text: 'From KG to PG — inspiring excellence since 1934.',
            },
          ]
        : []),
      overviewImage
        ? {
            blockType: 'mediaText',
            heading: "About South Indians' Welfare Society",
            accentWord: 'Welfare Society',
            headingLevel: 'h2',
            background: 'white',
            image: overviewImage,
            imagePosition: 'right',
            imageShape: 'rounded',
            content: richText(OVERVIEW),
          }
        : {
            blockType: 'richText',
            heading: "About South Indians' Welfare Society",
            accentWord: 'Welfare Society',
            headingLevel: 'h2',
            width: 'normal',
            background: 'white',
            content: richText(OVERVIEW),
          },
      {
        blockType: 'statistics',
        heading: 'A legacy parents trust',
        background: 'brand',
        stats: [
          { value: '1934', label: 'Serving Mumbai since' },
          { value: '90+', label: 'Years of educational legacy' },
          { value: 'KG–PG', label: 'A complete educational journey' },
        ],
      },
      historyImage
        ? {
            blockType: 'mediaText',
            heading: 'Our History',
            accentWord: 'History',
            headingLevel: 'h2',
            background: 'white',
            image: historyImage,
            imagePosition: 'left',
            imageShape: 'rounded',
            content: richText(HISTORY),
          }
        : {
            blockType: 'richText',
            heading: 'Our History',
            accentWord: 'History',
            headingLevel: 'h2',
            width: 'normal',
            background: 'white',
            content: richText(HISTORY),
          },
      /*
       * Vision then Mission, in that order: the vision is the single sentence
       * the mission's six commitments serve, and reading them the other way
       * round makes the list look like an unexplained set of promises.
       */
      /*
       * The single deep-blue section on the page. One statement, centred, on
       * full brand — it is the only place the colour is allowed to take the
       * whole width, which is what makes it land instead of blending into the
       * bands above and below it.
       */
      {
        blockType: 'richText',
        heading: 'Our Vision',
        accentWord: 'Vision',
        headingLevel: 'h2',
        width: 'narrow',
        background: 'brand',
        content: richText([VISION]),
        ...(visionBackground ? { backgroundImage: visionBackground } : {}),
      },
      {
        blockType: 'featureList',
        heading: 'Our Mission',
        accentWord: 'Mission',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2',
        background: 'white',
        items: MISSION,
      },
      coreValuesSection('white'),
      ...(dividerTwo
        ? [
            {
              blockType: 'divider',
              image: dividerTwo,
              overlay: 'sea',
              height: 'slim',
            },
          ]
        : []),
      ...(galleryImages.length > 0
        ? [
            {
              blockType: 'gallery',
              heading: 'Life at SIWS',
              accentWord: 'SIWS',
              headingLevel: 'h2',
              background: 'tint',
              layout: 'grid',
              perPage: '9',
              images: galleryImages,
            },
          ]
        : []),
      {
        blockType: 'map',
        heading: 'Find us',
        accentWord: 'us',
        headingLevel: 'h2',
        background: 'white',
        label: 'South Indians’ Welfare Society, Wadala',
        address:
          'Sewree Estate, 337, Major R Parameswaran Rd, Wadala, Mumbai, Maharashtra 400031',
        height: 'medium',
      },
    ],
  })

  payload.logger.info('Institution content seeded.')
  payload.logger.warn(
    'NOTE: the supplied content names a Degree College as part of the SIWS group. It is described in the text but has no unit website, since the SRS scopes this project to four units.',
  )
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Institution seed failed:', error)
    process.exit(1)
  })
