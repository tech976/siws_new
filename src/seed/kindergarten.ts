import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('./lexical')

/**
 * Seeds the Kindergarten website.
 *
 * Two sources, and where they disagree the school wins:
 *  - the approved landing page, which supplied the layout and the marketing copy;
 *  - SIWS's own KG requirement document, which supplies the curriculum, the
 *    teaching team, the timings, the age criteria, the fee, the achievements and
 *    the one real parent testimonial.
 *
 * Everything created here is ordinary editable content — nothing is hard-coded
 * into a template — so staff can change any of it afterwards. Re-running the
 * script updates the same pages rather than duplicating them, matched by slug.
 *
 * Run with:  npm run seed:kg
 */

/**
 * The five KG teachers, head teacher first.
 *
 * NO CAMPUS IS RECORDED. SIWS's endowment register names a "K.G. Section,
 * Wadala" and a "K.G. Section, Matunga" separately, but this document does not
 * say which campus its teachers or its timings belong to. Guessing would put
 * five named people at a location nobody has confirmed, so the field is left
 * blank and the question is raised at the end of the run.
 */
const FACULTY = [
  {
    name: 'Mrs. Nagkumari V. Seelam',
    designation: 'Head Teacher',
    qualifications: 'B.Com., B.Ed., E.C.C.Ed.',
  },
  {
    name: 'Mrs. Ulina James Fernandes',
    designation: 'Asst. Teacher',
    qualifications: 'S.S.C., Montessori',
  },
  {
    name: 'Mrs. Preethi Mahesh',
    designation: 'Asst. Teacher',
    qualifications: 'S.S.C., E.C.C.Ed.',
  },
  {
    name: 'Mrs. Kaladevi Nadar',
    designation: 'Asst. Teacher',
    qualifications: 'B.A., E.C.C.Ed.',
  },
  {
    name: 'Mrs. Meena Murugan Thevar',
    designation: 'Asst. Teacher',
    qualifications: 'H.S.C., E.C.C.Ed.',
  },
]

/** Why play-based learning works — SIWS's own seven points. */
const PLAY_BASED = [
  {
    title: 'Sparks natural curiosity',
    description: 'Children explore concepts deeply through hands-on, self-directed discovery.',
  },
  {
    title: 'Builds social intelligence',
    description: 'Group play teaches sharing, empathy and collaborative problem-solving.',
  },
  {
    title: 'Develops critical thinking',
    description: 'Open-ended activities challenge children to experiment and evaluate outcomes.',
  },
  {
    title: 'Boosts language skills',
    description: 'Interactive storytelling and role play rapidly expand vocabulary.',
  },
  {
    title: 'Strengthens motor skills',
    description: 'Active physical games refine both fine and gross coordination.',
  },
  {
    title: 'Fosters emotional resilience',
    description: 'Navigating peer play builds confidence and emotional self-regulation.',
  },
  {
    title: 'Nurtures lifelong joy',
    description: 'Learning feels like an adventure, preventing early school burnout.',
  },
]

/**
 * Parent feedback for the Kindergarten section.
 *
 * SUPPLIED BY SIWS, WITH THE PARENTS' CONSENT, AND PUBLISHED WITHOUT NAMES.
 *
 * Attributed to "Parent" rather than to anybody in particular, at the school's
 * instruction. That is the right way round for this: a parent's full name is
 * their personal data (DPDPA 2023), and none of it is needed for the quote to
 * mean something. What made the three testimonials this section deleted a
 * problem was never that they had no name on them — it was that nobody had
 * said them. These were said.
 *
 * The eleventh, with a name on it, is the one SIWS published on the home page
 * and asked to keep attributed. It stays where it is.
 */
const KG_PARENT_QUOTES: { quote: string; attribution: string; detail?: string }[] = [
  {
    quote:
      'SIWS provides a warm and welcoming environment where children feel comfortable, confident, and excited to learn every day.',
    attribution: 'Parent',
  },
  {
    quote:
      'We love the balance between learning and play. Our child has become much more independent and enthusiastic about school.',
    attribution: 'Parent',
  },
  {
    quote:
      'The teachers are caring and attentive, making sure every child gets the encouragement and support they need.',
    attribution: 'Parent',
  },
  {
    quote:
      'SIWS has created a wonderful foundation for our child’s early years, with activities that make learning enjoyable and meaningful.',
    attribution: 'Parent',
  },
  {
    quote:
      'What stands out to us is how much the school focuses on the overall development of the child, not just academics.',
    attribution: 'Parent',
  },
  {
    quote:
      'Our child looks forward to going to school every morning. The friendly teachers and engaging classroom environment have made a big difference.',
    attribution: 'Parent',
  },
  {
    quote:
      'We appreciate the safe, positive atmosphere at SIWS. It gives children the confidence to explore, ask questions, and express themselves.',
    attribution: 'Parent',
  },
  {
    quote:
      'The kindergarten experience has been full of fun, creativity, and new experiences. We have seen our child grow in confidence since joining.',
    attribution: 'Parent',
  },
  {
    quote:
      'The teachers make learning feel natural and enjoyable. Our child has developed a genuine curiosity and excitement about discovering new things.',
    attribution: 'Parent',
  },
  {
    quote:
      'SIWS feels like a place where children are understood and encouraged to be themselves while building strong foundations for the years ahead.',
    attribution: 'Parent',
  },
]

const ACTIVITIES = [
  { title: 'Drawing and colouring' },
  { title: 'Finger, thumb and palm painting' },
  { title: 'Festival celebrations' },
  { title: 'Fancy dress' },
  { title: 'Dance and movement' },
  { title: 'Sports' },
]

/**
 * Looks up a media item by filename so page content can reference the images
 * uploaded by `seed:media`. Returns null when the image is missing, and the
 * caller then omits it — a page must still seed correctly on an installation
 * where the photographs have not been uploaded.
 */
const mediaByFilename = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  filename: string,
): Promise<number | null> => {
  const exact = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (exact.docs[0]) return exact.docs[0].id as number

  /*
   * Payload appends `-1`, `-2`… when the name it wants is already taken on
   * disk, and this repository commits `media/`, so every name it ships is
   * taken before the first upload. A re-seed then left the library holding
   * `kg-play-area-2.jpg` where this file asks for `kg-play-area.jpg`, every
   * lookup returned null, and "Campus and Facilities" seeded with ZERO
   * photographs — the block was written, the gallery had nothing to render,
   * and the whole section disappeared off the Kindergarten page.
   */
  const stem = filename.replace(/\.[^.]+$/, '')
  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { like: stem + '-%' } },
    sort: 'id',
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })
  const suffixed = docs.find((d) => String(d.filename).replace(/-\d+(\.[^.]+)$/, '$1') === filename)
  return (suffixed?.id as number | undefined) ?? null
}

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'kindergarten' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const kg = units[0]
  if (!kg) throw new Error('Kindergarten unit not found. Run `npm run seed` first.')

  // Photographs uploaded by `npm run seed:media`.
  const img = {
    classroomActivity: await mediaByFilename(payload, 'kg-classroom-activity.jpg'),
    activityTable: await mediaByFilename(payload, 'kg-activity-table.jpg'),
    // The banner photograph: a whole class, not a corner of one.
    classroomTables: await mediaByFilename(payload, 'kg-classroom-tables.jpg'),
    classroomGroup: await mediaByFilename(payload, 'kg-classroom-group.jpg'),
    classroomSeated: await mediaByFilename(payload, 'kg-classroom-seated.jpg'),
    playArea: await mediaByFilename(payload, 'kg-play-area.jpg'),
    teacherWithChildren: await mediaByFilename(payload, 'kg-teacher-with-children.jpg'),
    childrenTogether: await mediaByFilename(payload, 'kg-children-together.jpg'),
    canteen: await mediaByFilename(payload, 'kg-canteen-meal.jpg'),
    handwashing: await mediaByFilename(payload, 'kg-handwashing.jpg'),
    smartBoard: await mediaByFilename(payload, 'kg-smart-board.jpg'),
    drawingClass: await mediaByFilename(payload, 'kg-drawing-class.jpg'),
    activityLiteracy: await mediaByFilename(payload, 'kg-activity-literacy.jpg'),
    activityCreative: await mediaByFilename(payload, 'kg-activity-creative.jpg'),
    activityMotor: await mediaByFilename(payload, 'kg-activity-motor.jpg'),
    /*
     * The three prize photographs. Two are already in the library for the
     * portal — the fancy-dress costume is the portal's own 'Life at SIWS'
     * tile and the Natya Tarang stage is its banner — so they are reused
     * rather than uploaded twice under a second name.
     */
    awardAuxilium: await mediaByFilename(payload, 'siws-fancy-dress-environment.jpg'),
    awardAndhra: await mediaByFilename(payload, 'siws-award-andhra.jpg'),
    awardNatyaTarang: await mediaByFilename(payload, 'siws-natya-tarang.jpg'),
    // From the school's own Activities set, for the programme cards below.
    fingerPainting: await mediaByFilename(payload, 'pre-primary-section-activities-photos-1.jpg'),
    paperLanterns: await mediaByFilename(payload, 'pre-primary-section-activities-photos-4.jpg'),
    /*
     * For "Why Parents Choose SIWS". Drawn from sets nothing else on this page
     * uses — the same photograph twice on one page reads as a school with only
     * eight of them.
     *
     * Chosen for shape as much as for subject. These sit in a portrait frame,
     * and three of the first picks were 2.17:1 panoramas of the play area: a
     * frame that tall shows a fifth of a photograph that wide, so the subject
     * was cropped out and what remained had been enlarged until it was soft.
     * Everything here is 4:3 or taller.
     */
    alphabetLesson: await mediaByFilename(payload, 'pre-primary-section-activities-photos-3.jpg'),
    readingBoard: await mediaByFilename(
      payload,
      'pre-primary-section-classroom-campus-images-4.jpg',
    ),
    orderlyClass: await mediaByFilename(
      payload,
      'pre-primary-section-classroom-campus-images-2.jpg',
    ),
    /*
     * THE PRIZE PHOTOGRAPHS, for the Achievements page.
     *
     * Every one of these is a group of Kindergarten children holding something
     * they were given. They are named here rather than pulled off the gallery
     * wall because the Achievements page states what each one WAS — the
     * competition, the prize — and that claim has to be attached to a known
     * photograph, not to whatever happens to be filed under the heading.
     */
    prizeNatyaTarang: await mediaByFilename(payload, 'siws-natya-tarang.jpg'),
    prizeFancyDress: await mediaByFilename(payload, 'siws-fancy-dress-environment.jpg'),
    prizeAndhra: await mediaByFilename(payload, 'siws-award-andhra.jpg'),
    prizeDanceCompetition: await mediaByFilename(payload, 'siws-dance-competition.jpg'),
    prizeDanceTrophy: await mediaByFilename(payload, 'kg-dance-trophy-2024.jpg'),
    prizeOurLadysGarden: await mediaByFilename(payload, 'kg-dance-ourladys-garden.jpg'),
    prizeIgnitedMind: await mediaByFilename(payload, 'ignited-mind-lab-2026.jpg'),
    prizeDistribution: await mediaByFilename(payload, 'kg-prize-distribution-2025.jpg'),
    prizeInterClass: await mediaByFilename(payload, 'kg-prize-distribution-2025-group.jpg'),
    prizeSports: await mediaByFilename(payload, 'kg-annual-sports-prizes.jpg'),
    prizeFancyDressEntrants: await mediaByFilename(payload, 'kg-fancy-dress-entrants.jpg'),
    // Portrait, and the only play-area shot that is — it fills the frame whole.
    slide: await mediaByFilename(payload, 'pre-primary-section-classroom-campus-images-5.jpg'),
  }

  const missing = Object.entries(img)
    .filter(([, id]) => id === null)
    .map(([name]) => name)
  if (missing.length > 0) {
    payload.logger.warn(
      `Some photographs are not in the media library yet (${missing.join(', ')}). Run \`npm run seed:media\` first for the full page.`,
    )
  }

  /** Gallery entry, skipped entirely when the image is absent. */
  const shot = (id: number | null, caption: string) => (id === null ? [] : [{ image: id, caption }])

  /**
   * One tile on the achievement wall, skipped entirely when its photograph is
   * absent. The block requires a picture per row — a prize with no photograph
   * would be a card in a wall of photographs — so a missing file has to remove
   * the whole claim rather than leave a hole in the grid.
   */
  const won = (
    photo: number | null,
    fields: { title: string; award?: string; when?: string; detail?: string; feature?: boolean },
  ) => (photo === null ? [] : [{ photo, ...fields }])

  // -- Fill in the unit's own details, so the footer and contact page work ---
  await payload.update({
    collection: 'units',
    id: kg.id,
    overrideAccess: true,
    data: {
      addressLine1: 'South Indians’ Welfare Society',
      addressLine2: 'Sion–Wadala Estate Road, Wadala',
      city: 'Mumbai',
      postalCode: '400031',
      email: 'info@siws.edu.in',
      phone: '+91 98927 03893',
      admissionsEmail: 'admissions@siws.edu.in',
      contactEmail: 'info@siws.edu.in',
      socialProfiles: [
        { platform: 'whatsapp', url: 'https://wa.me/919892703893', showFeed: false },
        {
          platform: 'instagram',
          url: 'https://www.instagram.com/siwsschoolwadala/',
          showFeed: false,
        },
        {
          platform: 'facebook',
          url: 'https://www.facebook.com/profile.php?id=61585854647515',
          showFeed: false,
        },
      ],
    } as never,
  })

  // -----------------------------------------------------------------------
  // The pages. `home` is the unit landing page; the rest are inner pages.
  // -----------------------------------------------------------------------
  type SeedPage = {
    slug: string
    title: string
    intro?: string
    showInNav?: boolean
    navLabel?: string
    navOrder?: number
    metaDescription?: string
    layout: Record<string, unknown>[]
  }

  /**
   * Upserts one page and hands back its ID.
   *
   * Pulled out of the loop below so the contact page can be seeded on its own,
   * ahead of everything else: the home hero links to it by relationship, and an
   * internal link needs its target to exist first (FR-QL-06).
   */
  const upsertPage = async (page: SeedPage) => {
    const existing = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: page.slug } }, { unit: { equals: kg.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const data = {
      ...page,
      unit: kg.id,
      // Seeded content is published and pre-approved: it is the copy SIWS
      // already signed off, so routing it back through review would leave the
      // site empty until someone clicked approve.
      _status: 'published',
      reviewStatus: 'approved',
    }

    if (existing.docs[0]) {
      const doc = await payload.update({
        collection: 'pages',
        id: existing.docs[0].id,
        data: data as never,
        overrideAccess: true,
      })
      payload.logger.info(`Updated page: ${page.title}`)
      return { id: doc.id, created: false }
    }

    const doc = await payload.create({
      collection: 'pages',
      data: data as never,
      overrideAccess: true,
    })
    payload.logger.info(`Created page: ${page.title}`)
    return { id: doc.id, created: true }
  }

  // -------------------------------------------------------------- CONTACT
  /** The enquiry form lives here now, not on the home page. */
  const contact = await upsertPage({
    slug: 'contact',
    title: 'Contact us',
    intro: 'Book a free campus tour, or ask us about Jr. KG and Sr. KG admission.',
    showInNav: true,
    navLabel: 'Contact',
    navOrder: 40,
    metaDescription:
      'Contact SIWS Kindergarten, Wadala — book a campus tour, and find our address, phone number and email for admissions.',
    layout: [
      {
        blockType: 'heroEnquiry',
        title: 'Book a Free Campus Tour',
        /*
         * THE SECTION’S OWN RANGE, not a board it does not sit.
         *
         * This read "SSC Board | Safe | Value-Based Education". The S.S.C. is
         * the Standard X examination — a Kindergarten child is eleven years
         * away from it, and naming it here told a parent nothing about the two
         * years they were actually enquiring about. Every other section states
         * the range it teaches in this line: Primary says Grades 1 to 4 and
         * Secondary says Standards V to X.
         *
         * The curriculum claim has not been dropped, only moved to where it is
         * true: the trust points below still say "SSC / State Board
         * curriculum", which is what the SIWS Group follows onward from
         * Grade 1 and is the reason a family choosing a kindergarten here is
         * choosing a school for the next twelve years.
         */
        subtitle: 'Jr. KG and Sr. KG | Safe | Value-Based Education',
        benefitsIntro: 'At SIWS, your child benefits from:',
        benefits: [
          { text: 'Strong academic foundations for the SSC / State Board years ahead' },
          { text: 'Structured early learning approach' },
          { text: 'Focus on discipline, values and confidence' },
          { text: 'Safe, nurturing and child-friendly campus' },
        ],
        badge: {
          title: 'Admissions Open for 2026–27',
          subtitle: 'Limited seats | Jr. KG & Sr. KG',
        },
        form: {
          title: 'Book a Free Campus Tour',
          subtitle: '(Limited seats available for Jr. KG & Sr. KG)',
          classOptions: [{ label: 'Jr KG' }, { label: 'Sr KG' }],
          trustPoints: [
            { text: 'Over 92 years of educational legacy' },
            { text: 'SSC / State Board curriculum' },
            { text: 'Experienced and trained teachers' },
            { text: 'Safe and disciplined campus' },
          ],
        },
      },
      {
        blockType: 'cardGrid',
        heading: 'Who to contact',
        headingLevel: 'h2',
        columns: '2',
        background: 'white',
        cards: [
          {
            title: 'Admissions',
            description: 'For enquiries about Jr. KG and Sr. KG admission — admissions@siws.edu.in',
          },
          {
            title: 'General enquiries',
            description: 'For anything else — info@siws.edu.in, +91 98927 03893',
          },
        ],
      },
    ],
  })

  /**
   * A stand-in for a page relation whose id is not known yet.
   *
   * Resolved after every page has been seeded — see the second pass at the
   * foot of this file. Written as a function rather than a bare object so a
   * misspelt path is visible at the call site.
   */
  const LINK_TO = (path: string) => ({ __linkTo: path })

  const pages: SeedPage[] = [
    // ---------------------------------------------------------------- HOME
    {
      slug: 'home',
      title: 'SIWS Kindergarten, Wadala',
      metaDescription:
        'Wadala’s most trusted kindergarten since 1934. Safe, value-based early education for Jr. KG and Sr. KG. Admissions open for 2026–27.',
      layout: [
        {
          blockType: 'hero',
          title: 'Wadala’s Most Trusted Kindergarten Since 1934',
          accentWord: 'Most Trusted',
          eyebrow: 'Jr. KG and Sr. KG | Safe | Value-Based Education',
          /*
           * A photograph behind the banner, which switches it from the flat
           * brand panel to the washed variant Secondary and the portal use —
           * the brand gradient runs dense at the left where the type sits and
           * thins to the right so the room still reads.
           *
           * Omitted if the picture is not in the library, so the banner falls
           * back to the flat panel rather than losing its gradient and the
           * contrast that goes with it.
           */
          /*
           * A WHOLE CLASS, not a corner of one.
           *
           * The banner had been a small group at one table, which at 3px of
           * blur behind a gradient read as an indistinct patch of colour — it
           * could have been four children anywhere. This one is a full year
           * group around both curved tables, so the thing that survives the
           * blur is the scale of the room and how many children are in it,
           * which is what a parent is at the top of this page to find out.
           *
           * `activityTable` stays in the library and keeps its place in the
           * campus row below.
           */
          ...(img.classroomTables
            ? { image: img.classroomTables }
            : img.activityTable
              ? { image: img.activityTable }
              : {}),
          // Plain string: the hero's `intro` is a textarea, not rich text.
          intro:
            'Strong academic foundations for the SSC / State Board years ahead, a structured early-learning approach, and a safe, nurturing and child-friendly campus — with a focus on discipline, values and confidence.',
          links: [
            {
              link: {
                label: 'Book a free campus tour',
                type: 'internal',
                reference: { relationTo: 'pages', value: contact.id },
                appearance: 'primary',
              },
            },
          ],
        },
        {
          blockType: 'richText',
          heading: 'About South Indians’ Welfare Society (SIWS)',
          accentWord: '(SIWS)',
          headingLevel: 'h2',
          width: 'normal',
          background: 'white',
          content: richText([
            'Founded in 1934, South Indians’ Welfare Society (SIWS) is a trusted educational institution in Mumbai with a legacy spanning nearly a century. The institution is known for its commitment to discipline, values and structured academic learning, with a strong emphasis on nurturing young minds during their formative years.',
          ]),
        },
        {
          blockType: 'statistics',
          heading: 'A legacy parents trust',
          background: 'sea',
          stats: [
            { value: '1934', label: 'Serving Mumbai since' },
            { value: '92+', label: 'Years of educational legacy' },
            { value: 'SSC', label: 'State Board curriculum' },
          ],
        },
        /**
         * The campus section, matching the approved page: a scrolling row of
         * photographs, each captioned with the facility it shows.
         *
         * This used to be followed by "What the campus offers", a card grid
         * naming the same seven facilities in words. Two blocks saying the
         * same thing back to back made the page argue with itself: a parent
         * scrolled a row of photographs of the classrooms, then immediately
         * read a card telling them the classrooms are spacious. The row is
         * the better of the two — a photograph of the room is worth more than
         * an adjective about it — so the cards have gone.
         *
         * What the cards carried and the photographs cannot — the canteen,
         * the washrooms and the monitored entry, none of which are in this
         * row — has moved into the intro line below, so removing the block
         * does not quietly remove the facts with it.
         */
        {
          blockType: 'gallery',
          heading: 'Campus and Facilities',
          accentWord: 'Facilities',
          headingLevel: 'h2',
          layout: 'carousel',
          background: 'white',
          intro: richText([
            'A child-friendly campus in Wadala, with a pure vegetarian canteen cooking on site, washrooms fitted at child height and cleaned through the day, and monitored entry throughout.',
          ]),
          images: [
            ...shot(img.classroomActivity, 'Spacious, well-ventilated classrooms'),
            ...shot(img.playArea, 'Safe play and activity area'),
            ...shot(img.classroomGroup, 'Group tables sized for young children'),
            ...shot(img.teacherWithChildren, 'Supportive and trained school staff'),
            ...shot(img.classroomSeated, 'Dedicated activity rooms'),
            /*
             * Freed up by the banner, which now carries the whole-class
             * photograph instead. Eight tiles rather than seven also gives the
             * loop a longer run before a visitor sees the first one come round
             * again.
             */
            ...shot(img.activityTable, 'Low tables and chairs sized for small children'),
            ...shot(img.childrenTogether, 'Room to play together between lessons'),
            /*
             * The canteen tray and the washroom tap came off this row at the
             * school's request (2026-08-25). Both are also the two the media
             * seed flags as not looking like SIWS's own photography, so they
             * were the weakest of the nine either way. They stay in the
             * library, and the intro line above still names both.
             */
            ...shot(img.smartBoard, 'Interactive smart boards in every classroom'),
            ...shot(img.drawingClass, 'Quiet, focused work at every desk'),
          ],
        },
        {
          blockType: 'featureList',
          heading: 'Kindergarten & Pre-Primary Programme at SIWS',
          accentWord: 'Programme',
          headingLevel: 'h2',
          marker: 'number',
          columns: '2',
          background: 'tint',
          intro: richText([
            'SIWS follows the SSC (State Board) curriculum, with a structured approach to foundational learning at the kindergarten and pre-primary levels.',
          ]),
          layout: 'cards',
          footnote: 'Building strong foundations today for a brighter tomorrow.',
          items: [
            {
              title: 'Early Literacy and Numeracy',
              description: 'Letters, numbers, reading readiness and writing skills.',
              icon: 'library',
              // The blackboard behind this class is counting one to ten.
              photo: img.activityLiteracy,
            },
            {
              title: 'Creative Expression',
              description: 'Art, music, storytelling and activity-based learning.',
              icon: 'activity',
              photo: img.activityCreative,
            },
            {
              title: 'Communication and Social Skills',
              description: 'Speaking, listening, sharing and confidence building.',
              icon: 'communication',
              photo: img.childrenTogether,
            },
            {
              title: 'Cognitive and Motor Development',
              description: 'Hands-on activities supporting mental and physical growth.',
              icon: 'thinking',
              photo: img.activityMotor,
            },
            {
              title: 'Physical Activity and Play',
              description: 'Movement, games and structured playtime.',
              icon: 'sport',
              photo: img.playArea,
            },
          ],
        },
        /**
         * "Holistic Development" carries the photograph in the approved page.
         * Falls back to a plain text section if the image is not in the library,
         * so the copy is never lost to a missing asset.
         */
        img.childrenTogether === null
          ? {
              blockType: 'richText',
              heading: 'Holistic Development Beyond the Classroom',
              headingLevel: 'h2',
              width: 'narrow',
              background: 'white',
              content: richText([
                'SIWS promotes emotional, social and physical development through group activities, celebrations, play and guided interaction, supporting all-round growth during the formative years.',
              ]),
            }
          : {
              blockType: 'mediaText',
              heading: 'Holistic Development Beyond the Classroom',
              accentWord: 'Beyond the Classroom',
              headingLevel: 'h2',
              image: img.childrenTogether,
              imagePosition: 'left',
              imageShape: 'rounded',
              background: 'white',
              content: richText([
                'SIWS promotes emotional, social and physical development through group activities, celebrations, play and guided interaction, supporting all-round growth during the formative years.',
              ]),
              cta: [],
            },
        {
          blockType: 'featureList',
          heading: 'Why Parents Choose SIWS for Kindergarten in Wadala',
          accentWord: 'SIWS',
          headingLevel: 'h2',
          marker: 'tick',
          layout: 'cards',
          eyebrow: 'Why parents choose us',
          background: 'sea',
          items: [
            /**
             * Rewritten against SIWS's own answers. The list previously offered
             * general claims from the landing page; these are the specifics the
             * school actually gave — a KG-to-PG pathway, the digital board, the
             * ground and garden, and staff with 18 to 30 years behind them.
             */
            {
              title: 'A pathway from KG to PG',
              description:
                'One institution from Kindergarten through to postgraduate study, so a child need not change schools to move up.',
              icon: 'study',
              photo: img.readingBoard,
            },
            {
              /*
               * No photograph. SIWS has sent no picture of the KG digital
               * board, and the smartboard shots in the library are all Primary
               * Wadala — putting one here would show a parent a room their
               * child will not be taught in. The card runs on its icon until
               * the school sends one.
               */
              title: 'Digital board facility',
              description: 'Technology-supported teaching in the early years classroom.',
              icon: 'computers',
            },
            {
              title: 'Experienced staff',
              description:
                'Our teachers and staff have between 18 and 30 years of experience with young children.',
              icon: 'staff',
              /*
               * NO PHOTOGRAPH, deliberately.
               *
               * Every card in this list names one, but only this card's was
               * ever in the library — the rest point at the `photos:import`
               * set whose rows are not in the repository, so they resolve to
               * null and run on their icon. That left one card in six wearing
               * a picture and looking like a mistake rather than a choice.
               *
               * Taking it off makes the grid one thing. If those photographs
               * are ever imported, this card should get one back at the same
               * time as the other five, not on its own.
               */
            },
            {
              title: 'A safe and disciplined environment',
              description:
                'CCTV-monitored entry and exit, and female staff throughout the section.',
              icon: 'security',
              photo: img.orderlyClass,
            },
            {
              title: 'Sports ground and garden',
              description: 'Open space for active play, games and outdoor learning.',
              icon: 'sport',
              photo: img.slide,
            },
            {
              title: 'Strong early learning foundation',
              description:
                'Phonics, letter recognition, pre-writing skills, vocabulary, peer socialisation, motor skills and confidence building.',
              icon: 'thinking',
              photo: img.alphabetLesson,
            },
          ],
        },
        {
          blockType: 'featureList',
          heading: 'Why play-based learning works',
          accentWord: 'play-based learning',
          headingLevel: 'h2',
          marker: 'tick',
          columns: '2',
          background: 'white',
          items: PLAY_BASED,
        },
        {
          blockType: 'featureList',
          heading: 'Our children’s achievements',
          accentWord: 'achievements',
          headingLevel: 'h2',
          marker: 'tick',
          columns: '1',
          background: 'tint',
          /*
           * Showcase rather than the tick list this was.
           *
           * A prize is the one thing on this page a parent wants to SEE, and
           * the school has a photograph of each. A tick and a line of text
           * spent none of that.
           */
          layout: 'showcase',
          intro: richText([
            'Our children take part in interschool competitions and have won awards.',
          ]),
          items: [
            {
              title: 'Our Lady’s Garden, Auxilium Convent',
              description: 'Four prizes.',
              photo: img.awardAuxilium,
            },
            {
              title: 'Andhra Education Society',
              description: 'One prize.',
              photo: img.awardAndhra,
            },
            {
              title: 'Natya Tarang',
              description: 'One prize.',
              photo: img.awardNatyaTarang,
            },
          ],
        },
        {
          /**
           * REPLACED, not extended.
           *
           * This block previously carried three quotes from the approved
           * landing page, each attributed only to "Parent". Nobody said them —
           * they were written as design copy — and an unattributed testimonial
           * on a school site is fabricated social proof about real families.
           * SIWS has now supplied one genuine testimonial, so the invented
           * three are gone and the real one stands alone.
           */
          blockType: 'testimonials',
          heading: 'What parents say',
          accentWord: 'parents',
          headingLevel: 'h2',
          background: 'white',
          quotes: [
            {
              quote:
                'The curriculum perfectly balances fun with learning. The Pre-Primary team lays a rock-solid foundation for future grades. I’m happy to have enrolled my child here.',
              // The name is published as SIWS supplied it. A parent's full name
              // is their personal data, so SIWS should hold their permission —
              // flagged at the end of the run.
              attribution: 'Kaveri Rajbhansi',
              detail: 'Parent',
            },
          ],
        },
        {
          blockType: 'accordion',
          heading: 'Frequently Asked Questions',
          accentWord: 'Questions',
          headingLevel: 'h2',
          background: 'tint',
          allowMultipleOpen: false,
          items: [
            {
              question: 'Is SIWS a kindergarten school in Wadala?',
              answer: richText([
                'Yes. SIWS offers kindergarten and pre-primary education in Wadala, Mumbai.',
              ]),
            },
            {
              question: 'Which board does SIWS follow?',
              answer: richText(['SIWS follows the SSC (State Board) curriculum.']),
            },
            {
              question: 'What is the eligibility for kindergarten admission?',
              answer: richText([
                'Your child should be 4 years or above for Jr. KG, and 5 years or above for Sr. KG.',
              ]),
            },
            {
              question: 'How can parents apply for admission?',
              answer: richText([
                'The admission process starts in November each year, and forms are submitted in person at the school office. Send us an enquiry through this page and the admissions team will contact you and guide you through it.',
              ]),
            },
            {
              question: 'What are the school timings?',
              answer: richText([
                'Jr. KG runs from 11.00 a.m. to 1.00 p.m., and Sr. KG from 2.00 p.m. to 5.00 p.m.',
              ]),
            },
            {
              question: 'Is the campus safe for young children?',
              answer: richText([
                'Yes. The campus is supervised, secure and designed to be child-friendly throughout.',
              ]),
            },
          ],
        },
        {
          blockType: 'callToAction',
          heading: 'Come and see the campus for yourself',
          background: 'brand',
          text: richText([
            'Book a free campus tour and meet the teachers who will be looking after your child.',
          ]),
          links: [
            {
              link: {
                label: 'Book a free campus tour',
                type: 'external',
                url: 'https://siws.edu.in/kindergarten#enquire',
                appearance: 'primary',
              },
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------- ACADEMICS
    {
      slug: 'academics',
      title: 'What your child learns',
      intro:
        'Jr. KG and Sr. KG on the State Board curriculum — English, Mathematics, EVS, General Knowledge and Arts.',
      showInNav: true,
      navLabel: 'Academics',
      navOrder: 5,
      metaDescription:
        'The Jr. KG and Sr. KG curriculum at SIWS Kindergarten — phonics, number work, EVS, general knowledge, arts and play-based learning.',
      layout: [
        {
          blockType: 'featureList',
          heading: 'Subjects',
          accentWord: 'Subjects',
          headingLevel: 'h2',
          marker: 'tick',
          columns: '2-centre',
          background: 'white',
          items: [
            { title: 'English' },
            { title: 'Mathematics' },
            { title: 'EVS' },
            { title: 'General Knowledge' },
            { title: 'Arts' },
          ],
        },
        {
          blockType: 'featureList',
          heading: 'Jr. KG',
          accentWord: 'Jr. KG',
          headingLevel: 'h2',
          marker: 'tick',
          columns: '1',
          background: 'sea',
          items: [
            {
              title: 'English — alphabet and phonics',
              description:
                'Pre-writing strokes and basic curves. Identifying and writing capital letters A–Z, and pronouncing the correct phonic sounds.',
            },
            {
              title: 'Mathematics',
              description:
                'Oral and written counting from 1 to 50. Pre-maths concepts: big and small, tall and short, heavy and light.',
            },
            {
              title: 'EVS and General Knowledge',
              description:
                'Myself, parts of the body, family members, fruits, vegetables, domestic animals, the sounds animals make, and means of transport.',
            },
          ],
        },
        {
          blockType: 'featureList',
          heading: 'Sr. KG',
          accentWord: 'Sr. KG',
          headingLevel: 'h2',
          marker: 'tick',
          columns: '1',
          background: 'white',
          items: [
            {
              title: 'English — alphabet and phonics',
              description:
                'Mastering A–Z in both capital and small letters, and the phonic sounds needed for reading. Word building: reading and writing two- and three-letter words.',
            },
            {
              title: 'Mathematics',
              description:
                'Number work, single-digit addition and subtraction, and number concepts. Shapes and colours.',
            },
            {
              title: 'EVS',
              description:
                'The living world, our surroundings and safety, good manners and personal hygiene.',
            },
            {
              title: 'Creative and physical activities',
              description:
                'Art, craft and co-curricular work: action rhymes, storytelling, indoor and outdoor play, and music.',
            },
          ],
        },
        {
          blockType: 'featureList',
          heading: 'Activities through the year',
          accentWord: 'Activities',
          headingLevel: 'h2',
          marker: 'tick',
          columns: '2-centre',
          background: 'tint',
          items: ACTIVITIES,
        },
        {
          blockType: 'richText',
          heading: 'How the year is organised',
          headingLevel: 'h2',
          width: 'narrow',
          background: 'white',
          content: richText(['The academic year runs in two terms.']),
        },
      ],
    },

    // ------------------------------------------------------ PARENT FEEDBACK
    /*
     * Contact › Parent Feedback, which was the menu's own placeholder.
     *
     * The page is built for the drifting-rows layout — two rows of quotes
     * passing each other in opposite directions, which is what `marquee` on
     * the testimonials block does. It needs FOUR quotes before it drifts;
     * below that it falls back to a grid, because two cards sliding past
     * mostly empty track reads as a fault rather than as motion.
     *
     * SIWS HAS SUPPLIED ONE. It is here, and it is real. The rest of the list
     * is empty on purpose: this section already deleted three invented
     * "Parent" testimonials once — see the note on the home page's block — and
     * writing sixteen more would be inventing what parents said about a real
     * school, to other parents choosing one. Add real ones to PARENT_QUOTES
     * below, or in the admin panel, and the rows start moving on their own.
     */
    {
      slug: 'parent-feedback',
      title: 'Parent feedback',
      intro:
        'What families tell us shapes how the section runs. If your child is with us, we would like to hear from you.',
      showInNav: true,
      navLabel: 'Parent Feedback',
      navOrder: 82,
      metaDescription:
        'Send your feedback to the SIWS Kindergarten section, Wadala — and read what parents of our Jr. KG and Sr. KG children say.',
      layout: [
        ...(KG_PARENT_QUOTES.length > 0
          ? [
              {
                blockType: 'testimonials',
                heading: 'What parents say',
                accentWord: 'parents',
                headingLevel: 'h2',
                background: 'white',
                // Two rows drifting past each other, edges faded, paused on
                // hover and on focus. Falls back to a grid under four quotes.
                layout: 'marquee',
                // "What parents say" above ten cards each signed "Parent" is
                // the same word eleven times. Who said it is still recorded.
                showAttribution: false,
                quotes: KG_PARENT_QUOTES,
              },
            ]
          : []),
        {
          blockType: 'featureList',
          heading: 'How to send us your feedback',
          accentWord: 'feedback',
          headingLevel: 'h2',
          marker: 'number',
          columns: '1',
          background: 'sea',
          items: [
            {
              title: 'Speak to the class teacher first',
              description:
                'Anything about your own child — how they are settling, what they are finding hard, how the day is going — is answered fastest by the person who teaches them.',
            },
            {
              title: 'Write in the school diary',
              description:
                'The diary goes home with your child every day and is the simplest line between the classroom and the kitchen table.',
            },
            {
              title: 'Telephone the office on +91 98927 03893',
              description:
                'For anything the class teacher cannot settle, the office will arrange a time with the Head of Section.',
            },
            {
              title: 'Or write to us through the enquiry form',
              description:
                'The form on the Contact page reaches the school directly, and somebody will come back to you.',
            },
          ],
        },
      ],
    },

    // -------------------------------------------------------- STUDENT LIFE
    /*
     * Student Life, which was a bare hero and nothing else.
     *
     * The section's day is short — two hours for Jr. KG, three for Sr. KG —
     * so "student life" here is not clubs and societies. It is the shape of
     * the day itself, and what happens inside it. That is what this page
     * describes, and every part of it is already stated somewhere on this
     * site: the timings from the admissions page, the activities from the
     * academics page, the rooms from Facilities & Campus.
     *
     * The Student Wall came out of the menu — it is still the placeholder —
     * so the two things this section really has to show a parent are the
     * photographs and how a child gets here. Both are linked below.
     */
    {
      slug: 'student-life',
      title: 'Student Life',
      intro:
        'What a Kindergarten day actually looks like — a short day, built around play, with time to settle into it.',
      showInNav: true,
      navLabel: 'Student Life',
      navOrder: 50,
      metaDescription:
        'A day in the SIWS Kindergarten section, Wadala — timings, activities, the play area and how children travel to school.',
      layout: [
        {
          blockType: 'featureList',
          heading: 'The shape of the day',
          accentWord: 'the day',
          headingLevel: 'h2',
          marker: 'number',
          columns: '1',
          background: 'white',
          items: [
            {
              title: 'A short day, on purpose',
              description:
                'Jr. KG runs from 11.00 a.m. to 1.00 p.m., Sr. KG from 2.00 p.m. to 5.00 p.m. Long enough to settle into a routine, short enough that a four-year-old is still enjoying it at the end.',
            },
            {
              title: 'Learning at a table, together',
              description:
                'Children work in small groups at child-height tables rather than in rows, so a teacher is never more than a step away and children learn as much from each other as from the board.',
            },
            {
              title: 'Time to move',
              description:
                'Dance, movement and sports in the play area break up the day. At this age sitting still is a skill being learned, not one to be assumed.',
            },
            {
              title: 'Something made, most days',
              description:
                'Drawing, colouring and finger, thumb and palm painting — work that goes home and gets put on a fridge.',
            },
          ],
        },
        {
          blockType: 'featureList',
          heading: 'What the children do',
          accentWord: 'children',
          headingLevel: 'h2',
          layout: 'compact',
          marker: 'tick',
          background: 'sea',
          intro: richText([
            'The activities that run through the Kindergarten year, alongside the academic work.',
          ]),
          items: [
            { title: 'Festival celebrations', icon: 'activity' },
            { title: 'Fancy dress', icon: 'activity' },
            { title: 'Dance and movement', icon: 'music' },
            { title: 'Sports', icon: 'sport' },
            { title: 'Drawing and colouring', icon: 'activity' },
            { title: 'Finger, thumb and palm painting', icon: 'activity' },
          ],
        },
        {
          blockType: 'cardGrid',
          heading: 'More on school life',
          accentWord: 'school life',
          headingLevel: 'h2',
          columns: '2',
          background: 'white',
          cards: [
            {
              title: 'Campus Gallery',
              description:
                'The classrooms, the play area and the children at work — photographed as they are.',
              cta: [
                {
                  link: {
                    label: 'See the photographs',
                    type: 'internal',
                    reference: LINK_TO('/kindergarten/gallery'),
                  },
                },
              ],
            },
            {
              title: 'Transport',
              description: 'How children travel to and from the Wadala campus.',
              cta: [
                {
                  link: {
                    label: 'Transport details',
                    type: 'internal',
                    reference: LINK_TO('/kindergarten/transport'),
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------- ACHIEVEMENTS
    /*
     * What a Kindergarten "achievement" actually is.
     *
     * The other sections have prizes and results to show. This one does not,
     * and should not pretend otherwise: at four and five, the achievement is
     * the child holding a pencil properly, or joining in without being asked.
     *
     * So the page leads with the four things the section is actually working
     * towards, each described in terms of what SIWS already says it teaches —
     * the phonics and number work from the Academics page, the painting and
     * dance from the activities list, the group tables from the facilities.
     * Nothing here claims an outcome the school has not claimed.
     */
    {
      slug: 'achievements',
      title: 'Achievements',
      intro:
        'The competitions our Kindergarten children take part in, the prizes they bring home, and the everyday milestones we celebrate along the way.',
      showInNav: true,
      navLabel: 'Achievements',
      navOrder: 42,
      metaDescription:
        'Prizes, competitions and prize days in the SIWS Kindergarten section in Wadala — and the early literacy, number and social milestones behind them.',
      layout: [
        {
          /*
           * NO HEADING AND NO INTRO ON THIS BLOCK.
           *
           * The page's own title and intro already say that this is the
           * Achievements page and what is on it, and the wall is the first
           * thing under them. A second heading immediately beneath, saying
           * much the same in different words, was one line of furniture
           * between the reader and the photographs.
           *
           * The field is optional and `SectionHeading` renders nothing when it
           * is empty, so the wall simply starts at the top of its band.
           */
          blockType: 'achievementWall',
          background: 'white',
          items: [
            /*
             * THE LARGE TILE. Chosen because it is the least ambiguous thing
             * on this page: the certificates name the competition, the year
             * and the class, so nothing about it rests on anybody's memory.
             */
            ...won(img.prizeIgnitedMind, {
              title: 'Ignited Mind Lab — Mental Maths Competition',
              award: 'Certificates and medals',
              when: '2025',
              detail:
                'Eleven children came back with a Certificate of Achievement and a gold medal each, having secured an A grade in the Jr. KG and Sr. KG rounds.',
              feature: true,
            }),
            ...won(img.prizeFancyDress, {
              title: 'Our Lady’s Garden, Auxilium Convent',
              award: 'Four prizes',
              detail:
                'The interschool fancy dress competition. Our costumes were made at home on an environmental theme — a painted globe, a model of the Earth, a windmill and a solar panel.',
            }),
            ...won(img.prizeDanceTrophy, {
              title: 'Interschool dance competition',
              award: 'Trophy and certificate',
              when: 'August 2024',
              detail:
                'A tricolour group dance for Independence Day, and the trophy and certificate from The Andhra Education Society’s Pre-Primary School that came back with it.',
            }),
            ...won(img.prizeOurLadysGarden, {
              title: 'Group dance at Our Lady’s Garden',
              award: 'Trophy and certificate',
              detail:
                'Thirteen children in the regional costume of a different state each, and the two staff members who taught them the piece.',
            }),
            ...won(img.prizeAndhra, {
              title: 'Andhra Education Society',
              award: 'One prize',
              detail: 'Receiving the certificate on stage at the end of the competition.',
            }),
            ...won(img.prizeSports, {
              title: 'Annual school sports',
              award: 'Trophies and certificates',
              detail:
                'The Kindergarten section’s own sports day, and the prize distribution that closes it.',
            }),
            ...won(img.prizeInterClass, {
              title: 'Interclass competition',
              award: 'Certificates of honour',
              when: '2024–25',
              detail:
                'Held between the Kindergarten classes through the year, with the certificates handed out on prize day.',
            }),
            ...won(img.prizeDistribution, {
              title: 'Annual prize distribution',
              award: 'Certificates and prizes',
              when: '2024–25',
            }),
            /*
             * THE BADGE NAMES THE ENTRY, NOT A PRIZE.
             *
             * This tile had no badge at all, which was honest but left it the
             * odd one out in a row of nine — a gap where every neighbour has a
             * yellow pill reads as a tile that failed to load rather than a
             * deliberate silence. (The badges wait for hover now, so the gap is
             * only ever seen on one tile at a time. It still reads as a fault
             * when it is seen, which is why this stays.)
             *
             * So it gets a badge that says what the photograph actually shows.
             * The children are wearing numbered entrant cards; there is no
             * trophy and no certificate anywhere in the frame, and nothing in
             * the library records a placing. "Participation" is therefore the
             * strongest claim the evidence supports, and the tile now matches
             * its neighbours without asserting a win nobody recorded.
             *
             * It reads as a badge because it is the ordinary word for one —
             * every neighbour names a thing received, and this names the entry
             * itself. An earlier draft counted the children instead ("Six
             * entrants"), which stated a fact but did not sound like any label
             * a school would print.
             *
             * No `when`: the year of this competition is not recorded against
             * the photograph, and a guessed one on a prize wall is worse than
             * none.
             */
            ...won(img.prizeFancyDressEntrants, {
              title: 'Interschool fancy dress',
              award: 'Participation',
              detail:
                'Six entrants and six costumes made at home — a fruit seller, a pilot, a beauty queen, a campaigner, Spider-Man and a bunch of grapes.',
            }),
          ],
        },
        {
          blockType: 'featureList',
          heading: 'Milestones we build towards',
          accentWord: 'Milestones',
          headingLevel: 'h2',
          // Cards: four pillars each carrying a short paragraph, which a tick
          // list would run together into one block of prose.
          layout: 'cards',
          background: 'sea',
          items: [
            {
              title: 'Foundational literacy',
              icon: 'library',
              description:
                'The alphabet and phonics in Jr. KG, then blending sounds into words and reading simple sentences by the end of Sr. KG.',
            },
            {
              title: 'Early number sense',
              icon: 'thinking',
              description:
                'Counting, number recognition and the first ideas of more and less, worked through objects and pictures before they are written down.',
            },
            {
              title: 'Motor skills',
              icon: 'activity',
              description:
                'Drawing, colouring and finger, thumb and palm painting for the small muscles; dance, movement and sports for the large ones.',
            },
            {
              title: 'Social and emotional growth',
              icon: 'care',
              description:
                'Sharing a table, taking a turn, joining a group and standing up in a fancy dress or a festival — the parts of school that are not on a worksheet.',
            },
          ],
        },
        {
          blockType: 'featureList',
          heading: 'How progress is shared',
          accentWord: 'shared',
          headingLevel: 'h2',
          marker: 'number',
          columns: '1',
          background: 'white',
          items: [
            {
              title: 'Continuous observation, not examinations',
              description:
                'There are no examinations in the Kindergarten years. Teachers watch how a child is getting on day to day, which at this age tells them far more.',
            },
            {
              title: 'Through the class teacher',
              description:
                'Anything about your own child — how they are settling, what they are finding hard — is answered fastest by the person who teaches them.',
            },
            {
              title: 'In the school diary',
              description:
                'The diary goes home with your child and is the everyday line between the classroom and the kitchen table.',
            },
          ],
        },
      ],
    },

    // ------------------------------------------------- UPDATES, NEWS, PRIZES
    /*
     * Three pages the school will fill itself once the site is running.
     *
     * They were bare placeholders, and the honest problem with an empty
     * "News & Events" is that there is no news yet — writing some would be
     * inventing school events, which is not a thing to do on a school's own
     * website. So each page carries EVERGREEN content instead: what the
     * section marks every year, what it teaches, and where to hear from it.
     * All of it is true on any date, none of it goes stale, and every item
     * comes from somewhere SIWS has already told us about.
     *
     * When real news arrives it goes above these, and they still read.
     */
    {
      slug: 'updates',
      title: 'Updates',
      intro:
        'News, achievements and the documents you may need — the parts of the Kindergarten section that change through the year.',
      showInNav: true,
      navLabel: 'Updates',
      navOrder: 40,
      metaDescription:
        'News, events, achievements and downloads from the SIWS Kindergarten section in Wadala.',
      layout: [
        {
          blockType: 'cardGrid',
          heading: 'Where to look',
          accentWord: 'look',
          headingLevel: 'h2',
          columns: '3',
          background: 'white',
          cards: [
            {
              title: 'News & Events',
              description: 'What the section marks through the year, and anything coming up.',
              cta: [
                {
                  link: {
                    label: 'See news and events',
                    type: 'internal',
                    reference: LINK_TO('/kindergarten/news'),
                  },
                },
              ],
            },
            {
              title: 'Achievements',
              description: 'What the children are working towards, and what they have won.',
              cta: [
                {
                  link: {
                    label: 'See achievements',
                    type: 'internal',
                    reference: LINK_TO('/kindergarten/achievements'),
                  },
                },
              ],
            },
            {
              title: 'Download Centre',
              description: 'Forms, circulars and the documents parents are asked for.',
              cta: [
                {
                  link: {
                    label: 'Go to downloads',
                    type: 'internal',
                    reference: LINK_TO('/kindergarten/download-centre'),
                  },
                },
              ],
            },
          ],
        },
        {
          blockType: 'callToAction',
          heading: 'Hearing from us',
          accentWord: 'us',
          headingLevel: 'h2',
          background: 'sea',
          body: richText([
            'Day-to-day messages reach parents through the class teacher and the school diary. For anything else, the office is on +91 98927 03893.',
          ]),
          links: [
            {
              link: {
                label: 'Contact the school',
                type: 'internal',
                reference: LINK_TO('/kindergarten/contact'),
                appearance: 'primary',
              },
            },
          ],
        },
      ],
    },

    {
      slug: 'news',
      title: 'News & Events',
      intro:
        'The Kindergarten year has a shape to it. These are the things that come round every year — dated notices appear here as they are announced.',
      showInNav: true,
      navLabel: 'News & Events',
      navOrder: 41,
      metaDescription:
        'Events and celebrations through the year at the SIWS Kindergarten section, Wadala.',
      layout: [
        {
          blockType: 'featureList',
          heading: 'What we mark through the year',
          accentWord: 'through the year',
          headingLevel: 'h2',
          layout: 'compact',
          marker: 'tick',
          background: 'white',
          intro: richText([
            'Every one of these is part of the Kindergarten calendar. Dates are given to parents through the school diary.',
          ]),
          items: [
            { title: 'Festival celebrations', icon: 'activity' },
            { title: 'Fancy dress', icon: 'activity' },
            { title: 'Dance and movement', icon: 'music' },
            { title: 'Sports', icon: 'sport' },
            { title: 'Drawing and colouring', icon: 'activity' },
            { title: 'Finger, thumb and palm painting', icon: 'activity' },
          ],
        },
        {
          blockType: 'callToAction',
          heading: 'Seeing it for yourself',
          accentWord: 'yourself',
          headingLevel: 'h2',
          background: 'sea',
          body: richText([
            'Photographs from the celebrations, the classrooms and the play area are gathered on the Campus Gallery.',
          ]),
          links: [
            {
              link: {
                label: 'Open the Campus Gallery',
                type: 'internal',
                reference: LINK_TO('/kindergarten/gallery'),
                appearance: 'primary',
              },
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------- ADMISSIONS FAQ
    /*
     * Admissions > Admissions FAQ, which was the menu's own placeholder.
     *
     * EVERY ANSWER HERE IS ALREADY SOMEWHERE ELSE ON THIS SITE. The timings
     * come from the admissions page, the fee and its caveat from the fee
     * block, the attendance figure from the timings list, the documents and
     * the no-entrance-test answer from the accordion on the admissions page
     * itself. Nothing has been invented to fill the page out: an FAQ that
     * answers a question the school has not actually answered is worse than
     * one that says "ask the office", because a parent acts on it.
     *
     * Where SIWS has not given a figure — the age cut-off, which is set per
     * year — the answer says so and points at the people who know.
     */
    {
      slug: 'admissions-faq',
      title: 'Admissions FAQ',
      intro: 'The questions the office is asked most often about joining the Kindergarten section.',
      showInNav: true,
      navLabel: 'Admissions FAQ',
      navOrder: 2,
      metaDescription:
        'Answers to common questions about Kindergarten admission at SIWS Wadala — when to apply, age criteria, documents, timings, fees and attendance.',
      layout: [
        {
          blockType: 'accordion',
          heading: 'Before you apply',
          accentWord: 'apply',
          headingLevel: 'h2',
          background: 'white',
          allowMultipleOpen: false,
          items: [
            {
              question: 'When do admissions open?',
              answer: richText([
                'Admissions for the next academic year begin in November. It is worth contacting the school before then, so we can tell you when forms are available.',
              ]),
            },
            {
              question: 'How old does my child need to be?',
              answer: richText([
                'Age criteria are set for each academic year in line with State Board rules, so the cut-off date moves. Please ask the admissions team for the dates that apply to your child rather than working from last year’s.',
              ]),
            },
            {
              question: 'Is there an entrance test?',
              answer: richText([
                'No. There is no entrance test at kindergarten level. Admission is based on age eligibility and seat availability.',
              ]),
            },
            {
              question: 'Can I apply online?',
              answer: richText([
                'No. Admission forms are collected and submitted in person at the school office. You can send an enquiry through this website at any time and the admissions team will contact you and guide you through what is needed.',
              ]),
            },
            {
              question: 'Which documents will I need?',
              answer: richText([
                'Usually your child’s birth certificate, recent photographs, proof of address and, where applicable, a transfer certificate. The admissions team will confirm the full list for your child.',
              ]),
            },
            {
              question: 'Can we see the school before we apply?',
              answer: richText([
                'Yes. Please telephone the office on +91 98927 03893 to arrange a time. Coming to see the classrooms and the play area, and meeting the teachers, tells you more than any page here can.',
              ]),
            },
          ],
        },
        {
          blockType: 'accordion',
          heading: 'Once your child has a place',
          accentWord: 'place',
          headingLevel: 'h2',
          background: 'sea',
          allowMultipleOpen: false,
          items: [
            {
              question: 'What are the school timings?',
              answer: richText([
                'Jr. KG runs from 11.00 a.m. to 1.00 p.m. Sr. KG runs from 2.00 p.m. to 5.00 p.m.',
              ]),
            },
            {
              question: 'What are the fees?',
              answer: richText([
                'The fee for Jr. KG and Sr. KG is ₹65,000. Please confirm the current figure, what it covers and how it is paid with the school office before you apply.',
              ]),
            },
            {
              question: 'Is there a minimum attendance requirement?',
              answer: richText([
                'Yes — we ask for a minimum of 75% attendance across the year. Regularity matters more at this age than at any later stage, because so much of the early years is routine.',
              ]),
            },
            {
              question: 'Is food provided?',
              answer: richText([
                'There is a pure vegetarian canteen on the campus, with food prepared on site.',
              ]),
            },
            {
              question: 'Which board does the Kindergarten follow?',
              answer: richText([
                'SIWS follows the SSC curriculum of the Maharashtra State Board, and the Kindergarten years prepare children for it.',
              ]),
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------ FACILITIES PAGE
    /*
     * About > Facilities & Campus, which was the menu's own placeholder — a
     * hero and "we are preparing this page" — while the school had fourteen
     * photographs of the place sitting in the library.
     *
     * The home page names the facilities as icon cards, which is right there:
     * it is a summary, and it has to stay readable for somebody who cannot
     * load the pictures. This page is the other half of that — the same
     * facilities with the photograph of each, at a size worth looking at.
     *
     * TWO ARE NAMED HERE WITHOUT A PICTURE, deliberately. The canteen tray and
     * the washroom tap were taken off the home page at SIWS's request on
     * 2026-08-25, and the media seed flags both as not looking like the
     * school's own photography. They are real facilities, so they are listed;
     * they simply are not illustrated until SIWS sends a photograph of its own.
     */
    {
      slug: 'facilities',
      title: 'Facilities & Campus',
      intro:
        'A child-friendly campus in Wadala — the rooms, the play area and the people who look after them.',
      showInNav: true,
      navLabel: 'Facilities & Campus',
      navOrder: 2,
      metaDescription:
        'The SIWS Kindergarten campus in Wadala — classrooms, smart boards, the play area, activity rooms and trained staff.',
      layout: [
        {
          blockType: 'featureList',
          heading: 'The rooms and the grounds',
          accentWord: 'rooms',
          headingLevel: 'h2',
          // A photograph across the top of each card, words beneath. The
          // facilities a parent walks round are recognised before they are
          // read, which an icon cannot do.
          layout: 'showcase',
          background: 'white',
          items: [
            {
              title: 'Spacious, well-ventilated classrooms',
              description: 'Bright, airy rooms with group seating and room to move.',
              ...(img.classroomActivity ? { photo: img.classroomActivity } : { icon: 'classroom' }),
            },
            {
              title: 'Interactive smart boards',
              description: 'A smart board in every classroom, used from the earliest years.',
              ...(img.smartBoard ? { photo: img.smartBoard } : { icon: 'computers' }),
            },
            {
              title: 'Safe play and activity area',
              description: 'A supervised space for games and structured play.',
              ...(img.playArea ? { photo: img.playArea } : { icon: 'play' }),
            },
            {
              title: 'Dedicated activity rooms',
              description: 'Separate spaces for art, music and hands-on work.',
              ...(img.classroomSeated ? { photo: img.classroomSeated } : { icon: 'activity' }),
            },
            {
              title: 'Group tables sized for young children',
              description: 'Child-height furniture, arranged for small groups.',
              ...(img.classroomGroup ? { photo: img.classroomGroup } : { icon: 'classroom' }),
            },
            {
              title: 'Supportive and trained staff',
              description: 'Attentive staff experienced with early years children.',
              ...(img.teacherWithChildren ? { photo: img.teacherWithChildren } : { icon: 'staff' }),
            },
          ],
        },
        {
          /*
           * The two the school has no photograph of yet, kept as a plain list
           * so the page still says the campus has them.
           */
          blockType: 'featureList',
          heading: 'Also on the campus',
          accentWord: 'campus',
          headingLevel: 'h2',
          marker: 'tick',
          columns: '2-centre',
          background: 'sea',
          items: [
            {
              title: 'Pure vegetarian canteen',
              description: 'Hygienic, purely vegetarian food prepared on campus.',
              icon: 'canteen',
            },
            {
              title: 'Clean and hygienic washrooms',
              description: 'Child-height fittings, cleaned and checked through the day.',
              icon: 'hygiene',
            },
            {
              title: 'Secure, child-friendly campus',
              description: 'Monitored entry and child-safe infrastructure throughout.',
              icon: 'security',
            },
          ],
        },
        {
          blockType: 'gallery',
          heading: 'A day in the Kindergarten',
          accentWord: 'Kindergarten',
          headingLevel: 'h2',
          layout: 'bento',
          perPage: '0',
          background: 'white',
          images: [
            ...shot(img.activityLiteracy, 'Worksheets and number work in the early years'),
            ...shot(img.drawingClass, 'Quiet, focused work at every desk'),
            ...shot(img.activityCreative, 'Finger painting and activity-based learning'),
            ...shot(img.activityMotor, 'Hands-on work the whole class makes together'),
            ...shot(img.childrenTogether, 'Friendships that start in the earliest years'),
            ...shot(img.activityTable, 'A Kindergarten class at the activity table'),
          ],
        },
      ],
    },

    // -------------------------------------------------------- CAMPUS GALLERY
    /*
     * Every photograph the Kindergarten page already shows, gathered onto the
     * page the menu points at.
     *
     * The pictures were spread across three sections — the facilities row, the
     * programme cards and the Holistic Development band — where each one is a
     * small illustration of the point beside it. A parent who wants to SEE the
     * place had nowhere to go: About > Campus Gallery led to an empty
     * placeholder. Same photographs, shown at a size worth looking at.
     *
     * Deliberately not a fresh set: these are what SIWS has sent. Adding more
     * later is a line each here, or an editor dropping them into the block.
     */
    {
      slug: 'gallery',
      title: 'Campus Gallery',
      intro:
        'A look around the Kindergarten section — the classrooms, the play area and the children at work.',
      showInNav: true,
      navLabel: 'Campus Gallery',
      navOrder: 3,
      metaDescription:
        'Photographs of the SIWS Kindergarten section in Wadala — classrooms, play area, activities and the children at work.',
      layout: [
        {
          blockType: 'gallery',
          heading: 'The Kindergarten Experience',
          accentWord: 'Experience',
          headingLevel: 'h2',
          layout: 'bento',
          background: 'white',
          images: [
            ...shot(img.classroomActivity, 'Spacious, well-ventilated classrooms'),
            ...shot(img.playArea, 'Safe play and activity area'),
            ...shot(img.classroomGroup, 'Group tables sized for young children'),
            ...shot(img.teacherWithChildren, 'Supportive and trained school staff'),
            ...shot(img.classroomSeated, 'Dedicated activity rooms'),
            ...shot(img.smartBoard, 'Interactive smart boards in every classroom'),
            ...shot(img.drawingClass, 'Quiet, focused work at every desk'),
            ...shot(img.activityLiteracy, 'Early literacy and numeracy'),
            ...shot(img.activityCreative, 'Creative expression'),
            ...shot(img.activityMotor, 'Cognitive and motor development'),
            ...shot(img.childrenTogether, 'Holistic development beyond the classroom'),
          ],
        },
      ],
    },

    // -------------------------------------------------------------- TEACHERS
    {
      slug: 'teachers',
      title: 'Our teachers',
      intro:
        'Our teachers and staff have between 18 and 30 years of experience with young children.',
      showInNav: true,
      navLabel: 'Teachers',
      navOrder: 8,
      metaDescription:
        'Meet the Kindergarten teaching team at SIWS — qualified early childhood educators with 18 to 30 years of experience.',
      layout: [
        {
          blockType: 'faculty',
          heading: 'Meet the team',
          headingLevel: 'h2',
          showQualifications: true,
          background: 'white',
          intro: richText([
            'Patient, trained educators who understand early childhood development.',
          ]),
        },
      ],
    },

    /* ------------------------------------------------ RULES AND UNIFORM ---
     *
     * Written from the guidelines SIWS supplied, and split into the two things
     * a parent actually comes here to do: find out what to buy, and find out
     * what is expected of them.
     *
     * THE RULES ARE CARDS WITH TITLES, not the numbered sentences as supplied.
     * Seven sentences of near-identical length set as a list is a wall — a
     * parent looking for the attendance requirement has to read six other
     * rules to find it. Giving each one a two- or three-word title puts the
     * subject first, so the page can be scanned and the sentence read only
     * once the right rule has been found. The wording of each rule is
     * otherwise the school's own.
     *
     * "Pupil" is not used, here or anywhere else on the site, per SIWS's
     * instruction of 2026-08-27. The supplied text says "pupils"; this says
     * "children", which is what the rest of the Kindergarten section says.
     */
    {
      slug: 'school-rules',
      title: 'Rules, Discipline & Uniform',
      intro:
        'What children wear to school, and what we ask of families to keep the day running smoothly.',
      showInNav: true,
      navLabel: 'Rules & Uniform',
      navOrder: 9,
      metaDescription:
        'The Kindergarten uniform at SIWS Wadala — girls, boys, P.T. days and footwear — and the general school rules on attendance, punctuality, recess food and safety.',
      layout: [
        /*
         * Four cards, which the row-fill logic lays out as a single row of
         * four on a large screen and a two-by-two block below that — even
         * either way, with no stretched card at the end.
         *
         * No icons. The icon set runs to classrooms, laboratories and sports
         * pitches; there is nothing in it for a frock, a shirt or a shoe, and
         * a card labelled "Girls" under a picture of a school building is
         * worse than a card with no picture at all.
         */
        {
          blockType: 'featureList',
          heading: 'The uniform',
          accentWord: 'uniform',
          headingLevel: 'h2',
          layout: 'cards',
          background: 'white',
          intro: richText([
            'Terrycot, in lemon yellow and mehendi green. The same cloth for both, so a class photograph reads as one group.',
          ]),
          items: [
            {
              title: 'Girls',
              description:
                'A terrycot frock in lemon yellow and mehendi green, with checks and dots.',
            },
            {
              title: 'Boys',
              description:
                'A lemon yellow terrycot shirt with dots, and mehendi green checked half pants.',
            },
            {
              title: 'P.T. uniform',
              description: 'Worn every Wednesday, in place of the regular uniform.',
            },
            {
              title: 'Footwear',
              description:
                'All-season black shoes with a Velcro strap, and lemon yellow socks with stripes.',
            },
          ],
        },
        /*
         * Numbered cards on the tinted ground, so the two sections of this
         * page do not read as one long run of white boxes. Seven falls as four
         * then three, and the second row widens to fill the line.
         */
        {
          blockType: 'featureList',
          heading: 'General rules',
          accentWord: 'rules',
          headingLevel: 'h2',
          layout: 'cards',
          marker: 'number',
          background: 'tint',
          intro: richText([
            'These apply through the year. Anything you are unsure about, the school office will answer.',
          ]),
          items: [
            {
              title: 'Diary and identity card',
              description:
                'Every child must carry the school diary and the identity card to school daily.',
            },
            {
              title: 'Arriving on time',
              description: 'Parents must ensure that their child reaches school on time.',
            },
            {
              title: 'Fees',
              description: 'Parents are advised to remit the fees for the whole year.',
            },
            {
              title: 'Attendance',
              description:
                'A minimum attendance of 75% of the total number of working days is required of every child.',
            },
            {
              title: 'No gold ornaments',
              description:
                'Children are requested not to wear any gold ornaments, for the sake of their personal safety.',
            },
            {
              title: 'Food at recess',
              description:
                'Children should bring only dry food for recess. Please avoid oily and liquid food.',
            },
            {
              title: 'School property',
              description:
                'Any damage to school property — inside or outside the classrooms, or anywhere within the school premises — is to be made good by those responsible, or by their parents.',
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------------ ADMISSIONS
    {
      slug: 'admissions',
      title: 'Admissions',
      intro:
        'Admissions for Jr. KG and Sr. KG are open for the 2026–27 academic year. Seats are limited.',
      showInNav: true,
      navLabel: 'Admissions',
      navOrder: 10,
      metaDescription:
        'Kindergarten admissions at SIWS Wadala for 2026–27. Eligibility, the application process and how to enquire.',
      layout: [
        {
          blockType: 'featureList',
          heading: 'Who can apply',
          accentWord: 'Who',
          headingLevel: 'h2',
          marker: 'tick',
          columns: '2-centre',
          background: 'white',
          items: [
            { title: 'Jr. KG', description: 'Your child should be 4 years or above.' },
            { title: 'Sr. KG', description: 'Your child should be 5 years or above.' },
          ],
        },
        {
          /**
           * Corrected against SIWS's answer. The earlier version described an
           * online-first flow ending in "the team will guide you through the
           * forms". SIWS applies **in November, on paper, at the school** — a
           * parent who took the old wording literally could have missed the
           * window entirely.
           */
          blockType: 'featureList',
          heading: 'How admission works',
          headingLevel: 'h2',
          marker: 'number',
          columns: '1',
          background: 'sea',
          items: [
            {
              title: 'The process opens in November',
              description:
                'Admissions for the next academic year begin in November. It is worth contacting us before then so we can tell you when forms are available.',
            },
            {
              title: 'Collect and submit the form at the school',
              description:
                'Admission forms are handled in person at the school office, not online.',
            },
            {
              title: 'Send us an enquiry any time',
              description:
                'Fill in the enquiry form on this website and the admissions team will contact you and guide you through what is needed.',
            },
            {
              title: 'Visit the campus',
              description: 'Come and see the classrooms and play areas, and meet the teachers.',
            },
          ],
        },
        {
          blockType: 'featureList',
          heading: 'Timings and attendance',
          accentWord: 'Timings',
          headingLevel: 'h2',
          marker: 'tick',
          columns: '2-centre',
          background: 'white',
          items: [
            { title: 'Jr. KG', description: '11.00 a.m. to 1.00 p.m.' },
            { title: 'Sr. KG', description: '2.00 p.m. to 5.00 p.m.' },
            {
              title: 'Attendance',
              description: 'We ask for a minimum of 75% attendance across the year.',
            },
            {
              title: 'Punctuality and regularity',
              description:
                'Coming in on time and every day matters a great deal at this age — routine is much of what the early years are teaching.',
            },
          ],
        },
        {
          /**
           * The first fee figure SIWS has given for any unit. Published as
           * supplied, with the period left unstated because their document
           * does not give one — see the warning at the end of this seed. A
           * guessed "per year" on a fee page is the kind of error a family
           * plans their finances around.
           */
          blockType: 'featureList',
          heading: 'Fees',
          accentWord: 'Fees',
          headingLevel: 'h2',
          marker: 'tick',
          columns: '1',
          background: 'sea',
          items: [
            {
              title: 'Jr. KG and Sr. KG — ₹65,000',
              description:
                'Please confirm the current fee, what it covers and how it is paid with the school office before you apply.',
            },
          ],
        },
        {
          blockType: 'accordion',
          heading: 'Admissions questions',
          headingLevel: 'h2',
          background: 'sea',
          allowMultipleOpen: true,
          items: [
            {
              question: 'What age does my child need to be?',
              answer: richText([
                'Age criteria are set for each academic year in line with State Board rules. Please contact the admissions team for the exact dates that apply to your child.',
              ]),
            },
            {
              question: 'Which documents will I need?',
              answer: richText([
                'Usually your child’s birth certificate, recent photographs, proof of address and, where applicable, a transfer certificate. The admissions team will confirm the full list.',
              ]),
            },
            {
              question: 'Is there an entrance test for kindergarten?',
              answer: richText([
                'No. There is no entrance test at kindergarten level. Admission is based on age eligibility and seat availability.',
              ]),
            },
          ],
        },
      ],
    },
  ]

  // -- Faculty (FR-FAC-01) -------------------------------------------------
  let facultyCreated = 0
  let facultyUpdated = 0

  for (const [index, teacher] of FACULTY.entries()) {
    const existing = await payload.find({
      collection: 'faculty',
      where: { and: [{ name: { equals: teacher.name } }, { unit: { equals: kg.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const data = {
      ...teacher,
      unit: kg.id,
      order: index + 1,
      _status: 'published',
      reviewStatus: 'approved',
    }

    if (existing.docs[0]) {
      await payload.update({
        collection: 'faculty',
        id: existing.docs[0].id,
        data: data as never,
        overrideAccess: true,
      })
      facultyUpdated += 1
    } else {
      await payload.create({ collection: 'faculty', data: data as never, overrideAccess: true })
      facultyCreated += 1
    }
  }

  payload.logger.info(`Faculty — ${facultyCreated} created, ${facultyUpdated} updated.`)

  // The contact page was seeded above, before the rest, so it counts here.
  let created = contact.created ? 1 : 0
  let updated = contact.created ? 0 : 1

  const idBySlug = new Map<string, number>([['contact', contact.id as number]])

  /*
   * The first pass goes in WITHOUT the cross-links.
   *
   * `link.ts` requires a real page relation on an internal link, so a
   * placeholder cannot be written and then patched — validation rejects the
   * page outright and nothing gets seeded at all. Any button carrying a marker
   * is therefore dropped for this pass and put back by the next one, a moment
   * later, pointing at a page that now exists.
   */
  const stripMarkers = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value
        .filter((entry) => !JSON.stringify(entry ?? null).includes('__linkTo'))
        .map(stripMarkers)
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          stripMarkers(item),
        ]),
      )
    }
    return value
  }

  for (const page of pages) {
    const result = await upsertPage({
      ...page,
      layout: stripMarkers(page.layout) as SeedPage['layout'],
    })
    idBySlug.set(page.slug, result.id as number)
    if (result.created) created += 1
    else updated += 1
  }

  /*
   * SECOND PASS: point the cross-links at the pages they name.
   *
   * A link on this site is a RELATION to a page, not a URL — `link.ts` rejects
   * a relative address outright, which is the right call: a typed path goes
   * stale silently the moment a slug changes, where a broken relation shows up
   * the moment anybody looks. The catch is that these pages link to each
   * other, and none of their ids exist until the loop above has run.
   *
   * So the layouts go in carrying `LINK_TO('/kindergarten/news')` markers and
   * are rewritten here, once every id is known. A marker whose page cannot be
   * found is reported rather than published as a dead button.
   */
  /*
   * Some of the pages linked to are not created here.
   *
   * The Download Centre is one of `seed:nav`'s placeholders, and the SIWS
   * gallery belongs to the portal rather than to any section — both are real,
   * published pages that this seed simply does not own. Looking the whole
   * Kindergarten set up from the database, plus the portal's gallery, means a
   * link resolves if the page exists at all, whoever made it.
   */
  const { docs: existingPages } = await payload.find({
    collection: 'pages',
    where: { unit: { equals: kg.id } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })
  for (const doc of existingPages as { id: number; slug: string }[]) {
    if (!idBySlug.has(doc.slug)) idBySlug.set(doc.slug, doc.id)
  }

  const { docs: portalGallery } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'gallery' } }, { unit: { exists: false } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  // The portal's gallery, filed under a key the marker path resolves to.
  if (portalGallery[0]) idBySlug.set('__portal-gallery', portalGallery[0].id as number)

  const unresolved: string[] = []

  const resolveLinks = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      /*
       * A marker that cannot be resolved takes its whole entry with it. A
       * `reference` of null fails validation exactly as the marker did, so
       * the choice is between dropping the button and failing the seed.
       */
      return value
        .filter((entry) => {
          const raw = JSON.stringify(entry ?? null)
          if (!raw.includes('__linkTo')) return true
          const marker = raw.match(/"__linkTo":"([^"]+)"/)?.[1] ?? ''
          const parts = marker.split('/').filter(Boolean)
          const slug =
            parts.length === 1 && parts[0] === 'gallery' ? '__portal-gallery' : (parts.pop() ?? '')
          if (idBySlug.has(slug)) return true
          unresolved.push(marker)
          return false
        })
        .map(resolveLinks)
    }
    if (value && typeof value === 'object') {
      const marker = (value as { __linkTo?: string }).__linkTo
      if (typeof marker === 'string') {
        // The last segment is the slug: '/kindergarten/news' -> 'news',
        // '/gallery' -> 'gallery'. No regex, nothing to escape.
        /*
         * '/gallery' with no section in front of it is the PORTAL's gallery —
         * the Kindergarten's own is '/kindergarten/gallery'. Without this the
         * two collapse to the same slug and the Achievements page's link to
         * the whole-group wall would quietly point at the section's own.
         */
        const parts = marker.split('/').filter(Boolean)
        const slug =
          parts.length === 1 && parts[0] === 'gallery' ? '__portal-gallery' : (parts.pop() ?? '')
        const id = idBySlug.get(slug)
        if (id === undefined) {
          unresolved.push(marker)
          return null
        }
        return { relationTo: 'pages', value: id }
      }
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          resolveLinks(item),
        ]),
      )
    }
    return value
  }

  for (const page of pages) {
    const raw = JSON.stringify(page.layout ?? [])
    if (!raw.includes('__linkTo')) continue
    const id = idBySlug.get(page.slug)
    if (id === undefined) continue
    await payload.update({
      collection: 'pages',
      id,
      data: { layout: resolveLinks(page.layout) } as never,
      overrideAccess: true,
    })
    payload.logger.info(`Resolved cross-links on: ${page.title}`)
  }

  if (unresolved.length > 0) {
    payload.logger.warn(
      `These links point at pages this seed does not create, so they were dropped rather than published as dead buttons: ${[...new Set(unresolved)].join(', ')}.`,
    )
  }

  payload.logger.info(`Kindergarten seed complete — ${created} created, ${updated} updated.`)

  payload.logger.warn('TO CONFIRM WITH SIWS (Kindergarten):')
  for (const question of [
    'FEE PERIOD — the fee is given as "Jr.KG & Sr.KG 65K" with no period. The page publishes ₹65,000 and asks families to confirm with the office, because a guessed "per year" is what a family plans around. Is it annual, per term, or something else? Does it include any other charge?',
    'CAMPUS — the endowment register names a K.G. Section at Wadala and one at Matunga, but this document does not say which campus these five teachers and these timings belong to. No campus is recorded against any of them. Does Matunga have its own KG team and timings?',
    'TESTIMONIAL — the parent’s full name is published as supplied. Please confirm SIWS holds that parent’s permission to publish it (DPDPA 2023), or we will shorten it to an initial.',
    'DAY CARE — left blank in the document. Wadala Primary answered "Not applicable". Does the KG section offer after-school care?',
  ]) {
    payload.logger.warn(`  • ${question}`)
  }

  payload.logger.warn(
    'STILL TO COME: classroom and facility photographs beyond those already uploaded, event videos, alumni achievements, press mentions, certifications, social media handles beyond WhatsApp/Instagram/Facebook, and the legal documents.',
  )
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Kindergarten seed failed:', error)
    process.exit(1)
  })
