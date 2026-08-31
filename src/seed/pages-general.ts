import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('./lexical')

/**
 * Gives every page that is still blank a real structure and general copy.
 *
 * WHAT THIS WILL AND WILL NOT WRITE.
 *
 * Every line here is either a description of what the page is for, or guidance
 * that is true of schools generally — "admission enquiries are answered by the
 * office", "routes are confirmed before each academic year". Nothing asserts a
 * fact about SIWS: no fees, no timings, no routes, no counts, no dates, no
 * claims about facilities the school may or may not have. Those are the things
 * only SIWS can supply, and a page that invents one is read as fact long after
 * the placeholder is forgotten.
 *
 * So each page says what belongs there and how to reach the school in the
 * meantime, and leaves a slot for the specifics. When SIWS sends real content
 * it replaces the general copy rather than sitting awkwardly beside it.
 *
 * Pages that already carry real content are skipped entirely — the guard is
 * `intro like 'We are preparing this page%'`, which only the placeholder seed
 * writes.
 *
 * Run with:  npm run seed:pages
 */

interface Recipe {
  /** Small label above the page title. */
  eyebrow: string
  /** One or two sentences saying what the page is for. */
  intro: string
  /** "What you will find here" — the sections SIWS's content will fill. */
  points: { title: string; description: string }[]
  /** Closing paragraph. Guidance only, never a claim. */
  outro?: string
}

/*
 * Keyed by slug, so a recipe written once serves the same page on the portal
 * and on all four unit sites. Where a unit needs different wording later it
 * can be edited in the admin panel like any other page.
 */
const RECIPES: Record<string, Recipe> = {
  about: {
    eyebrow: 'About',
    intro:
      'An introduction to the school — how it is organised, what it sets out to do, and who leads it.',
    points: [
      {
        title: 'Overview',
        description: 'What the school offers and the age groups it serves.',
      },
      {
        title: 'Approach',
        description: 'How teaching and pastoral care are organised day to day.',
      },
      {
        title: 'Head of school',
        description: "A message from the school's head.",
      },
      {
        title: 'Campus',
        description: 'The buildings, grounds and facilities students use.',
      },
    ],
    outro: 'For anything not covered here, the school office is the best first point of contact.',
  },
  facilities: {
    eyebrow: 'Campus',
    intro: 'The spaces students learn, eat, play and gather in during the school day.',
    points: [
      {
        title: 'Classrooms',
        description: 'Teaching spaces and how they are equipped.',
      },
      {
        title: 'Library and laboratories',
        description: 'Facilities supporting study and practical work.',
      },
      {
        title: 'Sport and play',
        description: 'Outdoor and indoor space for physical activity.',
      },
      {
        title: 'Health and safety',
        description: 'Arrangements for supervision, first aid and access.',
      },
    ],
    outro: 'Families are welcome to arrange a visit to see the campus in person.',
  },
  gallery: {
    eyebrow: 'Gallery',
    intro: 'Photographs from around the school and from events through the year.',
    points: [
      {
        title: 'Around the campus',
        description: 'Everyday spaces as students use them.',
      },
      {
        title: 'Events and celebrations',
        description: 'Assemblies, festivals and school occasions.',
      },
      {
        title: 'Activities',
        description: 'Sport, the arts and other activities beyond the classroom.',
      },
    ],
  },
  academics: {
    eyebrow: 'Academics',
    intro: 'What is taught, how it is taught, and how students are supported through the year.',
    points: [
      {
        title: 'Curriculum',
        description: 'Subjects offered and how the year is structured.',
      },
      {
        title: 'Teaching approach',
        description: 'How lessons, practical work and assessment fit together.',
      },
      {
        title: 'Assessment',
        description: 'How progress is measured and reported to parents.',
      },
      {
        title: 'Support',
        description: 'Help available to students who need it.',
      },
    ],
  },
  teachers: {
    eyebrow: 'Our teachers',
    intro: 'The staff who teach and look after students here.',
    points: [
      {
        title: 'Teaching staff',
        description: 'Names, subjects and qualifications.',
      },
      {
        title: 'Support staff',
        description: 'Colleagues supporting learning and welfare.',
      },
    ],
    outro: 'To contact a member of staff, please write to the school office in the first instance.',
  },
  'annual-calendar': {
    eyebrow: 'Calendar',
    intro:
      'Term dates, holidays and school events for the academic year, published once confirmed.',
    points: [
      { title: 'Term dates', description: 'When each term begins and ends.' },
      { title: 'Holidays', description: 'Scheduled breaks and closures.' },
      {
        title: 'Events',
        description: 'Examinations, meetings and school occasions.',
      },
    ],
    outro: 'Dates can change. The office will confirm anything you are planning around.',
  },
  'school-rules': {
    eyebrow: 'Rules and uniform',
    intro: 'What is expected of students day to day, and what they should wear.',
    points: [
      { title: 'Uniform', description: 'The everyday and sports uniform.' },
      {
        title: 'Attendance and timings',
        description: 'Arrival, departure and absence.',
      },
      {
        title: 'Conduct',
        description: 'How students are expected to treat one another and the school.',
      },
    ],
  },
  admissions: {
    eyebrow: 'Admissions',
    intro: 'How to apply, what the school asks for, and who to speak to at each stage.',
    points: [
      { title: 'Who can apply', description: 'Age groups and entry points.' },
      {
        title: 'How to apply',
        description: 'The steps from first enquiry to confirmed place.',
      },
      {
        title: 'What to submit',
        description: 'Documents and forms needed with an application.',
      },
      { title: 'Fees', description: 'What is payable, and when.' },
    ],
    outro:
      'Send an enquiry and the admissions office will reply with current dates and the forms you need.',
  },
  'admissions-faq': {
    eyebrow: 'Admissions',
    intro: 'Answers to the questions families ask most often when applying.',
    points: [
      {
        title: 'Applying',
        description: 'Timing, eligibility and the steps involved.',
      },
      { title: 'Documents', description: 'What to prepare before you apply.' },
      {
        title: 'After you apply',
        description: 'What happens next and when you will hear.',
      },
    ],
    outro: 'If your question is not answered here, please send it to the admissions office.',
  },
  updates: {
    eyebrow: 'Updates',
    intro: 'News, announcements and events from across the school.',
    points: [
      { title: 'News', description: 'Announcements for parents and students.' },
      { title: 'Events', description: 'What is coming up.' },
      {
        title: 'Circulars',
        description: 'Notices sent home, kept here for reference.',
      },
    ],
  },
  news: {
    eyebrow: 'News',
    intro: 'Announcements and notices for parents, students and staff.',
    points: [
      { title: 'Latest', description: 'Recent announcements.' },
      {
        title: 'Notices',
        description: 'Circulars and letters sent to families.',
      },
    ],
  },
  events: {
    eyebrow: 'Events',
    intro: 'School occasions through the year, with dates confirmed as they are set.',
    points: [
      { title: 'Coming up', description: 'Events scheduled for this term.' },
      {
        title: 'Past events',
        description: 'Reports and photographs from earlier occasions.',
      },
    ],
  },
  achievements: {
    eyebrow: 'Achievements',
    intro: 'Recognition earned by students in academic work, sport and the arts.',
    points: [
      {
        title: 'Academic',
        description: 'Examination and competition results.',
      },
      { title: 'Sport', description: 'Team and individual achievements.' },
      {
        title: 'Arts and culture',
        description: 'Music, dance, drama and the visual arts.',
      },
    ],
    outro:
      "Students' names are published only where the school holds permission from a parent or guardian.",
  },
  'download-centre': {
    eyebrow: 'Downloads',
    intro: 'Forms, circulars and documents families need, gathered in one place.',
    points: [
      { title: 'Forms', description: 'Documents to complete and return.' },
      { title: 'Circulars', description: 'Notices previously sent home.' },
      {
        title: 'Policies',
        description: 'Documents the school publishes for reference.',
      },
    ],
    outro: 'If a document you need is not here, the office can send it to you.',
  },
  'student-life': {
    eyebrow: 'Student life',
    intro:
      'What students do beyond lessons — activities, responsibilities and the wider community.',
    points: [
      { title: 'Activities', description: 'Clubs, sport and the arts.' },
      {
        title: 'Creative work',
        description: 'Writing, art and projects by students.',
      },
      {
        title: 'Responsibility',
        description: 'Roles students take on within the school.',
      },
    ],
  },
  'student-wall': {
    eyebrow: 'Student wall',
    intro: "A place for students' own work — writing, artwork, photography and projects.",
    points: [
      { title: 'Writing', description: 'Stories, poems and essays.' },
      { title: 'Art and design', description: 'Drawing, painting and craft.' },
      { title: 'Projects', description: 'Work from across subjects.' },
    ],
    outro:
      "Work is published with the student's name only where the school holds permission from a parent or guardian.",
  },
  'value-based-stories': {
    eyebrow: 'Values',
    intro: 'Short pieces on the values the school teaches, and how they show up in school life.',
    points: [
      {
        title: 'Thought for the week',
        description: 'A short reflection shared with students.',
      },
      { title: 'Stories', description: 'Accounts drawn from school life.' },
    ],
  },
  alumni: {
    eyebrow: 'Alumni',
    intro: 'For former students — staying in touch, and news from the alumni community.',
    points: [
      {
        title: 'Stay in touch',
        description: 'Register your details to receive news.',
      },
      {
        title: 'Alumni news',
        description: 'What former students are doing now.',
      },
      {
        title: 'Reunions',
        description: 'Gatherings and events for former students.',
      },
    ],
    outro: 'If you studied here and would like to reconnect, please get in touch.',
  },
  transport: {
    eyebrow: 'Transport',
    intro:
      'Information about travelling to and from school, published once arrangements are confirmed for the year.',
    points: [
      {
        title: 'Routes and stops',
        description: 'Where the service runs and where it stops.',
      },
      { title: 'Timings', description: 'Departure and arrival times.' },
      {
        title: 'Safety',
        description: 'Supervision and conduct while travelling.',
      },
    ],
    outro: 'For current arrangements, please contact the school office.',
  },
  faq: {
    eyebrow: 'FAQ',
    intro: 'Answers to the questions families ask most often.',
    points: [
      { title: 'Admissions', description: 'Applying, timings and documents.' },
      {
        title: 'The school day',
        description: 'Timings, uniform and what to bring.',
      },
      { title: 'Contact', description: 'Who to speak to about what.' },
    ],
    outro: 'If your question is not answered here, please send it to the school office.',
  },
  contact: {
    eyebrow: 'Contact',
    intro: 'How to reach the school, and who to speak to.',
    points: [
      {
        title: 'General enquiries',
        description: 'The office is the first point of contact.',
      },
      {
        title: 'Admissions',
        description: 'Questions about applying for a place.',
      },
      { title: 'Visiting', description: 'Arranging to see the school.' },
    ],
  },
  'parent-feedback': {
    eyebrow: 'Feedback',
    intro: 'The school welcomes comments, suggestions and concerns from parents and guardians.',
    points: [
      {
        title: 'Share a comment',
        description: 'Tell the school what is working, or what is not.',
      },
      {
        title: 'Raise a concern',
        description: 'How concerns are received and looked into.',
      },
    ],
    outro: 'Every message is read. Please include a way to reply if you would like a response.',
  },
  careers: {
    eyebrow: 'Careers',
    intro: 'Working at the school — current vacancies and how to apply.',
    points: [
      { title: 'Current vacancies', description: 'Roles open at the moment.' },
      { title: 'How to apply', description: 'What to send, and to whom.' },
    ],
    outro:
      'Applications are welcome from suitably qualified candidates. Please write to the school office.',
  },
  newsletter: {
    eyebrow: 'Newsletter',
    intro: 'School news by email, for parents, guardians and former students.',
    points: [
      {
        title: 'What is sent',
        description: 'Announcements, events and reminders.',
      },
      {
        title: 'Your details',
        description: 'Used only to send the newsletter, and you can stop at any time.',
      },
    ],
  },
  leadership: {
    eyebrow: 'Leadership',
    intro: 'The people responsible for running the institution and its schools.',
    points: [
      {
        title: 'Management',
        description: 'Those responsible for governance and direction.',
      },
      {
        title: 'Heads of school',
        description: 'Who leads each school day to day.',
      },
    ],
  },
  'mandatory-documents': {
    eyebrow: 'Disclosure',
    intro: 'Documents the institution publishes for public reference, as required of schools.',
    points: [
      {
        title: 'Recognition',
        description: 'Affiliation and recognition documents.',
      },
      {
        title: 'Governance',
        description: 'Documents relating to how the institution is run.',
      },
      {
        title: 'Policies',
        description: 'Policies published for families and the public.',
      },
    ],
    outro: 'Certified copies can be requested from the office.',
  },
  community: {
    eyebrow: 'Community',
    intro: 'The wider school community — former students, families and staff.',
    points: [
      { title: 'Alumni', description: 'For former students.' },
      { title: 'Working here', description: 'Vacancies and how to apply.' },
      { title: 'Feedback', description: 'Comments and concerns from parents.' },
    ],
  },
  scholarships: {
    eyebrow: 'Scholarships',
    intro: 'Awards and assistance available to students, and how they are applied for.',
    points: [
      { title: 'Awards', description: 'What is available and who it is for.' },
      { title: 'How to apply', description: 'The process and what to submit.' },
    ],
  },
}

const run = async () => {
  const payload = await getPayload({ config })

  const { docs: media } = await payload.find({
    collection: 'media',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  const usable = media.filter((m) => m.withdrawn?.isWithdrawn !== true)

  /*
   * Fetched and filtered here rather than with a `like` in the query. The
   * adapter's `like` returned nothing against this column, and a silent empty
   * result would have looked like "no blank pages" instead of a broken filter.
   */
  /*
   * Published rows, NOT drafts. `draft: true` returns the newest version of
   * each page, and these pages still carry an older draft from the run that
   * created them — so the placeholder text this looks for lives on the
   * published row and the draft looked untouched. Reading drafts here found
   * nothing and reported "0 pages" as though the work were already done.
   */
  const { docs: allPages } = await payload.find({
    collection: 'pages',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  /*
   * Two ways a page qualifies: it still carries the placeholder line and has
   * never been touched, or it carries the section an earlier run of this
   * script wrote and is safe to rebuild. Neither matches a page an editor has
   * authored, which is the point.
   *
   * The second is found by querying for that section directly. Reading
   * `layout` off the fetched documents did not work — the blocks come back
   * without the shape that check assumed, so it silently matched nothing and
   * reported "0 pages" as though the work were already done.
   */
  const pool = (
    payload.db as unknown as {
      pool: {
        query: (t: string, v: unknown[]) => Promise<{ rows: { _parent_id: number }[] }>
      }
    }
  ).pool

  /*
   * Generated pages are recognised by their banner introduction, which is one
   * of the strings in RECIPES above. The previous guard looked for the ticked
   * list this script used to write — removing that list left the guard
   * matching nothing, so a re-run reported "0 pages" while every page still
   * held the old layout.
   */
  const { rows } = await pool.query(
    'SELECT DISTINCT _parent_id FROM pages_blocks_hero WHERE intro = ANY($1)',
    [Object.values(RECIPES).map((r) => r.intro)],
  )
  const generatedIds = new Set(rows.map((r) => String(r._parent_id)))

  const blank = allPages.filter(
    (page) =>
      (page.intro ?? '').startsWith('We are preparing this page') ||
      generatedIds.has(String(page.id)),
  )

  let filled = 0
  const noRecipe: string[] = []
  const failed: string[] = []

  for (const page of blank) {
    const recipe = RECIPES[page.slug]
    if (!recipe) {
      noRecipe.push(page.slug)
      continue
    }

    /*
     * The banner photograph rotates through the library by position, so a run
     * of pages does not all open on the same picture. Purely cosmetic — no
     * photograph is tied to the subject of any page, because none of them
     * illustrate these subjects specifically.
     */
    /*
     * A photograph only where one genuinely relates to the page.
     *
     * These were previously rotated through the library by position, which put
     * a kindergarten classroom on Transport, on the Download Centre and on
     * Careers. Every photograph SIWS has sent is a kindergarten scene; there is
     * no picture of a bus, a form or a vacancy, and dressing those pages with
     * an unrelated one tells the visitor something untrue about the page.
     * Pages with no matching photograph open on type alone, which the banner
     * already supports.
     */
    const RELEVANT: Record<string, string> = {
      about: 'kg-classroom-group.jpg',
      academics: 'kg-classroom-activity.jpg',
      teachers: 'kg-teacher-with-children.jpg',
      facilities: 'kg-play-area.jpg',
      gallery: 'kg-children-together.jpg',
      'student-life': 'kg-children-together.jpg',
      'student-wall': 'kg-classroom-seated.jpg',
    }
    const wanted = RELEVANT[page.slug]
    const banner = wanted ? (usable.find((m) => m.filename === wanted)?.id ?? null) : null

    try {
      await payload.update({
        collection: 'pages',
        id: page.id,
        data: {
          /*
           * The page's own slug and unit are passed back unchanged. They are not
           * being edited — but `ensureUniqueSlugPerUnit` runs on every save and
           * reads both from the incoming data, so omitting them made it compare
           * this slug against the whole institution rather than against its own
           * unit, and every unit page failed as a duplicate.
           */
          /*
           * `_status` must be passed back explicitly. Without it, an update
           * outside draft mode resets the field to its default and silently
           * unpublishes the page — every one of these went to draft and started
           * returning 404 to visitors while still looking correct in the CMS.
           */
          _status: page._status ?? 'published',
          slug: page.slug,
          ...(page.unit ? { unit: page.unit } : {}),
          // Cleared: the banner below now carries the introduction.
          intro: null,
          layout: [
            {
              blockType: 'hero',
              /*
               * No eyebrow. It held the page's own subject — "Transport" above
               * a page titled "Transport" — so sixty-eight pages opened by
               * saying the same word twice. A label that repeats the heading
               * under it carries nothing.
               */
              title: page.title,
              intro: recipe.intro,
              background: 'white',
              ...(banner ? { image: banner } : {}),
            },
            /*
             * Nothing between the banner and the closing note, on purpose.
             *
             * Every page carried a ticked "What you will find here" list
             * naming sections that do not exist yet. Across seventy pages it
             * read as filler — and a list promising Fees, Routes and Term
             * dates that appear nowhere is worse than an empty page, because
             * it looks like the content failed to load. Empty is honest.
             */
            ...(recipe.outro
              ? [
                  {
                    blockType: 'richText',
                    headingLevel: 'h2',
                    width: 'narrow',
                    background: 'sea',
                    content: richText([recipe.outro]),
                  },
                ]
              : []),
          ],
        } as never,
        overrideAccess: true,
      })
      filled += 1
    } catch (error) {
      /*
       * One page that will not save must not abort the other eighty-three.
       * The slug field rejects a reserved word, so a page whose address
       * collides with a system route fails here — worth reporting by name
       * rather than losing the whole run to it.
       */
      failed.push(`${page.slug} (${(error as Error).message})`)
    }
  }

  payload.logger.info(`Filled ${filled} pages with general content.`)
  if (failed.length > 0) {
    payload.logger.warn(`Could not save: ${failed.join('; ')}`)
  }
  if (noRecipe.length > 0) {
    payload.logger.warn(`No recipe, left blank: ${[...new Set(noRecipe)].sort().join(', ')}`)
  }
  payload.logger.warn(
    'This copy makes NO claim about SIWS — no fees, dates, routes, counts or facilities. It describes what each page is for. Replace it as SIWS sends the real detail.',
  )

  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
