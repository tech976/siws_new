import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { bulletList, richTextNodes } = await import('@/seed/lexical')
const { findMediaId } = await import('@/utilities/media-lookup')

/**
 * Writes the Fine Arts page from the Centre's own website text — "SIWS Arts
 * Website Intro", the two-page document SIWS sent on 2026-10-12 with the
 * instruction "use this as the intro for the fine art section".
 *
 * THIS REPLACES THE FIRST VERSION, written the same morning from the Centre's
 * description of itself and its annual report. That one was ours: five
 * sections of prose in the Sports page's form, argued from their facts. This
 * one is theirs, and the difference decides everything below.
 *
 * THEIR WORDS, THEIR HEADINGS, THEIR LISTS. Nothing is rewritten. The Sports
 * page was turned from points into paragraphs because SIWS asked for that of
 * a brief; here they have sent finished copy, with the subjects and the
 * reasons to join set as lists, and a list of seven subjects made into a
 * sentence would be us editing their document. The headings are set in the
 * site's sentence case and the lists stay lists.
 *
 * WHAT IS NOW PUBLISHED THAT WAS HELD BACK. The first version left out the
 * "48 students" who have completed the course, because the annual report gave
 * no year, and the six proposals at the end of that report, because they were
 * recommendations to the Society and not things the Centre did. Both are in
 * this text in SIWS's own framing — forty-eight "have successfully completed",
 * and the proposals are what "the Centre plans to" do — so both are on the
 * page. Whether to say them was theirs to decide, and they have.
 *
 * TWO THINGS ARE NOT AS THE DOCUMENT HAS THEM:
 *   - "The South Indian Welfare Society" is set as the Society's name is on
 *     every other page of its own site, the South Indians’ Welfare Society;
 *   - "Free Saturday classes for SIWS School students" is bold and not
 *     underlined. On a web page an underline is a link.
 *
 * THE NAME. The document calls it the Arts, Fine Arts & PHILOSOPHY Centre; the
 * sheets signed by its Head said PHILOSOPHICAL. The page follows the document
 * it was told to use, title included. The tab still says "Fine Arts" and the
 * address is unchanged. The first section carries the title exactly, which is
 * what makes the route drop its own left-ranged header.
 *
 * THE TWO LINES UNDER THE TITLE ARE CENTRED, as they are a strapline and not
 * prose. That is a paragraph with Lexical's own centre alignment on it, which
 * `components/RichText.tsx` renders; everything else is justified like the
 * rest of the site.
 *
 * THE CENTRE'S TEACHERS, from "S.I.W.S School staffs Information (Fine Arts)",
 * the sheet SIWS sent on 2026-10-13 with "please upload these on our site":
 * the Head and eight teachers, each with a post and qualifications. They are
 * added as Teacher records, the same kind every school's Teachers page is made
 * of, so they look the same and the office can add a photograph or a new
 * teacher from the panel. They have no school — the Centre is the Society's —
 * and a teachers block on a page of the main site lists exactly those.
 *
 * The sheet's own order is kept, which is also its grouping: the Head, the
 * three language teachers of the Arts section, then the five of the Fine Arts
 * section. The qualifications are theirs, set consistently (M.A., B.Ed., PhD)
 * and otherwise untouched; "Bharatnatyam" is spelt as the Centre's own text
 * above spells it. Mr. Tanjorkar's line is the corrected one sent with the
 * sheet. A teacher already in the panel under the same name is LEFT ALONE —
 * once a record exists the panel is where it is edited, and this must never
 * put back an old qualification over a corrected one.
 *
 * THE GALLERY LAYOUT (2026-10-16). The page is now laid out as a student
 * gallery: a banner with a collage from the four schools, the Centre's text
 * as before, a chapter for each school's creative work, Primary's Natya
 * Tarang 2026 as a featured moment, and a gallery wall at the foot. The
 * Centre's own sections are unchanged word for word; they are only placed
 * among the new ones. What each block becomes on the page is described in
 * `components/fine-arts/FineArtsPage.tsx`. The photographs are the schools'
 * own, already on the live site — see PHOTOS.
 *
 * REFUSES A PAGE SOMEBODY HAS WRITTEN. It stops if the page has sections on
 * it, so it can never overwrite the school's own work. `--force` is there for
 * a re-run after a change to this script — which is what this is.
 *
 * Usage:  npx tsx src/scripts/write-portal-fine-arts-page.ts [--apply] [--force]
 */

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')

/** The address and the menu label, neither of which this script changes. */
const SLUG = 'fine-arts'

/** The Centre's name as the document heads it. */
const TITLE = 'SIWS Arts, Fine Arts & Philosophy Centre'

const STRAPLINE = 'Nurturing young minds through language, music, dance and timeless wisdom'
const FREE_CLASSES = 'Free Saturday classes for SIWS School students'

/** Under the title on a search result, and wherever the page is summarised. */
const INTRO = `${STRAPLINE}. ${FREE_CLASSES}.`

/**
 * The Centre's staff, in the order of the sheet. `order` is their place in the
 * list, as on every school's roster.
 */
const TEACHERS: { name: string; designation: string; qualifications: string }[] = [
  { name: 'Mrs. Bhavana Narayanan', designation: 'Head', qualifications: 'M.A., B.Ed. in Sanskrit' },
  // Arts section — languages
  { name: 'Mrs. Priya Rohit Neroy', designation: 'Sanskrit Teacher', qualifications: 'M.A. in Sanskrit' },
  {
    name: 'Dr. Mahalakshmi V.',
    designation: 'Tamil Teacher',
    qualifications:
      'PhD in Economics, M.A. in Econometrics, MPhil in Economics, M.Ed. in Economics, MBA (HR), Diploma in Labour Law, Diploma in Tamil',
  },
  {
    name: 'Mrs. Rekha Raveendran',
    designation: 'Malayalam Teacher',
    qualifications: 'M.A. in Malayalam Language & Literature',
  },
  // Fine Arts section
  { name: 'Mrs. Ramalakshmi', designation: 'Vocal Teacher', qualifications: 'B.Sc. (B.Music), Diploma in Music' },
  {
    name: 'Mr. Vinit Sawant',
    designation: 'Veena Teacher',
    qualifications: 'Shanmukhananda Exam (3 Years) | 4 Years’ Experience',
  },
  {
    name: 'Miss Kimaya Shantaram Kamble',
    designation: 'Bharatanatyam Teacher',
    qualifications: 'Masters in Performing Arts (Bharatanatyam)',
  },
  {
    name: 'Sampada Shivani Rajesh Tambe',
    designation: 'Bharatanatyam Teacher',
    qualifications: 'M.A. in Bharatanatyam, B.A. Visharad in Bharatanatyam',
  },
  {
    name: 'Mr. Sekhar Janardhan Tanjorkar',
    designation: 'Violin Teacher',
    qualifications: 'Training Through – Guru–Shishya Parampara | National & International Awardee',
  },
]

/* --- Lexical, as much of it as this page needs ---------------------------- */

const BOLD = 1

/** Shared shape for every element node. Lexical rejects nodes missing these. */
const element = { format: '' as const, indent: 0, version: 1, direction: 'ltr' as const }

const t = (body: string, format = 0) => ({
  type: 'text',
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text: body,
  version: 1,
})
const b = (body: string) => t(body, BOLD)

type Inline = ReturnType<typeof t>

const p = (children: string | Inline[]) => ({
  type: 'paragraph',
  ...element,
  textFormat: 0,
  children: typeof children === 'string' ? [t(children)] : children,
})

const h3 = (body: string) => ({ type: 'heading', tag: 'h3', ...element, children: [t(body)] })

/** A list whose items open on a bold term and a colon, as the document sets them. */
const termList = (entries: [term: string, detail: string][]) => ({
  type: 'list',
  listType: 'bullet' as const,
  tag: 'ul' as const,
  start: 1,
  ...element,
  children: entries.map(([term, detail], index) => ({
    type: 'listitem',
    value: index + 1,
    ...element,
    children: [b(`${term}:`), t(` ${detail}`)],
  })),
})

/** White and sea alternate down the page, so each section reads as its own. */
const section = (
  heading: string,
  accentWord: string | null,
  nodes: unknown[],
  index: number,
  level: 'h1' | 'h2' = 'h2',
) => ({
  blockType: 'richText',
  heading,
  ...(accentWord ? { accentWord } : {}),
  headingLevel: level,
  width: 'normal',
  background: index % 2 === 0 ? 'white' : 'sea',
  content: richTextNodes(nodes),
})

/** The Centre's own sections, in the order of its document. */
const centre = [
  section(
    'About the Centre',
    'the Centre',
    [
      p(
        'Started in the academic year 1997–98 under the South Indians’ Welfare Society, the SIWS Arts, Fine Arts & Philosophy Centre was founded with a noble aim: to nurture young minds through culture, creativity and values. We seek to enhance each student’s intellectual and emotional growth by encouraging self-expression, building analytical skills and fostering a deeper appreciation of culture, ideas and the human condition.',
      ),
      p([
        t(
          'Since its inception, the Centre has offered a holistic education that blends languages, music, dance and philosophy. Classes are held ',
        ),
        b('every Saturday'),
        t(
          ' throughout the academic year, so students can balance their studies with cultural learning. Every course is optional and ',
        ),
        b('completely free of cost'),
        t(' for SIWS students.'),
      ]),
    ],
    1,
  ),
  section(
    'What we teach',
    'teach',
    [
      h3('Arts – Classical Languages'),
      p(
        'A unique feature of the Centre is its focus on multilingual exposure. Learning Tamil, Malayalam and Sanskrit helps students appreciate India’s linguistic diversity and cultural richness.',
      ),
      bulletList(['Tamil', 'Malayalam', 'Sanskrit']),
      h3('Fine Arts – Music & Dance'),
      p(
        'Students train in classical music, instruments and dance under experienced, dedicated teachers.',
      ),
      bulletList(['Carnatic Vocal', 'Veena', 'Violin', 'Bharatanatyam']),
      h3('Philosophy'),
      p(
        'The Centre places special emphasis on Indian philosophy and culture through the teachings of the Bhagavad Gita, guiding students towards moral values and disciplined living.',
      ),
      bulletList(['Bhagavad Gita: recitation, meaning and life lessons']),
    ],
    2,
  ),
  section(
    'Why join the Centre?',
    'the Centre?',
    [
      termList([
        ['Free of cost', 'quality cultural education for every SIWS student, fully supported by the Society.'],
        ['Experienced, dedicated teachers', 'learn from accomplished teachers in each subject.'],
        [
          'Structured three-year course',
          'systematic learning, with a certificate from the Centre on completion.',
        ],
        ['Every Saturday', 'classes designed to fit around regular studies.'],
        [
          'Stage and competition opportunities',
          'students take part in competitions, examinations and cultural events run by well-known organisations.',
        ],
        [
          'Recognition',
          'annual awards for the best outgoing students in each section, sponsored by our well-wishers.',
        ],
        [
          'Values and confidence',
          'the arts build discipline, focus, self-expression and pride in one’s culture.',
        ],
      ]),
    ],
    3,
  ),
  section(
    'Our journey',
    'journey',
    [
      p(
        'For more than 25 years, the Centre has contributed significantly to the cultural and moral development of SIWS students. Our students regularly take part in competitions, examinations and cultural events conducted by well-known organisations, showcasing their talent in languages, Carnatic music, veena, violin, Bharatanatyam and Bhagavad Gita recitation.',
      ),
      p([
        t('Many have gone on to excel in their chosen fields. '),
        b('48 students'),
        t(
          ' have successfully completed the full three-year programme and received the Centre’s certificate, and each year our sponsors present awards to the best outgoing student in every section.',
        ),
      ]),
      p([
        t('The Centre is led by '),
        b('Mrs. Bhavana Narayanan, Head'),
        t(', together with a team of eminent, experienced and dedicated teachers.'),
      ]),
    ],
    4,
  ),
  /*
   * The teachers "Our journey" has just spoken of. A teachers block on the
   * main site lists the teachers with no school, which are the Centre's; a
   * plain grid, because the Centre has one Head and not a head teacher with a
   * list under her.
   */
  {
    blockType: 'faculty',
    heading: 'Our teachers',
    accentWord: 'teachers',
    headingLevel: 'h2',
    layout: 'grid',
    cardLayout: 'centred',
    showQualifications: true,
    background: 'sea',
  },
  section(
    'Looking ahead',
    'ahead',
    [
      p('We are expanding. With renewed energy, the Centre plans to:'),
      bulletList([
        'add new subjects and programmes to the ones we teach today',
        'hold demonstrations, workshops and cultural events open to students and parents',
        'offer flexible timings and additional classes where needed',
        'bring modern teaching methods alongside traditional practice',
        'introduce more recognition, awards and scholarships for dedicated students',
        'welcome greater involvement from parents and the wider community',
      ]),
      p(
        'The Centre will continue to inspire and shape future generations while preserving our rich heritage.',
      ),
    ],
    6,
  ),
]

/* --- the photographs ------------------------------------------------------ */

/**
 * Every photograph is one the schools have already put on the live site —
 * found there by filename, chosen by looking at it and not by its name, and
 * captioned with what it shows and which school it is from. None is of the
 * Centre's own classes: there are no such photographs yet, and a school's
 * dance competition captioned as a Bharatanatyam class would be a claim the
 * Centre has not made.
 *
 * Six were uploaded by the schools' own accounts and keep their phone names
 * (IMG-…, PHOTO-…); they are the right photographs all the same.
 */
const PHOTOS = {
  // Banner collage — one from each school
  stage: 'natya-tarang-2026-company.jpg',
  fingerPaint: 'kg-activity-creative.jpg',
  tshirts: 'secondary-event-05.jpg',
  rangoliMessage: 'jc-rangoli-2.jpg',
  // Kindergarten
  colouring: 'kg-classroom-activity.jpg',
  handprints: 'kg-classroom-full-class-1.jpg',
  regionalDance: 'kg-stage-regional-dance.jpg',
  // Primary
  paperPortraits: 'IMG-20261001-WA0035.jpg',
  clay: 'PHOTO-2026-10-08-14-42-13.jpg',
  pookalam: 'onam-2026-pookalam.jpg',
  // Secondary
  craftClass: 'secondary-craft-class.jpg',
  paperCutting: 'portal-vision-background.jpg',
  traditionalDress: 'secondary-event-01.jpg',
  // Junior College
  rangoliPortrait: 'jc-rangoli.jpg',
  // Natya Tarang 2026
  performance: 'natya-tarang-2026-performance.jpg',
  trophy: 'natya-tarang-2026-trophy.jpg',
  costumePrize: 'primary-natya-tarang-2026-costume-props-prize.jpg',
  firstPrize: 'natya-tarang-2026-first-prize.jpg',
  // The gallery wall
  earthCostume: 'siws-fancy-dress-environment.jpg',
  fancyDress: 'kg-fancy-dress-entrants.jpg',
  janmashtami: 'kg-janmashtami-costumes.jpg',
  rehearsal: 'kg-dance-rehearsal.jpg',
  danceWinners: '20260910_160345.jpg',
  danceTrophy: 'kg-dance-ourladys-garden.jpg',
  singing: 'IMG-20260909-WA0001.jpg',
  greetingCard: 'PHOTO-2026-10-09-14-27-10.jpg',
  peacePosters: 'IMG-20261002-WA0001.jpg',
  ganeshDisplay: 'primary-ganesh-chaturthi-2026-banner.jpg',
  activityClass: 'secondary-activity-class.jpg',
  pongal: 'jc-pongal-day.jpg',
} as const

type Ids = Record<keyof typeof PHOTOS, number>

/** A photograph in a gallery, its caption opening on the school: "Primary · …". */
const shot = (image: number, caption: string) => ({ image, caption })

/** A point of the "every age" list: a chapter's lead, or one of its extra prints. */
const chapter = (school: string, title: string, photo: number, description?: string) => ({
  chip: school,
  title,
  photo,
  ...(description ? { description } : {}),
})

/** A button to a section further down this page. */
const jump = (label: string, pageId: number, anchor: string, appearance: 'primary' | 'secondary') => ({
  link: { label, type: 'internal', reference: { relationTo: 'pages', value: pageId }, anchor, appearance },
})

const buildLayout = (photo: Ids, pageId: number) => {
  const [about, teach, why, journey, teachers, ahead] = centre

  return [
    /*
     * The banner. The headline is the brief's; the line under it is the
     * Centre's own strapline and its free Saturday classes; the three figures
     * (the most the banner takes) are all in the Centre's text: 1997–98; eight
     * subjects — Tamil, Malayalam, Sanskrit, vocal, veena, violin,
     * Bharatanatyam and the Gita; and the 48 who have completed the course.
     */
    {
      blockType: 'hero',
      eyebrow: TITLE,
      title: 'Where Creativity Finds Its Voice.',
      accentWord: 'Creativity',
      intro: `${STRAPLINE}. ${FREE_CLASSES} — and a love of colour, craft and performance you can see in all four of our schools.`,
      image: photo.stage,
      highlights: [
        { value: '1997–98', label: 'the year the Centre opened' },
        { value: '8', label: 'subjects, every Saturday' },
        { value: '48', label: 'graduates of the three-year course' },
      ],
      links: [
        jump('What we teach', pageId, 'what-we-teach', 'primary'),
        jump('See the student gallery', pageId, 'student-art-gallery', 'secondary'),
      ],
    },
    /* Directly after the banner, so it is drawn as the banner's collage. */
    {
      blockType: 'gallery',
      heading: 'Banner photographs',
      layout: 'grid',
      images: [
        shot(photo.stage, 'Primary · The full company on stage at Natya Tarang 2026'),
        shot(photo.tshirts, 'Secondary · T-shirts painted for the anti-drug campaign'),
        shot(photo.fingerPaint, 'Kindergarten · A finger painting, made together'),
        shot(photo.rangoliMessage, 'Junior College · A rangoli with a message'),
      ],
    },
    about,
    teach,
    {
      blockType: 'featureList',
      heading: 'Creativity at every age',
      accentWord: 'every age',
      headingLevel: 'h2',
      layout: 'panel',
      background: 'sea',
      intro: richTextNodes([
        p(
          'Long before a student chooses an instrument or a classical language, they are drawing, making, dressing up and taking the stage. These photographs come from the classrooms and stages of our four schools.',
        ),
      ]),
      items: [
        chapter(
          'Kindergarten',
          'First colours, first stages',
          photo.colouring,
          'Crayons, finger paint and handprints come first. Our youngest children colour together at their tables, turn their handprints into a flag and step onto the stage in costume for their first performances.',
        ),
        chapter('Kindergarten', 'A flag made of painted handprints', photo.handprints),
        chapter('Kindergarten', 'On stage at an inter-school dance competition', photo.regionalDance),
        chapter(
          'Primary',
          'Ideas in paper, clay and colour',
          photo.paperPortraits,
          'In the Primary School ideas take shape in paper, clay and paint. Std 2 made paper portraits and Swachh Bharat posters, our pupils have brought home prizes in clay moulding from inter-school competitions, and festivals such as Onam are marked with a flower pookalam.',
        ),
        chapter('Primary', 'Second prize in clay moulding', photo.clay),
        chapter('Primary', 'Around the Onam pookalam', photo.pookalam),
        chapter(
          'Secondary',
          'Craft with a purpose',
          photo.craftClass,
          'By the Secondary years a whole class works together with paper and scissors, and art begins to carry a message: students painted T-shirts with anti-drug slogans for a school campaign, and dress in traditional costume for the school’s celebrations.',
        ),
        chapter('Secondary', 'Cutting coloured paper into a decoration', photo.paperCutting),
        chapter('Secondary', 'In traditional dress for the occasion', photo.traditionalDress),
        chapter(
          'Junior College',
          'Art that speaks',
          photo.rangoliPortrait,
          'At the Junior College students lay rangoli across the college floor — portraits, patterns and messages drawn in coloured powder, among them a call to stop violence.',
        ),
      ],
    },
    /*
     * A featured moment: Primary's Natya Tarang 2026. Every fact is in the
     * photographs' own descriptions in the library — first in Category A,
     * Pre-Primary to 4th Std (the trophy); the ₹20,000 cheque; the ₹5,000
     * special prize for costume and props.
     */
    {
      blockType: 'gallery',
      heading: 'Natya Tarang 2026',
      accentWord: '2026',
      layout: 'grid',
      intro: richTextNodes([
        p([
          t('At Natya Tarang 2026, the inter-school dance and music competition, children of our Primary School took '),
          b('first place in Category A'),
          t(' (Pre-Primary to Std 4) and a '),
          b('special prize for costume and props'),
          t('.'),
        ]),
      ]),
      images: [
        shot(photo.performance, 'Primary · Arms raised on the Natya Tarang stage'),
        shot(photo.trophy, 'Primary · First in Category A'),
        shot(photo.firstPrize, 'Primary · The first prize of ₹20,000'),
        shot(photo.costumePrize, 'Primary · ₹5,000 for costume and props'),
      ],
    },
    { ...why, background: 'white' },
    { ...journey, background: 'sea' },
    { ...teachers, background: 'white' },
    { ...ahead, background: 'sea' },
    /* Last, so it is drawn as the gallery wall. */
    {
      blockType: 'gallery',
      heading: 'Student art gallery',
      accentWord: 'art gallery',
      layout: 'grid',
      perPage: '0',
      background: 'white',
      intro: richTextNodes([
        p('Costume, dance, song, craft and colour from all four schools. Select a photograph to see it larger.'),
      ]),
      images: [
        shot(photo.earthCostume, 'Kindergarten · An Earth costume at the inter-school fancy dress competition'),
        shot(photo.peacePosters, 'Primary · Posters with messages of truth and peace'),
        shot(photo.rehearsal, 'Kindergarten · Rehearsing a dance for the annual programme'),
        shot(photo.activityClass, 'Secondary · Writing and cutting coloured paper in an activity session'),
        shot(photo.janmashtami, 'Kindergarten · Krishna and Radha for Janmashtami'),
        shot(photo.greetingCard, 'Primary · Third prize in greeting card making at the Josephite competition'),
        shot(photo.danceWinners, 'Kindergarten · Dance competition winners'),
        shot(photo.pongal, 'Junior College · Pongal day, with a kolam laid on the floor'),
        shot(photo.ganeshDisplay, 'Primary · The Ganesh Chaturthi display, with paper flowers and Ganesha crafts'),
        shot(photo.singing, 'Kindergarten · Sr. KG singing competition winners'),
        shot(photo.danceTrophy, 'Kindergarten · A trophy for the group dance at Our Lady’s Garden'),
        shot(photo.fancyDress, 'Kindergarten · The fancy dress competition'),
      ],
    },
  ]
}

const main = async () => {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: SLUG } }, { unit: { exists: false } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = docs[0] as unknown as
    | { id: number; title: string; layout?: unknown[]; intro?: string | null }
    | undefined
  if (!page) throw new Error('The institution-wide Fine Arts page does not exist — create the tab first.')

  const written = (page.layout ?? []).length
  if (written > 0 && !FORCE) {
    console.log(`  The page already has ${written} section(s) — left alone. Re-run with --force to replace them.`)
    process.exit(0)
  }

  /* --- the Centre's teachers ---------------------------------------------- */
  const { docs: listed } = await payload.find({
    collection: 'faculty',
    where: { unit: { exists: false } },
    limit: 200,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })
  const known = new Set(listed.map((doc) => String((doc as { name?: unknown }).name ?? '').trim()))
  const missing = TEACHERS.map((teacher, at) => ({ ...teacher, order: at + 1 })).filter(
    (teacher) => !known.has(teacher.name),
  )
  console.log(
    `  Teachers: ${TEACHERS.length - missing.length} of ${TEACHERS.length} already in the panel` +
      (missing.length > 0 ? `, ${APPLY ? 'adding' : 'would add'} ${missing.length}:` : ' — left as they are.'),
  )
  for (const teacher of missing) {
    console.log(`    ${teacher.order}. ${teacher.name} — ${teacher.designation}`)
    if (!APPLY) continue
    await payload.create({
      collection: 'faculty',
      data: { ...teacher, _status: 'published', reviewStatus: 'approved' } as never,
      overrideAccess: true,
    })
  }

  /* --- the photographs ---------------------------------------------------- */
  const photo = {} as Ids
  const absent: string[] = []
  for (const [key, filename] of Object.entries(PHOTOS) as [keyof typeof PHOTOS, string][]) {
    const id = await findMediaId(payload, filename)
    if (id === null) absent.push(filename)
    else photo[key] = id
  }
  if (absent.length > 0) throw new Error(`Not in the media library: ${absent.join(', ')}. Nothing was written.`)
  console.log(`  Photographs: all ${Object.keys(PHOTOS).length} found in the library.`)

  const layout = buildLayout(photo, page.id)
  console.log(`\n  ${APPLY ? 'Writing' : 'Would write'} ${layout.length} sections to the Fine Arts page:`)
  for (const block of layout) console.log(`    ${block.blockType}: ${block.heading ?? (block as { title?: string }).title}`)
  if (page.title !== TITLE) console.log(`\n  Title: “${page.title}” → “${TITLE}” (menu label and address unchanged)`)

  if (!APPLY) {
    console.log('\n  Nothing was written. Re-run with --apply to do it.')
    process.exit(0)
  }

  await payload.update({
    collection: 'pages',
    id: page.id,
    data: {
      title: TITLE,
      // Said out loud, so a new title can never be taken as a reason to move the page.
      slug: SLUG,
      intro: INTRO,
      layout,
      metaDescription:
        'Free Saturday classes for SIWS students in Tamil, Malayalam and Sanskrit, Carnatic vocal, veena, violin, Bharatanatyam and the Bhagavad Gita.',
      _status: 'published',
    } as never,
    overrideAccess: true,
  })
  console.log('  Written.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
