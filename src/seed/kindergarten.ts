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
  const stem = filename.replace(/\.[^.]+$/, "")
  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { like: stem + "-%" } },
    sort: 'id',
    limit: 10,
    depth: 0,
    overrideAccess: true,
  })
  const suffixed = docs.find(
    (d) => String(d.filename).replace(/-\d+(\.[^.]+)$/, "$1") === filename,
  )
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
    // Portrait, and the only play-area shot that is — it fills the frame whole.
    slide: await mediaByFilename(payload, 'pre-primary-section-classroom-campus-images-5.jpg'),
  }

  const missing = Object.entries(img).filter(([, id]) => id === null).map(([name]) => name)
  if (missing.length > 0) {
    payload.logger.warn(
      `Some photographs are not in the media library yet (${missing.join(', ')}). Run \`npm run seed:media\` first for the full page.`,
    )
  }

  /** Gallery entry, skipped entirely when the image is absent. */
  const shot = (id: number | null, caption: string) =>
    id === null ? [] : [{ image: id, caption }]

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
        subtitle: 'SSC Board | Safe | Value-Based Education',
        benefitsIntro: 'At SIWS, your child benefits from:',
        benefits: [
          { text: 'Strong academic foundations (SSC Board)' },
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
            description:
              'For enquiries about Jr. KG and Sr. KG admission — admissions@siws.edu.in',
          },
          {
            title: 'General enquiries',
            description: 'For anything else — info@siws.edu.in, +91 98927 03893',
          },
        ],
      },
    ],
  })

  const pages: SeedPage[] = [
    // ---------------------------------------------------------------- HOME
    {
      slug: 'home',
      title: 'SIWS Kindergarten, Wadala',
      metaDescription:
        'Wadala’s most trusted kindergarten since 1934. SSC Board, safe and value-based early education for Jr. KG and Sr. KG. Admissions open for 2026–27.',
      layout: [
        {
          blockType: 'hero',
          title: 'Wadala’s Most Trusted Kindergarten Since 1934',
          accentWord: 'Most Trusted',
          eyebrow: 'SSC Board | Safe | Value-Based Education',
          // Plain string: the hero's `intro` is a textarea, not rich text.
          intro:
            'Strong academic foundations on the SSC Board, a structured early-learning approach, and a safe, nurturing and child-friendly campus — with a focus on discipline, values and confidence.',
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
         * photographs, followed by the facilities written out as text.
         *
         * Split into two blocks rather than one grid of captioned cards because
         * the facilities list must stay readable when the photographs are not —
         * a visitor on a slow connection, or one who cannot see the images, still
         * gets the full list of what the campus has.
         */
        {
          blockType: 'gallery',
          heading: 'Campus and Facilities',
          accentWord: 'Facilities',
          headingLevel: 'h2',
          layout: 'carousel',
          background: 'white',
          intro: richText(['A child-friendly campus in Wadala.']),
          images: [
            ...shot(img.classroomActivity, 'Spacious, well-ventilated classrooms'),
            ...shot(img.playArea, 'Safe play and activity area'),
            ...shot(img.classroomGroup, 'Group tables sized for young children'),
            ...shot(img.teacherWithChildren, 'Supportive and trained school staff'),
            ...shot(img.classroomSeated, 'Dedicated activity rooms'),
            /*
             * The canteen tray and the washroom tap came off this row at the
             * school's request (2026-08-25). Both are also the two the media
             * seed flags as not looking like SIWS's own photography, so they
             * were the weakest of the nine either way. They stay in the
             * library, and the facilities LIST below still names both.
             */
            ...shot(img.smartBoard, 'Interactive smart boards in every classroom'),
            ...shot(img.drawingClass, 'Quiet, focused work at every desk'),
          ],
        },
        /*
         * Cards rather than a two-column tick list.
         *
         * Seven ticks of equal weight gave the eye nothing to land on, so a
         * parent had to read all seven to find the one they came for. A card
         * with a picture on it can be recognised before it is read, which is
         * the whole point of a facilities list.
         *
         * Seven items falls as four cards then three, and the renderer widens
         * the last row so it fills the line rather than trailing off.
         */
        {
          blockType: 'featureList',
          heading: 'What the campus offers',
          headingLevel: 'h3',
          layout: 'cards',
          background: 'white',
          items: [
            {
              title: 'Spacious & Well-Ventilated Classrooms',
              description: 'Bright, airy rooms designed for young learners.',
              icon: 'classroom',
            },
            {
              title: 'Secure & Child-Friendly Campus',
              description: 'Monitored entry and child-safe infrastructure throughout.',
              icon: 'security',
            },
            {
              title: 'Safe Play & Activity Area',
              description: 'Supervised space for games and structured play.',
              icon: 'play',
            },
            {
              title: 'Dedicated Activity Rooms',
              description: 'Separate spaces for art, music and hands-on learning.',
              icon: 'activity',
            },
            {
              title: 'Pure Veg Canteen',
              description: 'Hygienic, purely vegetarian food prepared on campus.',
              icon: 'canteen',
            },
            {
              title: 'Clean & Hygienic Washrooms',
              description: 'Child-height fittings, cleaned and checked through the day.',
              icon: 'hygiene',
            },
            {
              title: 'Supportive & Trained School Staff',
              description: 'Attentive staff experienced with early years children.',
              icon: 'staff',
            },
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
          columns: '2',
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
          columns: '2',
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
          columns: '2',
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
          columns: '2',
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

  for (const page of pages) {
    const result = await upsertPage(page)
    if (result.created) created += 1
    else updated += 1
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
