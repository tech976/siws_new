import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('./lexical')

/**
 * Seeds the Primary section — one school, no campus split — from the information requirement
 * document SIWS returned.
 *
 * Everything published here is SIWS's own wording. Where the document left a
 * heading blank — fee details, photographs, testimonials, alumni achievements,
 * press mentions, awards, social media handles and the legal documents — no
 * page or section is invented to fill the gap; the omission is reported at the
 * end of the run instead.
 *
 * Run with:  npm run seed:primary
 */

/**
 * CORRECTION: the Primary section covers GRADES 1 TO 4.
 *
 * An earlier seed guessed "Standards I to VII" from the usual Maharashtra
 * pattern and flagged it as unconfirmed. SIWS's document settles it, and the
 * enquiry form's class list is corrected here to match — an enquiry offering
 * classes the school does not run is worse than offering none.
 */
const CLASS_OPTIONS = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4']

/**
 * PRIMARY SECTION CONTACT DETAILS
 * ===============================
 * Supplied by SIWS for the Primary Section, and the only contact details
 * this section shows. They are held here rather than typed into each page
 * because eight places print them, and eight copies drift.
 *
 * Primary only. The other three units and the portal keep the Society's
 * general email and mobile from `units-content.ts`.
 *
 * TWO NUMBERS, TWO FIELDS. A `tel:` link holds one number, so a pair in
 * a single field would dial neither. The unit carries `phone` and
 * `phoneAlt`, and both are printed wherever the office is reachable —
 * header, footer, contact cards and the prose — each separately dialable.
 */
const PRIMARY_PHONE = '022-24114262'
const PRIMARY_PHONE_ALT = '022-24115055'
const PRIMARY_PHONES = `${PRIMARY_PHONE} or ${PRIMARY_PHONE_ALT}`
const PRIMARY_EMAIL = 'admissions@siwsschool.edu.in'

/*
 * The subjects, each with an icon so the list reads as a syllabus rather than
 * eight ticks in a column. The icons come from the block's fixed set — see
 * FEATURE_ICON_OPTIONS — so the section keeps one visual voice.
 *
 * COMPUTER was added at SIWS's instruction (2026-08-26). It is not in the
 * requirement document the rest of this file is built from, so it carries no
 * description: what is taught in it, and from which grade, has not been
 * supplied. The seed reports it at the end of the run for confirmation.
 */
const SUBJECTS = [
  { title: 'English' },
  { title: 'Marathi' },
  { title: 'Mathematics' },
  /*
   * The expansion is part of the LABEL, not a description underneath it.
   *
   * As a description it made EVS the only item in the list carrying a second
   * line, and the two-column layout is a grid — every cell on a row is as tall
   * as the tallest one on it. That single line opened a hole in the left
   * column between Mathematics and Art, and left Physical Education stranded
   * on a row of its own, which is what the section looked wrong for.
   *
   * Folded into the title, all nine subjects are one line each, the five rows
   * come out even, and not a word is lost. The block's own single-column
   * layout is the one built for items that carry a paragraph.
   */
  { title: 'EVS (Science, History, Geography and Civics)' },
  { title: 'ICT' },
  { title: 'Art' },
  { title: 'Work Experience' },
  { title: 'Physical Education' },
  { title: 'Value Education' },
]

const GRADE_CURRICULUM = [
  {
    title: 'Grade 1 — Building Strong Foundations',
    description:
      'The focus is on developing literacy, numeracy and communication skills through stories, songs, games, rhymes, hands-on activities and play-based learning. Children are encouraged to observe, explore, ask questions and express themselves confidently in a joyful learning environment.',
  },
  {
    title: 'Grade 2 — Strengthening Concepts',
    description:
      'Students strengthen their reading, writing and mathematical skills while developing curiosity, creativity and independent thinking. Learning experiences are connected to real-life situations through activities, projects and collaborative tasks.',
  },
  {
    title: 'Grade 3 — Expanding Knowledge',
    description:
      'The curriculum encourages deeper conceptual understanding across languages, Mathematics and Environmental Studies. Students participate in experiments, discussions, projects and creative assignments that promote analytical thinking, communication and problem-solving skills.',
  },
  {
    title: 'Grade 4 — Preparing for Higher Learning',
    description:
      'Students are guided towards independent learning by strengthening conceptual understanding, critical thinking and application-based learning. They develop confidence through presentations, teamwork, research-based activities and experiential learning, preparing them for the next stage of schooling.',
  },
]

const TEACHING_PRACTICES = [
  { title: 'Activity-based and experiential learning' },
  { title: 'Competency-based teaching with focus on learning outcomes' },
  { title: 'Storytelling, role play, music and art-integrated learning' },
  { title: 'Project-based and collaborative learning' },
  { title: 'Smart Classroom and digital learning resources' },
  {
    title: 'Inquiry-based learning that encourages questioning and exploration',
  },
  { title: 'Real-life applications to make learning meaningful' },
  { title: 'Continuous formative assessment and constructive feedback' },
  { title: 'Individual attention and remedial support wherever required' },
  {
    title: 'Value education, environmental awareness and life-skill development',
  },
]

const HOLISTIC = [
  { title: 'Literary and language activities' },
  { title: 'Mathematics and EVS enrichment programmes' },
  { title: 'Art, Craft, Music and Dance' },
  { title: 'Sports and Physical Education' },
  { title: 'Cultural celebrations and festivals' },
  { title: 'Environmental awareness initiatives' },
  { title: 'Leadership opportunities and value-based activities' },
]

/*
 * Six, not seven, so the two columns come out three and three.
 *
 * The one dropped — "seamless progression to higher classes within the SIWS
 * Group" — was saying the same thing as the last card in `USPS` two sections
 * below it. It is kept there, where it has room to explain itself.
 */
const PROGRAMME_BENEFITS = [
  { title: 'Strong academic foundation' },
  { title: 'Interactive and technology-enabled learning' },
  { title: 'Safe and secure campus with CCTV surveillance' },
  { title: 'Communication, creativity and critical thinking' },
  { title: 'Sports, arts and cultural exposure' },
  { title: 'Value education and life skills' },
]

/*
 * SIX CARDS, EACH ONE SENTENCE.
 *
 * There were ten of these, every one carrying thirty-odd words, set as a
 * two-column tick list in which the heading was 16.8px and the sentence under
 * it 16px — a difference of eight tenths of a millimetre. Nothing told the eye
 * where a point started, so the section read as one 969px block of prose with
 * ticks in it, and by the fourth item nobody is reading.
 *
 * Cut to six, cut to a sentence each, and given a card and an icon apiece, so
 * a parent can take one in at a glance and stop wherever they like.
 */
const USPS = [
  {
    title: 'Academic excellence',
    icon: 'study',
    description:
      'A strong foundation on the Maharashtra State Board curriculum, with continuous assessment and attention to every child.',
  },
  {
    title: 'Experienced teachers',
    icon: 'staff',
    description:
      'Qualified teachers using child-centred, activity-based methods, so lessons are understood rather than memorised.',
  },
  {
    title: 'Smart classrooms',
    icon: 'computers',
    description:
      'Interactive smart panels in the classrooms, with multimedia lessons and digital resources.',
  },
  {
    title: 'Holistic development',
    icon: 'activity',
    description:
      'Sports, art, music, dance, competitions and leadership, alongside the academic timetable.',
  },
  {
    title: 'Individual care',
    icon: 'care',
    description:
      'Every child is different. Personal attention and remedial support wherever a learner needs it.',
  },
  {
    title: 'A school to move up in',
    icon: 'classroom',
    description:
      'Part of the SIWS Group, so a child continues into the higher classes without changing school.',
  },
]

const COMPETITIONS = [
  'Recitation',
  'Fancy Dress',
  'Elocution',
  'Drawing & Painting',
  'Story Telling',
  'Group Singing (Patriotic Songs)',
  'Handwriting',
  'Work Experience',
  'Clay Work',
  'Rangoli',
  'Best out of Waste',
  'Sports & Games',
].map((title) => ({ title }))

/**
 * MATUNGA CAMPUS
 * ==============
 * The Primary Section is published as ONE school.
 *
 * It used to run as two campuses with a page each, a roster each and a set of
 * house rules each. Those pages, the card grid that led to them and the second
 * rule list are gone. What is kept is the teaching staff: nine of these names
 * were recorded against Matunga, and dropping a campus label is not a reason
 * to drop nine teachers from the school's roster. They are listed with
 * everybody else, and the campus each was tagged with is no longer shown.
 */
const MATUNGA_FACULTY = [
  {
    name: 'Mrs. Sreedevi Prasanna Bagayatkar',
    designation: 'Head Teacher',
    qualifications: 'S.S.C., D.Ed.',
  },
  { name: 'Mrs. Vinaya Haridas Kamath', designation: 'Asst. Teacher', qualifications: 'S.S.C., D.Ed.' },
  { name: 'Mrs. Malathi Premnath Shankar', designation: 'Asst. Teacher', qualifications: 'S.S.C., D.Ed.' },
  { name: 'Mrs. Parameshwari Perumal Raj', designation: 'Asst. Teacher', qualifications: 'B.A., D.Ed.' },
  { name: 'Mrs. Thangamani Belvintony', designation: 'Asst. Teacher', qualifications: 'B.A., D.Ed.' },
  { name: 'Mrs. Usha Raju', designation: 'Asst. Teacher', qualifications: 'B.A., D.Ed.' },
  { name: 'Ms. Payal Sandeep Shukla', designation: 'Asst. Teacher', qualifications: 'H.S.C., D.Ed.' },
  { name: 'Mrs. Mary Dolours Richard', designation: 'Asst. Teacher', qualifications: 'B.A., D.Ed.' },
  { name: 'Ms. Prema Keshwan Devendra', designation: 'Asst. Teacher', qualifications: 'B.A., D.Ed.' },
  /*
   * KEPT ACROSS THE MERGE, DELIBERATELY. The other side of this merge had
   * dropped this teacher from the list — not in any commit of its own, but
   * silently, inside an earlier merge resolution, with nothing recorded
   * anywhere about why. Straight three-way semantics would have honoured that
   * as a deletion and taken a serving teacher off the staff page.
   *
   * Two things say she belongs here: the row is still in the faculty table on
   * a database restored from the committed dump, and the commit this line
   * arrives in is the one that supplies her qualifications. Nobody fills in
   * the qualifications of a teacher they are removing.
   */
  { name: 'Ms. Vaishali Baghat', designation: 'Asst. Teacher', qualifications: 'H.S.C., A.T.D.' },
]

/** The 18 rules Matunga supplied, verbatim. */
const MATUNGA_RULES: string[] = [
  'Bring the school calendar every day.',
  'Maintain at least 80% attendance.',
  'Wear proper school uniform.',
  'Take care of your books and belongings; don’t wear ornaments.',
  'Maintain discipline in school and during activities.',
  'Speak only in English in school.',
  'Avoid late coming, absenteeism, and indiscipline.',
  'Do not damage school property; compensation must be paid if damaged.',
  'Parents should meet teachers only with prior permission.',
  'Inform the school of any change in address or phone number.',
  'Do not give cash or gifts to teachers.',
  'Do not bring unnecessary books, magazines, or newspapers. Bring only dry snacks.',
  'Do not participate in political or communal activities.',
  'Parents should ensure regularity, homework, and discipline.',
  'Be regular, obedient and polite.',
  'No school office work on Saturdays, Sundays, or holidays.',
  'Certificates are issued only during the specified office hours.',
  'Follow the Library Rules.',
]

/*
 * MATUNGA_SUBJECTS and MATUNGA_BENEFITS lived here.
 *
 * They existed only to fill the Matunga campus page, which is gone now that
 * the Primary Section is one school. Their content was a differently-worded
 * copy of SUBJECTS and PROGRAMME_BENEFITS above ("Environmental Studies Part 1
 * and 2" for "EVS", "Physical Training" for "Physical Education"), so nothing
 * the school actually teaches is lost by dropping them.
 */

/** Head teacher first; the rest in the order SIWS listed them. */
const FACULTY = [
  {
    name: 'Mrs. Geeta Raja',
    designation: 'I/C Head Teacher',
    qualifications: 'B.A., D.Ed., DSM (Diploma in School Management)',
  },
  { name: 'Jayasudha Christopher', qualifications: 'B.A., D.Ed.' },
  { name: 'Vailankani Antony Vincent Pinto', qualifications: 'B.A., D.Ed.' },
  { name: 'Padma Thippaya Baikadi', qualifications: 'B.A., D.Ed.' },
  { name: 'Sobika Rangaswamy', qualifications: 'M.A., D.Ed.' },
  { name: 'Nadar Alagumathi Selvaganeshan', qualifications: 'B.A., D.Ed.' },
  { name: 'Nadar Arulpoornam Jegan', qualifications: 'B.A., D.Ed.' },
  { name: 'Awari Vanita Subhash', qualifications: 'B.A., D.Ed.' },
  { name: 'Shravani Ramesh', qualifications: 'B.Com., D.Ed.' },
  { name: 'Poornima Kaur Sandhu', qualifications: 'H.S.C., D.Ed.' },
  { name: 'Gurjit Kaur Matta', qualifications: 'B.A., D.Ed.' },
  { name: 'Shruti Sampat Gaware', qualifications: 'B.A., D.Ed.' },
  { name: 'Deepika Naidu', qualifications: 'H.S.C., D.Ed.' },
  // Listed by SIWS with a subject and no qualification of her own.
  { name: 'Deepika Boricha', designation: 'Arts Teacher' },
]

/**
 * Ten pieces of parent feedback, sent by SIWS with the families' consent
 * (2026-08-29) and reproduced word for word.
 *
 * `attribution` is filled in because the record of who said a thing belongs
 * with the thing; the block is asked NOT to print it, since a heading reading
 * "What parents say" over ten cards each signed "Parent" is the same word
 * eleven times. Same decision as the Kindergarten section's page.
 */
const PRIMARY_PARENT_QUOTES: { quote: string; attribution: string }[] = [
  {
    quote:
      'We’ve seen a noticeable change in our child’s confidence since joining SIWS. They’re much more comfortable speaking up and asking questions.',
    attribution: 'Parent',
  },
  {
    quote:
      'What we like about SIWS is that the teachers are approachable. If there’s something we’re concerned about, we can actually talk to them.',
    attribution: 'Parent',
  },
  {
    quote:
      'Our child has become more responsible with schoolwork and doesn’t need as much reminding as before. That’s been a big change for us.',
    attribution: 'Parent',
  },
  {
    quote:
      'The academics are taken seriously, but there isn’t constant pressure on the children. We’ve found that balance quite good.',
    attribution: 'Parent',
  },
  {
    quote:
      'We were initially worried about how our child would adjust, but they settled in faster than we expected and now look forward to school.',
    attribution: 'Parent',
  },
  {
    quote:
      'The teachers seem to know the children well, not just academically but also in terms of their individual strengths and areas they need help with.',
    attribution: 'Parent',
  },
  {
    quote:
      'We’ve been happy with the way concepts are explained. Our child is encouraged to understand the topic instead of just learning answers.',
    attribution: 'Parent',
  },
  {
    quote:
      'There are definitely busy periods with schoolwork, but overall we feel our child is learning at a comfortable pace.',
    attribution: 'Parent',
  },
  {
    quote:
      'One thing we’ve noticed is that our child has become more willing to try things independently instead of always waiting for us to help.',
    attribution: 'Parent',
  },
  {
    quote:
      'For us, the biggest positive has been the overall environment. Our child feels comfortable at school, and that gives us peace of mind.',
    attribution: 'Parent',
  },
]

/**
 * The 19 general rules, in SIWS's own wording.
 *
 * With one substitution: the school's document says "pupils" throughout and
 * the site says "students" or "children" (SIWS, 2026-08-29). It is a synonym
 * and no rule means anything different for it, but the note above used to say
 * "verbatim" and that is now a word too strong for what this is.
 */
const GENERAL_RULES: string[] = [
  'Every student must possess a copy of the school calendar which must be brought daily to the school.',
  'Students suffering from contagious diseases or declared infectious diseases by the health authorities, and which require segregation in the class, will not be permitted to attend school without the student being certified as fit by the doctor.',
  'All students must come to school in the prescribed uniform. They should always be neat and tidy.',
  'Students are responsible for the safe custody of their books and other belongings. They are requested not to wear any ornaments or watch for the sake of personal safety.',
  'Irregular attendance, habitual idleness, late coming, wilful disobedience or conduct and any form of indiscipline in the school will be seriously dealt with. All students are responsible to the school authorities for their behaviour inside the school.',
  'All students must possess the school identity card which they must carry daily to school. Similarly, they must bring to school their School Diary without fail.',
  'Any damage to school property, whether inside or outside the classrooms or within the school premises, will have to be made good by those responsible for it or by their parents or guardians. The decision of the school authorities regarding compensation payable to the school is final.',
  'Parents/guardians or others are not allowed to see their wards or meet their teacher during school hours without the prior consent of the Head Teacher.',
  'Any breach of discipline or disrespect to any member of the school staff will be dealt with seriously and students responsible for such misbehaviour will be summarily dismissed after proper warning to the student and parents/guardians.',
  'The school authorities maintain a record of the address and phone numbers of parents/guardians in the school office. Parents/guardians are requested to promptly intimate the school authorities of any changes.',
  'Presents in cash or in kind to the teachers are not permitted. Collection of funds for any reason whatsoever within the school premises is also prohibited.',
  'Letters addressed to students in the school will not be delivered in the classrooms.',
  'Students are not permitted to bring unnecessary books, magazines, newspapers, periodicals or similar articles to the school. They must bring only dry food for the long recess.',
  'Students are forbidden to take part in any political or other organisation likely to result in violence or communal disturbance.',
  'Parents/guardians are earnestly requested to enforce regularity and discipline and see that their children do their homework and prepare their lessons daily as per the timetable. Parental co-operation is earnestly solicited not only for the benefit of the student but also for the smooth working of the school.',
  'The school observes the “Principles of Discipline” set out in Rule 53 of the Grant-In-Aid Code: regularity and implicit obedience; politeness and courtesy of speech and conduct together with cleanliness of dress and person; and students’ responsibility to the school for their conduct both inside and outside it.',
  'No school business will be transacted on Saturdays, Sundays and holidays.',
  'Any student who is persistently non-co-operative, repeatedly or wilfully mischievous, guilty of gross malpractice in connection with examinations, or has committed an act of serious indiscipline or misbehaviour, or who in the opinion of the Head of the School has an undesirable influence on fellow students, is liable to be expelled permanently or removed for a specific period, with the reasons recorded in writing.',
  'Certificates — date of birth, bonafide student, first attempt, leaving certificate and similar — will be issued between 1.00 p.m. and 2.30 p.m. only.',
]

/**
 * THE MERGED HOUSE RULES.
 *
 * These were published as two numbered lists — one per campus — precisely
 * because they are not the same document. The second list sets an 80%
 * attendance requirement and an English-only rule the first does not contain,
 * and the first covers infectious illness, identity cards and the office
 * hours for certificates the second does not.
 *
 * The section is one school now, so it gets one list, and the union is the only
 * safe way to build it: dropping either document's rules would quietly release
 * families from something the school still asks of them. That does mean every
 * family is now shown every rule, including ones that previously applied to
 * only half the school — SIWS should read this list once and strike anything
 * the merged school no longer enforces.
 *
 * Deduplicated on a normalised form so "Wear proper school uniform." and
 * "Wear proper school uniform" do not both appear.
 */
const normalise = (rule: string) =>
  rule
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const MERGED_RULES: string[] = (() => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const rule of [...GENERAL_RULES, ...MATUNGA_RULES]) {
    const key = normalise(rule)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(rule)
  }
  return out
})()

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'primary' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const primary = units[0]
  if (!primary) throw new Error('Primary unit not found. Run `npm run seed` first.')

  /**
   * Internal links store a relationship, not a typed path (FR-QL-06), so the
   * institution-wide scholarship register has to exist before Primary can point
   * at it. If it does not, the link is left out rather than seeded as a broken
   * one — the section still reads correctly without it.
   */
  const { docs: scholarshipPages } = await payload.find({
    collection: 'pages',
    where: {
      and: [{ slug: { equals: 'scholarships' } }, { unit: { exists: false } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const scholarshipsPageId = scholarshipPages[0]?.id ?? null

  if (!scholarshipsPageId) {
    payload.logger.warn(
      'Scholarship register not found — run `npm run seed:scholarships` first, then re-run this seed to add the link.',
    )
  }

  // -- The unit's own details ---------------------------------------------
  await payload.update({
    collection: 'units',
    id: primary.id,
    overrideAccess: true,
    data: {
      /*
       * ONE SCHOOL, NOT TWO CAMPUSES.
       *
       * The Primary Section used to be published as a Wadala campus and a
       * Matunga campus with separate pages, separate rosters and separate rule
       * lists. SIWS has since merged them, so nothing here names a location:
       * it is one Primary School with one teaching team, and a parent reading
       * this should not have to work out which half of it applies to them.
       */
      name: 'SIWS Primary School',
      shortName: 'Primary School',
      tagline: 'Maharashtra State Board | Grades 1 to 4',
      description:
        'Grades 1 to 4 following the Maharashtra State Board curriculum, aligned with NEP 2020 — nurturing confident, responsible and joyful learners.',
      // Overrides the Society-wide pair from `units-content.ts` for this
      // section only. Both numbers: `phoneAlt` exists so the header and
      // footer can print the pair and still give each its own `tel:` link.
      phone: PRIMARY_PHONE,
      phoneAlt: PRIMARY_PHONE_ALT,
      email: PRIMARY_EMAIL,
    } as never,
  })

  // -- Faculty (FR-FAC-01) -------------------------------------------------
  let facultyCreated = 0
  let facultyUpdated = 0

  /**
   * ONE ROSTER, TWO TEAMS.
   *
   * SIWS supplies the staff as two lists, each under its own head teacher,
   * and asked for the page to show them that way. The faculty block's
   * `teams` layout does the grouping, and `campus` is the only field on a
   * faculty record that says which team somebody belongs to — so the tag is
   * set here rather than cleared, which is what this seed used to do.
   *
   * IT IS NOT A CAMPUS LABEL. Nothing renders the value: the block groups
   * by it and prints no heading for it, so the section is still published as
   * one school. The word is the field's, not the page's.
   *
   * Teams are ordered by that key, and 'matunga' sorts before 'wadala' —
   * which is the order SIWS listed them in, Mrs. Bagayatkar's team first.
   * `order` still runs 1..n across the whole roster so the sequence inside
   * each team is stable.
   */
  const roster = [
    ...FACULTY.map((teacher) => ({ ...teacher, campus: 'wadala' })),
    ...MATUNGA_FACULTY.map((teacher) => ({ ...teacher, campus: 'matunga' })),
  ].map((teacher, index) => ({
    ...teacher,
    order: index + 1,
  }))

  for (const teacher of roster) {
    const existing = await payload.find({
      collection: 'faculty',
      where: {
        and: [
          { name: { equals: teacher.name } },
          { unit: { equals: primary.id } },
          // Name and unit are the whole identity now. If the same person was
          // on both rosters, the two rows collapse into one — which is the
          // right answer for a school that no longer has two of anything.
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const data = {
      ...teacher,
      designation: teacher.designation ?? 'Teacher',
      /*
       * SPELLED OUT, because omitting it does not clear it.
       *
       * `payload.update` leaves a field it is not given exactly as it was, so
       * dropping `qualifications` from a roster entry left the old value on
       * the record and the page went on printing it. Deepika Boricha is the
       * case: SIWS lists her with a subject and no qualification, and she
       * kept "H.S.C., A.T.D." through a clean re-seed until this line.
       */
      qualifications: 'qualifications' in teacher ? teacher.qualifications : null,
      unit: primary.id,
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
      await payload.create({
        collection: 'faculty',
        data: data as never,
        overrideAccess: true,
      })
      facultyCreated += 1
    }
  }

  payload.logger.info(`Faculty — ${facultyCreated} created, ${facultyUpdated} updated.`)

  // -- Pages ---------------------------------------------------------------
  const upsert = async (page: Record<string, unknown> & { slug: string; title: string }) => {
    const existing = await payload.find({
      collection: 'pages',
      where: {
        and: [{ slug: { equals: page.slug } }, { unit: { equals: primary.id } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const data = { ...page, unit: primary.id }

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

  // ---------------------------------------------------------------- EVENTS
  /**
   * Looks a page or a photograph up by name, and says so if it is not there.
   *
   * Everything below is optional: an event card with no banner, or a banner
   * with nowhere to go, is left out rather than published half-built.
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

  const pageId = async (slug: string) => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: {
        and: [{ slug: { equals: slug } }, { unit: { equals: primary.id } }],
      },
      limit: 1,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    return docs[0]?.id ?? null
  }

  /*
   * The banner is the invitation SIWS designed for the day. Until that file is
   * in the library the card falls back to a photograph FROM the event, so the
   * page is never published with an empty frame — but the two are different
   * things and the fallback is reported, not passed off as the banner.
   */
  const classroom = await photo('primary-classroom.jpg')

  const videoStills = {
    independence: await photo('video-2026-independence-day.jpg'),
    raksha: await photo('video-2026-raksha-bandhan.jpg'),
    onam: await photo('video-2026-onam.jpg'),
  }

  const onamBanner = await photo('onam-2026-banner.jpg')
  const onamFallback = await photo('onam-2026-assembly.jpg')
  const onamImage = onamBanner ?? onamFallback
  if (!onamBanner && onamFallback) {
    payload.logger.warn(
      'Onam: the designed invitation banner (onam-2026-banner.jpg) is not in the library, so the event card is showing a photograph from the day instead. Drop the banner into photos-inbox/ and re-import to replace it.',
    )
  }

  /*
   * The gallery is seeded by `seed:galleries`, which runs after this. On a
   * database where it has not run yet the page does not exist, so the card is
   * published without its link rather than with a broken one.
   */
  const galleryPageId = await pageId('gallery')
  if (!galleryPageId) {
    payload.logger.warn(
      'Onam: no Campus Gallery page yet, so the event card has no link. Run npm run seed:galleries, then this seed again.',
    )
  }

  await upsert({
    slug: 'events',
    title: 'Events',
    intro: 'Celebrations, competitions and gatherings through the school year.',
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
    navLabel: 'Events',
    navOrder: 62,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Events at SIWS Primary School — celebrations, competitions and gatherings through the school year.',
    layout: [
      {
        blockType: 'cardGrid',
        heading: 'What we have been celebrating',
        accentWord: 'celebrating',
        headingLevel: 'h2',
        background: 'white',
        columns: '2',
        cards: [
          ...(onamImage
            ? [
                {
                  title: 'Onam',
                  ...(onamImage ? { image: onamImage } : {}),
                  // An invitation, not a photograph: the crop would take the
                  // crest off the top and the date, venue and time off the foot.
                  fit: 'whole',
                  description:
                    'The school marked Onam under the Ek Bharat Shreshtha Bharat initiative, with a pookalam laid in the hall, the lamp lit together, and staff and children in Kerala dress.',
                  ...(galleryPageId
                    ? {
                        cta: [
                          {
                            link: {
                              label: 'See the photographs',
                              type: 'internal',
                              reference: {
                                relationTo: 'pages',
                                value: galleryPageId,
                              },
                              /*
                               * Straight to the Onam band, not the top of the
                               * wall. The gallery is grouped by category and
                               * Onam is the second band, so a reader who came
                               * from this card would otherwise land on the
                               * Achievements photographs and have to scroll
                               * past them to reach what they clicked for.
                               *
                               * 'onam' is what `headingAnchor` makes of the
                               * band's own heading, which `seed:galleries`
                               * sets from the category name.
                               */
                              anchor: 'onam',
                            },
                          },
                        ],
                      }
                    : {}),
                },
              ]
            : []),
        ],
      },

      /*
       * The films of each day, on a tint so they read as their own band rather
       * than more of the card above. Only the ones whose still made it into
       * the library are listed: a video card with no picture on it is a grey
       * rectangle that tells a visitor nothing.
       *
       * The links are stored as Drive sharing URLs and reduced to the file id
       * on save — see VideoGalleryBlock for why the id is all that is kept.
       */
      {
        blockType: 'videoGallery',
        heading: 'Watch the celebrations',
        accentWord: 'Watch',
        headingLevel: 'h2',
        background: 'sea',
        videos: [
          ...(videoStills.independence
            ? [
                {
                  title: 'Independence Day',
                  description:
                    'Our 80th Independence Day, marked on stage by the children of the Primary Section.',
                  driveUrl:
                    'https://drive.google.com/file/d/1QYoEj_g24oqyoOhZKSLKy5IwQm9G9Ttm/view',
                  poster: videoStills.independence,
                },
              ]
            : []),
          ...(videoStills.raksha
            ? [
                {
                  title: 'Raksha Bandhan',
                  description:
                    'The children tied rakhis to the men and women who look after the neighbourhood.',
                  driveUrl:
                    'https://drive.google.com/file/d/10OIkijSppmfAqhcFOtm6pvHcPlSrCK_m/view',
                  poster: videoStills.raksha,
                },
              ]
            : []),
          ...(videoStills.onam
            ? [
                {
                  title: 'Onam',
                  description:
                    'The pookalam laid, the lamp lit, and the whole school gathered round it.',
                  driveUrl:
                    'https://drive.google.com/file/d/1JiWFG7-LV5lxTGhawLu_lpMForAXAOMu/view',
                  poster: videoStills.onam,
                },
              ]
            : []),
        ],
      },
    ],
  })

  // ---------------------------------------------------------- ACHIEVEMENTS
  /*
   * The prizes, as a wall of photographs.
   *
   * Each picture is included only if it is in the library, so the page is
   * built from whatever has actually arrived rather than leaving holes where
   * the rest will go. A caption is written per picture here rather than reused
   * from the library's alt text: the alt text describes the photograph for
   * somebody who cannot see it, and a caption says what the prize was.
   */
  const achievementShots = [
    {
      file: 'natya-tarang-2026-first-prize.jpg',
      caption:
        'First prize in Category A at Natya Tarang 2026, the inter-school and college group dance competition.',
    },
    {
      file: 'natya-tarang-2026-performance.jpg',
      caption: 'On stage at Natya Tarang 2026.',
    },
    {
      file: 'ignited-mind-lab-2026.jpg',
      caption: 'Certificates of achievement from the Ignited Mind Lab programme.',
    },
    {
      file: 'natya-tarang-2026-company.jpg',
      caption: 'The full company in costume at Natya Tarang 2026.',
    },
    {
      file: 'natya-tarang-2026-trophy.jpg',
      caption: 'The Category A trophy, Pre-Primary to Standard IV.',
    },
  ]

  const achievementImages = (
    await Promise.all(
      achievementShots.map(async (shot) => {
        const id = await photo(shot.file)
        return id ? { image: id, caption: shot.caption } : null
      }),
    )
  ).filter((entry) => entry !== null)

  if (achievementImages.length < achievementShots.length) {
    payload.logger.warn(
      `Achievements: ${achievementShots.length - achievementImages.length} of ${achievementShots.length} photographs are not in the library yet. Put them in photos-inbox/ under the names above, run npm run photos:import, then this seed again.`,
    )
  }

  await upsert({
    slug: 'achievements',
    title: 'Achievements',
    intro: 'Recognition earned by our students in the arts, in competition and in the classroom.',
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
    navLabel: 'Achievements',
    navOrder: 63,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Prizes and recognition won by students of SIWS Primary School, including first place in Category A at Natya Tarang 2026.',
    layout: [
      ...(achievementImages.length > 0
        ? [
            {
              blockType: 'gallery',
              heading: 'Natya Tarang 2026 and other honours',
              accentWord: 'Natya Tarang 2026',
              headingLevel: 'h2',
              background: 'white',
              /*
               * A collage rather than an even grid. These are five pictures of
               * two occasions, not an album to be paged through, and the
               * mixed sizes let the prize-giving carry more of the wall than
               * the close-ups beside it.
               */
              layout: 'bento',
              perPage: '0',
              images: achievementImages,
            },
          ]
        : []),
    ],
  })

  // --------------------------------------------------------------- CONTACT
  /**
   * The enquiry form lives here now, not on the home page.
   *
   * Seeded before `home` because the home hero links to it by relationship,
   * and an internal link needs its target to exist first (FR-QL-06).
   */
  const contactPageId = await upsert({
    slug: 'contact',
    title: 'Contact us',
    intro: 'Ask us about admission to Grades 1 to 4.',
    showInNav: true,
    navLabel: 'Contact',
    navOrder: 50,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription: 'Contact SIWS Primary School — enquire about admission to Grades 1 to 4.',
    layout: [
      {
        blockType: 'heroEnquiry',
        title: 'Enquire about admission',
        subtitle: 'Maharashtra State Board | Grades 1 to 4',
        benefitsIntro: 'At SIWS, your child benefits from:',
        benefits: [
          {
            text: 'A strong academic foundation on the Maharashtra State Board curriculum',
          },
          { text: 'Interactive, technology-enabled smart classrooms' },
          { text: 'A safe and secure campus with CCTV surveillance' },
          { text: 'Teachers with 20+ years of classroom experience' },
        ],
        badge: {
          title: 'Admissions as per Education Department norms',
          subtitle: 'Grades 1 to 4 | Subject to vacancies',
        },
        form: {
          title: 'Enquire about admission',
          subtitle: 'Tell us about your child and we will get in touch.',
          classOptions: CLASS_OPTIONS.map((label) => ({ label })),
          /*
           * No campus choice. The form used to ask which campus so the enquiry
           * could reach the right head teacher; there is one Primary School and
           * one head teacher now, so the question has no answer to offer and is
           * left off entirely rather than shown with a single option.
           */
          campusOptions: [],
          trustPoints: [
            { text: 'Over 90 years of educational service since 1934' },
            { text: 'A Grade school' },
            { text: 'Experienced and trained teachers' },
            { text: 'Safe, CCTV-monitored campus' },
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
              `For enquiries about Grades 1 to 4 at either campus — ${PRIMARY_EMAIL}, or telephone ${PRIMARY_PHONES}.`,
          },
          {
            title: 'General enquiries',
            description: `For anything else — ${PRIMARY_EMAIL}, or telephone ${PRIMARY_PHONES}.`,
          },
        ],
      },
    ],
  })

  // ------------------------------------------------------------------ HOME
  await upsert({
    slug: 'home',
    title: 'SIWS Primary School',
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'SIWS Primary School — Grades 1 to 4 on the Maharashtra State Board curriculum. Smart classrooms, experienced teachers and a safe, CCTV-monitored campus.',
    layout: [
      /**
       * The enquiry form moved to the contact page. This hero carries the same
       * headline and the same four reasons, and sends anyone ready to enquire
       * one click onward — so the home page opens on the school rather than on
       * a form.
       */
      {
        blockType: 'hero',
        title: 'SIWS Primary School',
        accentWord: 'Primary',
        eyebrow: 'Maharashtra State Board | Grades 1 to 4',
        /*
         * A photograph behind the banner, which switches it from the flat
         * brand panel to the washed variant every other section now uses —
         * the brand gradient dense at the left where the type sits, thinning
         * to the right so the room still reads. Omitted if the picture is not
         * in the library, so the banner keeps its contrast either way.
         */
        ...(classroom ? { image: classroom } : {}),
        // Plain string: the hero's `intro` is a textarea, not rich text.
        intro:
          'A caring, inclusive and stimulating school for Grades 1 to 4 — with smart classrooms, teachers of 20+ years’ experience, and a safe, CCTV-monitored campus.',
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
       * The "Our two campuses" card pair used to sit here, sending parents off
       * to a Wadala page and a Matunga page. Both are gone: there is one
       * Primary School, so there is nothing to choose between and no second
       * page to link to.
       */
      {
        blockType: 'richText',
        heading: 'A caring, inclusive and stimulating school',
        accentWord: 'caring',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'At SIWS Primary School, we are committed to nurturing every child in a caring, inclusive and stimulating environment. Our focus extends beyond academic excellence to developing confident, responsible and compassionate individuals.',
          'At SIWS Primary School, we don’t just educate children — we inspire lifelong learners, responsible citizens and future leaders.',
        ]),
      },
      {
        blockType: 'statistics',
        heading: 'A legacy parents trust',
        background: 'sea',
        stats: [
          { value: '1934', label: 'Serving Mumbai since' },
          { value: '90+', label: 'Years of educational service' },
          { value: 'A Grade', label: 'School recognition' },
          { value: '20+', label: 'Years average teaching experience' },
        ],
      },
      {
        blockType: 'featureList',
        heading: 'What our Primary programme offers',
        accentWord: 'Primary programme',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2',
        background: 'white',
        items: PROGRAMME_BENEFITS,
      },
      {
        blockType: 'featureList',
        heading: 'Why parents choose SIWS Primary',
        accentWord: 'SIWS Primary',
        headingLevel: 'h2',
        // Cards, not ticks: six points with a sentence each need separating
        // from one another more than they need a mark in front of them.
        layout: 'cards',
        marker: 'tick',
        background: 'tint',
        items: USPS,
      },
      {
        blockType: 'richText',
        heading: 'Safe, Secure & Disciplined Campus',
        accentWord: 'Safe',
        headingLevel: 'h2',
        width: 'narrow',
        background: 'white',
        content: richText([
          'The safety and well-being of every child is our highest priority. The entire school campus — including classrooms, corridors, entrances and common areas — is monitored through a comprehensive CCTV surveillance system to ensure a secure learning environment.',
          'Well-defined safety protocols, disciplined practices and vigilant supervision provide parents with confidence that their children are learning in a safe, caring and protected atmosphere.',
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
              url: `mailto:${PRIMARY_EMAIL}`,
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
      'Grades 1 to 4, following the Maharashtra State Board (SCERT / Balbharati) curriculum and aligned with the National Education Policy 2020.',
    showInNav: true,
    navLabel: 'Academics',
    navOrder: 20,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'The SIWS Primary curriculum for Grades 1 to 4 — Maharashtra State Board, NEP 2020 aligned, with competency-based and activity-oriented learning.',
    layout: [
      {
        blockType: 'richText',
        heading: 'Curriculum & Teaching Methodology',
        accentWord: 'Teaching Methodology',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'Our Primary Section (Grades 1 to 4) follows the curriculum prescribed by the Maharashtra State Board (SCERT Maharashtra / Balbharati), aligned with the principles of the National Education Policy (NEP) 2020.',
          'The curriculum is designed to nurture confident, responsible and joyful learners by developing strong academic foundations along with essential life skills through competency-based and activity-oriented learning (PARAKH).',
        ]),
      },
      {
        /*
         * The compact layout, not a tick list and not cards.
         *
         * Ticks in two columns said nothing about the subjects and gave a
         * parent scanning the page nothing to catch on. Cards are the other
         * extreme: this block's own note explains that a card earns its size
         * when it carries a picture and a sentence, and a one-word label given
         * a card becomes a tall box that is mostly empty — eight of them, with
         * a ragged last row.
         *
         * Compact is the middle: a labelled tile per subject, icon beside the
         * words, three across. It reads as a syllabus at a glance, and the
         * tiles are a fixed height so the last row not dividing by three stops
         * mattering.
         */
        blockType: 'featureList',
        heading: 'Subjects taught',
        accentWord: 'Subjects',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2-centre',
        background: 'sea',
        items: SUBJECTS,
      },
      {
        blockType: 'featureList',
        heading: 'Grade by grade',
        accentWord: 'Grade by grade',
        headingLevel: 'h2',
        marker: 'number',
        columns: '1',
        background: 'white',
        items: GRADE_CURRICULUM,
      },
      {
        blockType: 'richText',
        heading: 'Our Teaching Methodology',
        headingLevel: 'h2',
        width: 'narrow',
        background: 'tint',
        content: richText([
          'We believe that every child learns differently. Our classrooms are interactive, inclusive and learner-centred, where teachers act as facilitators, encouraging children to think, explore and discover.',
        ]),
      },
      {
        blockType: 'featureList',
        heading: 'Our teaching practices',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2',
        background: 'white',
        items: TEACHING_PRACTICES,
      },
      {
        blockType: 'featureList',
        heading: 'Holistic Development',
        accentWord: 'Holistic',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2',
        background: 'sea',
        items: HOLISTIC,
      },
      {
        blockType: 'featureList',
        heading: 'Competitions held through the year',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2-centre',
        background: 'white',
        items: COMPETITIONS,
      },
      {
        blockType: 'richText',
        heading: 'Academic year and promotion',
        headingLevel: 'h2',
        width: 'normal',
        background: 'tint',
        content: richText([
          'The school follows the promotion guidelines prescribed by the Government of Maharashtra and the School Education Department.',
          'Students of Grades 1 to 4 are continuously assessed throughout the academic year through classroom participation, assignments, projects, oral and written assessments, and overall performance. Promotion to the next grade is based on the student’s continuous progress and holistic development, in accordance with the prevailing Government norms.',
          'Students requiring additional academic support are provided with appropriate guidance and remedial assistance to help them achieve the expected learning outcomes.',
        ]),
      },
    ],
  })

  // --------------------------------------------------------------- TEACHERS
  await upsert({
    slug: 'teachers',
    title: 'Our teachers',
    intro:
      'Our qualified and experienced teachers use child-centred, activity-based and competency-driven teaching strategies.',
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
    navLabel: 'Teachers',
    navOrder: 30,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Meet the teaching team at SIWS Primary School — experienced, qualified staff for Grades 1 to 4.',
    layout: [
      /**
       * TWO LISTS, ONE BLOCK.
       *
       * SIWS supplies the staff as two lists, each under its own head
       * teacher, and asked for the page to show them that way.
       *
       * It is NOT the old campus split coming back. That was two separate
       * blocks with a campus filter each, which asked a parent to choose a
       * location before reading a name. This is one block in `teams` layout:
       * it takes the whole roster, groups it, finds each team's head from the
       * designation, and prints no label for the group — so the page says
       * "here are the two teaching teams", not "pick a campus".
       */
      {
        blockType: 'faculty',
        heading: 'Our teachers',
        accentWord: 'teachers',
        headingLevel: 'h2',
        layout: 'teams',
        /*
         * Kept for the grid, which is what this block falls back to if the
         * teams layout is ever switched off: the monogram goes above the name
         * there because a three-across grid leaves the text column narrow
         * enough that "Nadar Alagumathi Selvaganeshan" wraps beside it.
         *
         * The teams layout sets the monogram beside the name itself, so this
         * has no effect while `layout` is 'teams'.
         */
        cardLayout: 'centred',
        showQualifications: true,
        background: 'white',
        intro: richText([
          'Our teachers are well trained, with over 20 years of teaching experience. With knowledge and passion, they create classrooms where every child feels encouraged to explore and succeed.',
        ]),
      },
    ],
  })

  // ------------------------------------------------------- RULES & UNIFORM
  await upsert({
    slug: 'school-rules',
    title: 'School rules and uniform',
    intro: 'What we ask of students and parents, and what our students wear.',
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
    navLabel: 'Rules & uniform',
    navOrder: 40,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription: 'General rules, discipline and uniform guidelines for SIWS Primary School.',
    layout: [
      {
        /**
         * ONE UNIFORM SPECIFICATION, AND IT NEEDS CONFIRMING.
         *
         * Only one of the two merged documents ever described the uniform in
         * detail; the other said no more than "wear proper school uniform". It
         * used to be labelled as that campus's own so no family bought a
         * uniform on the strength of a page that had never checked. With the
         * campuses merged there is no label left to qualify it, so it now reads
         * as the school's — which is only true if SIWS has in fact standardised
         * on it. That is flagged at the end of this run.
         */
        blockType: 'featureList',
        heading: 'Uniform',
        accentWord: 'Uniform',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '1',
        background: 'white',
        items: [
          {
            title: 'Girls',
            description:
              'Off-white striped half-sleeve shirt, biscuit-colour pinafore with V neck and box pleats reaching below the knee, red tie and red cross belt. Hair tied in two plaits with red ribbons.',
          },
          {
            title: 'Boys',
            description:
              'Off-white striped half-sleeve shirt and biscuit-colour half pants, red tie and red cross belt.',
          },
          { title: 'Cloth', description: 'Terry Cott.' },
          {
            title: 'Sweater',
            description: 'During the winter season, for both boys and girls — maroon colour only.',
          },
          {
            title: 'Footwear',
            description:
              'All-season black shoes with Velcro strap and biscuit-colour socks. Chappals and sandals are allowed only during the rainy season.',
          },
          {
            title: 'P.T. uniform',
            description: 'P.T. uniform should be worn on all Wednesdays.',
          },
        ],
      },
      {
        // Both campuses' lists, merged and deduplicated. See MERGED_RULES.
        blockType: 'featureList',
        heading: 'General rules',
        accentWord: 'rules',
        headingLevel: 'h2',
        marker: 'number',
        columns: '1',
        background: 'sea',
        items: MERGED_RULES.map((title) => ({ title })),
      },
    ],
  })

  // ------------------------------------------- UPDATES, NEWS & STUDENT LIFE
  /*
   * Three pages that carried a heading and nothing else.
   *
   * There is one hard constraint running through all of them: this section's
   * whole photographed record is eleven pictures of two occasions — Natya
   * Tarang 2026 and the Ignited Mind Lab certificates — plus Onam, three film
   * stills and one classroom. So the same photographs necessarily appear on
   * more than one of these pages, and each page has to earn its place by the
   * question it answers rather than by having pictures of its own:
   *
   *   Updates      — what has happened lately, and where the rest of it is
   *   News         — the things worth telling you, newest first
   *   Student Life — what school is like beyond the timetable
   *
   * STUDENT WALL AND TRANSPORT WERE HERE, and are gone at SIWS's instruction.
   * Transport was the page `institution.ts` warns about — the school has
   * supplied no operator, route or fare, so it never said anything a parent
   * could act on. Both are dropped from Primary's menu in `UNIT_OMIT` in
   * `seed/nav.ts`, which otherwise recreates them as placeholders, and the
   * rows are deleted by `npm run remove:primary-pages`.
   */
  const newsShots = {
    firstPrize: await photo('natya-tarang-2026-first-prize.jpg'),
    performance: await photo('natya-tarang-2026-performance.jpg'),
    company: await photo('natya-tarang-2026-company.jpg'),
    ignitedMind: await photo('ignited-mind-lab-2026.jpg'),
    pookalam: await photo('onam-2026-pookalam.jpg'),
  }

  const eventsPageId = await pageId('events')
  const achievementsPageId = await pageId('achievements')

  /*
   * The two notices the office repeats most often. Both are already stated on
   * the rules page; they are here because a parent looking for opening hours
   * goes to Updates, not to a page about uniform.
   */
  const OFFICE_NOTICES = [
    {
      title:
        'Certificates — date of birth, bonafide student, first attempt, leaving certificate and similar — are issued between 1.00 p.m. and 2.30 p.m. only.',
    },
    { title: 'No school business is transacted on Saturdays, Sundays and holidays.' },
  ]

  // ------------------------------------------------------------ STUDENT LIFE
  await upsert({
    slug: 'student-life',
    title: 'Student Life',
    intro:
      'What the day holds beyond the timetable — the stage, the sports ground, the festivals and the habits a child leaves with.',
    showInNav: true,
    navLabel: 'Student Life',
    navOrder: 70,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Life at SIWS Primary School beyond the classroom — arts and dance, sport, cultural celebrations, environmental work and leadership for children in Grades 1 to 4.',
    layout: [
      ...(newsShots.performance
        ? [
            {
              blockType: 'mediaText',
              heading: 'School is more than the timetable',
              accentWord: 'more than',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'left',
              imageShape: 'rounded',
              image: newsShots.performance,
              content: richText([
                'A child in Grades 1 to 4 spends four years here, and the part they remember is rarely the part that was examined. It is the morning they stood on a stage in costume, the afternoon their rangoli was the one photographed, the term they were trusted to lead something.',
                'The section is built to give every child several of those, whatever they turn out to be good at — which is why the list below is as wide as it is.',
              ]),
            },
          ]
        : []),
      {
        blockType: 'featureList',
        /*
         * Six of the seven strands in `HOLISTIC`. The one left out — the
         * Mathematics and EVS enrichment programmes — is academic work and is
         * already set out on the Academics page under the curriculum it
         * belongs to. Six also splits three and three, which is the reason
         * `PROGRAMME_BENEFITS` above is six rather than seven.
         */
        heading: 'What a year holds',
        accentWord: 'a year',
        headingLevel: 'h2',
        layout: 'cards',
        background: 'sea',
        items: [
          {
            title: 'Literary and language activities',
            icon: 'library',
            description:
              'Recitation, elocution, story telling and handwriting — in English and in Marathi.',
          },
          {
            title: 'Art, craft, music and dance',
            icon: 'music',
            description:
              'Drawing and painting, clay work, rangoli, best out of waste, and the group dance that took Natya Tarang 2026.',
          },
          {
            title: 'Sports and physical education',
            icon: 'sport',
            description: 'Sports and games through the year, taught as a subject in its own right.',
          },
          {
            title: 'Cultural celebrations and festivals',
            icon: 'activity',
            description:
              'Onam under Ek Bharat Shreshtha Bharat, Independence Day, Raksha Bandhan — marked together, on stage, by the children.',
          },
          {
            title: 'Environmental awareness',
            icon: 'garden',
            description:
              'Best out of waste and environment-themed work, so that looking after things is practised rather than announced.',
          },
          {
            title: 'Leadership and values',
            icon: 'care',
            description:
              'Value education, life skills, and chances to be responsible for something in front of the rest of the school.',
          },
        ],
      },
      ...(galleryPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'See a year of it',
              background: 'sea',
              text: richText([
                'The classrooms, the costumes and the prizes, photographed as they happened.',
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
    title: 'News',
    intro: 'What has happened in the Primary Section lately, newest first.',
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
    navLabel: 'News',
    navOrder: 61,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'News from SIWS Primary School — first place at Natya Tarang 2026, certificates from the Ignited Mind Lab programme, and the celebrations of the school year.',
    layout: [
      /*
       * Two across rather than three. Each of these has a photograph worth
       * looking at and two sentences under it; at three across the picture
       * comes out the size of a thumbnail and the story reads as a caption.
       */
      {
        blockType: 'cardGrid',
        heading: 'Lately at the Primary Section',
        accentWord: 'Lately',
        headingLevel: 'h2',
        background: 'white',
        columns: '2',
        placedBySeed: true,
        cards: [
          ...(newsShots.firstPrize
            ? [
                {
                  title: 'First place at Natya Tarang 2026',
                  image: newsShots.firstPrize,
                  description:
                    'Our dancers took first place in Category A — Pre-Primary to Standard IV — at the inter-school and college group dance competition, coming back with the trophy and a cheque for twenty thousand rupees.',
                  ...(achievementsPageId
                    ? {
                        cta: [
                          {
                            link: {
                              label: 'See the photographs',
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
          ...(newsShots.ignitedMind
            ? [
                {
                  title: 'Certificates from the Ignited Mind Lab',
                  image: newsShots.ignitedMind,
                  description:
                    'Eleven children came back from the Ignited Mind Lab programme with certificates of achievement and medals round their necks.',
                  ...(achievementsPageId
                    ? {
                        cta: [
                          {
                            link: {
                              label: 'See the photographs',
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
          ...(newsShots.pookalam
            ? [
                {
                  title: 'Onam, under Ek Bharat Shreshtha Bharat',
                  image: newsShots.pookalam,
                  description:
                    'A pookalam laid in the hall, the lamp lit together, and staff and children in Kerala dress. There is a film of the morning on the Events page.',
                  ...(eventsPageId
                    ? {
                        cta: [
                          {
                            link: {
                              label: 'Watch the day',
                              type: 'internal',
                              reference: { relationTo: 'pages', value: eventsPageId },
                            },
                          },
                        ],
                      }
                    : {}),
                },
              ]
            : []),
          ...(videoStills.independence
            ? [
                {
                  title: 'The 80th Independence Day, on stage',
                  image: videoStills.independence,
                  description:
                    'Our 80th Independence Day was marked on stage by the children of the Primary Section, and filmed. At Raksha Bandhan they tied rakhis to the men and women who look after the neighbourhood.',
                  ...(eventsPageId
                    ? {
                        cta: [
                          {
                            link: {
                              label: 'Watch both films',
                              type: 'internal',
                              reference: { relationTo: 'pages', value: eventsPageId },
                            },
                          },
                        ],
                      }
                    : {}),
                },
              ]
            : []),
        ],
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
    intro: 'News, events and honours from the Primary Section, and where to find each of them.',
    showInNav: true,
    navLabel: 'Updates',
    navOrder: 60,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Updates from SIWS Primary School — the latest news, the celebrations of the school year, and the prizes our students have won.',
    layout: [
      /*
       * The overview leads with the single biggest thing that has happened
       * rather than with a row of cards. A hub page that opens on three equal
       * boxes tells a parent where to click and nothing about the school; this
       * way the first thing on the page is news, and the navigation follows it.
       */
      ...(newsShots.firstPrize
        ? [
            {
              blockType: 'mediaText',
              heading: 'First place at Natya Tarang 2026',
              accentWord: 'First place',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'left',
              imageShape: 'rounded',
              image: newsShots.firstPrize,
              content: richText([
                'Our dancers took first place in Category A — Pre-Primary to Standard IV — at Natya Tarang 2026, the inter-school and college group dance competition. They came back with the trophy and a cheque for twenty thousand rupees.',
              ]),
              ...(achievementsPageId
                ? {
                    cta: [
                      {
                        link: {
                          label: 'See the photographs',
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
        columns: '3',
        placedBySeed: true,
        cards: [
          {
            title: 'News',
            description:
              'What has happened lately — prizes, programmes and the notices the office repeats most often.',
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
            title: 'Events',
            description:
              'The celebrations of the school year, with films of Independence Day, Raksha Bandhan and Onam.',
            ...(eventsPageId
              ? {
                  cta: [
                    {
                      link: {
                        label: 'See the events',
                        type: 'internal',
                        reference: { relationTo: 'pages', value: eventsPageId },
                      },
                    },
                  ],
                }
              : {}),
          },
          {
            title: 'Achievements',
            description:
              'Recognition earned by our students in the arts, in competition and in the classroom.',
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

  // ---------------------------------------------------------- FAQ & FEEDBACK
  /*
   * The general FAQ deliberately answers NOTHING about admission.
   *
   * Primary carries two FAQ pages — this one at the top level and Admissions
   * FAQ inside the Admissions drop-down — and two FAQs in one menu is only
   * worth having if a reader can tell from the outside which one holds their
   * question. So the split is by WHEN somebody is asking: Admissions FAQ is
   * for a family deciding whether to apply, and this is for a family whose
   * child is already here. Every answer below comes from the nineteen general
   * rules, the curriculum, or the staffing — all of it set out earlier in this
   * file — and the one link between the two pages is the note at the foot.
   */

  await upsert({
    slug: 'faq',
    title: 'FAQ',
    intro: 'The questions parents of children already in Grades 1 to 4 ask most often.',
    showInNav: true,
    navLabel: 'FAQ',
    navOrder: 80,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Answers for parents of SIWS Primary School students — what a child brings each day, uniform, illness, how the curriculum is taught, and how to reach a teacher.',
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
              'Three things, without fail: the school calendar, the school identity card and the school diary. Every student must have their own copy of the calendar and bring it daily.',
              'For the long recess, only dry food. Students are asked not to bring books, magazines, newspapers or periodicals that are not needed for the day’s lessons.',
            ]),
          },
          {
            question: 'What are the uniform rules?',
            answer: richText([
              'All students come to school in the prescribed uniform and are expected to be neat and tidy. What the uniform consists of is set out on the rules and uniform page.',
              'Children are asked not to wear ornaments or a watch. That is a safety rule rather than a dress rule — students are responsible for the safe custody of their own books and belongings.',
            ]),
          },
          {
            question: 'How is the campus kept safe?',
            answer: richText([
              'The entire campus — classrooms, corridors, entrances and common areas — is monitored by CCTV, and movement between rooms is supervised. Safety is the reason the school also asks visitors to come in only with the Head Teacher’s consent.',
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
              'English, Marathi, Mathematics, EVS — which takes in Science, History, Geography and Civics — ICT, Art, Work Experience, Physical Education and Value Education. The curriculum is the Maharashtra State Board’s, aligned with NEP 2020, in English medium.',
            ]),
          },
          {
            question: 'How are lessons taught?',
            answer: richText([
              'Through child-centred, activity-based and competency-driven methods, so a lesson is understood rather than memorised. Every classroom has an interactive smart panel, and multimedia lessons are used alongside the board and the exercise book.',
              'There is continuous formative assessment with constructive feedback, and individual attention and remedial support wherever a child needs it.',
            ]),
          },
          {
            question: 'How much homework should I expect?',
            answer: richText([
              'Enough that it needs doing daily. Parents are earnestly asked to see that their children do their homework and prepare their lessons each day as per the timetable — the school is explicit that this matters both for the child and for the smooth running of the class.',
            ]),
          },
          {
            question: 'What can my child take part in outside lessons?',
            answer: richText([
              'Twelve competitions run through the year — recitation, fancy dress, elocution, drawing and painting, story telling, group singing, handwriting, work experience, clay work, rangoli, best out of waste, and sports and games.',
              'Alongside those are literary and language activities, art, craft, music and dance, sport, cultural celebrations, environmental work and leadership opportunities. The Student Life pages set all of it out.',
            ]),
          },
          {
            question: 'Who teaches my child?',
            answer: richText([
              'The section has twenty-two teachers under two head teachers, qualified in B.A., B.Com., M.A., B.Ed. and D.Ed., with an art teacher among them. Many have taught here for more than twenty years. Every name, and who leads each teaching team, is on the teachers page.',
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
              'Ask the office to arrange it. Parents, guardians and others are not permitted to see their ward or meet a teacher during school hours without the prior consent of the Head Teacher — it is how the school knows who is on the campus while the children are in it.',
            ]),
          },
          {
            question: 'How do I tell the school we have moved or changed our number?',
            answer: richText([
              'Tell the office promptly. The school keeps a record of the address and telephone number of every student’s parents or guardians, and it is only useful if it is current.',
            ]),
          },
          {
            question: 'When can I get a bonafide certificate?',
            answer: richText([
              'From the school office between 1.00 p.m. and 2.30 p.m. only. The same window covers date of birth, first attempt and leaving certificates. No school business is transacted on Saturdays, Sundays or holidays.',
            ]),
          },
          {
            question: 'May we give a gift to a teacher, or collect funds at school?',
            answer: richText([
              'No. Presents in cash or in kind to teachers are not permitted, and collecting funds for any reason within the school premises is prohibited.',
            ]),
          },
          {
            question: 'Is there financial help?',
            answer: richText([
              'SIWS administers 151 scholarship and endowment funds, given by well-wishers over more than nine decades and awarded from the Kindergarten Section through to the S.S.C. Examination. Three of them name the Wadala Primary Section specifically, and the whole register is linked below.',
            ]),
          },
        ],
      },
      /*
       * INHERITED FROM THE ADMISSIONS PAGE, which carried it until that page
       * was removed. The register is institution-wide and this section's own
       * scholarship answer sits a few centimetres above, so the link belongs
       * here rather than nowhere — without it, Primary names 151 funds and
       * offers no way to read them.
       */
      ...(scholarshipsPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'See every SIWS scholarship fund',
              background: 'brand',
              text: richText([
                'The complete register of all 151 merit, open and arts funds is published for the whole institution.',
              ]),
              links: [
                {
                  link: {
                    label: 'View the full scholarship register',
                    type: 'internal',
                    reference: { relationTo: 'pages', value: scholarshipsPageId },
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
      'What families tell us shapes how the section runs. If your child is with us, we would like to hear from you.',
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
      'What parents of SIWS Primary School students say about Grades 1 to 4 in Wadala — and how to send the section your own feedback.',
    layout: [
      {
        blockType: 'testimonials',
        heading: 'What parents say',
        accentWord: 'parents',
        headingLevel: 'h2',
        background: 'white',
        // Two rows drifting past one another, the top travelling right and the
        // bottom left, edges faded, paused on hover and on focus. Under four
        // quotes it falls back to a grid, and with motion reduced it becomes a
        // wrapped grid rather than a pair of scrollbars.
        layout: 'marquee',
        showAttribution: false,
        quotes: PRIMARY_PARENT_QUOTES,
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
            title: 'Speak to the class teacher first',
            description:
              'Anything about your own child — how they are getting on, what they are finding hard, how the homework is going — is answered fastest by the person who teaches them. Ask the office to arrange a time.',
          },
          {
            title: 'Write in the school diary',
            description:
              'The diary comes to school with your child every day and goes home again. It is the simplest line between the classroom and the kitchen table.',
          },
          {
            title: 'Write to the school office',
            description:
              `For anything the class teacher cannot settle, write to ${PRIMARY_EMAIL} or telephone ${PRIMARY_PHONES}, and the office will arrange a time with the Head Teacher.`,
          },
          ...(contactPageId
            ? [
                {
                  title: 'Or send it through the enquiry form',
                  description:
                    'The form on the contact page reaches the school directly, and somebody will come back to you.',
                },
              ]
            : []),
        ],
      },
    ],
  })

  // ------------------------------------------------------ ABOUT & FACILITIES
  /*
   * The two pages the menu has pointed at since it was built, and which have
   * carried a bare heading and nothing else ever since.
   *
   * They are seeded LAST, after every other page, because both link onward and
   * `pageId` reads what is already in the database — putting them here means
   * the ids for Academics, Teachers and the gallery are real by the time the
   * cards are built, instead of null on a first run.
   *
   * Neither page says anything about fees, timings or the buildings. SIWS has
   * not supplied any of it, and the warning at the foot of this file still
   * lists all three as outstanding.
   */
  const facilitiesPageId = await upsert({
    slug: 'facilities',
    title: 'Facilities & Campus',
    intro:
      'A campus in Wadala under CCTV throughout, with an interactive panel in the classrooms and room for everything that happens outside them.',
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
      'The SIWS Primary School campus in Wadala — smart classrooms with digital learning resources, CCTV surveillance throughout, and space for sport and the arts.',
    layout: [
      ...(classroom
        ? [
            {
              blockType: 'mediaText',
              heading: 'Inside a Primary classroom',
              accentWord: 'classroom',
              headingLevel: 'h2',
              background: 'white',
              imagePosition: 'left',
              imageShape: 'rounded',
              image: classroom,
              content: richText([
                'Every classroom has an interactive smart panel at the front of it. Multimedia lessons and digital learning resources are used alongside the board and the exercise book rather than instead of them — a diagram can be shown moving, and then drawn.',
                'Children sit in pairs at desks facing the front, and the teacher moves between them. It is an ordinary classroom, run by somebody who has usually been running one here for a very long time.',
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
            title: 'Smart classrooms',
            icon: 'computers',
            description:
              'Interactive, technology-enabled classrooms with multimedia lessons and digital learning resources.',
          },
          {
            title: 'A campus under CCTV',
            icon: 'security',
            description:
              'Classrooms, corridors, entrances and common areas are all covered by the surveillance system.',
          },
          {
            title: 'Room for sport and the arts',
            icon: 'sport',
            description:
              'Space for the sports, drawing, clay work, rangoli and group singing the section competes in through the year.',
          },
          {
            title: 'Years of dedication',
            icon: 'staff',
            description:
              'Twenty-two teachers, many of them more than twenty years in this section — the most important thing on any campus.',
          },
        ],
      },
      {
        blockType: 'richText',
        heading: 'How the campus is kept safe',
        accentWord: 'safe',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'The safety and well-being of every child is our highest priority. The entire school campus — including classrooms, corridors, entrances and common areas — is monitored through a comprehensive CCTV surveillance system to ensure a secure learning environment.',
          'Parents and guardians are asked not to meet a child or their teacher during school hours without the prior consent of the Head Teacher. It is a rule about knowing exactly who is on the campus, and it is the reason the arrangement works.',
        ]),
      },
      {
        blockType: 'richText',
        heading: 'At the school office',
        accentWord: 'office',
        headingLevel: 'h2',
        width: 'normal',
        background: 'sea',
        content: richText([
          'Certificates — date of birth, bonafide student, first attempt, leaving certificate and similar — are issued between 1.00 p.m. and 2.30 p.m. only.',
        ]),
      },
      ...(galleryPageId
        ? [
            {
              blockType: 'callToAction',
              heading: 'See the section for yourself',
              background: 'white',
              text: richText([
                'Photographs of the classrooms, the competitions, and the prizes the children have brought back.',
              ]),
              links: [
                {
                  link: {
                    label: 'Open the gallery',
                    type: 'internal',
                    reference: { relationTo: 'pages', value: galleryPageId },
                  },
                },
              ],
            },
          ]
        : []),
    ],
  })

  const academicsPageId = await pageId('academics')
  const teachersPageId = await pageId('teachers')

  /* A card is only built if the page it points at is really there. */
  const onwardCard = (
    title: string,
    description: string,
    label: string,
    target: number | string | null,
  ) => ({
    title,
    description,
    ...(target
      ? {
          cta: [
            {
              link: {
                label,
                type: 'internal',
                reference: { relationTo: 'pages', value: target },
              },
            },
          ],
        }
      : {}),
  })

  await upsert({
    slug: 'about',
    title: 'About',
    intro:
      'Grades 1 to 4 on the Maharashtra State Board curriculum, taught by twenty-two teachers on a campus SIWS has run since 1934.',
    showInNav: true,
    navLabel: 'About',
    navOrder: 1,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'About SIWS Primary School — Grades 1 to 4 on the Maharashtra State Board curriculum, aligned with NEP 2020, taught by twenty-two teachers under two head teachers.',
    layout: [
      {
        blockType: 'statistics',
        heading: 'The section at a glance',
        accentWord: 'a glance',
        headingLevel: 'h2',
        background: 'sea',
        stats: [
          { value: '1 to 4', label: 'Grades taught' },
          { value: '22', label: 'Teachers in the section' },
          { value: '1934', label: 'Serving Mumbai since' },
          { value: 'SSC', label: 'Maharashtra State Board' },
        ],
      },
      {
        blockType: 'richText',
        heading: 'What the Primary years are for',
        accentWord: 'Primary years',
        headingLevel: 'h2',
        width: 'normal',
        background: 'white',
        content: richText([
          'The Primary Section takes a child from Grade 1 to Grade 4 — the four years in which reading stops being the thing being learnt and becomes the thing everything else is learnt with. The curriculum is the Maharashtra State Board’s, aligned with NEP 2020, and it is taught through activity and discussion rather than through dictation and copying.',
          'The section sits inside the SIWS Group of Institutions. A child who joins in Grade 1 can carry on into the Secondary School and then the Junior College without changing school in between — the same campus, and often teachers who already know the family.',
        ]),
      },
      {
        blockType: 'featureList',
        heading: 'What is taught',
        accentWord: 'taught',
        headingLevel: 'h2',
        marker: 'tick',
        columns: '2-centre',
        background: 'white',
        items: SUBJECTS,
      },
      {
        blockType: 'featureList',
        heading: 'How the section is staffed',
        accentWord: 'staffed',
        headingLevel: 'h2',
        marker: 'number',
        columns: '1',
        background: 'sea',
        items: [
          {
            title: 'Two head teachers',
            description:
              'Mrs. Geeta Raja is I/C Head Teacher and Mrs. Sreedevi Prasanna Bagayatkar is Head Teacher. Each leads her own teaching team.',
          },
          {
            title: 'Twenty assistant teachers',
            description:
              'Qualified in B.A., B.Com., M.A., B.Ed. and D.Ed., with an art teacher among them. Many have taught in this section for more than twenty years.',
          },
          {
            title: 'Taught, not lectured',
            description:
              'Child-centred, activity-based and competency-driven methods, so that a lesson is understood rather than memorised.',
          },
        ],
      },
      {
        blockType: 'cardGrid',
        heading: 'Where to go next',
        accentWord: 'next',
        headingLevel: 'h2',
        background: 'white',
        columns: '3',
        placedBySeed: true,
        cards: [
          onwardCard(
            'Academics',
            'The subjects, what each grade covers, and how the school year is organised.',
            'See what is taught',
            academicsPageId,
          ),
          onwardCard(
            'Teachers',
            'Every teacher in the section, listed under the head teacher they work with.',
            'Meet the teachers',
            teachersPageId,
          ),
          onwardCard(
            'Facilities & Campus',
            'The classrooms, the safety arrangements, and what the campus offers.',
            'See the campus',
            facilitiesPageId,
          ),
        ],
      },
    ],
  })

  payload.logger.info(
    `Primary content seeded — one school, ${MERGED_RULES.length} merged house rules.`,
  )

  payload.logger.warn(
    'STILL TO COME from SIWS: fee details; campus, classroom and facility photographs; teacher photographs; parent testimonials; alumni achievements; press mentions; awards and certifications; social media handles; and the legal documents (privacy policy, terms, fee/refund policy, RTI disclosures). No page invents any of these.',
  )
  payload.logger.warn(
    `TO CONFIRM AFTER THE MERGE — the two campuses were published separately until now, and merging them forced two decisions this seed could not make on its own:\n` +
      `  • HOUSE RULES — the two documents were not the same. The page now shows the union of both (${MERGED_RULES.length} rules), because dropping either set would release families from something the school may still ask of them. That means every family is shown rules that previously applied to only half the school — notably the 80% attendance requirement and the English-only rule. Please strike anything the merged school no longer enforces.\n` +
      `  • UNIFORM — only one of the two documents ever specified a uniform; the other said only "wear proper school uniform". That specification is now published as the school's, unqualified. Confirm SIWS has standardised on it before a family buys one.`,
  )
  payload.logger.warn(
    'ICT and VALUE EDUCATION are published as Primary subjects on SIWS’s instruction, and are in neither requirement document. The Academics page now tells parents the Primary Section teaches both. Confirm they are taught, and from which grade — neither tile carries a description, because none was supplied.',
  )
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    // Payload nests field errors inside `data.errors`, which the default
    // console output prints as `[Object]` — useless for finding which field
    // actually failed.
    const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
    if (Array.isArray(nested)) {
      console.error('Primary seed failed. Field errors:')
      for (const item of nested) console.error('  •', JSON.stringify(item))
    } else {
      console.error('Primary seed failed:', error)
    }
    process.exit(1)
  })
