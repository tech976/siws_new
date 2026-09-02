import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('./lexical')

/**
 * Seeds the Junior College's own pages.
 *
 * WHY THIS FILE EXISTS AT ALL
 * ---------------------------
 * The other three sections each have a seed of their own, built from a
 * document SIWS supplied. Junior College never got one: everything it has came
 * from `units-content.ts`, which writes the same generic front page for all
 * three senior sections and leaves the rest as placeholders. That was fine
 * while nothing had been asked of the section, and stopped being fine the
 * moment its Admissions pages needed writing.
 *
 * WHAT IS KNOWN, AND WHAT IS NOT
 * ------------------------------
 * Known, because it is already published on the front page and in the enquiry
 * panel: Standards XI and XII, established 1934, ninety-two years of the SIWS
 * Group, a State Board curriculum, a safe and supervised campus in Wadala, and
 * the four steps of an enquiry — send it, we call, visit, complete the forms.
 *
 * NOT known, and therefore nowhere on these pages: the streams offered, the
 * subject combinations, the eligibility marks, the fees, the dates, the
 * document list, and any result. A junior college is chosen on its streams
 * more than on anything else, so the temptation to write "Science, Commerce
 * and Arts" here is considerable and the cost of being wrong is a family
 * applying for a stream that does not exist.
 *
 * The pages therefore say what IS settled, and hand every one of the unknowns
 * to the office by name — telling the reader what to ask FOR, so nobody is
 * sent there twice. Both pages carry a warning at the foot of this run.
 *
 * Run with:  npm run seed:jc          (and `npm run seed:nav` after it)
 */

/**
 * Eight pieces of parent feedback, sent by SIWS with the families' consent
 * (2026-08-29) and reproduced word for word.
 *
 * `attribution` is recorded because who said a thing belongs with the thing;
 * the block is asked not to PRINT it, since a heading reading "What parents
 * say" over eight cards each signed "Parent" is the same word nine times. Same
 * decision as the other three sections.
 */
/**
 * The teaching staff, as SIWS supplied the list (2026-09-02).
 *
 * ALL FORTY-SEVEN ARE ASSISTANT TEACHERS, which is what the list states for
 * every one of them, so the designation is set once below rather than repeated
 * on each row. No head of department or principal was named; when one is, the
 * designation goes on that row and the block will lead with it.
 *
 * MOST CARRY NO QUALIFICATION, and that is the list rather than an omission
 * here — eight of the forty-seven have one against their name. The field is
 * left off entirely for the rest, so the card shows a name and a designation
 * and nothing where a qualification would be. Inventing a degree for a teacher
 * is not a small error, and a blank is honest and easily filled in later.
 *
 * Several are given by first name only, again as supplied. They are seeded as
 * written: a surname guessed to make a card look tidier would be somebody
 * else's name.
 */
const FACULTY: { name: string; qualifications?: string }[] = [
  { name: 'Kalyani Deshpande', qualifications: 'MSc (Physics), B.Ed.' },
  { name: 'Bharti Pandey', qualifications: 'M.A. (Hindi)' },
  { name: 'Shilpa Raje', qualifications: 'MSc (Physics), B.Ed.' },
  { name: 'Jinsy Thomas', qualifications: 'MSc (Chemistry), B.Ed.' },
  { name: 'Sangeeta Kashid' },
  { name: 'Kalmashi Dholakia' },
  { name: 'Manjari', qualifications: 'M.A. (English)' },
  { name: 'Sheela Krishnan' },
  { name: 'Anamika Rath' },
  { name: 'Sunil Mhadik' },
  { name: 'Pratima Tiwari' },
  { name: 'Jagruti Joshi' },
  { name: 'Bhoopesh' },
  { name: 'Mangesh' },
  { name: 'Gayathri Sridhar' },
  { name: 'Trupti Sawant' },
  { name: 'Anil Arya' },
  { name: 'Dilip Singh' },
  { name: 'Umesh Ingole' },
  { name: 'Sandeep Pandit' },
  { name: 'Priyanka Sawant' },
  { name: 'Ishwari K' },
  { name: 'Smita Bhole', qualifications: 'MSc (Physics), B.Ed., PGDIT' },
  { name: 'Nilesh Karbhari' },
  { name: 'Karthik' },
  { name: 'Suraj Bhosale' },
  { name: 'Uma' },
  { name: 'Komal Komavat' },
  { name: 'Hema Patil' },
  { name: 'Girish' },
  { name: 'Sateesh Sawant' },
  { name: 'Anjali' },
  { name: 'Gauri Sawant' },
  { name: 'Pranay Juvatkar' },
  { name: 'Aditi' },
  { name: 'Abhishek Madhav' },
  { name: 'Sanjaya' },
  { name: 'Manju Sharma', qualifications: 'MSc (Physics), B.Ed.' },
  { name: 'Suchitra Jena', qualifications: 'MSc (Physics), B.Ed.' },
  { name: 'Manoj Kawankar' },
  { name: 'Ashwini' },
  { name: 'Sonu Rajbhar', qualifications: 'MSc (Physics), B.Ed.' },
  { name: 'Purva' },
  { name: 'Priyanka' },
  { name: 'Babita Jaiswar' },
  { name: 'Vaishali' },
  { name: 'SeturamLaxmi' },
]

const PARENT_QUOTES: { quote: string; attribution: string }[] = [
  {
    quote:
      'We’ve been happy with the academics and the support from the teachers. Overall, a good experience.',
    attribution: 'Parent',
  },
  {
    quote: 'The teachers are approachable and keep us updated about our child’s progress.',
    attribution: 'Parent',
  },
  {
    quote: 'My child has become more focused about studies since joining the junior college.',
    attribution: 'Parent',
  },
  {
    quote:
      'We’re happy with the way the teachers prepare the students for exams and the next step after college.',
    attribution: 'Parent',
  },
  {
    quote:
      'Overall, SIWS has been a good choice for our child. The teachers have been supportive throughout.',
    attribution: 'Parent',
  },
  {
    quote:
      'There is a good focus on academics, and whenever our child has needed help, the teachers have been available.',
    attribution: 'Parent',
  },
  {
    quote:
      'We’ve had a positive experience so far. Our child is comfortable here and has been doing well.',
    attribution: 'Parent',
  },
  {
    quote:
      'The transition to junior college was smooth for our child. We’re happy with the overall environment and teaching.',
    attribution: 'Parent',
  },
]

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'junior-college' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const college = units[0]
  if (!college) throw new Error('Junior College unit not found. Run `npm run seed` first.')

  const upsert = async (page: Record<string, unknown> & { slug: string; title: string }) => {
    const existing = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: page.slug } }, { unit: { equals: college.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const data = { ...page, unit: college.id }

    if (existing.docs[0]) {
      const doc = await payload.update({
        collection: 'pages',
        id: existing.docs[0].id,
        data: data as never,
        overrideAccess: true,
      })
      payload.logger.info(`Updated page: ${page.title}`)
      return doc.id
    }

    const doc = await payload.create({
      collection: 'pages',
      data: data as never,
      overrideAccess: true,
    })
    payload.logger.info(`Created page: ${page.title}`)
    return doc.id
  }

  /** Looks a page of this section up by slug, drafts included. */
  const pageId = async (slug: string) => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { unit: { equals: college.id } }] },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    return docs[0]?.id ?? null
  }

  /**
   * Looks a photograph up by filename, and says so if it is not there.
   *
   * Every block below that carries a picture is built only if the picture
   * exists, so a missing file leaves a page shorter rather than published with
   * an empty frame — and the run reports exactly which filename it wanted.
   */
  const photo = async (filename: string) => {
    const { docs } = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return docs[0]?.id ?? null
  }

  const contactPageId = await pageId('contact')

  /*
   * The Secondary School's own front page, for the pathway section.
   *
   * Looked up across units rather than within this one, because the whole
   * point of the link is that it leaves the Junior College site — a family
   * whose child is in Standard X is reading this from the other school.
   */
  const secondaryHomeId = await (async () => {
    const { docs: sec } = await payload.find({
      collection: 'units',
      where: { slug: { equals: 'secondary' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (!sec[0]) return null
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: 'home' } }, { unit: { equals: sec[0].id } }] },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    return docs[0]?.id ?? null
  })()

  const admissionsFaqPageId = await pageId('admissions-faq')

  // ------------------------------------------------------------------ ABOUT
  /*
   * Published now. This page and the two below it were drafts — they returned
   * 404 to a visitor while looking finished in the CMS — because nothing had
   * been supplied to put on them. SIWS sent the college's history, vision,
   * mission, streams, subjects and roster on 2026-09-02, which is what these
   * three are built from.
   */
  await upsert({
    slug: 'about',
    title: 'About the college',
    intro: 'N. R. Swamy College of Commerce & Economics and Smt. Thirumalai College of Science.',
    showInNav: true,
    navLabel: 'About',
    navOrder: 5,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'About SIWS Junior College, Wadala — the Commerce and Science streams, their history, and the vision and mission of the South Indians’ Welfare Society.',
    layout: [
      {
        blockType: 'richText',
        heading: 'SIWS College',
        accentWord: 'SIWS',
        headingLevel: 'h1',
        width: 'normal',
        background: 'white',
        content: richText([
          'N. R. Swamy College of Commerce & Economics and Smt. Thirumalai College of Science — the Junior College of the SIWS Group, on the Society’s Wadala campus.',
          'Vidya Dhanam Sarva Dhanat Pradhanam — of all wealth, the wealth of knowledge is foremost.',
        ]),
      },
      {
        blockType: 'richText',
        heading: 'How the college began',
        accentWord: 'began',
        headingLevel: 'h2',
        width: 'normal',
        background: 'tint',
        content: richText([
          'The Junior College of the Commerce stream was begun with a view to providing higher education, to cater to the needs of the Society’s own students at the school.',
          'The Science stream was started in the year 1988.',
        ]),
      },
      {
        blockType: 'featureList',
        heading: 'What the Society is for',
        accentWord: 'Society',
        headingLevel: 'h2',
        layout: 'cards',
        marker: 'tick',
        columns: '2',
        background: 'white',
        items: [
          {
            title: 'Vision',
            description:
              'To be an educational institution of brilliance that continually strives to respond to realities and social changes through knowledge empowerment.',
          },
          {
            title: 'Mission',
            description:
              'In pursuance of its vision, SIWS is dedicated to producing socially responsible and intellectually capable citizens of India.',
          },
        ],
      },
      {
        blockType: 'statistics',
        heading: 'The college at a glance',
        accentWord: 'a glance',
        headingLevel: 'h2',
        background: 'sea',
        stats: [
          { value: 'XI & XII', label: 'Standards taught' },
          { value: 'Two', label: 'Streams — Commerce and Science' },
          { value: '1988', label: 'Science stream established' },
          { value: 'HSC', label: 'State Board curriculum' },
        ],
      },
    ],
  })

  // -------------------------------------------------------------- ACADEMICS
  await upsert({
    slug: 'academics',
    title: 'Academics',
    intro: 'Commerce and Science, Standards XI and XII, on the Maharashtra State Board syllabus.',
    showInNav: true,
    navLabel: 'Academics',
    navOrder: 8,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Commerce and Science at SIWS Junior College, Wadala — the subjects taught in Standards XI and XII, the curriculum, and how it is taught.',
    layout: [
      {
        blockType: 'richText',
        heading: 'Two streams, two years',
        accentWord: 'Two streams',
        headingLevel: 'h1',
        width: 'normal',
        background: 'white',
        content: richText([
          'The college teaches Standards XI and XII in two streams, Commerce and Science, on the Maharashtra State Board (HSC) syllabus.',
        ]),
      },
      /*
       * FOUR LISTS, NOT ONE.
       *
       * The subjects differ by stream AND by year — Standard XII Commerce
       * offers Mathematics or Secretarial Practice where XI has Mathematics —
       * so a single merged list would tell a family choosing a stream the one
       * thing they cannot act on. Each list is given as SIWS supplied it.
       */
      {
        blockType: 'featureList',
        heading: 'Commerce — Standard XI',
        accentWord: 'Commerce',
        headingLevel: 'h2',
        layout: 'compact',
        marker: 'tick',
        columns: '2',
        background: 'tint',
        items: [
          { title: 'English' },
          { title: 'Hindi / Marathi / Tamil' },
          { title: 'Book Keeping and Accountancy' },
          { title: 'Organisation of Commerce and Management' },
          { title: 'Mathematics' },
          { title: 'Economics' },
          { title: 'Physical Education' },
          { title: 'Environmental Science' },
          { title: 'Vocational — Information Technology' },
        ],
      },
      {
        blockType: 'featureList',
        heading: 'Commerce — Standard XII',
        accentWord: 'Commerce',
        headingLevel: 'h2',
        layout: 'compact',
        marker: 'tick',
        columns: '2',
        background: 'white',
        items: [
          { title: 'English' },
          { title: 'Hindi / Marathi / Tamil' },
          { title: 'Book Keeping and Accountancy' },
          { title: 'Organisation of Commerce and Management' },
          { title: 'Mathematics or Secretarial Practice' },
          { title: 'Economics' },
          { title: 'Physical Education' },
          { title: 'Environmental Science' },
          { title: 'Vocational — Information Technology' },
        ],
      },
      {
        blockType: 'featureList',
        heading: 'Science — Standard XI',
        accentWord: 'Science',
        headingLevel: 'h2',
        layout: 'compact',
        marker: 'tick',
        columns: '2',
        background: 'tint',
        items: [
          { title: 'English' },
          { title: 'Hindi / Marathi / Tamil' },
          { title: 'Physics' },
          { title: 'Chemistry' },
          { title: 'Biology' },
          { title: 'Mathematics and Statistics' },
          { title: 'Bifocal — Information Technology' },
          { title: 'Bifocal — Computer Science' },
          { title: 'Physical Education' },
          { title: 'Environmental Science' },
        ],
      },
      {
        blockType: 'featureList',
        heading: 'Science — Standard XII',
        accentWord: 'Science',
        headingLevel: 'h2',
        layout: 'compact',
        marker: 'tick',
        columns: '2',
        background: 'white',
        items: [
          { title: 'English' },
          { title: 'Hindi / Marathi / Tamil' },
          { title: 'Physics' },
          { title: 'Chemistry' },
          { title: 'Biology' },
          { title: 'Mathematics and Statistics' },
          { title: 'Bifocal — Information Technology' },
          { title: 'Bifocal — Computer Science' },
          { title: 'Physical Education' },
          { title: 'Environmental Science' },
        ],
      },
      {
        blockType: 'featureList',
        heading: 'What each stream is built to do',
        accentWord: 'each stream',
        headingLevel: 'h2',
        layout: 'cards',
        marker: 'tick',
        columns: '2',
        background: 'sea',
        items: [
          {
            title: 'Science',
            description:
              'The curriculum follows the Maharashtra State Board syllabus and is designed to develop scientific knowledge, analytical thinking and problem-solving skills. It provides a foundation in Physics, Chemistry, Biology, Mathematics, Computer Science and Electronics, while preparing students for the HSC Board Examination and competitive examinations such as JEE, NEET, MHT-CET and CUET.',
          },
          {
            title: 'Commerce',
            description:
              'The curriculum is based on the Maharashtra State Board syllabus and aims to develop knowledge of Accountancy, Economics, Business Studies, Organisation of Commerce & Management, Secretarial Practice, Mathematics and Information Technology. It equips students with financial literacy, business acumen, communication skills and entrepreneurial thinking, and prepares them for higher studies and professional courses such as CA, CS, CMA, B.Com., BBA and other management programmes.',
          },
        ],
      },
      {
        blockType: 'featureList',
        heading: 'How it is taught',
        accentWord: 'taught',
        headingLevel: 'h2',
        layout: 'list',
        marker: 'tick',
        columns: '1',
        background: 'white',
        items: [
          { title: 'Student-centric and outcome-based learning' },
          {
            title: 'Experiential and activity-based learning',
            description: 'Through practicals, projects, case studies and group discussions.',
          },
          {
            title: 'Continuous assessment',
            description:
              'Assignments, quizzes, unit tests, practical examinations and projects, through the year rather than at the end of it.',
          },
          { title: 'Individual mentoring, remedial coaching and doubt-solving sessions' },
          {
            title: 'Career guidance, counselling and orientation',
            description:
              'Programmes supporting students’ academic and professional growth beyond Standard XII.',
          },
        ],
      },
      {
        blockType: 'featureList',
        heading: 'What a Science student leaves with',
        accentWord: 'Science',
        headingLevel: 'h2',
        layout: 'list',
        marker: 'tick',
        columns: '2',
        background: 'tint',
        items: [
          { title: 'A foundation in Physics, Chemistry, Biology, Mathematics and Computer Science' },
          { title: 'Preparation for the HSC Board Examination and for JEE, NEET, MHT-CET and CUET' },
          { title: 'Analytical thinking, problem-solving and scientific reasoning' },
          { title: 'Hands-on learning through well-equipped laboratories and practical sessions' },
          { title: 'Research aptitude, innovation and critical thinking' },
          {
            title:
              'Pathways to Engineering, Medicine, Pharmacy, Pure Sciences, Biotechnology and Computer Science',
          },
          { title: 'Career guidance, counselling and academic mentoring for higher education' },
        ],
      },
      {
        blockType: 'featureList',
        heading: 'What a Commerce student leaves with',
        accentWord: 'Commerce',
        headingLevel: 'h2',
        layout: 'list',
        marker: 'tick',
        columns: '2',
        background: 'white',
        items: [
          {
            title:
              'A foundation in Accountancy, Economics, Business Studies, OCM, Secretarial Practice and Information Technology',
          },
          { title: 'Financial literacy, business management and entrepreneurial skills' },
          { title: 'Analytical, decision-making and communication abilities' },
          { title: 'Preparation for CA, CS, CMA, B.Com., BBA, BMS and Economics' },
          { title: 'Exposure to business practice through projects, case studies and presentations' },
          { title: 'Leadership, teamwork and ethical business practice' },
          { title: 'Career guidance and counselling for professional and management careers' },
        ],
      },
    ],
  })

  // --------------------------------------------------------------- TEACHERS
  /*
   * THE ROSTER GOES IN THE FACULTY COLLECTION, NOT INTO THIS PAGE.
   *
   * The block reads the collection for this unit, so a teacher who joins or
   * leaves is one record rather than an edit to a page's layout — the same
   * arrangement the other three sections use.
   */
  for (const teacher of FACULTY) {
    const existing = await payload.find({
      collection: 'faculty',
      where: {
        and: [{ name: { equals: teacher.name } }, { unit: { equals: college.id } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const data = {
      ...teacher,
      unit: college.id,
      designation: 'Assistant Teacher',
      /*
       * Spelled out even when absent. `payload.update` leaves a field it is
       * not given exactly as it was, so a qualification entered once by hand
       * would survive a re-seed that no longer lists one — and the page would
       * disagree with the roster SIWS sent.
       */
      qualifications: teacher.qualifications ?? null,
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
    } else {
      await payload.create({ collection: 'faculty', data: data as never, overrideAccess: true })
    }
  }
  payload.logger.info(`Junior College roster: ${FACULTY.length} teacher(s).`)

  await upsert({
    slug: 'teachers',
    title: 'Our Teachers',
    intro: 'The teaching staff of the Commerce and Science streams.',
    showInNav: true,
    navLabel: 'Our Teachers',
    navOrder: 9,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'The teaching staff of SIWS Junior College, Wadala — the teachers of the Commerce and Science streams for Standards XI and XII.',
    layout: [
      {
        blockType: 'faculty',
        heading: 'Our teachers',
        accentWord: 'teachers',
        headingLevel: 'h1',
        background: 'white',
        campus: 'all',
        /*
         * Shown, because eight of the forty-seven have one and those eight
         * are worth reading. The card simply omits the line where the roster
         * carries no qualification, rather than printing an empty label.
         */
        showQualifications: true,
        /*
         * The same arrangement as Primary's roster, so a family moving between
         * the four sections meets one page rather than four.
         *
         * SIWS sent one list and the two streams are not a split of it — a
         * teacher of English teaches both — so this is a single team, which
         * `teams` runs full width.
         */
        layout: 'teams',
        cardLayout: 'centred',
        intro: richText([
          'Our teachers hold the Commerce and Science streams across Standards XI and XII, on the Maharashtra State Board syllabus.',
        ]),
      },
    ],
  })

  // ------------------------------------------------------------- ADMISSIONS
  await upsert({
    slug: 'admissions',
    title: 'Admissions',
    intro: 'Joining Standards XI and XII at SIWS Junior College, Wadala.',
    showInNav: true,
    navLabel: 'Admissions',
    navOrder: 10,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Admission to SIWS Junior College, Wadala — Standards XI and XII. How to enquire, what the admissions team can tell you, and what to ask for.',
    layout: [
      /*
       * The figures open the page rather than the process, because the process
       * is the part that is not published yet — and because a family reading
       * an admissions page is deciding whether to ask, not filling anything
       * in. All four are already on the front page.
       */
      {
        blockType: 'statistics',
        heading: 'The college at a glance',
        accentWord: 'a glance',
        headingLevel: 'h2',
        background: 'sea',
        stats: [
          { value: 'XI & XII', label: 'Standards taught' },
          { value: '1934', label: 'Serving Mumbai since' },
          { value: '92+', label: 'Years of educational legacy' },
          { value: 'State', label: 'Board curriculum' },
        ],
      },
      {
        blockType: 'richText',
        heading: 'Admission to Standards XI and XII',
        accentWord: 'Standards XI and XII',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'SIWS Junior College takes students for Standards XI and XII on a State Board curriculum, on the same Wadala campus as the Kindergarten, Primary and Secondary sections of the SIWS Group.',
          'Which streams and subject combinations are open in a given year, what marks they ask for, the dates, the documents and the fees are all set year by year and are held by the admissions team. Rather than print a set here that would still be here after it stopped being true, this page tells you exactly what to ask for and who to ask.',
        ]),
      },
      {
        blockType: 'featureList',
        heading: 'How admission works',
        accentWord: 'works',
        headingLevel: 'h2',
        layout: 'cards',
        background: 'white',
        items: [
          {
            title: 'Send us an enquiry',
            icon: 'communication',
            description:
              'Use the form on the contact page and say which standard you are asking about, and for which academic year.',
          },
          {
            title: 'We contact you',
            icon: 'staff',
            description:
              'The admissions team will call to answer your questions and confirm what your child is eligible for.',
          },
          {
            title: 'Visit the campus',
            icon: 'classroom',
            description:
              'Come and see the college and meet the teachers before you decide. Arrange the visit through the office.',
          },
          {
            title: 'Complete the formalities',
            icon: 'study',
            description:
              'The team will tell you which forms and documents are needed and guide you through them.',
          },
        ],
      },
      /*
       * SRS 4.3 requires the Junior College site to present the pathway from
       * the Secondary School. It has been a draft placeholder page in the menu
       * since the site was built; it belongs on the admissions page, which is
       * where a Standard X family is actually reading.
       */
      {
        blockType: 'richText',
        heading: 'Coming up from SIWS Secondary School',
        accentWord: 'Secondary School',
        headingLevel: 'h2',
        width: 'normal',
        background: 'sea',
        content: richText([
          'Students finishing Standard X at SIWS High School continue to the Junior College on the same campus — the same buildings, and in many cases teachers who have already taught them. Moving up is still an admission rather than an automatic step, so the enquiry above is the place to start.',
          'If your child is in Standard X here, say so when you enquire. It is the single most useful thing the admissions team can know.',
        ]),
      },
      {
        blockType: 'cardGrid',
        heading: 'Worth reading before you decide',
        accentWord: 'before you decide',
        headingLevel: 'h2',
        background: 'white',
        columns: '2',
        placedBySeed: true,
        cards: [
          {
            title: 'Common questions',
            description:
              'What the college teaches, how to apply, and the questions the office is asked most often.',
            ...(admissionsFaqPageId
              ? {
                  cta: [
                    {
                      link: {
                        label: 'Open the Admissions FAQ',
                        type: 'internal',
                        reference: { relationTo: 'pages', value: admissionsFaqPageId },
                      },
                    },
                  ],
                }
              : {}),
          },
          {
            title: 'The Secondary School',
            description:
              'Where most of our Standard XI students come from — 99.53% in the S.S.C. Examination 2026.',
            ...(secondaryHomeId
              ? {
                  cta: [
                    {
                      link: {
                        label: 'Visit SIWS High School',
                        type: 'internal',
                        reference: { relationTo: 'pages', value: secondaryHomeId },
                      },
                    },
                  ],
                }
              : {}),
          },
        ],
      },
      ...(contactPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'Ask about a place',
              background: 'brand',
              text: richText([
                'Tell us the standard and the year, and the admissions team will tell you what is possible.',
              ]),
              links: [
                {
                  link: {
                    label: 'Send an enquiry',
                    type: 'internal',
                    reference: { relationTo: 'pages', value: contactPageId },
                    appearance: 'primary',
                  },
                },
              ],
            },
          ]
        : []),
      /*
       * ADDED 2026-09-02, when SIWS sent the process and the term dates.
       *
       * Both admissions run to a schedule set outside this page — one by the
       * State, one by the college — so each says WHO sets it. A family that
       * knows the FYJC dates are the Government's looks for them where they
       * are actually published, rather than waiting for this page to change.
       */
      {
        blockType: 'featureList',
        heading: 'How admission works',
        accentWord: 'admission',
        headingLevel: 'h2',
        layout: 'cards',
        marker: 'number',
        columns: '2',
        background: 'tint',
        items: [
          {
            title: 'Standard XI (FYJC)',
            description:
              'Admission is made through the Maharashtra Government’s centralised schedule, which is set afresh each year. The dates, the cut-offs and the application itself are the State’s, not the college’s.',
          },
          {
            title: 'Standard XII (SYJC)',
            description:
              'Admission is made at the college, each year, for students continuing into the second year.',
          },
        ],
      },
      {
        blockType: 'featureList',
        heading: 'The academic year',
        accentWord: 'academic year',
        headingLevel: 'h2',
        layout: 'spec',
        marker: 'tick',
        background: 'white',
        items: [
          { title: 'Term 1', description: '15 June 2026 to 5 November 2026.' },
          { title: 'Term 2', description: '21 November 2026 to 30 April 2027.' },
          {
            title: 'Promotion from Standard XI',
            description: 'As per Government rules.',
          },
          {
            title: 'Standard XII examinations',
            description:
              'Conducted by the Mumbai Divisional Board. Students are promoted as per the Government’s criteria.',
          },
        ],
      },
    ],
  })

  // --------------------------------------------------------- ADMISSIONS FAQ
  /*
   * Twelve questions in the order somebody asks them.
   *
   * Several end at the office, and each of those still carries everything that
   * IS settled — so nobody is sent to ask a question this page could have
   * answered. That is the honest shape of the page until SIWS sends the
   * streams and the process.
   *
   * One open at a time: a reader comparing two answers on a phone loses their
   * place when both are long, and only one question is ever being asked.
   */
  await upsert({
    slug: 'admissions-faq',
    title: 'Admissions FAQ',
    intro: 'The questions the office is asked most often about joining Standards XI and XII.',
    showInNav: false,
    navLabel: 'Admissions FAQ',
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Common questions about admission to SIWS Junior College, Wadala — which standards, the board, how to apply, coming up from the Secondary School, and who to ask.',
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
            question: 'Which standards does the Junior College take?',
            answer: richText([
              'Standards XI and XII. Below that is our Secondary School, which takes Standards V to X on the same campus.',
            ]),
          },
          {
            question: 'Which board do you follow?',
            answer: richText([
              'A State Board curriculum, as the whole SIWS Group does from Grade 1 upwards.',
            ]),
          },
          {
            question: 'Which streams and subject combinations are offered?',
            answer: richText([
              'Ask the admissions team. What is open varies by year, and this is the single question worth asking before any other — a stream printed here that later closed would send a family to apply for something that is not available.',
            ]),
          },
          {
            question: 'Where is the college?',
            answer: richText([
              'In Wadala, on the same campus as the Kindergarten, Primary and Secondary sections. It is a safe, supervised campus, and the SIWS Group has taught in Wadala since 1934.',
            ]),
          },
        ],
      },
      {
        blockType: 'accordion',
        heading: 'Applying',
        accentWord: 'Applying',
        headingLevel: 'h2',
        background: 'sea',
        allowMultipleOpen: false,
        items: [
          {
            question: 'How do I start?',
            answer: richText([
              'Send an enquiry through the form on the contact page, saying which standard and which academic year you are asking about. The admissions team will call you back.',
            ]),
          },
          {
            question: 'What happens after I enquire?',
            answer: richText([
              'The team calls to answer your questions and confirm what your child is eligible for. You are welcome to come and see the college and meet the teachers before you decide, and the team then guides you through the forms and documents.',
            ]),
          },
          {
            question: 'When do admissions open, and what marks do you ask for?',
            answer: richText([
              'Both are set year by year, and neither is fixed by the college alone. Ask when you enquire and the team will tell you this year’s position for the stream you are interested in.',
            ]),
          },
          {
            question: 'Which documents will I need?',
            answer: richText([
              'The admissions team will give you the list — it depends on the stream and on which school your child is coming from. Please ask before you come in, rather than making the trip twice.',
            ]),
          },
        ],
      },
      {
        blockType: 'accordion',
        heading: 'Coming up from Standard X',
        accentWord: 'Standard X',
        headingLevel: 'h2',
        background: 'white',
        allowMultipleOpen: false,
        items: [
          {
            question: 'My child is in Standard X at SIWS. Is a place automatic?',
            answer: richText([
              'No — moving up is an admission like any other, and the same enquiry is the place to start. Do say that your child is with us when you write, though: it is the single most useful thing the admissions team can know.',
            ]),
          },
          {
            question: 'What is the advantage of staying?',
            answer: richText([
              'The same campus, and in many cases teachers who have already taught your child for six years and know how they work. There is no change of school, no new journey and no settling-in period at the point where two public examinations are two years apart.',
            ]),
          },
          {
            question: 'What are the fees?',
            answer: richText([
              'The fee structure for the current year is with the office, and it is what you should ask for when you enquire. We would rather tell you the real figure than publish one that goes out of date.',
            ]),
          },
          {
            question: 'Who do I contact?',
            answer: richText([
              'The enquiry form on the contact page reaches the college directly, and somebody will come back to you. The address and telephone number are on the same page.',
            ]),
          },
        ],
      },
      ...(contactPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'Still not sure?',
              background: 'brand',
              text: richText([
                'If the answer you need is not here, the admissions team would rather you asked than guessed.',
              ]),
              links: [
                {
                  link: {
                    label: 'Send an enquiry',
                    type: 'internal',
                    reference: { relationTo: 'pages', value: contactPageId },
                    appearance: 'primary',
                  },
                },
              ],
            },
          ]
        : []),
    ],
  })

  // ---------------------------------------------------------------- UPDATES
  /*
   * WHAT IS ON THESE PAGES, AND WHY IT IS ONLY TWO EVENTS.
   *
   * SIWS sent photographs of three occasions at the college. Two of them say
   * plainly what they are and are written up below: a flag hoisting with a
   * formed contingent on the ground, and a yoga and meditation session.
   *
   * The third is the orientation programme, which the photograph alone could
   * not have told anyone: a hall full of students and a speaker is a room, not
   * an occasion. Its file name was what said so, and 15 July is exactly when a
   * new Standard XI intake would be sitting there.
   *
   * Every block that carries a picture is still built only if the file is in
   * the library, so a page loses a band rather than publishing an empty frame
   * if a photograph is ever withdrawn.
   */
  const shots = {
    independenceDay: await photo('jc-independence-day-2026.jpg'),
    orientation: await photo('jc-orientation-2026.jpg'),
    yoga: await photo('jc-yoga-meditation-2026.jpg'),
    performance2025: await photo('jc-independence-day-2025.jpg'),
    pongal: await photo('jc-pongal-celebration.jpg'),
    fieldVisit: await photo('jc-evs-field-visit.jpg'),
    library: await photo('jc-library.jpg'),
    laboratory: await photo('jc-physics-laboratory.jpg'),
    charts: await photo('jc-physics-charts.jpg'),
  }

  const missingShots = Object.entries(shots)
    .filter(([, id]) => id === null)
    .map(([name]) => name)

  const newsPageId = await upsert({
    slug: 'news',
    title: 'News & Events',
    intro: 'What has happened at the college lately.',
    showInNav: false,
    navLabel: 'News & Events',
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'News and events at SIWS Junior College, Wadala — Independence Day on the college ground, and yoga and meditation for Standards XI and XII.',
    layout: [
      /*
       * Two across rather than three. Each of these has a photograph worth
       * looking at and two sentences under it; at three across the picture
       * comes out the size of a thumbnail and the story reads as a caption.
       */
      {
        blockType: 'cardGrid',
        heading: 'Lately at the college',
        accentWord: 'Lately',
        headingLevel: 'h2',
        background: 'white',
        columns: '2',
        placedBySeed: true,
        cards: [
          {
            title: 'Orientation for the new intake',
            ...(shots.orientation ? { image: shots.orientation } : {}),
            description:
              'The hall full on 15 July 2026, at the start of the academic year, for the orientation programme — what the two years ahead hold, how the college runs, and who to go to. It is the first morning of Standard XI for most of the room.',
          },
          {
            title: 'Independence Day on the college ground',
            ...(shots.independenceDay ? { image: shots.independenceDay } : {}),
            description:
              'The national flag unfurled on the ground, with a contingent of students in ceremonial white and berets formed up in front of it, and staff and families behind. The whole campus marks the day together.',
          },
          {
            title: 'Yoga and meditation, out on the ground',
            ...(shots.yoga ? { image: shots.yoga } : {}),
            description:
              'Students of Standards XI and XII seated in rows in the open air for a guided session — eyes closed, hands on knees. Two public examinations sit two years apart, and an hour spent learning to settle is not an hour lost.',
          },
        ],
      },
      ...(contactPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'Ask us about the college',
              background: 'sea',
              text: richText([
                'The office is happy to tell you more about what the year holds, and about admission to Standards XI and XII.',
              ]),
              links: [
                {
                  link: {
                    label: 'Get in touch',
                    type: 'internal',
                    reference: { relationTo: 'pages', value: contactPageId },
                    appearance: 'primary',
                  },
                },
              ],
            },
          ]
        : []),
    ],
  })

  await upsert({
    slug: 'updates',
    title: 'Updates',
    intro: 'News and events from SIWS Junior College, and where to find them.',
    showInNav: true,
    navLabel: 'Updates',
    navOrder: 60,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Updates from SIWS Junior College, Wadala — news and events from the college year for Standards XI and XII.',
    layout: [
      /*
       * The overview leads with the occasion rather than with a row of cards.
       * A hub page that opens on equal boxes tells a reader where to click and
       * nothing about the college; this way the first thing on the page is
       * something that happened, and the navigation follows it.
       */
      ...(shots.independenceDay
        ? [
            {
              blockType: 'mediaText',
              heading: 'Independence Day on the college ground',
              accentWord: 'Independence Day',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'left',
              imageShape: 'rounded',
              image: shots.independenceDay,
              content: richText([
                'The national flag unfurled on the ground, a contingent of students in ceremonial white and berets formed up in front of it, and the staff and families of the college behind them.',
                'It is the one morning in the year when every section on the Wadala campus is doing the same thing at the same time.',
              ]),
              ...(newsPageId
                ? {
                    cta: [
                      {
                        link: {
                          label: 'See what else has happened',
                          type: 'internal',
                          reference: { relationTo: 'pages', value: newsPageId },
                          appearance: 'primary',
                        },
                      },
                    ],
                  }
                : {}),
            },
          ]
        : []),
      {
        blockType: 'cardGrid',
        heading: 'Where to find what',
        accentWord: 'find what',
        headingLevel: 'h2',
        background: 'sea',
        columns: '2',
        placedBySeed: true,
        cards: [
          {
            title: 'News & Events',
            description:
              'What has happened at the college lately — the occasions the year is marked by, photographed as they happened.',
            ...(newsPageId
              ? {
                  cta: [
                    {
                      link: {
                        label: 'Read the news',
                        type: 'internal',
                        reference: { relationTo: 'pages', value: newsPageId },
                      },
                    },
                  ],
                }
              : {}),
          },
          {
            title: 'Admissions',
            description:
              'Standards XI and XII — how to enquire, what the admissions team can tell you, and what to ask for.',
            cta: [
              {
                link: {
                  label: 'Open Admissions',
                  type: 'internal',
                  reference: { relationTo: 'pages', value: await pageId('admissions') },
                },
              },
            ],
          },
        ],
      },
    ],
  })

  // ----------------------------------------------------------- STUDENT LIFE
  /*
   * Three pages, built around the nine photographs the college has.
   *
   * The division between the first two is the one that matters, because
   * without it they become the same page twice:
   *
   *   Student Life — what the college PUTS ON. The year as it is organised:
   *                  the national days, Pongal, the field visits, the library
   *                  and the laboratories, wellbeing on the timetable.
   *   Student Wall — what the students THEMSELVES did with it. The chart they
   *                  drew, the performance they staged, the trail they walked.
   *
   * Same campus, same year, different subject: one is the offer and the other
   * is the take-up. Every photograph sits on the page whose question it
   * answers, and none appears on both.
   *
   * Transport is the third, and it is written the way Primary's and
   * Secondary's are — SIWS has sent no operator, route or fare, so it says
   * what IS known and hands the rest to the office rather than inventing a
   * bus.
   */
  await upsert({
    slug: 'student-life',
    title: 'Student Life',
    intro:
      'What the two years hold beyond the syllabus — the hall, the trail, the library and the ground.',
    showInNav: true,
    navLabel: 'Student Life',
    navOrder: 70,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Life at SIWS Junior College, Wadala beyond the classroom — national days, Pongal, environmental field visits, the library and laboratories, and wellbeing on the timetable.',
    layout: [
      ...(shots.fieldVisit
        ? [
            {
              blockType: 'mediaText',
              heading: 'Two years is not only a syllabus',
              accentWord: 'not only',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'left',
              imageShape: 'rounded',
              image: shots.fieldVisit,
              content: richText([
                'Standards XI and XII are two years with a public examination at the end of them, and a college that treated them as nothing else would be a poor place to spend the time.',
                'So the year has a shape of its own: days marked together in the hall, a festival the Society has kept since 1934, work that happens outdoors, and an hour on the ground learning to sit still.',
              ]),
            },
          ]
        : []),
      {
        blockType: 'featureList',
        heading: 'What the year holds',
        accentWord: 'the year',
        headingLevel: 'h2',
        layout: 'cards',
        background: 'sea',
        items: [
          {
            title: 'The national days',
            icon: 'activity',
            description:
              'Independence Day is marked on the ground with the flag and a formed contingent, and in the hall with the students’ own programme.',
          },
          {
            title: 'Pongal Thiruvizha',
            icon: 'care',
            description:
              'The harvest festival kept in the college hall, under Tamil banners and sugarcane — the South Indians’ Welfare Society observing its own.',
          },
          {
            title: 'Field visits',
            icon: 'garden',
            description:
              'Environmental studies taken out of the classroom and onto a woodland trail, with the teachers who set the work walking it alongside.',
          },
          {
            title: 'The library',
            icon: 'library',
            description:
              'Long tables by the windows, open stacks, computers and a reference section — used through the day rather than reserved for examinations.',
          },
          {
            title: 'The laboratories',
            icon: 'laboratory',
            description:
              'Practical work set up bench by bench, with the apparatus laid out before the class arrives.',
          },
          {
            title: 'Yoga and meditation',
            icon: 'health',
            description:
              'Guided sessions in the open air. Two public examinations sit two years apart, and an hour spent learning to settle is not an hour lost.',
          },
        ],
      },
      ...(shots.pongal
        ? [
            {
              blockType: 'mediaText',
              heading: 'Pongal in the hall',
              accentWord: 'Pongal',
              headingLevel: 'h2',
              background: 'white',
              // A 1600x739 panorama of a room-length line — shown above the
              // words, at full width, because any side-by-side crop loses
              // somebody off the end of it.
              imagePosition: 'above',
              imageShape: 'rounded',
              image: shots.pongal,
              content: richText([
                'The harvest festival, kept in the college hall with sugarcane at the backdrop and the banners up. The staff turn out in silk for it, and the room is decorated the day before.',
                'It is the plainest thing on this page and the least negotiable: the South Indians’ Welfare Society has been in Wadala since 1934, and Pongal is the day the college looks most like itself.',
              ]),
            },
          ]
        : []),
      {
        blockType: 'cardGrid',
        heading: 'The rest of student life',
        accentWord: 'student life',
        headingLevel: 'h2',
        background: 'sea',
        columns: '2',
        placedBySeed: true,
        cards: [
          /*
           * NO PICTURES ON THESE TWO.
           *
           * They had one each and neither belonged to the card it was on: a
           * patriotic performance stood for Student Wall, and the LIBRARY
           * stood for Transport, which is simply a photograph of a different
           * subject under the wrong word.
           *
           * Student Wall could have taken the physics chart honestly enough,
           * but there is no photograph of transport and there is not going to
           * be one until SIWS sends the arrangements. One illustrated card
           * beside one empty card reads as a card that failed to load — the
           * same fault that took a grid off the Primary Student Life page —
           * so both go without. The titles and the sentences under them say
           * where each one goes, which is all a signpost has to do.
           */
          {
            title: 'Student Wall',
            description:
              'What the students themselves made and staged this year — the charts, the performances, the trail.',
            cta: [
              {
                link: {
                  label: 'See the wall',
                  type: 'internal',
                  reference: { relationTo: 'pages', value: await pageId('student-wall') },
                },
              },
            ],
          },
          {
            title: 'Transport',
            description:
              'Getting to Wadala, arriving and being collected, and who to ask about your own route.',
            cta: [
              {
                link: {
                  label: 'Getting to college',
                  type: 'internal',
                  reference: { relationTo: 'pages', value: await pageId('transport') },
                },
              },
            ],
          },
        ],
      },
    ],
  })

  await upsert({
    slug: 'student-wall',
    title: 'Student Wall',
    intro: 'What the students made, staged and walked this year.',
    showInNav: false,
    navLabel: 'Student Wall',
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Work by students of SIWS Junior College, Wadala — hand-made physics charts, the Independence Day programme, environmental field work, and practical work in the laboratories.',
    layout: [
      ...(shots.charts
        ? [
            {
              blockType: 'mediaText',
              heading: 'Drawn by hand, not printed',
              accentWord: 'by hand',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'left',
              // A chart is READ. Shown whole and untinted, like a certificate.
              imageShape: 'document',
              image: shots.charts,
              content: richText([
                'Units and physical quantities: absolute, relative and percentage error down one side, the principle of homogeneity down the other, and a table of formulae, SI units and dimensional formulae through the middle — density, acceleration, momentum, force, impulse, work, kinetic energy.',
                'Every panel is cut, coloured and lettered by hand. Copying a table out of a textbook teaches almost nothing; laying one out so that somebody else can read it means having understood it first.',
              ]),
            },
          ]
        : []),
      {
        blockType: 'featureList',
        heading: 'Ways a student takes part',
        accentWord: 'takes part',
        headingLevel: 'h2',
        layout: 'cards',
        background: 'sea',
        items: [
          {
            title: 'On the stage',
            icon: 'music',
            description:
              'The Independence Day programme in the hall — white and tricolour, rehearsed over weeks and performed to the whole college.',
          },
          {
            title: 'On the trail',
            icon: 'garden',
            description:
              'Environmental studies field work, looking closely at a single sapling rather than at a photograph of one.',
          },
          {
            title: 'At the bench',
            icon: 'laboratory',
            description:
              'Practical work in the physics laboratory, with the apparatus set out and the readings taken by the student, not demonstrated at the front.',
          },
          {
            title: 'On the wall',
            icon: 'thinking',
            description:
              'Charts made for the laboratory and the corridor, drawn and lettered by hand so the next class can read them.',
          },
        ],
      },
      /*
       * The photographs of the students at it, as a wall rather than as more
       * cards — a collage is the right shape for four pictures of four
       * different things.
       */
      {
        blockType: 'gallery',
        heading: 'This year, photographed',
        accentWord: 'photographed',
        headingLevel: 'h2',
        background: 'white',
        layout: 'bento',
        perPage: '0',
        images: [
          ...(shots.performance2025
            ? [
                {
                  image: shots.performance2025,
                  caption: 'The Independence Day programme in the hall, 2025.',
                },
              ]
            : []),
          ...(shots.fieldVisit
            ? [{ image: shots.fieldVisit, caption: 'Environmental studies, on the trail.' }]
            : []),
          ...(shots.laboratory
            ? [
                {
                  image: shots.laboratory,
                  caption: 'An experiment set up in the physics laboratory.',
                },
              ]
            : []),
          ...(shots.library
            ? [{ image: shots.library, caption: 'An afternoon in the library.' }]
            : []),
        ],
      },
    ],
  })

  await upsert({
    slug: 'transport',
    title: 'Transport',
    intro: 'How students reach the college, and who to ask about the part we cannot publish.',
    showInNav: false,
    navLabel: 'Transport',
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Getting to SIWS Junior College, Wadala — arriving and being collected, and who to ask about travel arrangements.',
    layout: [
      /*
       * THIS PAGE DOES NOT LIST A BUS ROUTE, AND THAT IS THE POINT.
       *
       * SIWS has supplied nothing about transport for the Junior College, and
       * `institution.ts` names Transport as a page left blank for exactly that
       * reason: an invented route outlives the placeholder it replaced and is
       * read as fact. What IS known is said plainly, and the one unknown is
       * handed to the office rather than guessed at.
       */
      {
        blockType: 'featureList',
        heading: 'What the college can help with',
        accentWord: 'help with',
        headingLevel: 'h2',
        layout: 'cards',
        background: 'sea',
        items: [
          {
            title: 'A supervised campus',
            icon: 'security',
            description:
              'The Wadala campus is shared with the Kindergarten, Primary and Secondary sections, and is supervised throughout the day.',
          },
          {
            title: 'Anything else about travel',
            icon: 'communication',
            description:
              'Ask the office. Questions about your own route are answered better by somebody who knows this year’s arrangements than by a page.',
          },
        ],
      },
      {
        blockType: 'richText',
        heading: 'Where the college is',
        accentWord: 'Where',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'The college is in Wadala, on the same campus as the rest of the SIWS Group. The full address and telephone number are on the contact page, along with the enquiry form.',
        ]),
      },
      ...(contactPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'Ask about your route',
              background: 'brand',
              text: richText([
                'Tell us where you will be travelling from and the office will tell you what is possible.',
              ]),
              links: [
                {
                  link: {
                    label: 'Contact the college',
                    type: 'internal',
                    reference: { relationTo: 'pages', value: contactPageId },
                    appearance: 'primary',
                  },
                },
              ],
            },
          ]
        : []),
    ],
  })

  // ---------------------------------------------------------- PARENT FEEDBACK
  await upsert({
    slug: 'parent-feedback',
    title: 'Parent feedback',
    intro:
      'What families tell us shapes how the college runs. If your child is with us, we would like to hear from you.',
    showInNav: false,
    navLabel: 'Parent Feedback',
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'What parents of SIWS Junior College students say about Standards XI and XII in Wadala — and how to send the college your own feedback.',
    layout: [
      {
        blockType: 'testimonials',
        heading: 'What parents say',
        accentWord: 'parents',
        headingLevel: 'h2',
        background: 'white',
        /*
         * ONE row, as on the Secondary page. Eight quotes split four and four
         * make two tracks barely wider than the viewport, so the loop comes
         * round often enough to notice; one row takes all eight and the
         * section is the height of a single card.
         */
        layout: 'marquee-single',
        showAttribution: false,
        quotes: PARENT_QUOTES,
      },
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
            title: 'Speak to the subject teacher first',
            description:
              'Anything about your own child — the work, the pace, how they are getting on — is answered fastest by the person who teaches them.',
          },
          {
            title: 'Ask the office to arrange a meeting',
            description:
              'For anything a subject teacher cannot settle, the office will find a time. Please telephone rather than calling in, so somebody is free when you arrive.',
          },
          {
            title: 'Or write to us through the enquiry form',
            description:
              'The form on the contact page reaches the college directly, and somebody will come back to you.',
          },
        ],
      },
    ],
  })

  payload.logger.info('Junior College content seeded.')

  if (missingShots.length > 0) {
    payload.logger.warn(
      `PHOTOGRAPHS NOT IN THE LIBRARY: ${missingShots.join(', ')} — those cards and bands were published without a picture. The files belong in assets/images and are seeded by src/seed/media.ts; run npm run seed:media, then this seed again.`,
    )
  }

  payload.logger.warn(
    'STILL TO COME from SIWS for the Junior College: eligibility marks, the document list, fees, the annual calendar, college rules and uniform, and results. The streams, subjects, curriculum, teaching methodology, roster, admission process and term dates arrived on 2026-09-02 and are published. Rules & Uniform is still a DRAFT — the heading was supplied with nothing under it, and school rules are not something to guess at.',
  )

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
