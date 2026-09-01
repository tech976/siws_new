import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('./lexical')

/**
 * Builds a single page that reproduces the layout of siwscollege.edu.in, so the
 * structure can be reviewed end to end before it is applied to any real page.
 *
 * WHAT IS REAL AND WHAT IS NOT
 * ----------------------------
 * The four sections, the photographs and the institution's own facts are real.
 * The notices, the recruiter names and the campus-life copy are PLACEHOLDER —
 * SIWS has supplied none of those for the schools, and this page says so at the
 * top rather than quietly reading as fact. Nothing here is linked from the
 * navigation.
 *
 * DELETE BEFORE GO-LIVE, or replace its placeholder text with real content and
 * give it a proper slug. It is published rather than left in draft only so it
 * can be opened without signing in.
 *
 * Run with:  npm run seed:preview
 */

const PLACEHOLDER = 'Sample text — for layout review only.'

const main = async () => {
  const payload = await getPayload({ config })

  const media = async (filename: string): Promise<number | null> => {
    const { docs } = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return (docs[0]?.id as number | undefined) ?? null
  }

  const img = {
    activity: await media('kg-classroom-activity.jpg'),
    group: await media('kg-classroom-group.jpg'),
    play: await media('kg-play-area.jpg'),
    teacher: await media('kg-teacher-with-children.jpg'),
    together: await media('kg-children-together.jpg'),
    seated: await media('kg-classroom-seated.jpg'),
  }

  const missing = Object.entries(img).filter(([, id]) => id === null)
  if (missing.length > 0) {
    payload.logger.warn(
      `Missing images (${missing.map(([name]) => name).join(', ')}) — run \`npm run seed:media\` first.`,
    )
  }

  /** Sections, so the picture cards point at something real. */
  const { docs: units } = await payload.find({
    collection: 'units',
    sort: 'order',
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })

  const homeIdFor = async (unitId: number) => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: 'home' } }, { unit: { equals: unitId } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return (docs[0]?.id as number | undefined) ?? null
  }

  const unitCards = []
  for (const unit of units.slice(0, 4)) {
    const pageId = await homeIdFor(unit.id as number)
    if (!pageId) continue
    unitCards.push({
      title: unit.shortName || unit.name,
      image: [img.activity, img.group, img.play, img.teacher][unitCards.length] ?? img.activity,
      caption: unit.tagline ?? undefined,
      cta: [
        {
          link: {
            label: `Visit ${unit.shortName || unit.name}`,
            type: 'internal',
            reference: { relationTo: 'pages', value: pageId },
          },
        },
      ],
    })
  }

  const slide = (image: number | null, title: string, caption: string) =>
    image === null ? [] : [{ image, title, caption }]

  const layout: Record<string, unknown>[] = [
    {
      blockType: 'richText',
      heading: 'Design preview',
      accentWord: 'preview',
      headingLevel: 'h2',
      width: 'normal',
      background: 'sea',
      content: richText([
        'This page reproduces the layout of siwscollege.edu.in so the structure can be reviewed in one place. The sections, photographs and institutional facts are real; the notices, recruiter names and campus-life text are placeholder, and are marked as such.',
        'It is not linked from any menu. Delete it before go-live, or replace the placeholder text with real content.',
      ]),
    },

    // 1. Banner carousel.
    {
      blockType: 'heroCarousel',
      height: 'tall',
      slides: [
        ...slide(
          img.together,
          'A century of learning at SIWS',
          'Serving Mumbai since 1934 — from Kindergarten through to Junior College, on one trusted campus.',
        ),
        ...slide(
          img.teacher,
          'Teachers with decades behind them',
          'Across our sections, staff bring between 15 and 25 years of classroom experience.',
        ),
        ...slide(
          img.play,
          'Safe, supervised, CCTV-monitored campuses',
          'Every classroom, corridor and entrance is monitored, at Wadala and at Matunga.',
        ),
      ],
    },

    // 2. Picture cards — the reference's "Our Programs, your Future".
    {
      blockType: 'programCards',
      heading: 'Our sections, your child’s future',
      accentWord: 'your child’s future',
      headingLevel: 'h2',
      background: 'white',
      intro: richText([
        'One institution from Kindergarten to Junior College, so a child need not change schools to move up.',
      ]),
      cards: unitCards,
    },

    // 3. Signpost buttons — "Discover SIWS / Management / Organogram".
    {
      blockType: 'quickNav',
      heading: 'About the institution',
      headingLevel: 'h2',
      background: 'white',
      items: [
        {
          label: 'Discover SIWS',
          icon: 'building',
          link: { type: 'external', url: 'https://siws.edu.in' },
        },
        {
          label: 'Our management',
          icon: 'people',
          link: { type: 'external', url: 'https://siws.edu.in' },
        },
        {
          label: 'Organogram',
          icon: 'chart',
          link: { type: 'external', url: 'https://siws.edu.in' },
        },
      ],
    },

    // 4. Notice board — scrollable, as asked.
    {
      blockType: 'announcements',
      heading: 'Academic Announcements',
      accentWord: 'Announcements',
      headingLevel: 'h2',
      background: 'sea',
      maxHeight: 'medium',
      items: [
        { title: `Admission forms for the next academic year open in November. ${PLACEHOLDER}` },
        { title: `Term I examination timetable published for Standards V to X. ${PLACEHOLDER}` },
        { title: `Merit scholarship awards announced in the school calendar. ${PLACEHOLDER}` },
        { title: `Parent–teacher meeting scheduled for all sections. ${PLACEHOLDER}` },
        { title: `Revised school timings for the Kindergarten section. ${PLACEHOLDER}` },
        { title: `Uniform supplier details for the coming session. ${PLACEHOLDER}` },
        { title: `Annual day rehearsal schedule for participating classes. ${PLACEHOLDER}` },
      ],
    },

    // 5. Split image and message — "We're with you every step of the way".
    ...(img.seated
      ? [
          {
            blockType: 'mediaText',
            heading: 'We’re with you every step of the way',
            accentWord: 'every step',
            headingLevel: 'h2',
            image: img.seated,
            imagePosition: 'left',
            imageShape: 'rounded',
            background: 'sea',
            content: richText([
              'From a child’s first day in Jr. KG to the S.S.C. examination, the same institution follows them through — with teachers who know them, and a pathway that does not require changing schools.',
            ]),
            cta: [],
          },
        ]
      : []),

    // 6. Logo strip — "Our Esteemed Recruiters".
    {
      blockType: 'logoStrip',
      heading: 'Affiliations and recognition',
      headingLevel: 'h2',
      background: 'white',
      items: [
        { name: 'Maharashtra State Board' },
        { name: 'SCERT, Pune' },
        { name: 'Balbharati' },
        { name: 'Department of Education' },
      ],
    },

    // 7. Expandable list on a deep field — "Let's Come and Do".
    {
      blockType: 'accordion',
      heading: 'Beyond the classroom',
      accentWord: 'Beyond',
      headingLevel: 'h2',
      background: 'brand',
      allowMultipleOpen: false,
      items: [
        {
          question: 'Sports and physical education',
          answer: richText([`${PLACEHOLDER} Replace with the sports SIWS actually runs.`]),
        },
        {
          question: 'Arts, music and cultural activities',
          answer: richText([`${PLACEHOLDER} Replace with real activity descriptions.`]),
        },
        {
          question: 'Competitions and interschool events',
          answer: richText([
            'Kindergarten students won four prizes at Our Lady’s Garden, Auxilium Convent, and one prize each at Andhra Education Society and Natya Tarang.',
          ]),
        },
      ],
    },

    // 8. Quick links — the four-column band.
    {
      blockType: 'cardGrid',
      heading: 'Quick links',
      headingLevel: 'h2',
      columns: '4',
      background: 'sea',
      cards: [
        { title: 'Admissions', description: 'How to apply, age criteria and key dates.' },
        { title: 'School rules', description: 'What we ask of students and parents.' },
        { title: 'Scholarships', description: '151 endowed funds across the institution.' },
        { title: 'Contact us', description: 'Speak to the admissions team.' },
      ],
    },
  ]

  const page = {
    slug: 'design-preview',
    title: 'Design preview',
    intro: 'A layout reference reproducing the structure of siwscollege.edu.in.',
    // Deliberately NOT in any menu.
    showInNav: false,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription: 'Internal layout reference. Not part of the public site.',
    layout,
  }

  const existing = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: page.slug } }, { unit: { exists: false } }] },
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
    payload.logger.info('Updated page: Design preview')
  } else {
    await payload.create({ collection: 'pages', data: page as never, overrideAccess: true })
    payload.logger.info('Created page: Design preview')
  }

  payload.logger.info('Open it at /design-preview')
  payload.logger.warn(
    'PLACEHOLDER CONTENT: the notices, the campus-life descriptions and two of the three accordion entries are sample text, marked as such on the page. Delete this page before go-live, or replace them.',
  )

  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) {
    console.error('Design preview seed failed. Field errors:')
    for (const item of nested) console.error('  •', JSON.stringify(item))
  } else {
    console.error('Design preview seed failed:', error)
  }
  process.exit(1)
})
