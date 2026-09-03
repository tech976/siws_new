import { loadEnv } from '@/utilities/load-env'
import { findMediaId } from '@/utilities/media-lookup'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText, richTextLines } = await import('./lexical')
const { feedbackSection } = await import('./feedback-section')

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
 * The strands of the section's holistic approach, which SIWS asked on
 * 2026-09-01 to have highlighted rather than left implied.
 *
 * IT WAS ALREADY IN THE COPY, TWICE, AND BURIED BOTH TIMES. "Holistic
 * development" appears as the last item of a five-part list in the Academics
 * opening paragraph, and again in the first line of "Beyond the classroom".
 * A reader skimming either page meets the phrase in the middle of a sentence
 * about something else, which is the one place a claim cannot be read.
 *
 * So NOTHING BELOW IS NEW. Each strand is one SIWS already named — academic
 * excellence, communication skills, values, leadership qualities, and the
 * co-curricular programme — and each description is assembled from what this
 * same file already publishes about where that strand actually happens: the
 * methods above, the subject list, the timetabled P.T. and Art & Craft, and
 * the events named under "Beyond the classroom". Giving the idea its own
 * heading is the change; inventing a holistic programme the school has not
 * described would be a different and much worse one.
 *
 * `chip` is filled because these DO divide into groups and the panel layout
 * shows them — a one-word answer to "which part of a child is this about",
 * which is the whole argument for calling the approach holistic.
 */
const HOLISTIC = [
  {
    chip: 'Academics',
    title: 'Academic excellence',
    icon: 'thinking',
    description:
      'A competency-based curriculum built on conceptual understanding rather than recall, with critical thinking, creativity and problem-solving practised across all ten subjects.',
  },
  {
    chip: 'Expression',
    title: 'Communication skills',
    icon: 'communication',
    description:
      'Classroom discussions, debates, peer learning and collaborative projects give every student regular practice in explaining their thinking to somebody else.',
  },
  {
    chip: 'Character',
    title: 'Values',
    icon: 'care',
    description:
      'Named by the school among the things it sets out to nurture, so that a student leaves Standard X responsible as well as capable.',
  },
  {
    chip: 'Responsibility',
    title: 'Leadership qualities',
    icon: 'staff',
    description:
      'Competitions, cultural programmes and community service put students in charge of something real. The confidence and the teamwork follow from having done it, not from being told about it.',
  },
  {
    chip: 'The arts',
    title: 'Creativity',
    icon: 'music',
    description:
      'Music, dance, art and cultural performances run through the year, and Art & Craft is on the timetable as a subject in its own right.',
  },
  {
    chip: 'Health',
    title: 'Physical development',
    icon: 'sport',
    description:
      'P.T. is a timetabled subject rather than a free period, and sports events run through the year on the Wadala grounds.',
  },
  {
    chip: 'Citizenship',
    title: 'Environmental awareness and community service',
    icon: 'garden',
    description:
      'Innovation, environmental awareness and community service run alongside the academic programme rather than after it.',
  },
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
  {
    name: 'Mrs. Biny Thomas',
    designation: 'Assistant Head Mistress',
    qualifications: 'B.Sc., B.Ed.',
  },
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
  {
    name: 'Mrs. Anithajanaki Arunachalam',
    designation: 'Shikshan Sevak',
    qualifications: 'B.A., M.A., B.Ed.',
  },
  {
    name: 'Mr. Jagannath Suresh Arya',
    designation: 'Shikshan Sevak',
    qualifications: 'B.A., M.A., B.Ed., M.Ed.',
  },
  {
    name: 'Mrs. Dhanashri Madhukar Bansode',
    designation: 'Shikshan Sevak',
    qualifications: 'B.A., M.A., B.Ed., TET',
  },
  {
    name: 'Miss Ramalakshmi Lakshmanan',
    designation: 'Shikshan Sevak',
    qualifications: 'B.Sc., M.A., B.Ed., CTET',
  },
  { name: 'Mr. Selvin Rajkumar Joseph', qualifications: 'S.S.C., D.Ed.' },
  {
    name: 'Mrs. Ranjana Moses Brownson',
    qualifications: 'S.S.C., B.A., A.T.D., Dip. in Applied Art',
  },
  { name: 'Mrs. Aarti Rajesh Dubey', qualifications: 'H.S.C., B.A., D.Ed.' },
  { name: 'Mrs. Mamta Samil Loke', qualifications: 'H.S.C., B.A., M.A., D.Ed.' },
  { name: 'Mrs. Priya Dinesh Deore', qualifications: 'H.S.C., D.Ed.' },
  { name: 'Mrs. Vijitha Vikram Alur', qualifications: 'H.S.C., B.Com., D.Ed.' },
  { name: 'Mr. Vijay Ramdas Jadhav', qualifications: 'H.S.C., A.T.D. (Craft), A.M.' },
  { name: 'Mrs. Sejal Maclan D’Silva', qualifications: 'H.S.C., B.A., M.A., D.Ed.' },
  { name: 'Mr. Vikram Jayram Patil', qualifications: 'H.S.C., B.A., D.Ed.' },
  {
    name: 'Miss Bhavana Bhagwant Tuplondhe',
    qualifications: 'H.S.C., B.A., M.A., D.Ed., B.Ed., M.Ed.',
  },
  { name: 'Mrs. Ujjwala Mahesh Patil', qualifications: 'H.S.C., B.A., M.A., D.Ed.' },
  { name: 'Miss Supriya Shivaji Sonawane', qualifications: 'H.S.C., B.A., M.A., D.Ed.' },
  { name: 'Mr. Kandekar Sadanand Mahadev', qualifications: 'H.S.C., D.Ed., TET' },
  {
    name: 'Miss Jenisha Thomas',
    designation: 'Shikshan Sevak',
    qualifications: 'H.S.C., D.El.Ed., CTET',
  },

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

/**
 * The general rules, in the school’s own wording.
 *
 * With one substitution: the document says "pupils" throughout and the site
 * says "students" (SIWS, 2026-08-29). A synonym, so no rule means anything
 * different for it — but "verbatim" is now a word too strong for what this is.
 */
const GENERAL_RULES: string[] = [
  'Every student must possess a copy of the school calendar which must be brought daily to the school.',
  'Minimum attendance of 75% of the total number of working days is required to be fulfilled by all students.',
  'All students must come to school in the prescribed uniform. Uniform should be clean and well ironed.',
  'Students are expected to keep their hair and nails short. They are not permitted to colour their hair or sport any fashionable haircut.',
  'Students are responsible for the safe custody of their books and other belongings. They are requested not to wear any ornaments or watch for the sake of personal safety.',
  'Students should maintain discipline while moving in and out of the classroom when going to attend P.T., Mass, drill, Science Practicals, Computer seminars, etc.',
  'At all times a student is expected to communicate in English only.',
  'Irregular attendance, habitual idleness, late coming, wilful disobedience or misconduct and any form of indiscipline in the school will be seriously dealt with.',
  'All students are responsible to the school authorities for their behaviour inside the school.',
  'Any damage to school property, whether inside or outside the classrooms or within the school premises, will have to be made good by those responsible or by their parents or guardians. The decision of the school authorities regarding compensation payable to the school is final.',
  'Parents/guardians or others are not allowed to see their wards or meet their teacher during school hours without the prior consent of the Head Mistress.',
  'Any breach of discipline or disrespect to any members of the school staff will be dealt with seriously and students responsible for such misbehaviour will be summarily dismissed after proper warning to the student and parents/guardians.',
  'The school authorities maintain a record of the addresses and phone numbers of parents/guardians in the school office and for their own interest. Parents/guardians are requested to promptly intimate the changes, if any.',
  'Presents in cash or in kind to the teachers is not permitted. Collection of funds for any reason whatsoever within the school premises is also prohibited.',
  'Letters addressed to students in the school will not be delivered in the classrooms.',
  'Students are not permitted to bring unnecessary books, magazines, newspapers, periodicals or similar articles to the school. They must bring only dry food for the long recess.',
  'Students are forbidden to take part in any political or other organisation likely to result in violence or communal disturbance.',
  'Parents/guardians are earnestly requested to enforce regularity and discipline and see that their children do their homework and prepare their lessons daily as per the timetable. Parental cooperation is earnestly solicited not only for the benefit of the student but also for the smooth working of the school.',
  'Extracts from the Grant-in-Aid Code Rule 53, “Principles of Discipline”: regularity and implicit obedience are expected; politeness and courtesy of speech and conduct as well as cleanliness of dress and person are inculcated; students are made to realise that they are responsible to the school authorities not only for their conduct in the school but also for their general behaviour outside; and parents/guardians are given to understand that the management has the right to decide on what conditions they will admit or retain students, provided such conditions conform to the Grant-in-Aid Code and the instructions issued by the Director or concerned Educational Inspector from time to time.',
  'No school business will be transacted on Saturdays, Sundays and holidays.',
  'Any student who is persistently non-co-operative, or is repeatedly or wilfully mischievous, or is guilty of gross malpractices in connection with examinations, or has committed an act of serious indiscipline or misbehaviour, or who in the opinion of the Head of the School has an undesirable influence on fellow students, is liable to be expelled either permanently or removed for a specified period by the Head of School, with the reasons recorded in writing.',
  'Any report that signifies objectionable conduct even out of school premises on the part of a student shall make him or her liable for disciplinary action.',
  'Railway concession forms and other certificates — date of birth, bonafide student, first attempt, leaving certificate and similar — will be issued between 10.00 a.m. and 12.00 noon only.',
]

const UNIFORM = [
  {
    title: 'Girls',
    description:
      'Light blue striped shirt with collar and long sleeves up to the elbow. Dark blue skirt reaching below the knee. Blue belt. Sweater in navy blue only. Hair tied in two plaits with blue ribbon. Students are expected not to wear mehendi or nail polish, and to keep their nails short.',
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
/**
 * Eight pieces of parent feedback, sent by SIWS with the families' consent
 * (2026-08-29) and reproduced word for word.
 *
 * `attribution` is filled in because the record of who said a thing belongs
 * with the thing; the block is asked NOT to print it, since a heading reading
 * "What parents say" over eight cards each signed "Parent" is the same word
 * nine times. Same decision as the Kindergarten and Primary pages.
 */
const PARENT_QUOTES: { quote: string; attribution: string; detail?: string }[] = [
  {
    quote:
      'We’ve been happy with the teachers and the overall environment. Our child is doing well.',
    attribution: 'Parent',
  },
  {
    quote: 'The teachers are approachable and we can reach out whenever there’s an issue.',
    attribution: 'Parent',
  },
  {
    quote: 'My child has become much more independent with studies since joining SIWS.',
    attribution: 'Parent',
  },
  {
    quote: 'We’re quite happy with the academics and the way the teachers guide the students.',
    attribution: 'Parent',
  },
  {
    quote: 'The school has been good for our child. They’ve become more confident over the years.',
    attribution: 'Parent',
  },
  {
    quote:
      'We’ve had a good experience with SIWS so far. The teachers are supportive and involved.',
    attribution: 'Parent',
  },
  {
    quote:
      'The workload is definitely more now, but the teachers have been helpful whenever our child needs support.',
    attribution: 'Parent',
  },
  {
    quote: 'Overall, we’re happy with the school and feel our child is in a good environment.',
    attribution: 'Parent',
  },
]

const SSC_2026 = {
  appeared: 215,
  passed: 214,
  percentage: '99.53%',
  /*
   * A MARK PER BAND, ranked.
   *
   * These fell back to the neutral tick, so four identical checks stood under
   * four different headings — which tells a reader the four are the same
   * thing. Four marks that differ at a glance and rank in an obvious order.
   */
  grades: [
    { title: 'Distinction', description: '60 students.', icon: 'trophy' },
    { title: 'First Class', description: '99 students.', icon: 'medal' },
    { title: 'Second Class', description: '54 students.', icon: 'merit' },
    { title: 'Pass Class', description: '1 student.', icon: 'pass' },
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
      /*
       * NO LINE UNDER THE NAME. This read "Maharashtra State Board | Standards
       * V to X" until SIWS asked on 2026-09-02 to have it taken off.
       *
       * `null`, not omitted: this is a `payload.update`, which leaves a field
       * it is not given alone, so dropping the key would keep the old line in
       * a database that has already been seeded. The board and the range are
       * still on the page — the home hero carries both as its eyebrow, and
       * `description` below repeats them for search results.
       */
      tagline: null,
      description:
        'Standards V to X following the Maharashtra State Board curriculum, aligned with NEP 2020 — a learner-centred, competency-based approach at our Wadala campus.',
      /*
       * The section's contact number is the school's own landline.
       *
       * The header, the footer and the contact page each render a number only
       * when the unit carries one, so all three take this value. It is also
       * the number the five instructions in the body copy below already name
       * — telephoning the office to arrange a meeting with a teacher, to ask
       * about a route, to send feedback — so a reader now sees one number for
       * this section wherever they look.
       *
       * It replaces the Society's general mobile (+91 98927 03893), which the
       * school had asked for in the footer on 2026-08-29 and which the other
       * three units still carry. The `phone` field holds a single value and
       * becomes a `tel:` link, so it cannot hold both.
       */
      phone: '02224180877',
      email: 'info@siwsschool.edu.in',
      /*
       * WHERE THE FORMS ON THIS SECTION'S PAGES ARE DELIVERED.
       *
       * Both addresses are the ones this section's own Contact cards print —
       * admissions@ for Standards V to X, info@ for anything else. Neither was
       * set, so `actions/enquiry.ts` fell through to `email` and delivered
       * every admission enquiry to info@ while the card beside the form told
       * the parent it was going to admissions@.
       */
      admissionsEmail: 'admissions@siwsschool.edu.in',
      contactEmail: 'info@siwsschool.edu.in',
      feedbackEmail: 'info@siwsschool.edu.in',
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
   * THE PREFIX IS `secondary-section-`, not `secondary-`.
   *
   * These three read `secondary-...` and no such rows exist: `photos:import`
   * names a photograph after the folder it came from, and that folder is
   * "Secondary Section". Every lookup returned null, the three "Image with
   * text" blocks that require an image failed validation, and `seed:secondary`
   * could not complete at all — on any machine. It surfaced as a wall of field
   * errors about a required image rather than as a missing photograph.
   *
   * Every one is from SIWS's own Secondary folder — no picture from another
   * section appears on this site, because a Standard V parent looking at a
   * kindergarten classroom has been told something untrue about the school
   * their child would attend.
   */
  const photo = async (filename: string) => {
    // Suffix-tolerant — see `@/utilities/media-lookup`. An exact match missed
    // every photograph Payload had renamed on upload, and the page then
    // rendered without it.
    const id = await findMediaId(payload, filename)
    if (id === null) payload.logger.warn(`Photograph missing from the library: ${filename}`)
    return id
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
  const recognition = await photo('secondary-swachhta-framed.jpg')
  const toppers = await photo('secondary-toppers-2026-close.jpg')

  /*
   * The year's events, and the staff, sent by SIWS on 2026-09-02.
   *
   * Resolved as lists rather than named one by one: a wall of twenty is not a
   * composition anybody arranged, and naming each would put twenty variables
   * in this file to say "all of them".
   */
  const eventShots = (
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        photo(`secondary-event-${String(i + 1).padStart(2, '0')}.jpg`),
      ),
    )
  ).filter((id): id is number => typeof id === 'number')

  const staffShots = (
    await Promise.all(
      [
        'secondary-staff-group.jpg',
        'secondary-staffroom.jpg',
        'secondary-staff-onam.jpg',
        'secondary-staff-meditation.jpg',
        'secondary-staff-yoga.jpg',
      ].map((f) => photo(f)),
    )
  ).filter((id): id is number => typeof id === 'number')
  /*
   * Named `siws-` rather than `secondary-` because both were seeded before
   * anybody was filing photographs by section — but the alt text of each says
   * Secondary students in so many words, and `media.ts` now tags them to this
   * section. They are the only two of the six that no page was using.
   */
  const inTheHall = await photo('siws-yoga-meditation.jpg')
  const greenSkills = await photo('siws-green-skills.jpg')

  // --------------------------------------------------------------- CONTACT
  /** Seeded before `home`, which links to it — see the note in primary.ts. */
  const contactPageId = await upsert({
    slug: 'contact',
    title: 'Contact us',
    intro: 'Ask us about Standards V to X at Wadala.',
    showInNav: true,
    navLabel: 'Contact',
    navOrder: 50,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Contact SIWS High School, Wadala — reach the office about Standards V to X.',
    layout: [
      {
        /*
         * "Get in touch", not "Enquire about admission".
         *
         * SIWS asked on 2026-09-01 for the section to stop advertising an
         * admissions process, and this heading was the last place still doing
         * it. The form underneath is unchanged and still asks which standard
         * and which campus — that is what makes an enquiry answerable — but
         * the page now offers a conversation rather than an application.
         */
        blockType: 'heroEnquiry',
        title: 'Get in touch',
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
          title: 'Send us an enquiry',
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
            description: 'For enquiries about Standards V to X — admissions@siwsschool.edu.in',
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
            description: 'For anything else — info@siwsschool.edu.in, 02224180877',
          },
        ],
      },
      feedbackSection({ school: 'the school' }),
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
        /*
         * A MARQUEE RATHER THAN A STILL, at SIWS's request (2026-09-02), so
         * the banner changes every three seconds as the other sections' now
         * do. Every other field is the same on `heroMarquee` as on `hero`.
         *
         * NO BANNER SET WAS SUPPLIED FOR THIS SECTION. The Kindergarten and
         * Primary each sent a folder of banner photographs; Secondary did not,
         * so the set is drawn from the section's own library — the two
         * classroom photographs it already had, and the two of what happens
         * outside a lesson. Send a banner set and it replaces these.
         */
        blockType: 'heroMarquee',
        speed: 'brisk',
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
        images: [classroomActivity, classroomAtWork, greenSkills, inTheHall]
          .filter(Boolean)
          .map((image) => ({ image })),
        // Plain string: the hero's `intro` is a textarea, not rich text.
        intro:
          'From Standards V to X, we follow the Maharashtra State Board curriculum, updated in line with NEP 2020. Proudly running our Wadala campus since 1934 — 92+ years of trust and excellence.',
        /*
         * NO BUTTON. The banner carried "Enquire about admission", pointing at
         * Contact; SIWS asked on 2026-09-01 for the section to carry no
         * admission button, and this was the most prominent one on the site.
         *
         * `HeroBlock` renders the button row only when `links` has entries, so
         * omitting the field leaves the banner as type on the photograph
         * rather than as a panel with a gap where a button used to be. Contact
         * is still one tap away in the menu on every page.
         */
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
          'Out of 215 students who appeared, 214 passed with flying colors — 99.53% success rate.',
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

      /*
       * The same holistic approach as on Academics, in the same panels, on the
       * page a parent actually lands on.
       *
       * It used to follow a "How we teach" block, which listed the METHODS
       * while this one says what they are FOR. That block has been dropped
       * from the front page — the methods are on Academics, where a reader who
       * wants them goes — so this is now the ONLY panel section here, well
       * inside the "two at the outside" limit in docs/MASTER-LAYOUT.md §4.
       * Reusing HOLISTIC across both pages is how SUBJECTS already works in
       * this file, and it means the school revises this claim in one place.
       */
      {
        blockType: 'featureList',
        heading: 'A holistic approach to teaching',
        accentWord: 'holistic',
        headingLevel: 'h2',
        layout: 'panel',
        background: 'white',
        intro: richText([
          'We focus on nurturing academic excellence, communication skills, values, leadership qualities and holistic development, enabling every learner to become a confident, responsible and lifelong learner.',
        ]),
        items: HOLISTIC,
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
        background: 'tint',
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
        background: 'white',
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
        background: 'tint',
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
            title: '92+ years in Wadala',
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
              url: 'mailto:admissions@siwsschool.edu.in',
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
      /*
       * The holistic approach, given its own heading immediately after the
       * paragraph that used to be the only place it was mentioned.
       *
       * It sits BEFORE the subject list on purpose. "What do they study" and
       * "how do they teach" are both answered further down; this answers what
       * the section is trying to produce, which is the question those two only
       * make sense underneath.
       *
       * Panels rather than cards: seven short points a parent scans rather
       * than studies, and the only panel section on this page.
       */
      {
        blockType: 'featureList',
        heading: 'A holistic approach to teaching',
        accentWord: 'holistic',
        headingLevel: 'h2',
        layout: 'panel',
        background: 'tint',
        intro: richText([
          'We focus on nurturing academic excellence, communication skills, values, leadership qualities and holistic development, enabling every learner to become a confident, responsible and lifelong learner.',
          'These are not five programmes running side by side. The lesson that teaches a concept is where a student practises explaining it, and the year that runs the examinations is the year that runs the competitions.',
        ]),
        items: HOLISTIC,
      },
      {
        blockType: 'featureList',
        heading: 'Subjects',
        accentWord: 'Subjects',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2-centre',
        background: 'sea',
        items: SUBJECTS,
      },
      /*
       * COMPACT, not the two-column tick list it used to be, and not the panel
       * layout the front page used to carry either.
       *
       * The front-page copy of this block has been removed, so this is now the
       * only place the nine methods are published — which makes it worth the
       * layout that suits them. Every one is a bare label with no sentence
       * under it, and `FeatureCompact` exists for exactly that: an icon disc
       * beside the words, three across, tiles of equal height so the ragged
       * last row of nine-over-three stops showing.
       *
       * `marker` and `columns` are gone with it: compact draws its own icon
       * (a tick where an item has none) and sets its own flow, so both were
       * dead controls here.
       */
      {
        blockType: 'featureList',
        heading: 'How we teach',
        accentWord: 'teach',
        headingLevel: 'h2',
        layout: 'compact',
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

  // ---------------------------------------------------------------- EVENTS
  /*
   * THE MENU HAS POINTED HERE SINCE IT WAS BUILT AND NOTHING FILLED IT.
   *
   * `seed:nav` creates an Events entry under Updates for every section, and
   * the Kindergarten and Primary both write their own page behind it. This one
   * was a published page with an empty layout — a live link to nothing.
   *
   * A gallery rather than a card grid, because these are twenty photographs of
   * a year rather than a set of things to click. The `grid` layout is the
   * square-tiled wall the other sections use: one shape for every tile, so
   * mixed portrait and landscape uploads do not come out ragged, and
   * `.siws-flow` centres a short last row instead of stranding it left.
   */
  await upsert({
    slug: 'events',
    title: 'Events',
    intro: 'Celebrations, competitions and campaigns through the school year.',
    showInNav: false,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Events at SIWS Secondary School, Wadala — celebrations, competitions and campaigns through the school year.',
    layout:
      eventShots.length > 0
        ? [
            {
              blockType: 'gallery',
              heading: 'The year at SIWS Secondary',
              // Matched exactly, capital included — the field validates that
              // the word appears in the heading and 'the' is not 'The'.
              accentWord: 'The year',
              headingLevel: 'h1',
              background: 'white',
              layout: 'grid',
              perPage: '12',
              intro: richText([
                'A year of assemblies, competitions, campaigns and celebrations, photographed as they happened.',
              ]),
              images: eventShots.map((image) => ({ image, caption: '' })),
            },
          ]
        : [],
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
        /*
         * The same arrangement as Primary's roster, so a family moving between
         * the four sections meets one page rather than four.
         *
         * `campus` is left as it was and no longer filters: `teams` groups the
         * whole roster itself rather than being handed one team, and every one
         * of this section's forty-three teachers is tagged 'wadala', so the
         * page shows exactly who it showed before.
         */
        layout: 'teams',
        cardLayout: 'centred',
        campus: 'wadala',
        showQualifications: true,
        background: 'sea',
      },
      /*
       * THE STAFF AWAY FROM THE ROSTER, under it rather than among it.
       *
       * The block above is the roster — names, qualifications, one card each.
       * These five are the same people at Onam, in the staff room and at yoga
       * in the hall, and they answer a different question: not who teaches
       * here, but what it is like to work here. Mixing them into the roster
       * would put a group photograph where a person's card should be.
       *
       * The full staff photograph leads, because it is the one picture that
       * shows everybody, and a bento wall gives its first tile the 2x2.
       */
      ...(staffShots.length > 0
        ? [
            {
              blockType: 'gallery',
              heading: 'The staff through the year',
              accentWord: 'through the year',
              headingLevel: 'h2',
              background: 'white',
              layout: 'grid',
              perPage: '12',
              images: staffShots.map((image) => ({ image, caption: '' })),
            },
          ]
        : []),
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
                'Sixty of that group passed with Distinction. The full grade distribution, and the students who went on to qualify in the Scholarship Examination, are set out below.',
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
    ],
  })

  // ------------------------------------------------------- RULES & UNIFORM
  // ---------------------------------------------------------- PARENT FEEDBACK
  /*
   * The page carries only the four ways of reaching the school.
   *
   * SIWS has sent no parent quotes for the Secondary Section — the warning at
   * the foot of this file has said so from the start — and the drifting rows
   * that the Kindergarten and Primary pages use appear on their own the
   * moment `PARENT_QUOTES` has four or more in it. Inventing them is not an
   * option: a school's testimonials are the one thing on a site a family
   * takes entirely on trust.
   */
  await upsert({
    slug: 'parent-feedback',
    title: 'Parent feedback',
    intro:
      'What families tell us shapes how the school runs. If your child is with us, we would like to hear from you.',
    /*
     * OFF the menu here, and `seed:nav` puts it back inside its drop-down.
     *
     * This is a CHILD entry in the shared unit template. Setting it true from
     * a page seed makes it a TOP-LEVEL item, and whichever script ran last
     * wins — so running this seed after `seed:nav` climbed every child out
     * to the top row at once. Secondary reached thirteen top-level items and
     * the buttons wrapped onto a second line.
     *
     * Omitting the field is NOT enough: `payload.update` keeps the existing
     * `show_in_nav` while clearing `nav_parent_id`, which promotes the page
     * rather than leaving it alone. False explicitly means the worst this seed
     * can do is drop the entry until `seed:nav` runs — which is the
     * documented order anyway, and a missing drop-down entry is a far smaller
     * fault than a menu that wraps.
     */
    showInNav: false,
    navLabel: 'Parent Feedback',
    navOrder: 82,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Send your feedback to SIWS High School, Wadala — and read what parents of our Standard V to X students say.',
    layout: [
      ...(PARENT_QUOTES.length > 0
        ? [
            {
              blockType: 'testimonials',
              heading: 'What parents say',
              accentWord: 'parents',
              headingLevel: 'h2',
              background: 'white',
              /*
               * ONE row here, where Kindergarten and Primary run two.
               *
               * Those pages have ten quotes each, which split five and five
               * and give both rows a track worth watching. Eight would split
               * four and four — four cards make a track barely wider than the
               * viewport, so the loop point comes round often enough to
               * notice, and the section ends up twice as tall as eight quotes
               * justify. One row takes all eight and reads better for it.
               */
              layout: 'marquee-single',
              showAttribution: false,
              quotes: PARENT_QUOTES,
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
              'Anything about your own child — the work, the timetable, how they are settling — is usually answered fastest by the person who teaches them.',
          },
          {
            title: 'Ask the office for the Head Mistress',
            description:
              'For anything the class teacher cannot settle, the office will arrange a time. Please telephone rather than calling in, so somebody is free when you arrive.',
          },
          {
            title: 'Telephone the school on 02224180877',
            description:
              'The school office takes calls during working hours. Saturdays, Sundays and holidays are not office days.',
          },
          {
            title: 'Or write to us through the enquiry form',
            description:
              'The form on the Contact page reaches the school directly, and somebody will come back to you.',
          },
        ],
      },
    ],
  })

  await upsert({
    slug: 'school-rules',
    title: 'School rules and uniform',
    intro: 'What we ask of students and parents, and what our students wear.',
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

  // ----------------------------------------------------- FACILITIES & CAMPUS
  /*
   * The page the About drop-down has pointed at since the menu was built,
   * carrying a heading and nothing else.
   *
   * WHAT IT IS ALLOWED TO SAY. Three things about this campus are stated in
   * SIWS's own material: well-equipped science and computer laboratories,
   * CCTV throughout, and the #SwachhtaMonitor 2023 certificate. Two more are
   * implied by the rules, which tell students how to behave "when going to
   * attend P.T., Mass drill, Science Practicals, Computer seminars" — so there
   * is a hall and there are grounds, because the school tells children how to
   * walk to them.
   *
   * SMART BOARDS ARE NOT CLAIMED HERE. "Smart boards in every classroom" is in
   * the enquiry panel and on the home page, but SIWS asked for it off this
   * page (2026-08-29) because the every-classroom part is not confirmed. A
   * facilities page is where a reader goes to check such a thing, so it is
   * the last place to repeat one nobody is sure of.
   *
   * Nothing here adds a library, a canteen, a sick room or a bus. The warning
   * at the foot of this file lists what SIWS has not sent, and a facilities
   * page is the single easiest place to quietly invent a building.
   *
   * WHY IT IS BUILT ROUND PHOTOGRAPHS. A facilities page made of icon cards is
   * a list of claims; the point of one is to let somebody see the place. Two
   * of this section's six photographs — the hall and the veranda — were on no
   * page at all, and they are the two that show the campus rather than a
   * lesson. They carry the page, and the cards summarise underneath.
   */
  /** Looks a page of this section up by slug, drafts included. */
  const pageId = async (slug: string) => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: slug } }, { unit: { equals: secondary.id } }] },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    return docs[0]?.id ?? null
  }

  const galleryPageId = await (async () => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: 'gallery' } }, { unit: { equals: secondary.id } }] },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    if (!docs[0]) {
      payload.logger.warn(
        'Facilities: no Campus Gallery page yet, so the page is published without its closing link. Run npm run seed:galleries, then this seed again.',
      )
    }
    return docs[0]?.id ?? null
  })()

  await upsert({
    slug: 'facilities',
    title: 'Facilities & Campus',
    intro:
      'Laboratories for science and computing, a hall the whole school fits into, and grounds for P.T. — on a campus the State has certified for how it is kept.',
    /*
     * OFF the menu here, and `seed:nav` puts it back inside its drop-down.
     *
     * This is a CHILD entry in the shared unit template. Setting it true from
     * a page seed makes it a TOP-LEVEL item, and whichever script ran last
     * wins — so running this seed after `seed:nav` climbed every child out
     * to the top row at once. Secondary reached thirteen top-level items and
     * the buttons wrapped onto a second line.
     *
     * Omitting the field is NOT enough: `payload.update` keeps the existing
     * `show_in_nav` while clearing `nav_parent_id`, which promotes the page
     * rather than leaving it alone. False explicitly means the worst this seed
     * can do is drop the entry until `seed:nav` runs — which is the
     * documented order anyway, and a missing drop-down entry is a far smaller
     * fault than a menu that wraps.
     */
    showInNav: false,
    navLabel: 'Facilities & Campus',
    navOrder: 2,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'The SIWS High School campus in Wadala — science and computer laboratories, a school hall used for assembly and meditation, grounds for P.T., and CCTV surveillance throughout.',
    layout: [
      ...(inTheHall
        ? [
            {
              blockType: 'mediaText',
              heading: 'The school hall',
              accentWord: 'hall',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'left',
              imageShape: 'rounded',
              image: inTheHall,
              content: richText([
                'The same floor that holds a prize-giving in the evening holds a guided meditation in the morning. Rows of students in house-colour sports shirts, cross-legged on mats, eyes closed — mindfulness and focus practised together, at the scale a school hall allows.',
                'It is the room that makes the difference between a school that talks about wellbeing and one that timetables it.',
              ]),
            },
          ]
        : []),
      {
        blockType: 'featureList',
        heading: 'Around the campus',
        accentWord: 'campus',
        headingLevel: 'h2',
        layout: 'cards',
        background: 'sea',
        items: [
          {
            title: 'Science laboratories',
            icon: 'laboratory',
            description:
              'Well equipped, and used: Science Practicals are timetabled work from Standard V, not a demonstration at the front of a classroom.',
          },
          {
            title: 'Computer laboratories',
            icon: 'computers',
            description:
              'ICT is taught as a subject, and the Computer Section has a Head of Department and three teachers of its own.',
          },
          {
            title: 'A hall for the whole school',
            icon: 'activity',
            description:
              'Assemblies, mass drill, meditation, cultural performances, competitions and prize-giving — all of it happens in one room the school fits into.',
          },
          {
            title: 'Room for P.T. and sport',
            icon: 'sport',
            description:
              'Physical Training is on the timetable for every standard, alongside the sports and games that run through the year.',
          },
          {
            title: 'CCTV throughout',
            icon: 'security',
            description:
              'The campus is under surveillance across classrooms, corridors, entrances and common areas.',
          },
        ],
      },
      ...(greenSkills
        ? [
            {
              blockType: 'mediaText',
              heading: 'The school garden',
              accentWord: 'garden',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'right',
              imageShape: 'rounded',
              image: greenSkills,
              content: richText([
                'Sixteen students, two rows, each holding a plant they grew themselves. The veranda is where the saplings live, and looking after them is the lesson — a thing that has to be returned to every week rather than answered once.',
              ]),
            },
          ]
        : []),
      {
        blockType: 'richText',
        heading: 'Cleanliness and upkeep',
        accentWord: 'Cleanliness',
        headingLevel: 'h2',
        width: 'normal',
        background: 'sea',
        content: richText([
          'S.I.W.S. High School was certified amongst the 100 Best Schools in Maharashtra under #SwachhtaMonitor 2023, awarded by the School Education and Sports Department, Government of Maharashtra. The certificate itself is on the home page.',
          'It is an award for how a campus is kept rather than for what is taught in it, which is why it belongs on this page: the classrooms, corridors and grounds described above are the thing that was inspected.',
        ]),
      },
      ...(galleryPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'See the campus for yourself',
              background: 'brand',
              text: richText([
                'Photographs of the classrooms, the hall, the veranda and the prizes — filed by subject, and any of them opens full size.',
              ]),
              links: [
                {
                  link: {
                    label: 'Open the gallery',
                    type: 'internal',
                    reference: { relationTo: 'pages', value: galleryPageId },
                    appearance: 'primary',
                  },
                },
              ],
            },
          ]
        : []),
    ],
  })

  // ------------------------------------- PAGES THE OTHER PAGES LINK ACROSS TO
  /*
   * ADMISSIONS AND ADMISSIONS FAQ WERE DELETED HERE ON 2026-09-01, at SIWS's
   * request: the section is not to carry an admissions tab, an admissions
   * button or an admissions FAQ.
   *
   * What stood here were two pages built entirely out of what WAS settled —
   * the standards, the board, last year's results, the Grant-in-Aid Code
   * terms, and the office's own address for everything the school had left
   * blank. The process itself was never supplied, which is recorded in the
   * warning at the foot of this file and is why those pages ended at the
   * office rather than at a form.
   *
   * Nothing has been moved onto another page to compensate. A family that
   * wants to ask still reaches the office through Contact, which is the route
   * those pages pointed at anyway; what has gone is the claim that this
   * section publishes an admissions process.
   *
   * Two of the four page ids declared with them are still wanted by pages
   * further down, so they survive here. `academicsPageId` and
   * `admissionsFaqPageId` went with the pages that were their only readers.
   */
  const achievementsPageId = await pageId('achievements')
  const facilitiesPageId = await pageId('facilities')

  // --------------------------------------- UPDATES, STUDENT LIFE, TRANSPORT
  /*
   * Six pages that carried a heading and nothing else.
   *
   * TWO CONSTRAINTS SHAPE ALL OF THEM.
   *
   * The first is photographs: this section has six, and two of those are a
   * certificate and a prize-giving. So the same pictures necessarily appear
   * on more than one page, and each page has to earn its place by the
   * question it answers rather than by having pictures of its own:
   *
   *   Updates      — what has happened lately, and where the rest of it is
   *   News         — the things worth telling you, with the photographs
   *   Student Life — what school is like beyond the timetable
   *   Student Wall — what the students themselves have done
   *   Transport    — how a child gets here, and who to ask
   *   FAQ          — for a family whose child is already here
   *
   * The second is that SIWS has sent nothing about transport — no operator,
   * no route, no fare. `institution.ts` names Transport as a page left blank
   * for exactly that reason, and the page below is written around it rather
   * than inventing a bus.
   *
   * "Students" and "children" throughout, never "students" (SIWS, 2026-08-29).
   * The rules and uniform page still quotes the school's own wording, which
   * uses the older word; these pages are the school talking to a parent.
   */
  const newsShots = {
    toppers,
    recognition,
    inTheHall,
    greenSkills,
    classroom: classroomActivity,
    craft: classroomAtWork,
  }

  /*
   * The three standing notices the office repeats most often. All three are
   * on the rules page; they are here because a parent looking for opening
   * hours goes to Updates, not to a page about uniform.
   */
  const OFFICE_NOTICES = [
    {
      title:
        'Railway concession forms and other certificates — date of birth, bonafide student, first attempt, leaving certificate and similar — are issued between 10.00 a.m. and 12.00 noon only.',
    },
    { title: 'No school business is transacted on Saturdays, Sundays and holidays.' },
    {
      title:
        'A minimum attendance of 75% of the total number of working days is required of every student.',
    },
  ]

  // ------------------------------------------------------------- TRANSPORT
  await upsert({
    slug: 'transport',
    title: 'Transport',
    intro: 'How children reach the school, and who to ask about the part we cannot publish.',
    showInNav: false,
    navLabel: 'Transport',
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Getting to SIWS High School in Wadala — railway concession forms, arriving and being collected, and who to ask about travel arrangements.',
    layout: [
      /*
       * THIS PAGE DOES NOT LIST A BUS ROUTE, AND THAT IS THE POINT.
       *
       * Two things ARE known and are what most families actually need: the
       * school issues railway concession forms, at a stated hour, and it has
       * a rule about who may come onto the campus during the day. Those are
       * here, and the one unknown is handed to the office rather than guessed
       * at. An invented route outlives the placeholder it replaced.
       */
      {
        blockType: 'featureList',
        heading: 'What the school can help with',
        accentWord: 'help with',
        headingLevel: 'h2',
        layout: 'cards',
        background: 'sea',
        items: [
          {
            title: 'Railway concession forms',
            icon: 'transport',
            description:
              'Issued by the school office between 10.00 a.m. and 12.00 noon only — as are date of birth, bonafide student, first attempt and leaving certificates.',
          },
          {
            title: 'Arriving and being collected',
            icon: 'security',
            description:
              'Entrances, corridors and common areas are covered by CCTV, and movement between rooms is supervised.',
          },
          {
            title: 'Anything else about travel',
            icon: 'communication',
            description:
              'Ask the office on 02224180877. Questions about your own route are answered better by somebody who knows this year’s arrangements than by a page.',
          },
        ],
      },
      {
        blockType: 'richText',
        heading: 'Coming onto the campus',
        accentWord: 'campus',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'Parents and guardians are asked not to come in to see a child or a teacher during school hours without the prior consent of the Head Mistress. It is not a formality — it is how the school knows exactly who is on the campus while the children are in it.',
        ]),
      },
      ...(contactPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'Ask about your route',
              background: 'brand',
              text: richText([
                'Tell us where your child will be travelling from and the office will tell you what is possible.',
              ]),
              links: [
                {
                  link: {
                    label: 'Contact the school',
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

  // ----------------------------------------------------------- STUDENT WALL
  await upsert({
    slug: 'student-wall',
    title: 'Student Wall',
    intro:
      'What the students themselves have done this year — in the examination hall, on the stage, and on the veranda.',
    showInNav: false,
    navLabel: 'Student Wall',
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'The students of SIWS High School, Wadala — 99.53% in the SSC Examination 2026, scholarship examination qualifiers, and the work they do beyond the classroom.',
    layout: [
      ...(newsShots.craft
        ? [
            {
              blockType: 'mediaText',
              heading: 'Work made by students',
              accentWord: 'made by students',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'left',
              imageShape: 'rounded',
              image: newsShots.craft,
              content: richText([
                'Everything on this page was done by students in Standards V to X. Not what the school offers them — what they did with it.',
                'A full classroom at work with coloured paper and scissors is as much a part of that record as an examination result, and it is the part a visitor is least likely to be shown.',
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
            title: 'In the examination hall',
            icon: 'trophy',
            description:
              '215 students sat the S.S.C. Examination in 2026 and 214 passed, sixty of them with Distinction.',
          },
          {
            title: 'In the scholarship examinations',
            icon: 'merit',
            description:
              'Seven students qualified in the Pre-Upper Primary and Pre-Secondary Scholarship Examinations in 2025–26 — State examinations sat in Standards V and VIII.',
          },
          {
            title: 'On the stage',
            icon: 'music',
            description:
              'Cultural performances, music, dance and art run through the year, planned and rehearsed with the teachers who organise them.',
          },
          {
            title: 'In debate and competition',
            icon: 'communication',
            description:
              'Debates and inter-house competitions, where the point is to speak in front of people who might disagree.',
          },
          {
            title: 'On the sports field',
            icon: 'sport',
            description:
              'Sports events through the year, alongside P.T. and mass drill on the timetable for every standard.',
          },
          {
            title: 'Looking after something',
            icon: 'garden',
            description:
              'Sixteen students grew the saplings on the veranda themselves — a thing that has to be returned to every week rather than answered once.',
          },
        ],
      },
      ...(achievementsPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'See the record in full',
              background: 'white',
              text: richText([
                'The 2026 grade distribution, the scholarship qualifiers, and the photographs from the day.',
              ]),
              links: [
                {
                  link: {
                    label: 'Open Achievements',
                    type: 'internal',
                    reference: { relationTo: 'pages', value: achievementsPageId },
                    appearance: 'primary',
                  },
                },
              ],
            },
          ]
        : []),
    ],
  })

  // ------------------------------------------------------------ STUDENT LIFE
  await upsert({
    slug: 'student-life',
    title: 'Student Life',
    intro:
      'What the day holds beyond the timetable — the stage, the sports field, the veranda, and the habits a student leaves with.',
    showInNav: true,
    navLabel: 'Student Life',
    navOrder: 70,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Life at SIWS High School, Wadala beyond the classroom — sports, cultural performances, music, dance, art, debates and competitions for Standards V to X.',
    layout: [
      ...(newsShots.greenSkills
        ? [
            {
              blockType: 'mediaText',
              heading: 'School is more than the timetable',
              accentWord: 'more than',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'left',
              imageShape: 'rounded',
              image: newsShots.greenSkills,
              content: richText([
                'A student spends six years here, from Standard V to the S.S.C. Examination, and the part they remember is rarely the part that was examined. It is the term they were trusted to lead something, the afternoon they argued a case in front of the school, the plant that was theirs to keep alive.',
                'The school runs a wide range of co-curricular activities through the year for exactly that reason — and behind every one of them is a teacher who planned it.',
              ]),
            },
          ]
        : []),
      {
        blockType: 'featureList',
        heading: 'What runs through the year',
        accentWord: 'the year',
        headingLevel: 'h2',
        layout: 'cards',
        background: 'sea',
        items: [
          {
            title: 'Sports events',
            icon: 'sport',
            description:
              'Alongside P.T. and mass drill, which are on the timetable for every standard rather than an optional extra.',
          },
          {
            title: 'Cultural performances',
            icon: 'activity',
            description:
              'Programmes staged in the school hall, rehearsed over weeks with the teachers who organise them.',
          },
          {
            title: 'Music, dance and art',
            icon: 'music',
            description:
              'Art & Craft is a timetabled subject from Standard V, and the performing arts run beside it through the year.',
          },
          {
            title: 'Debates and competitions',
            icon: 'communication',
            description:
              'Where confidence is built by having to hold a position in front of people who might disagree with it.',
          },
          {
            title: 'Science practicals and computer seminars',
            icon: 'laboratory',
            description:
              'Timetabled laboratory work and seminars in the computer laboratories, taught by the Computer Section’s own staff.',
          },
          {
            title: 'Mindfulness and meditation',
            icon: 'care',
            description:
              'Guided sessions in the school hall — wellbeing given a place on the timetable rather than a mention in a prospectus.',
          },
        ],
      },
      /*
       * The expectations belong on this page, not only on the rules page.
       * They are as much a part of what daily life here is like as the
       * activities above, and a family reading about student life is entitled
       * to meet them before they meet them.
       */
      {
        blockType: 'richText',
        heading: 'What is expected in return',
        accentWord: 'expected',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'Students are expected to communicate in English at all times, to attend at least 75% of the working days in the year, and to come to school in a clean, well-ironed uniform with hair and nails kept short.',
          'Discipline is expected in the ordinary movements of the day too — going out to P.T., to mass drill, to science practicals and to computer seminars. The full list is on the rules and uniform page, in the school’s own words.',
        ]),
      },
      ...(galleryPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'See a year of it',
              background: 'sea',
              text: richText([
                'The classrooms, the hall, the veranda and the prizes — filed by subject, and any of them opens full size.',
              ]),
              links: [
                {
                  link: {
                    label: 'Open the gallery',
                    type: 'internal',
                    reference: { relationTo: 'pages', value: galleryPageId },
                    appearance: 'primary',
                  },
                },
              ],
            },
          ]
        : []),
    ],
  })

  // ------------------------------------------------------------------ SPORTS
  /*
   * SPORT, ON ITS OWN PAGE, at SIWS's instruction (2026-09-02) to give every
   * section a Sports entry in its menu.
   *
   * The two photographs are the reason this page can say anything specific at
   * all. They were in `media/` and in no seed — carried in by a
   * `photos:import` whose inbox is not in version control — and the banner in
   * the first of them is the only record on this site of the SIWS Sports
   * Academy or of the league it runs: "S.I.W.S. Sports Academy — South Indian
   * Welfare School presents the Inter School Football League 2023-24, age
   * categories U14 and U17 (Boys & Girls)."
   *
   * The page states that and no more of it. It does not say how many schools
   * entered, who won, or whether the league has run since — none of which is
   * legible in the photograph, and all of which would be invention. Those
   * questions go to SIWS in the warnings at the foot of this seed.
   *
   * NOT USED HERE, deliberately: the Swachhta Monitor certificate is awarded
   * by the "School Education and SPORTS Department, Government of
   * Maharashtra". It is a cleanliness award from a department with sport in
   * its name, and putting it on a sports page would read as a sporting
   * honour. It stays on Achievements, where it is described for what it is.
   */
  const footballShots = {
    teams: await photo('secondary-football-league-teams.jpg'),
    kickoff: await photo('secondary-football-league-kickoff.jpg'),
  }

  await upsert({
    slug: 'sports',
    title: 'Sports',
    intro:
      'P.T. and mass drill on the timetable for every standard, sports events through the year on the Wadala grounds, and the inter-school football league the SIWS Sports Academy runs.',
    /*
     * OFF the menu here, and `seed:nav` puts it back INSIDE the Student Life
     * drop-down. Sports is a child entry in the shared unit template, and
     * `show_in_nav` set from a page seed makes it a TOP-LEVEL item — so on a
     * machine where this seed ran last, the section would carry Sports twice:
     * once in the bar and once under Student Life.
     */
    showInNav: false,
    navLabel: 'Sports',
    navOrder: 71,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Sport at SIWS High School, Wadala — Physical Training timetabled for every standard from V to X, sports events on the Wadala grounds, and the SIWS Sports Academy inter-school football league.',
    layout: [
      {
        blockType: 'featureList',
        heading: 'What sport looks like here',
        accentWord: 'sport',
        headingLevel: 'h2',
        marker: 'number',
        columns: '1',
        background: 'white',
        items: [
          {
            title: 'P.T. is a timetabled subject, not a free period',
            description:
              'Physical Training is on the timetable for every standard from V to X, alongside mass drill — which is to say the school treats it as teaching rather than as the gap between two lessons.',
          },
          {
            title: 'Sports events run through the year',
            description:
              'On the Wadala grounds, alongside the cultural performances, debates and competitions the rest of the co-curricular year is made of.',
          },
          {
            title: 'The turf pitch, and the hall behind it',
            description:
              'A netted turf pitch for games and matches, with the school hall — where assemblies, mass drill, meditation and prize-giving all happen — a few steps away.',
          },
          {
            title: 'The SIWS Sports Academy’s inter-school football league',
            description:
              'The Society runs an Inter School Football League in age categories U14 and U17, for boys and girls, played on the school’s own pitch.',
          },
        ],
      },
      ...(footballShots.teams
        ? [
            {
              /*
               * The teams lined up under the banner, set as a picture-and-text
               * band rather than dropped into a gallery of two. Two photographs
               * in a grid read as the remains of a set; one photograph beside
               * the paragraph it illustrates reads as a choice.
               */
              blockType: 'mediaText',
              heading: 'The Inter School Football League',
              accentWord: 'Football League',
              headingLevel: 'h2',
              background: 'sea',
              imagePosition: 'right',
              /*
               * PORTRAIT, not the wide default. Both league photographs are
               * 900x1600 — taller than the 1200x1600 the `portrait` shape was
               * written for — and the wide frame keeps the middle two fifths
               * of that, which on a line of footballers standing to be greeted
               * is their shorts. The square frame loses a quarter instead, and
               * the focal point decides which quarter.
               */
              imageShape: 'portrait',
              image: footballShots.teams,
              content: richText([
                'The SIWS Sports Academy runs an Inter School Football League on the school’s own turf pitch, in two age categories — under-14 and under-17 — for boys and girls.',
                'The teams line up on the pitch to be greeted before play starts, in front of the league banner, in kit. It is the one fixture in the school year that brings other schools onto this campus to compete.',
              ]),
            },
          ]
        : []),
      ...(footballShots.kickoff
        ? [
            {
              /*
               * The second band alternates to the left, so the two photographs
               * read as a sequence rather than as a column. A gallery was the
               * obvious block for a lone picture and the wrong one: a grid
               * holding one tile looks like a grid that failed to load the
               * other eight.
               */
              blockType: 'mediaText',
              heading: 'Kick-off',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'left',
              /*
               * PORTRAIT, not the wide default. Both league photographs are
               * 900x1600 — taller than the 1200x1600 the `portrait` shape was
               * written for — and the wide frame keeps the middle two fifths
               * of that, which on a line of footballers standing to be greeted
               * is their shorts. The square frame loses a quarter instead, and
               * the focal point decides which quarter.
               */
              imageShape: 'portrait',
              image: footballShots.kickoff,
              content: richText([
                'The league is started on the school’s own pitch, with the ball placed at the centre spot and the staff who organised it standing over it.',
                'It is a small ceremony and it is the point of the thing: the fixture is hosted here, so the students playing in it are on their own ground.',
              ]),
            },
          ]
        : []),
      ...(galleryPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'See a year of it',
              background: 'sea',
              text: richText([
                'The classrooms, the hall, the veranda and the prizes — filed by subject, and any of them opens full size.',
              ]),
              links: [
                {
                  link: {
                    label: 'Open the gallery',
                    type: 'internal',
                    reference: { relationTo: 'pages', value: galleryPageId },
                    appearance: 'primary',
                  },
                },
              ],
            },
          ]
        : []),
    ],
  })

  // -------------------------------------------------------------------- NEWS
  const newsPageId = await upsert({
    slug: 'news',
    title: 'News & Events',
    intro: 'What has happened at the school lately, newest first.',
    showInNav: false,
    navLabel: 'News & Events',
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'News from SIWS High School, Wadala — 99.53% in the SSC Examination 2026, scholarship examination qualifiers, and recognition under #SwachhtaMonitor 2023.',
    layout: [
      /*
       * Two across rather than three. Each of these has a photograph worth
       * looking at and two sentences under it; at three across the picture
       * comes out the size of a thumbnail and the story reads as a caption.
       */
      {
        blockType: 'cardGrid',
        heading: 'Lately at the school',
        accentWord: 'Lately',
        headingLevel: 'h2',
        background: 'white',
        columns: '2',
        placedBySeed: true,
        cards: [
          ...(newsShots.toppers
            ? [
                {
                  title: '99.53% in the S.S.C. Examination 2026',
                  image: newsShots.toppers,
                  description:
                    '215 students appeared and 214 passed. Sixty came away with Distinction, 99 in the First Class and 54 in the Second Class.',
                  ...(achievementsPageId
                    ? {
                        cta: [
                          {
                            link: {
                              label: 'See the full result',
                              type: 'internal',
                              reference: { relationTo: 'pages', value: achievementsPageId },
                            },
                          },
                        ],
                      }
                    : {}),
                },
              ]
            : []),
          ...(newsShots.recognition
            ? [
                {
                  title: 'Amongst the 100 Best Schools in Maharashtra',
                  image: newsShots.recognition,
                  // A certificate, not a photograph: cropped it loses the
                  // heading off the top and the signature off the foot.
                  fit: 'whole',
                  description:
                    'S.I.W.S. High School was certified under #SwachhtaMonitor 2023 by the School Education and Sports Department, Government of Maharashtra — an award for how the campus is kept.',
                  ...(facilitiesPageId
                    ? {
                        cta: [
                          {
                            link: {
                              label: 'See the campus',
                              type: 'internal',
                              reference: { relationTo: 'pages', value: facilitiesPageId },
                            },
                          },
                        ],
                      }
                    : {}),
                },
              ]
            : []),
          ...(newsShots.inTheHall
            ? [
                {
                  title: 'Mindfulness, in the school hall',
                  image: newsShots.inTheHall,
                  description:
                    'Rows of students on mats in the hall for a guided meditation — wellbeing given a place on the timetable rather than a mention in a prospectus.',
                },
              ]
            : []),
          ...(newsShots.greenSkills
            ? [
                {
                  title: 'Sixteen students, sixteen saplings',
                  image: newsShots.greenSkills,
                  description:
                    'Green skills grown on the veranda, each plant raised by the student holding it. Looking after something is a lesson that has to be returned to every week.',
                },
              ]
            : []),
        ],
      },
      {
        blockType: 'richText',
        heading: 'Scholarship Examination qualifiers, 2025–26',
        accentWord: 'qualifiers',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'Seven students qualified in the Pre-Upper Primary Scholarship Examination (Standard V) and the Pre-Secondary Scholarship Examination (Standard VIII) for the academic year 2025–26 — five in Standard V and two in Standard VIII.',
          'Both are State examinations, and the school prepares candidates for them alongside the ordinary year’s work.',
        ]),
      },
      {
        blockType: 'announcements',
        heading: 'From the school office',
        items: OFFICE_NOTICES,
        background: 'sea',
      },
    ],
  })

  // ---------------------------------------------------------------- UPDATES
  await upsert({
    slug: 'updates',
    title: 'Updates',
    intro:
      'News, results and recognition from the Secondary Section, and where to find each of them.',
    showInNav: true,
    navLabel: 'Updates',
    navOrder: 60,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Updates from SIWS High School, Wadala — the 2026 SSC result, scholarship examination qualifiers, and news from across the Secondary Section.',
    layout: [
      /*
       * The overview leads with the single biggest thing that has happened
       * rather than with a row of cards. A hub page that opens on three equal
       * boxes tells a parent where to click and nothing about the school; this
       * way the first thing on the page is news, and the navigation follows.
       */
      ...(newsShots.toppers
        ? [
            {
              blockType: 'mediaText',
              heading: '99.53% in the S.S.C. Examination 2026',
              accentWord: '99.53%',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'left',
              imageShape: 'rounded',
              image: newsShots.toppers,
              content: richText([
                'Two hundred and fifteen students of Standard X appeared for the S.S.C. Examination of the Maharashtra State Board in 2026, and two hundred and fourteen of them passed. Sixty passed with Distinction.',
              ]),
              ...(achievementsPageId
                ? {
                    cta: [
                      {
                        link: {
                          label: 'See the full result',
                          type: 'internal',
                          reference: { relationTo: 'pages', value: achievementsPageId },
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
              'What has happened lately — results, recognition, and the notices the office repeats most often.',
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
            title: 'Achievements',
            description:
              'The 2026 grade distribution in full, and the students who qualified in the State scholarship examinations.',
            ...(achievementsPageId
              ? {
                  cta: [
                    {
                      link: {
                        label: 'See the honours',
                        type: 'internal',
                        reference: { relationTo: 'pages', value: achievementsPageId },
                      },
                    },
                  ],
                }
              : {}),
          },
        ],
      },
      {
        blockType: 'announcements',
        heading: 'Standing notices',
        items: OFFICE_NOTICES,
        background: 'white',
      },
    ],
  })

  // ---------------------------------------------------------------------- FAQ
  /*
   * The general FAQ deliberately answers NOTHING about admission.
   *
   * It used to be one of two FAQ pages, split by WHEN somebody was asking:
   * Admissions FAQ for a family deciding whether to apply, this one for a
   * family whose child is already here, with a card at the foot linking
   * across. SIWS asked on 2026-09-01 for everything about admission to come
   * off this section, so the other page and that card have both gone and this
   * is the section's only FAQ.
   *
   * The scope has NOT widened to fill the gap. Nothing here answers how to
   * apply, because the process was never supplied — inventing it now, with
   * the page that used to send the question to the office deleted, would be
   * the one way this removal could mislead somebody.
   */
  await upsert({
    slug: 'faq',
    title: 'FAQ',
    intro: 'The questions parents of students already in Standards V to X ask most often.',
    showInNav: true,
    navLabel: 'FAQ',
    navOrder: 80,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Answers for parents of SIWS High School students — attendance, uniform, what to bring, how the curriculum is taught, and how to reach a teacher or the office.',
    layout: [
      {
        blockType: 'accordion',
        heading: 'The school day',
        accentWord: 'school day',
        headingLevel: 'h2',
        background: 'white',
        allowMultipleOpen: false,
        items: [
          {
            question: 'What must my child bring to school every day?',
            answer: richText([
              'A copy of the school calendar, which every student must have and bring daily. Only dry food for the recess, and nothing beyond the books the day needs — magazines, newspapers and periodicals are not to be brought in.',
            ]),
          },
          {
            question: 'What is the uniform?',
            answer: richText([
              'Girls wear a light blue striped shirt with a collar and long sleeves to the elbow, a dark blue skirt below the knee, a blue belt and a navy blue sweater, with hair in two plaits and blue ribbon. Boys in Standards V to VII wear a light blue striped half shirt and dark blue half pants; Standards VIII to X the same shirt with full pants.',
              'The uniform is expected to be clean and well ironed. Hair and nails are kept short, hair is not to be coloured, and mehendi and nail polish are not worn.',
            ]),
          },
          {
            question: 'How much attendance is required?',
            answer: richText([
              'A minimum of 75% of the total number of working days in the year. Irregular attendance and late coming are treated seriously.',
            ]),
          },
          {
            question: 'What language is spoken at school?',
            answer: richText([
              'English, at all times. It is a school rule rather than a preference, and it is one of the reasons the section is confident about how its students speak by Standard X.',
            ]),
          },
        ],
      },
      {
        blockType: 'accordion',
        heading: 'Lessons and progress',
        accentWord: 'progress',
        headingLevel: 'h2',
        background: 'sea',
        allowMultipleOpen: false,
        items: [
          {
            question: 'What is my child taught?',
            answer: richText([
              'Ten subjects across Standards V to X: English, Marathi, Hindi, Sanskrit, Mathematics, Science, Social Science, ICT, PT and Art & Craft — on the Maharashtra State Board curriculum, aligned with NEP 2020, in English medium.',
            ]),
          },
          {
            question: 'How is it taught?',
            answer: richText([
              'Activity-based and experiential learning, peer and group work, collaborative projects, classroom discussion, technology-integrated instruction, project work, and real-life application of what is covered in class.',
              'Assessment is continuous rather than saved up for one paper at the end.',
            ]),
          },
          {
            question: 'How much homework should I expect?',
            answer: richText([
              'Enough that it needs doing daily. Parents are earnestly asked to enforce regularity and discipline, and to see that their children do their homework and prepare their lessons as the timetable requires.',
            ]),
          },
          {
            question: 'Can my child sit the scholarship examinations?',
            answer: richText([
              'Yes. Students here sit the Pre-Upper Primary Scholarship Examination in Standard V and the Pre-Secondary Scholarship Examination in Standard VIII — both State examinations. Seven qualified in 2025–26.',
            ]),
          },
          {
            question: 'Who teaches my child?',
            answer: richText([
              'The section has thirty-nine members of teaching staff, qualified to B.Ed., M.Ed., D.Ed. and postgraduate level, with a Computer Section of its own under a Head of Department. Every name is on the teachers page.',
            ]),
          },
        ],
      },
      {
        blockType: 'accordion',
        heading: 'Talking to the school',
        accentWord: 'Talking',
        headingLevel: 'h2',
        background: 'white',
        allowMultipleOpen: false,
        items: [
          {
            question: 'How do I meet my child’s teacher?',
            answer: richText([
              'Ask the office to arrange it, on 02224180877. Parents, guardians and others are not permitted to see their ward or meet a teacher during school hours without the prior consent of the Head Mistress — it is how the school knows who is on the campus while the children are in it.',
            ]),
          },
          {
            question: 'We have moved, or changed our phone number.',
            answer: richText([
              'Tell the office promptly. The school keeps a record of the address and telephone number of every student’s parents or guardians, and it is only useful if it is current.',
            ]),
          },
          {
            question: 'When can I get a bonafide or railway concession certificate?',
            answer: richText([
              'From the school office between 10.00 a.m. and 12.00 noon only. The same window covers date of birth, first attempt and leaving certificates. No school business is transacted on Saturdays, Sundays or holidays.',
            ]),
          },
          {
            question: 'What happens if school property is damaged?',
            answer: richText([
              'Damage to school property, inside or outside the classrooms, is made good by those responsible or by their parents or guardians. The school’s decision on the compensation payable is final.',
            ]),
          },
        ],
      },
    ],
  })

  // ---------------------------------------------------------------- ABOUT
  /*
   * THE SECTION'S OWN ABOUT PAGE, WHICH IT DID NOT HAVE.
   *
   * Until now `/secondary/about` was the generic recipe in `pages-general.ts`
   * — a banner, four headings naming what "should" go on an About page
   * ("Overview", "Approach", "Head of school", "Campus"), and a closing line
   * telling the reader to ring the office. It described the page instead of
   * being it.
   *
   * Worse, it opened on `kg-classroom-group.jpg`. That map of "a photograph
   * only where one genuinely relates to the page" was written when every
   * picture SIWS had sent was a Kindergarten scene, and it is keyed by SLUG
   * rather than by unit — so a family reading about a Standard V to X school
   * met a photograph of four-year-olds. This section has its own photographs
   * now, and uses one.
   *
   * NOTHING HERE IS NEW. Every fact below is already published somewhere in
   * this section — the 1934 date and the curriculum from the home banner, the
   * approach from "A learner-centred secondary school", the result from the
   * SSC_2026 figures, the recognition from its own block, the English rule and
   * the attendance figure from the FAQ. An About page is where a reader who
   * has not clicked through six pages meets them in one place, which is what
   * "add what is already on the site" means. It states no fee, no admission
   * step, no head of school and no teacher count: the first three SIWS has
   * never supplied, and the fourth is recorded in two places in this file that
   * disagree with each other.
   *
   * LAST IN THE FILE on purpose, so `pageId` below resolves the four pages the
   * closing cards point at — all of them are created above.
   */
  const academicsPageId = await pageId('academics')
  const teachersPageId = await pageId('teachers')

  await upsert({
    slug: 'about',
    title: 'About',
    intro:
      'Standards V to X on the Maharashtra State Board curriculum, on a Wadala campus SIWS has run since 1934.',
    showInNav: true,
    navLabel: 'About',
    navOrder: 1,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'About SIWS High School, Wadala — Standards V to X on the Maharashtra State Board curriculum, aligned with NEP 2020, on a campus the Society has run since 1934.',
    layout: [
      {
        blockType: 'statistics',
        heading: 'The section at a glance',
        accentWord: 'a glance',
        headingLevel: 'h2',
        background: 'sea',
        stats: [
          { value: 'V to X', label: 'Standards taught' },
          { value: '1934', label: 'On this campus since' },
          { value: SSC_2026.percentage, label: 'S.S.C. Examination 2026' },
          { value: 'SSC', label: 'Maharashtra State Board' },
        ],
      },

      /*
       * THE PHOTOGRAPH THAT REPLACES THE KINDERGARTEN ONE — a Standard V to X
       * room, in this section's own library, beside the paragraphs that say
       * what the room is for. `mediaText` rather than a banner: a picture
       * carries more here next to the claim it illustrates than washed out
       * behind a page title.
       */
      {
        blockType: 'mediaText',
        heading: 'What the school sets out to do',
        accentWord: 'sets out to do',
        headingLevel: 'h2',
        background: 'white',
        imagePosition: 'left',
        imageShape: 'rounded',
        ...(classroomActivity ? { image: classroomActivity } : {}),
        content: richText([
          'Standards V to X follow the Maharashtra State Board curriculum, taught in alignment with the National Education Policy 2020 and in English medium. The approach is competency-based: lessons are built to develop conceptual understanding rather than recall, and to give every student regular practice in critical thinking, creativity and problem-solving.',
          'Continuous assessment, project work and hands-on activity connect what happens in the classroom to life outside it — so a student leaves Standard X able to think, to explain their thinking, and to apply it.',
        ]),
      },

      {
        blockType: 'richText',
        heading: '92+ years in Wadala',
        accentWord: '92+ years',
        headingLevel: 'h2',
        width: 'normal',
        background: 'tint',
        content: richText([
          'The South Indians’ Welfare Society has taught in this city since 1934, and the High School has run on the Wadala campus for the whole of that time — 92+ years of trust and excellence.',
          'The section sits inside the SIWS Group of Institutions. A child can arrive in Kindergarten and stay through the Primary Section, these six years, and the Junior College without changing school in between — after the S.S.C. examination students move into the Science and Commerce streams according to their interests, and from there to degree colleges, professional courses and the careers that follow.',
        ]),
      },

      {
        blockType: 'featureList',
        heading: 'What the section expects',
        accentWord: 'expects',
        headingLevel: 'h2',
        layout: 'spec',
        background: 'white',
        /*
         * SPECIFICATION, not a list: each title NAMES the thing and the text
         * is its detail, which is the case docs/MASTER-LAYOUT.md gives for
         * that layout. All four are the school's own rules, published in full
         * on the FAQ and the school-rules page; an About page is where a
         * family reads them BEFORE deciding, not after.
         */
        items: [
          {
            title: 'English, at all times',
            description:
              'A school rule rather than a preference, and one of the reasons the section is confident about how its students speak by Standard X.',
          },
          {
            title: 'Attendance of 75%',
            description:
              'A minimum of 75% of the working days in the year. Irregular attendance and late coming are treated seriously.',
          },
          {
            title: 'The school calendar, daily',
            description:
              'Every student must have a copy and bring it in each day. It is how the school and the family write to each other.',
          },
          {
            title: 'Uniform, clean and ironed',
            description:
              'Set out in full on the school rules page, with hair and nails kept short, hair uncoloured, and no mehendi or nail polish.',
          },
        ],
      },

      /*
       * The state's own recognition, photographed — the same certificate the
       * home page carries, because it is the one external judgement of this
       * campus anybody has published and an About page that omitted it would
       * be the poorer for it.
       */
      {
        blockType: 'mediaText',
        heading: 'Recognised by the State',
        accentWord: 'Recognised',
        headingLevel: 'h2',
        background: 'tint',
        imagePosition: 'right',
        imageShape: 'rounded',
        ...(recognition ? { image: recognition } : {}),
        content: richText([
          'S.I.W.S. High School was certified amongst the 100 Best Schools in Maharashtra under #SwachhtaMonitor 2023, awarded by the School Education and Sports Department, Government of Maharashtra — an award for how the campus is kept.',
        ]),
      },

      {
        blockType: 'cardGrid',
        heading: 'Where to go next',
        accentWord: 'next',
        headingLevel: 'h2',
        background: 'white',
        columns: '2',
        placedBySeed: true,
        cards: [
          {
            title: 'Academics',
            description:
              'The ten subjects, how they are taught, and how the school year is organised into its two terms.',
            ...(academicsPageId
              ? {
                  cta: [
                    {
                      link: {
                        label: 'See what is taught',
                        type: 'internal',
                        reference: { relationTo: 'pages', value: academicsPageId },
                      },
                    },
                  ],
                }
              : {}),
          },
          {
            title: 'Our teachers',
            description:
              'Every teacher and member of the support staff in the section, with their qualifications.',
            ...(teachersPageId
              ? {
                  cta: [
                    {
                      link: {
                        label: 'Meet the team',
                        type: 'internal',
                        reference: { relationTo: 'pages', value: teachersPageId },
                      },
                    },
                  ],
                }
              : {}),
          },
          {
            title: 'Our results and achievements',
            description:
              'The 2026 grade distribution in full, and the students who qualified in the State scholarship examinations.',
            ...(achievementsPageId
              ? {
                  cta: [
                    {
                      link: {
                        label: 'See the results',
                        type: 'internal',
                        reference: { relationTo: 'pages', value: achievementsPageId },
                      },
                    },
                  ],
                }
              : {}),
          },
          {
            title: 'Facilities & Campus',
            description:
              'The classrooms, the laboratories and library, the CCTV arrangements, and what the campus offers.',
            ...(facilitiesPageId
              ? {
                  cta: [
                    {
                      link: {
                        label: 'See the campus',
                        type: 'internal',
                        reference: { relationTo: 'pages', value: facilitiesPageId },
                      },
                    },
                  ],
                }
              : {}),
          },
        ],
      },
    ],
  })

  payload.logger.info('Secondary content seeded.')

  if (!CHILD_NAMES_CONSENTED) {
    /*
     * Counted from the list itself rather than written into the sentence, so
     * the warning cannot drift out of step with the names it is about — and so
     * the list stays referenced now that the "Who qualified" section has come
     * off the achievements page. The names are still here, ready for the day
     * consent is confirmed.
     */
    const withheld = Object.values(SCHOLARSHIP_QUALIFIERS).flat().length
    payload.logger.warn(
      `CHILD NAMES WITHHELD — the ${withheld} scholarship qualifiers in Standards V and VIII are named in SIWS’s document but are not published. They are children, and their names are personal data (DPDPA 2023). The achievement, the examinations and the counts per standard ARE published. Confirm parental consent, set CHILD_NAMES_CONSENTED to true in src/seed/secondary.ts, and re-run — the names are already in the file.`,
    )
  }

  if (PARENT_QUOTES.length === 0) {
    payload.logger.warn(
      'PARENT FEEDBACK: no quotes have been supplied, so the page carries only the "how to send us your feedback" section. Add real ones to PARENT_QUOTES in this file — or in the admin panel — and the drifting rows appear. Four or more are needed before they drift rather than sit in a grid.',
    )
  }

  payload.logger.warn(
    'SPORTS — the new page stands on two photographs and the banner in one of them, which is the only record on this site of the S.I.W.S. Sports Academy: "the Inter School Football League 2023-24, age categories U14 and U17 (Boys & Girls)". NEEDED before it can say more: whether the league has run since 2023-24, which schools take part and how SIWS placed; what else the section plays besides football; whether there is an annual sports day, and photographs of it. Two frames of a kick-off is the whole photographic record of sport in this section.',
  )

  payload.logger.warn('LEFT BLANK by SIWS in the Secondary document:')
  for (const gap of [
    'Programme benefits',
    'Admission process — no age criteria, no application steps, no document list and no dates. NOTE that as of 2026-09-01 this section publishes nothing about admission at all: the Admissions page and the Admissions FAQ were deleted at SIWS’s request, so there is no longer a page waiting for this. Sending the process now means deciding first whether the section should carry it again',
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
