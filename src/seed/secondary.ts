import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText, richTextLines } = await import('./lexical')

/**
 * Seeds the Secondary Section (SIWS High School, Wadala) from the requirement
 * document SIWS returned.
 *
 * This replaces the placeholder that `seed:units` created, which guessed the
 * section covered Standards VIII to X. It covers STANDARDS V TO X, which also
 * means the enquiry form was offering the wrong classes.
 *
 * Everything published is SIWS's own wording. Where their document left a
 * heading blank — programme benefits, admission process, fee details, day care,
 * accreditation, testimonials, alumni, press, partnerships — nothing is
 * invented; the gaps are reported at the end of the run.
 *
 * Run with:  npm run seed:secondary
 */

/**
 * CORRECTION: Standards V to X, not VIII to X.
 *
 * The earlier placeholder guessed the usual "secondary = VIII–X" split. SIWS's
 * document says "Secondary Section – Std V to Std X", which matches the Primary
 * Section ending at Grade 4. An enquiry form offering the wrong classes turns
 * families away at the first question.
 */
const CLASS_OPTIONS = [
  'Standard V',
  'Standard VI',
  'Standard VII',
  'Standard VIII',
  'Standard IX',
  'Standard X',
]

/*
 * Icons are chosen for meaning, not decoration: the three language subjects
 * share the book mark because that is what they have in common, and nothing
 * here invents a description SIWS did not give.
 */
const SUBJECTS = [
  { title: 'English', icon: 'communication' },
  { title: 'Marathi', icon: 'library' },
  { title: 'Hindi', icon: 'library' },
  { title: 'Sanskrit', icon: 'library' },
  { title: 'Mathematics', icon: 'thinking' },
  { title: 'Science', icon: 'laboratory' },
  { title: 'Social Science', icon: 'study' },
  { title: 'ICT', icon: 'computers' },
  { title: 'PT', icon: 'sport' },
  { title: 'Art & Craft', icon: 'activity' },
]

const METHODOLOGY = [
  { title: 'Activity-based learning', icon: 'activity' },
  { title: 'Peer learning and group learning', icon: 'staff' },
  { title: 'Collaborative projects', icon: 'communication' },
  { title: 'Experiential learning', icon: 'laboratory' },
  { title: 'Classroom discussions', icon: 'classroom' },
  { title: 'Technology-integrated instruction', icon: 'computers' },
  { title: 'Continuous assessment', icon: 'study' },
  { title: 'Project work and hands-on activities' },
  { title: 'Real-life applications of classroom learning' },
]

/**
 * The 39 members of staff, in the order SIWS listed them.
 *
 * The source table is in capitals and splits academic from professional
 * qualifications; both are joined here into the single line a parent reads, and
 * names are set in ordinary case. Designations are expanded from the register's
 * abbreviations — H.M., A.H.M., ASSTT.TR and S. SEVAK mean nothing to a family
 * reading the page.
 */
const FACULTY = [
  { name: 'Mrs. Sreelatha Nair', designation: 'Head Mistress', qualifications: 'M.A., M.Ed.' },
  { name: 'Mrs. Biny Thomas', designation: 'Assistant Head Mistress', qualifications: 'B.Sc., B.Ed.' },
  { name: 'Mrs. Vanathi Rajuswamy', qualifications: 'S.S.C., B.A., D.Ed., B.Ed.' },
  { name: 'Mr. Ajendrakumar Rai', qualifications: 'B.A., M.A., B.Ed.' },
  { name: 'Mr. Suresh Kishan Giri', qualifications: 'B.A., B.P.Ed., M.P.Ed.' },
  { name: 'Mr. Ajaykumar Bholanath Singh', qualifications: 'B.A., B.P.Ed.' },
  { name: 'Mrs. Vanita Prabhakar Sawant', qualifications: 'M.A., B.Ed.' },
  { name: 'Miss Tanuja Ramesh Kadam', qualifications: 'M.A., B.Ed.' },
  { name: 'Miss Amutha Harry Ross', qualifications: 'B.A., M.A., B.Ed.' },
  { name: 'Mr. Sunilkumar Devanand Chaube', qualifications: 'B.A., B.Ed.' },
  { name: 'Mrs. Shruti Avinash Shelke', qualifications: 'B.Sc., B.Ed.' },
  { name: 'Mrs. Nadar Mary Stella John Peter', qualifications: 'B.A., M.A., B.Ed.' },
  { name: 'Mrs. Santhi Shankar', qualifications: 'B.Sc., M.A., B.Ed.' },
  { name: 'Mr. Arun Shivaji Patil', qualifications: 'B.A., M.A., B.Ed.' },
  { name: 'Mr. Suraj Sunder Poojari', qualifications: 'B.Sc., M.A., B.Ed.' },
  { name: 'Mrs. Swati Kishor Garud', qualifications: 'B.Sc., M.A., B.Ed.' },
  { name: 'Mr. Sanjay Harichandra Sakpal', qualifications: 'B.A., B.Ed.' },
  { name: 'Mrs. Marquis Juliet Neville', qualifications: 'B.Sc., M.A., B.Ed.' },
  { name: 'Mrs. Kavita Vedprakash Rai', qualifications: 'M.A., B.Ed.' },
  { name: 'Mrs. Angel Jabakani', qualifications: 'B.A., M.A., B.Ed.' },
  { name: 'Mrs. Pooja Santosh Pandey', qualifications: 'B.A., B.Ed.' },
  { name: 'Mrs. Anithajanaki Arunachalam', designation: 'Shikshan Sevak', qualifications: 'B.A., M.A., B.Ed.' },
  { name: 'Mr. Jagannath Suresh Arya', designation: 'Shikshan Sevak', qualifications: 'B.A., M.A., B.Ed., M.Ed.' },
  { name: 'Mrs. Dhanashri Madhukar Bansode', designation: 'Shikshan Sevak', qualifications: 'B.A., M.A., B.Ed., TET' },
  { name: 'Miss Ramalakshmi Lakshmanan', designation: 'Shikshan Sevak', qualifications: 'B.Sc., M.A., B.Ed., CTET' },
  { name: 'Mr. Selvin Rajkumar Joseph', qualifications: 'S.S.C., D.Ed.' },
  { name: 'Mrs. Ranjana Moses Brownson', qualifications: 'S.S.C., B.A., A.T.D., Dip. in Applied Art' },
  { name: 'Mrs. Aarti Rajesh Dubey', qualifications: 'H.S.C., B.A., D.Ed.' },
  { name: 'Mrs. Mamta Samil Loke', qualifications: 'H.S.C., B.A., M.A., D.Ed.' },
  { name: 'Mrs. Priya Dinesh Deore', qualifications: 'H.S.C., D.Ed.' },
  { name: 'Mrs. Vijitha Vikram Alur', qualifications: 'H.S.C., B.Com., D.Ed.' },
  { name: 'Mr. Vijay Ramdas Jadhav', qualifications: 'H.S.C., A.T.D. (Craft), A.M.' },
  { name: 'Mrs. Sejal Maclan D’Silva', qualifications: 'H.S.C., B.A., M.A., D.Ed.' },
  { name: 'Mr. Vikram Jayram Patil', qualifications: 'H.S.C., B.A., D.Ed.' },
  { name: 'Miss Bhavana Bhagwant Tuplondhe', qualifications: 'H.S.C., B.A., M.A., D.Ed., B.Ed., M.Ed.' },
  { name: 'Mrs. Ujjwala Mahesh Patil', qualifications: 'H.S.C., B.A., M.A., D.Ed.' },
  { name: 'Miss Supriya Shivaji Sonawane', qualifications: 'H.S.C., B.A., M.A., D.Ed.' },
  { name: 'Mr. Kandekar Sadanand Mahadev', qualifications: 'H.S.C., D.Ed., TET' },
  { name: 'Miss Jenisha Thomas', designation: 'Shikshan Sevak', qualifications: 'H.S.C., D.El.Ed., CTET' },

  /*
   * The Computer Section, supplied by SIWS on 2026-08-25.
   *
   * NO HONORIFIC on these four. Every other name in this list carries one,
   * but the school sent these without, and Mrs./Miss states something about a
   * person that cannot be guessed from a name. An inconsistent list is a
   * smaller fault than publishing an assumption about someone.
   *
   * The qualifications ARE punctuated to match the rest of the list, since
   * that is only typography: B.Com. rather than B.Com. MBA keeps its own
   * shape, as CTET and TET do above.
   */
  {
    name: 'Renu Bhatia',
    designation: 'HOD – Computer Section',
    qualifications: 'B.Com. (Hons.), Delhi University',
  },
  {
    name: 'Thangam Subramanian',
    designation: 'Teacher – Computer Section',
    qualifications: 'B.Com., B.A., M.A., B.Ed.',
  },
  {
    name: 'Shalini Pillai',
    designation: 'Teacher – Computer Section',
    qualifications: 'B.Com.',
  },
  {
    name: 'Nirmala R. Nadar',
    designation: 'Teacher – Computer Section',
    qualifications: 'B.A., MBA, E.C.C.Ed.',
  },
]

/** The general rules, verbatim. */
const GENERAL_RULES: string[] = [
  'Every pupil must possess a copy of the school calendar which must be brought daily to the school.',
  'Minimum attendance of 75% of the total number of working days is required to be fulfilled by all students.',
  'All pupils must come to school in the prescribed uniform. Uniform should be clean and well ironed.',
  'Pupils are expected to keep their hair and nails short. They are not permitted to colour their hair or sport any fashionable haircut.',
  'Pupils are responsible for the safe custody of their books and other belongings. They are requested not to wear any ornaments or watch for the sake of personal safety.',
  'Pupils should maintain discipline while moving in and out of the classroom when going to attend P.T., Mass, drill, Science Practicals, Computer seminars, etc.',
  'At all times a pupil is expected to communicate in English only.',
  'Irregular attendance, habitual idleness, late coming, wilful disobedience or misconduct and any form of indiscipline in the school will be seriously dealt with.',
  'All pupils are responsible to the school authorities for their behaviour inside the school.',
  'Any damage to school property, whether inside or outside the classrooms or within the school premises, will have to be made good by those responsible or by their parents or guardians. The decision of the school authorities regarding compensation payable to the school is final.',
  'Parents/guardians or others are not allowed to see their wards or meet their teacher during school hours without the prior consent of the Head Mistress.',
  'Any breach of discipline or disrespect to any members of the school staff will be dealt with seriously and pupils responsible for such misbehaviour will be summarily dismissed after proper warning to the student and parents/guardians.',
  'The school authorities maintain a record of the addresses and phone numbers of parents/guardians in the school office and for their own interest. Parents/guardians are requested to promptly intimate the changes, if any.',
  'Presents in cash or in kind to the teachers is not permitted. Collection of funds for any reason whatsoever within the school premises is also prohibited.',
  'Letters addressed to pupils in the school will not be delivered in the classrooms.',
  'Pupils are not permitted to bring unnecessary books, magazines, newspapers, periodicals or similar articles to the school. They must bring only dry food for the long recess.',
  'Pupils are forbidden to take part in any political or other organisation likely to result in violence or communal disturbance.',
  'Parents/guardians are earnestly requested to enforce regularity and discipline and see that their children do their homework and prepare their lessons daily as per the timetable. Parental cooperation is earnestly solicited not only for the benefit of the pupil but also for the smooth working of the school.',
  'Extracts from the Grant-in-Aid Code Rule 53, “Principles of Discipline”: regularity and implicit obedience are expected; politeness and courtesy of speech and conduct as well as cleanliness of dress and person are inculcated; pupils are made to realise that they are responsible to the school authorities not only for their conduct in the school but also for their general behaviour outside; and parents/guardians are given to understand that the management has the right to decide on what conditions they will admit or retain pupils, provided such conditions conform to the Grant-in-Aid Code and the instructions issued by the Director or concerned Educational Inspector from time to time.',
  'No school business will be transacted on Saturdays, Sundays and holidays.',
  'Any pupil who is persistently non-co-operative, or is repeatedly or wilfully mischievous, or is guilty of gross malpractices in connection with examinations, or has committed an act of serious indiscipline or misbehaviour, or who in the opinion of the Head of the School has an undesirable influence on fellow pupils, is liable to be expelled either permanently or removed for a specified period by the Head of School, with the reasons recorded in writing.',
  'Any report that signifies objectionable conduct even out of school premises on the part of a pupil shall make him or her liable for disciplinary action.',
  'Railway concession forms and other certificates — date of birth, bonafide student, first attempt, leaving certificate and similar — will be issued between 10.00 a.m. and 12.00 noon only.',
]

const UNIFORM = [
  {
    title: 'Girls',
    description:
      'Light blue striped shirt with collar and long sleeves up to the elbow. Dark blue skirt reaching below the knee. Blue belt. Sweater in navy blue only. Hair tied in two plaits with blue ribbon. Pupils are expected not to wear mehendi or nail polish, and to keep their nails short.',
  },
  {
    title: 'Boys — Standards V to VII',
    description: 'Light blue striped half shirt and dark blue half pants.',
  },
  {
    title: 'Boys — Standards VIII to X',
    description: 'Light blue striped half shirt and dark blue full pants.',
  },
  {
    title: 'Footwear',
    description:
      'All-season black shoes with dark blue socks with light blue stripes. Chappals and sandals are not allowed.',
  },
  {
    title: 'PT uniform',
    description: 'Wear PT uniform every Wednesday.',
  },
]

/**
 * SSC Examination 2026 — SIWS's own figures.
 *
 * The grade distribution sums to 214, which is exactly the number who passed,
 * so the two halves of the result agree with each other.
 */
const SSC_2026 = {
  appeared: 215,
  passed: 214,
  percentage: '99.53%',
  grades: [
    { title: 'Distinction', description: '60 students.' },
    { title: 'First Class', description: '99 students.' },
    { title: 'Second Class', description: '54 students.' },
    { title: 'Pass Class', description: '1 student.' },
  ],
}

/**
 * SCHOLARSHIP EXAMINATION QUALIFIERS, 2025–26 — HELD BACK BY DEFAULT.
 *
 * These are children in Standards V and VIII, roughly 10 and 13 years old.
 * Under the DPDPA 2023 a child's personal data may be processed only with
 * verifiable parental consent, and their full name on a public web page is
 * personal data — the same rule this platform already enforces for their
 * photographs (FR-PRV-11).
 *
 * SIWS supplied the names to be published and clearly intends to honour these
 * students, which is entirely normal and reasonable. But nobody has yet told us
 * the parents agreed, and a school website is exactly where that agreement has
 * to exist before the fact rather than after.
 *
 * So the achievement is published in full — the examinations, the year, the
 * congratulation, and how many qualified in each standard — and only the names
 * wait. Set this flag to `true` once SIWS confirms parental consent and re-run
 * the seed; the names are ready and nothing else needs to change.
 */
const CHILD_NAMES_CONSENTED = false

const SCHOLARSHIP_QUALIFIERS = {
  'Standard V': [
    'Yuvraj Walgude',
    'Jahanavi Gautam',
    'Marvi Shigwan',
    'Rudra Dhariya',
    'Namish Kulaye',
  ],
  'Standard VIII': ['Swaraj Chaugule', 'Ashish Godiyal'],
}

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'secondary' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const secondary = units[0]
  if (!secondary) throw new Error('Secondary unit not found. Run `npm run seed` first.')

  await payload.update({
    collection: 'units',
    id: secondary.id,
    overrideAccess: true,
    data: {
      name: 'SIWS High School, Wadala',
      shortName: 'Secondary School',
      tagline: 'Maharashtra State Board | Standards V to X',
      description:
        'Standards V to X following the Maharashtra State Board curriculum, aligned with NEP 2020 — a learner-centred, competency-based approach at our Wadala campus.',
      /*
       * The section had no telephone number at all — the header, the footer
       * and the contact page each render one only when the unit carries it,
       * so all three were simply blank on this site.
       */
      phone: '022-24180877',
    } as never,
  })

  // -- Faculty (FR-FAC-01) -------------------------------------------------
  let facultyCreated = 0
  let facultyUpdated = 0

  for (const [index, teacher] of FACULTY.entries()) {
    const existing = await payload.find({
      collection: 'faculty',
      where: { and: [{ name: { equals: teacher.name } }, { unit: { equals: secondary.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const data = {
      ...teacher,
      designation: teacher.designation ?? 'Assistant Teacher',
      unit: secondary.id,
      // SIWS's own achievement text names "SIWS High School, Wadala", so the
      // campus is stated rather than assumed.
      campus: 'wadala',
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

  // -- Pages ---------------------------------------------------------------
  const upsert = async (page: Record<string, unknown> & { slug: string; title: string }) => {
    const existing = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: page.slug } }, { unit: { equals: secondary.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const data = { ...page, unit: secondary.id }

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

  /**
   * Photographs, by the filename the importer gave them.
   *
   * Every one is from SIWS's own Secondary folder — no picture from another
   * section appears on this site, because a Standard V parent looking at a
   * kindergarten classroom has been told something untrue about the school
   * their child would attend.
   */
  const photo = async (filename: string) => {
    const { docs } = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (!docs[0]) payload.logger.warn(`Photograph missing from the library: ${filename}`)
    return docs[0]?.id ?? null
  }

  /*
   * Renamed from the `photos:import` filenames these used to carry
   * (`secondary-campus-facility-2-3` and friends). Those files are in
   * `media/` but their library rows never were, so all three resolved to
   * null, three required image fields failed validation, and the seed died
   * before it reached the teachers roster. They are seeded under these names
   * now, from `assets/images`, like every other photograph this site uses.
   */
  const classroomAtWork = await photo('secondary-craft-class.jpg')
  const classroomActivity = await photo('secondary-activity-class.jpg')
  const recognition = await photo('secondary-swachhta-certificate.jpg')
  const toppers = await photo('secondary-toppers-2026.jpg')

  // --------------------------------------------------------------- CONTACT
  /** Seeded before `home`, which links to it — see the note in primary.ts. */
  const contactPageId = await upsert({
    slug: 'contact',
    title: 'Contact us',
    intro: 'Ask us about admission to Standards V to X at Wadala.',
    showInNav: true,
    navLabel: 'Contact',
    navOrder: 50,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Contact SIWS High School, Wadala — enquire about admission to Standards V to X.',
    layout: [
      {
        blockType: 'heroEnquiry',
        title: 'Enquire about admission',
        subtitle: 'Maharashtra State Board | Standards V to X',
        benefitsIntro: 'At SIWS, your child benefits from:',
        benefits: [
          { text: 'A learner-centred, competency-based approach aligned with NEP 2020' },
          { text: 'Smart boards in every classroom' },
          { text: 'Well-equipped science and computer laboratories' },
          { text: 'A campus under CCTV surveillance throughout' },
        ],
        badge: {
          title: '99.53% in the SSC Examination 2026',
          subtitle: '214 of 215 students passed | 60 with Distinction',
        },
        form: {
          title: 'Enquire about admission',
          subtitle: 'Tell us about your child and we will get in touch.',
          classOptions: CLASS_OPTIONS.map((label) => ({ label })),
          campusOptions: [{ campus: 'wadala' }],
          trustPoints: [
            { text: 'Serving Mumbai since 1934' },
            { text: '99.53% SSC result in 2026' },
            { text: 'Qualified and experienced teachers' },
            { text: 'Smart boards and CCTV throughout' },
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
            description: 'For enquiries about Standards V to X — admissions@siws.edu.in',
          },
          {
            /*
             * The telephone number belongs in the page BODY, not only on the
             * unit record.
             *
             * A unit's `phone` renders in the header strip and the footer and
             * nowhere else, so on the one page a parent opens to find it —
             * Contact — it appeared only in the furniture around the content.
             * Kindergarten reads the same way because its seed writes the
             * number into this card too.
             */
            title: 'General enquiries',
            description: 'For anything else — info@siws.edu.in, 022-24180877',
          },
        ],
      },
    ],
  })

  // ------------------------------------------------------------------ HOME
  await upsert({
    slug: 'home',
    title: 'SIWS High School, Wadala',
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'SIWS High School, Wadala — Standards V to X on the Maharashtra State Board curriculum, aligned with NEP 2020. 99.53% in the SSC Examination 2026.',
    layout: [
      {
        blockType: 'hero',
        title: 'SIWS High School, Wadala',
        accentWord: 'High School',
        eyebrow: 'Maharashtra State Board | Standards V to X',
        /*
         * A photograph behind the banner, which is what switches `HeroBlock`
         * from its flat brand panel to the washed variant the portal uses —
         * the same left-to-right brand gradient at 85/70/55%, dense enough at
         * the left where the type sits and thinning to the right so the room
         * still reads.
         *
         * Omitted when the photograph is missing, so the banner falls back to
         * the flat panel rather than losing its gradient and its contrast.
         */
        ...(classroomActivity ? { image: classroomActivity } : {}),
        // Plain string: the hero's `intro` is a textarea, not rich text.
        intro:
          'From Standards V to X, we follow the Maharashtra State Board curriculum, updated in line with NEP 2020. Proudly running our Wadala campus since 1934 — 90+ years of trust and excellence.',
        links: [
          {
            link: {
              label: 'Enquire about admission',
              type: 'internal',
              reference: { relationTo: 'pages', value: contactPageId },
              appearance: 'primary',
            },
          },
        ],
      },

      /*
       * THE OPENING CLAIM, WITH A PHOTOGRAPH BESIDE IT.
       *
       * The section used to open on three prose blocks in a row. A parent
       * deciding between schools reads the first screen and skims the rest, so
       * the approach is stated once, plainly, next to a picture of it actually
       * happening — a Standard V room mid-lesson.
       */
      {
        blockType: 'mediaText',
        heading: 'A learner-centred secondary school',
        accentWord: 'learner-centred',
        headingLevel: 'h2',
        background: 'white',
        imagePosition: 'left',
        imageShape: 'rounded',
        ...(classroomAtWork ? { image: classroomAtWork } : {}),
        content: richText([
          'Standards V to X follow the Maharashtra State Board curriculum, taught in alignment with the National Education Policy 2020. The approach is competency-based: lessons are built to develop conceptual understanding rather than recall, and to give every student regular practice in critical thinking, creativity and problem-solving.',
          'Continuous assessment, project work and hands-on activity connect what happens in the classroom to life outside it — so a student leaves Standard X able to think, to explain their thinking, and to apply it.',
        ]),
      },

      {
        blockType: 'statistics',
        heading: 'SSC Examination 2026',
        accentWord: '2026',
        background: 'sea',
        stats: [
          { value: SSC_2026.percentage, label: 'Overall pass percentage' },
          { value: String(SSC_2026.appeared), label: 'Students appeared' },
          { value: String(SSC_2026.passed), label: 'Students passed' },
          { value: '60', label: 'Passed with Distinction' },
        ],
      },

      {
        blockType: 'featureList',
        heading: 'How the 2026 results broke down',
        headingLevel: 'h2',
        layout: 'cards',
        marker: 'tick',
        background: 'white',
        intro: richText([
          'Two hundred and fifteen students sat the examination and two hundred and fourteen passed.',
        ]),
        items: SSC_2026.grades,
      },

      /*
       * The subjects, as a scannable grid rather than a paragraph. This is the
       * question a parent moving a child between boards asks first, and a list
       * buried in prose makes them hunt for it.
       */
      {
        blockType: 'featureList',
        heading: 'What students study',
        accentWord: 'study',
        headingLevel: 'h2',
        layout: 'compact',
        marker: 'tick',
        background: 'tint',
        /*
         * Three lines, not three paragraphs — see `richTextLines`. Centred by
         * the compact layout, which puts `siws-centre` on the intro.
         */
        intro: richTextLines([
          '10 core subjects for Standards V to X',
          'Aligned with the Maharashtra State Board & NEP 2020',
          'building knowledge, skills, and values for the future.',
        ]),
        items: SUBJECTS,
      },

      {
        blockType: 'featureList',
        heading: 'How we teach',
        accentWord: 'teach',
        headingLevel: 'h2',
        layout: 'compact',
        marker: 'tick',
        background: 'white',
        intro: richText([
          'The methods used across the section, chosen so that understanding is built rather than memorised.',
        ]),
        items: METHODOLOGY,
      },

      /*
       * Co-curricular life, beside a photograph of it. The paragraph SIWS
       * supplied credits the teachers who run these programmes, which is worth
       * keeping — it is the part a prospectus usually leaves out.
       */
      {
        blockType: 'mediaText',
        heading: 'Beyond the classroom',
        accentWord: 'Beyond',
        headingLevel: 'h2',
        background: 'white',
        imagePosition: 'right',
        imageShape: 'rounded',
        ...(classroomActivity ? { image: classroomActivity } : {}),
        content: richText([
          'Sports, cultural performances, music, dance, art, debates and competitions run through the year, giving students room to find what they are good at outside an examination hall.',
          'Behind each one is the planning of the teachers who organise it — the encouragement that turns a student who has never entered a competition into one who does.',
        ]),
      },

      /*
       * The state's own recognition, photographed. SIWS left the
       * "accreditation" line of their document blank, but the certificate in
       * their photographs answers it: the wording here is exactly what the
       * certificate says, and nothing beyond it is claimed.
       */
      {
        blockType: 'mediaText',
        heading: 'Recognised by the State',
        accentWord: 'Recognised',
        headingLevel: 'h2',
        background: 'tint',
        imagePosition: 'left',
        imageShape: 'rounded',
        ...(recognition ? { image: recognition } : {}),
        content: richText([
          'S.I.W.S. High School was certified amongst the 100 Best Schools in Maharashtra under #SwachhtaMonitor 2023, awarded by the School Education and Sports Department, Government of Maharashtra.',
        ]),
      },

      {
        blockType: 'featureList',
        heading: 'Why families choose SIWS High School',
        accentWord: 'SIWS High School',
        headingLevel: 'h2',
        layout: 'cards',
        marker: 'tick',
        background: 'white',
        items: [
          {
            title: 'Experienced faculty',
            description:
              'Thirty-nine teachers, qualified to B.Ed., M.Ed., D.Ed. and postgraduate level, who upgrade their practice through regular training.',
            icon: 'staff',
          },
          {
            title: 'Smart boards in every classroom',
            description:
              'Technology-integrated instruction, with digital learning resources used as part of ordinary lessons rather than as an occasional treat.',
            icon: 'computers',
          },
          {
            title: 'Science and computer laboratories',
            description:
              'Well-equipped laboratories, a library and sports facilities on the Wadala campus.',
            icon: 'laboratory',
          },
          {
            title: 'A campus under CCTV surveillance',
            description:
              'Classrooms and premises are monitored throughout, with clean and secure surroundings and hygienic infrastructure.',
            icon: 'security',
          },
          {
            title: 'Sports, arts and community service',
            description:
              'Innovation, leadership, environmental awareness and community service run alongside the academic programme.',
            icon: 'activity',
          },
          {
            title: 'Ninety years in Wadala',
            description:
              'The Society has taught in this city since 1934, and a student can stay within it from Kindergarten to postgraduate study.',
            icon: 'study',
          },
        ],
      },

      {
        blockType: 'richText',
        heading: 'Where our students go next',
        accentWord: 'next',
        headingLevel: 'h2',
        width: 'narrow',
        background: 'sea',
        content: richText([
          'After the SSC examination, students move on to Junior College in the Science and Commerce streams according to their interests — and from there to degree colleges, professional courses and the careers that follow.',
        ]),
      },

      {
        blockType: 'callToAction',
        heading: 'Come and see the school for yourself',
        background: 'brand',
        text: richText(['Our admissions team is happy to talk you through the process.']),
        links: [
          {
            link: {
              label: 'Email the admissions team',
              type: 'external',
              url: 'mailto:admissions@siws.edu.in',
              appearance: 'primary',
            },
          },
        ],
      },
    ],
  })

  // ------------------------------------------------------------- ACADEMICS
  await upsert({
    slug: 'academics',
    title: 'Academics',
    intro:
      'Standards V to X, following the Maharashtra State Board curriculum in alignment with the National Education Policy 2020.',
    showInNav: true,
    navLabel: 'Academics',
    navOrder: 20,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'The Standards V to X curriculum at SIWS High School, Wadala — Maharashtra State Board, NEP 2020 aligned, with a learner-centred and competency-based approach.',
    layout: [
      {
        blockType: 'richText',
        heading: 'Our approach',
        accentWord: 'approach',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'Our Secondary Section (Standards V to X) follows the Maharashtra State Board curriculum in alignment with the National Education Policy (NEP) 2020. We adopt a learner-centred and competency-based approach that promotes conceptual understanding, critical thinking, creativity and problem-solving skills.',
          'Continuous assessment, project work, hands-on activities and real-life applications help students connect classroom learning with everyday life. We focus on nurturing academic excellence, communication skills, values, leadership qualities and holistic development, enabling every learner to become a confident, responsible and lifelong learner.',
        ]),
      },
      {
        blockType: 'featureList',
        heading: 'Subjects',
        accentWord: 'Subjects',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2',
        background: 'sea',
        items: SUBJECTS,
      },
      {
        blockType: 'featureList',
        heading: 'How we teach',
        accentWord: 'teach',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2',
        background: 'white',
        items: METHODOLOGY,
      },
      {
        blockType: 'richText',
        heading: 'How the year is organised',
        headingLevel: 'h2',
        width: 'narrow',
        background: 'tint',
        content: richText(['The academic year runs in two terms — Term I and Term II.']),
      },
      {
        blockType: 'richText',
        heading: 'Beyond the classroom',
        accentWord: 'Beyond',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'Our school strongly believes in the holistic development of students through a wide range of co-curricular activities. Throughout the year, programmes such as sports events, cultural performances, music, dance, art, debates and competitions are organised to nurture creativity, confidence, teamwork and leadership skills.',
          'Behind every successful event is the dedicated effort of our teachers, who plan, guide and motivate students to give their best. Their constant support and encouragement inspire students to discover their talents and shine with confidence. These activities make learning enjoyable and help shape well-rounded individuals ready to face the future.',
        ]),
      },
    ],
  })

  // -------------------------------------------------------------- TEACHERS
  await upsert({
    slug: 'teachers',
    title: 'Our teachers',
    // No headcount here either — the roster below already shows who they are,
    // and a printed number goes stale the moment somebody joins or leaves.
    intro: 'The teachers and support staff who teach across Standards V to X.',
    /*
     * OFF the menu here, and `seed:nav` puts it back in its drop-down.
     *
     * This used to set `showInNav: true` with a `navOrder` of its own, making
     * it a TOP-LEVEL item. The unit template already places it inside a
     * drop-down, so whichever script ran last won — and running this seed
     * after `seed:nav` climbed the page back out to the top row. Secondary
     * reached ten top-level items, 1229px of menu against a 1160px container,
     * and the buttons wrapped onto a second line.
     *
     * Simply omitting the field is NOT enough: `payload.update` keeps the
     * existing `show_in_nav` while clearing `nav_parent_id`, which promotes
     * the page instead of leaving it alone. Setting it false explicitly means
     * the worst this seed can do is drop the entry until `seed:nav` runs,
     * which is the documented order anyway — and a missing drop-down entry
     * is a far smaller fault than a menu that wraps.
     */
    showInNav: false,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Meet the teaching team at SIWS High School, Wadala — qualified, experienced staff across Standards V to X.',
    layout: [
      {
        blockType: 'richText',
        heading: 'A team that keeps learning too',
        accentWord: 'keeps learning',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'Our institution is proud to have a team of highly qualified, experienced and dedicated faculty members. They use innovative teaching methods to make learning engaging, interactive and student-centred, and provide individual attention to every child.',
          'They continuously upgrade their skills through regular training and professional development programmes. Their commitment, expertise and caring approach create a positive learning environment where every student is encouraged to learn, grow and succeed.',
        ]),
      },
      {
        blockType: 'faculty',
        heading: 'Meet the team',
        headingLevel: 'h2',
        campus: 'wadala',
        showQualifications: true,
        background: 'sea',
      },
    ],
  })

  // ---------------------------------------------------------- ACHIEVEMENTS
  await upsert({
    slug: 'achievements',
    title: 'Our results and achievements',
    /*
     * SIWS's own wording. The dash is an em dash rather than the hyphen it
     * was sent with, which is the only change: every other dash on the site
     * is one, and a spaced hyphen between two clauses reads as a typo.
     */
    /*
     * Not rendered while the first section carries the page heading: the
     * route prints one or the other, never both. Kept as the page's summary
     * in the CMS, and it reappears if that section is ever renamed.
     */
    intro: 'Out of 215 students who appeared, 214 passed — a 99.53% success rate.',
    /*
     * OFF the menu here, and `seed:nav` puts it back in its drop-down.
     *
     * This used to set `showInNav: true` with a `navOrder` of its own, making
     * it a TOP-LEVEL item. The unit template already places it inside a
     * drop-down, so whichever script ran last won — and running this seed
     * after `seed:nav` climbed the page back out to the top row. Secondary
     * reached ten top-level items, 1229px of menu against a 1160px container,
     * and the buttons wrapped onto a second line.
     *
     * Simply omitting the field is NOT enough: `payload.update` keeps the
     * existing `show_in_nav` while clearing `nav_parent_id`, which promotes
     * the page instead of leaving it alone. Setting it false explicitly means
     * the worst this seed can do is drop the entry until `seed:nav` runs,
     * which is the documented order anyway — and a missing drop-down entry
     * is a far smaller fault than a menu that wraps.
     */
    showInNav: false,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'SIWS High School, Wadala — 99.53% in the SSC Examination 2026, with 60 students passing with Distinction, and scholarship examination qualifiers.',
    layout: [
      /*
       * The three who topped the year, opening the page.
       *
       * Above the statistics rather than below them: the numbers are the
       * proof, but the faces are the reason anybody reads them.
       *
       * Omitted entirely when the photograph is not in the library, rather
       * than rendering an empty frame with a caption under it.
       */
      ...(toppers
        ? [
            {
              blockType: 'mediaText',
              image: toppers,
              imagePosition: 'left',
              /*
               * 1200x1600. An upright frame, or the wide one would keep the
               * middle of the picture and cut three faces out of it.
               */
              imageShape: 'portrait',
              /*
               * THE PAGE'S OWN HEADING, carried by this section.
               *
               * It used to be a bare photograph under a caption, with the page
               * title and its opening line printed on white above the band —
               * so the section had nothing at its top and the picture floated
               * in the middle of a tint that belonged to nothing. Because this
               * heading matches the page title, the route now hands its header
               * over to this block (see `hasOwnHeading` in the route) and the
               * title, the words and the photograph read as one band.
               */
              heading: 'Our results and achievements',
              accentWord: 'achievements',
              headingLevel: 'h1',
              /*
               * Tinted, not white. On white the photograph sat in a tall
               * empty band reading as leftover space rather than a section.
               * The tint closes it into a band of its own, and sets it off
               * against the deep blue statistics directly beneath it.
               */
              background: 'sea',
              /*
               * The page's opening line, given room to be a paragraph. Every
               * number in it is one the page already carries — 215, 214,
               * 99.53% and 60 are the four statistics in the band beneath —
               * so the prose says more without claiming more.
               */
              content: richText([
                'Two hundred and fifteen students of Standard X appeared for the SSC Examination of the Maharashtra State Board in 2026. Two hundred and fourteen of them passed — a success rate of 99.53%.',
                'Sixty of that group passed with Distinction. The full grade distribution, and the pupils who went on to qualify in the Scholarship Examination, are set out below.',
                "Pictured are the school's toppers for the year.",
              ]),
              cta: [],
            },
          ]
        : []),
      {
        blockType: 'statistics',
        heading: 'SSC Examination 2026',
        accentWord: '2026',
        background: 'sea',
        stats: [
          { value: SSC_2026.percentage, label: 'Overall pass percentage' },
          { value: String(SSC_2026.appeared), label: 'Students appeared' },
          { value: String(SSC_2026.passed), label: 'Students passed' },
          { value: '60', label: 'Passed with Distinction' },
        ],
      },

      {
        blockType: 'featureList',
        heading: 'Grade distribution',
        headingLevel: 'h2',
        marker: 'tick',
        // Four short items. Full width left them hanging off two half-margins.
        columns: '2-centre',
        background: 'white',
        intro: richText([
          'The South Indians’ Welfare Society High School proudly achieved an outstanding 99.53% result in the SSC Examination 2026. This exceptional achievement reflects the hard work of our students, the dedication of our teachers, and the continuous support of our parents.',
        ]),
        items: SSC_2026.grades,
      },
      {
        blockType: 'richText',
        heading: 'Scholarship Examination qualifiers, 2025–26',
        accentWord: 'qualifiers',
        headingLevel: 'h2',
        width: 'normal',
        background: 'tint',
        content: richText([
          'The South Indians’ Welfare Society High School, Wadala is proud to congratulate the students who have successfully qualified (पात्र) in the Pre-Upper Primary Scholarship Examination (Standard V) and the Pre-Secondary Scholarship Examination (Standard VIII) for the academic year 2025–26.',
          'Their hard work, dedication and perseverance have brought pride and honour to the school. We extend our heartfelt congratulations to the students, teachers and parents for this remarkable achievement.',
        ]),
      },
      {
        blockType: 'featureList',
        heading: 'Who qualified',
        headingLevel: 'h3',
        marker: 'tick',
        // Two items, so the spread was at its worst here.
        columns: '2-centre',
        background: 'white',
        items: Object.entries(SCHOLARSHIP_QUALIFIERS).map(([standard, names]) => ({
          title: standard,
          description: CHILD_NAMES_CONSENTED
            ? names.join(', ') + '.'
            : `${names.length} student${names.length === 1 ? '' : 's'} qualified.`,
        })),
      },
    ],
  })

  // ------------------------------------------------------- RULES & UNIFORM
  await upsert({
    slug: 'school-rules',
    title: 'School rules and uniform',
    intro: 'What we ask of pupils and parents, and what our pupils wear.',
    /*
     * OFF the menu here, and `seed:nav` puts it back in its drop-down.
     *
     * This used to set `showInNav: true` with a `navOrder` of its own, making
     * it a TOP-LEVEL item. The unit template already places it inside a
     * drop-down, so whichever script ran last won — and running this seed
     * after `seed:nav` climbed the page back out to the top row. Secondary
     * reached ten top-level items, 1229px of menu against a 1160px container,
     * and the buttons wrapped onto a second line.
     *
     * Simply omitting the field is NOT enough: `payload.update` keeps the
     * existing `show_in_nav` while clearing `nav_parent_id`, which promotes
     * the page instead of leaving it alone. Setting it false explicitly means
     * the worst this seed can do is drop the entry until `seed:nav` runs,
     * which is the documented order anyway — and a missing drop-down entry
     * is a far smaller fault than a menu that wraps.
     */
    showInNav: false,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'General rules, discipline and uniform guidelines for SIWS High School, Wadala — Standards V to X.',
    layout: [
      {
        blockType: 'featureList',
        heading: 'Uniform',
        accentWord: 'Uniform',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '1',
        background: 'white',
        items: UNIFORM,
      },
      {
        blockType: 'featureList',
        heading: 'General rules',
        headingLevel: 'h2',
        marker: 'number',
        columns: '1',
        background: 'sea',
        items: GENERAL_RULES.map((title) => ({ title })),
      },
    ],
  })

  payload.logger.info('Secondary content seeded.')

  if (!CHILD_NAMES_CONSENTED) {
    payload.logger.warn(
      'CHILD NAMES WITHHELD — the seven scholarship qualifiers in Standards V and VIII are named in SIWS’s document but are not published. They are children, and their names are personal data (DPDPA 2023). The achievement, the examinations and the counts per standard ARE published. Confirm parental consent, set CHILD_NAMES_CONSENTED to true in src/seed/secondary.ts, and re-run — the names are already in the file.',
    )
  }

  payload.logger.warn('LEFT BLANK by SIWS in the Secondary document:')
  for (const gap of [
    'Programme benefits',
    'Admission process — no age criteria and no application steps, so the admissions page still carries the generic placeholder',
    'Fee details, class-wise',
    'Day care / after-school care',
    'Accreditation and recognition — Primary claims "A Grade" from the Department of Education, but that must not be copied across to Secondary without confirmation',
    'Promotion criteria (only "I Term / II Term" was given)',
    'Parent testimonials, alumni achievements, press mentions, awards, certifications and institutional partnerships',
    'All photographs and videos, social media handles, and the four legal documents',
  ]) {
    payload.logger.warn(`  • ${gap}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
    if (Array.isArray(nested)) {
      console.error('Secondary seed failed. Field errors:')
      for (const item of nested) console.error('  •', JSON.stringify(item))
    } else {
      console.error('Secondary seed failed:', error)
    }
    process.exit(1)
  })
