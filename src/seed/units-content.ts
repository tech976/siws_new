import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Builds out the Primary, Secondary and Junior College websites.
 *
 * SIWS's content questionnaire has not come back yet, so this script is
 * deliberately conservative about what it publishes. Two rules govern it:
 *
 *  1. **Nothing invented is ever published.** Every published sentence is
 *     either institution-wide fact already confirmed on the approved
 *     Kindergarten page (founded 1934, Wadala, SSC Board) or a generic
 *     description of a process that is true of any admissions enquiry. There
 *     are no fabricated testimonials, no invented facilities, no made-up
 *     statistics and no faculty names. Publishing invented content about a real
 *     school is a reputational and legal risk that outlives the placeholder.
 *
 *  2. **Pages that need real content are created as drafts.** The structure is
 *     there in the CMS, with a note describing what belongs on it, so staff can
 *     drop the questionnaire answers straight in and press publish. Until then
 *     the public sees nothing rather than filler.
 *
 * The result: three sites that work today — navigation, enquiry forms, contact
 * details — with a visible, ready-made slot for everything still outstanding.
 *
 * Run with:  npm run seed:units
 */

const richText = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: paragraphs.map((body) => ({
      type: 'paragraph',
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      textFormat: 0,
      children: [
        { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text: body, version: 1 },
      ],
    })),
  },
})

/** Shared, verified facts about the institution. */
const ABOUT_SIWS =
  'Founded in 1934, South Indians’ Welfare Society (SIWS) is a trusted educational institution in Mumbai with a legacy spanning nearly a century. The institution is known for its commitment to discipline, values and structured academic learning.'

const CONTACT = {
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
    { platform: 'instagram', url: 'https://www.instagram.com/siwsschoolwadala/', showFeed: false },
    {
      platform: 'facebook',
      url: 'https://www.facebook.com/profile.php?id=61585854647515',
      showFeed: false,
    },
  ],
}

interface UnitContent {
  slug: string
  /** Hero headline — factual only. */
  headline: string
  subtitle: string
  /**
   * Classes offered, used by the enquiry form's dropdown.
   *
   * TO CONFIRM with SIWS: these follow the usual Maharashtra SSC pattern, but
   * the exact standards each unit covers must be verified before go-live. They
   * are on the content questionnaire.
   */
  classOptions: string[]
  /** Extra draft pages this unit needs beyond the shared set. */
  extraDrafts?: { slug: string; title: string; guidance: string[]; navLabel: string }[]
}

/**
 * Only the units that are still waiting on their content.
 *
 * Kindergarten, Primary and Secondary have each returned a requirement document
 * and now have a dedicated seed — `seed:kg`, `seed:primary`, `seed:secondary` —
 * which owns the same `home` and `contact` slugs. Leaving them here would mean
 * whoever ran `seed:units` last silently overwrote real school content with
 * placeholder copy and guessed class lists.
 *
 * Both guesses this file used to make turned out to be wrong, which is the point:
 * Primary is Grades 1 to 4, not Standards I to VII, and Secondary is Standards V
 * to X, not VIII to X.
 */
const UNITS: UnitContent[] = [
  {
    slug: 'junior-college',
    headline: 'SIWS Junior College, Wadala',
    subtitle: 'Standards XI & XII | Established 1934',
    classOptions: ['Standard XI', 'Standard XII'],
    extraDrafts: [
      {
        // SRS 4.3 — the Junior College site additionally presents the pathway
        // up from Secondary School.
        slug: 'moving-up-from-secondary',
        title: 'Moving up from Secondary School',
        navLabel: 'Moving up',
        guidance: [
          'This page explains the pathway from SIWS Secondary School into Junior College, which the specification requires the Junior College site to present.',
          'Please supply: the streams and courses offered; the eligibility or marks criteria for each; how and when students from SIWS Secondary apply; key dates; and who a student should speak to for guidance.',
        ],
      },
    ],
  },
]

/** Draft pages every unit needs, each with a note on what content to supply. */
const SHARED_DRAFTS = [
  {
    slug: 'about',
    title: 'About the school',
    navLabel: 'About',
    guidance: [
      'This page introduces the unit — the specification asks for an overview, the vision and approach, and a message from the head of school.',
      'Please supply: two or three paragraphs about this unit; the head of school’s name, photograph and message; and anything that makes this unit distinctive.',
    ],
  },
  {
    slug: 'academics',
    title: 'Academics',
    navLabel: 'Academics',
    guidance: [
      'This page covers the curriculum and how it is taught, plus the annual calendar and any documents parents can download.',
      'Please supply: the subjects offered; the teaching approach; board affiliation details; and any syllabus, book list or calendar PDFs you would like parents to be able to download.',
    ],
  },
  {
    slug: 'facilities',
    title: 'Campus and facilities',
    navLabel: 'Campus',
    guidance: [
      'This page shows the campus — the specification asks for facilities with descriptions and images, plus a campus gallery.',
      'Please supply: a list of facilities for this unit with a sentence each; and photographs of classrooms, laboratories, library, sports and other spaces.',
      'Please also confirm, for every photograph showing an identifiable student, that written parental permission has been obtained.',
    ],
  },
  {
    slug: 'faq',
    title: 'Frequently asked questions',
    navLabel: 'FAQ',
    guidance: [
      'This page answers the questions parents ask most often about this unit.',
      'Please supply: the questions your office actually receives, with answers — grouped by topic such as Admissions, Fees, Transport, Uniform and Academics.',
    ],
  },
]

const main = async () => {
  const payload = await getPayload({ config })

  let published = 0
  let drafted = 0

  for (const unit of UNITS) {
    const { docs } = await payload.find({
      collection: 'units',
      where: { slug: { equals: unit.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const record = docs[0]
    if (!record) {
      payload.logger.warn(`Unit "${unit.slug}" not found — skipping.`)
      continue
    }

    // All four units share one campus and one set of contact details.
    await payload.update({
      collection: 'units',
      id: record.id,
      data: CONTACT as never,
      overrideAccess: true,
    })

    const upsert = async (page: Record<string, unknown> & { slug: string; title: string }) => {
      const existing = await payload.find({
        collection: 'pages',
        where: { and: [{ slug: { equals: page.slug } }, { unit: { equals: record.id } }] },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })

      const data = { ...page, unit: record.id }

      if (existing.docs[0]) {
        await payload.update({
          collection: 'pages',
          id: existing.docs[0].id,
          data: data as never,
          overrideAccess: true,
        })
      } else {
        await payload.create({ collection: 'pages', data: data as never, overrideAccess: true })
      }
    }

    // ---------------------------------------------------------------- HOME
    await upsert({
      slug: 'home',
      title: unit.headline,
      _status: 'published',
      reviewStatus: 'approved',
      metaDescription: `${unit.headline} — part of South Indians’ Welfare Society, serving Wadala, Mumbai since 1934. Enquire about admission.`,
      layout: [
        {
          blockType: 'heroEnquiry',
          title: unit.headline,
          subtitle: unit.subtitle,
          benefitsIntro: 'At SIWS, your child benefits from:',
          benefits: [
            { text: 'A structured SSC Board curriculum' },
            { text: 'Nearly a century of educational experience' },
            { text: 'A focus on discipline, values and confidence' },
            { text: 'A safe, supervised campus in Wadala' },
          ],
          badge: {
            title: 'Admissions enquiries welcome',
            subtitle: 'Speak to our admissions team',
          },
          form: {
            title: 'Enquire about admission',
            subtitle: 'Tell us about your child and we will get in touch.',
            classOptions: unit.classOptions.map((label) => ({ label })),
            trustPoints: [
              { text: 'Over 92 years of educational legacy' },
              { text: 'SSC / State Board curriculum' },
              { text: 'Experienced and trained teachers' },
              { text: 'Safe and disciplined campus' },
            ],
          },
        },
        /*
         * THE TWO STREAMS, HIGH ON THE PAGE.
         *
         * This file now builds only the Junior College — the other three
         * sections have seeds of their own — and its home page said nothing
         * about Science and Commerce, which is the first thing a family
         * choosing a junior college needs and the only real decision in front
         * of them. It was three screens of legacy, figures and process before
         * the page named what is actually taught.
         *
         * `cards`, because each is a picture-less claim with a sentence under
         * it and there are two of them: a panel of two is a box around a
         * sentence, per docs/MASTER-LAYOUT.md §4.
         *
         * The wording is the short form of what /academics carries in full;
         * the link below sends anyone who wants the subject lists there rather
         * than repeating them here.
         */
        {
          blockType: 'featureList',
          heading: 'Two streams, Standards XI and XII',
          accentWord: 'Two streams',
          headingLevel: 'h2',
          layout: 'cards',
          marker: 'tick',
          columns: '2',
          background: 'tint',
          items: [
            {
              title: 'Science',
              description:
                'Physics, Chemistry, Biology and Mathematics on the Maharashtra State Board syllabus, with Computer Science and Information Technology as bifocal subjects — and preparation for JEE, NEET, MHT-CET and CUET alongside the HSC examination.',
            },
            {
              title: 'Commerce',
              description:
                'Accountancy, Economics, Organisation of Commerce and Management, Secretarial Practice, Mathematics and Information Technology — the foundation for CA, CS, CMA, B.Com., BBA and the management courses that follow.',
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
          content: richText([ABOUT_SIWS]),
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
        {
          blockType: 'featureList',
          heading: 'How admission works',
          headingLevel: 'h2',
          marker: 'number',
          columns: '2',
          background: 'white',
          items: [
            {
              title: 'Send us an enquiry',
              description: 'Fill in the form above with your details and the class you need.',
            },
            {
              title: 'We contact you',
              description:
                'Our admissions team will call to answer questions and confirm eligibility.',
            },
            {
              title: 'Visit the campus',
              description: 'Come and see the school and meet the teachers.',
            },
            {
              title: 'Complete the formalities',
              description: 'The team will guide you through the forms and documents needed.',
            },
          ],
        },
        {
          blockType: 'callToAction',
          heading: 'Questions about admission?',
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
    published += 1

    // ------------------------------------------------------------- CONTACT
    await upsert({
      slug: 'contact',
      title: 'Contact us',
      intro: 'We are on Sion–Wadala Estate Road in Wadala, Mumbai.',
      showInNav: true,
      navLabel: 'Contact',
      navOrder: 90,
      _status: 'published',
      reviewStatus: 'approved',
      metaDescription: `Contact ${unit.headline} — address, phone number and email for admissions and general enquiries.`,
      layout: [
        {
          blockType: 'cardGrid',
          heading: 'Who to contact',
          headingLevel: 'h2',
          columns: '2',
          background: 'white',
          cards: [
            {
              title: 'Admissions',
              description: 'For enquiries about joining the school — admissions@siws.edu.in',
            },
            {
              title: 'General enquiries',
              description: 'For anything else — info@siws.edu.in, +91 98927 03893',
            },
          ],
        },
      ],
    })
    published += 1

    // -------------------------------------------------------- DRAFT PAGES
    const drafts = [...SHARED_DRAFTS, ...(unit.extraDrafts ?? [])]

    for (const [index, draft] of drafts.entries()) {
      /*
       * SCAFFOLDING NEVER OVERWRITES A WRITTEN PAGE.
       *
       * These drafts exist to give a section a page to fill in. Once a section
       * seed has filled one in and published it, re-laying the scaffold puts
       * "What to put on this page" back over the content and returns it to
       * draft — which takes it off the site, because a draft is a 404 to a
       * visitor.
       *
       * That is exactly what happened to the Junior College's About and
       * Academics pages: `seed:jc` writes them at step 14 and this runs at
       * step 16, so they were correct in the database and gone by the end of
       * the run. Skipping a page that is already published leaves the
       * scaffolding doing its job for pages nobody has written yet.
       */
      const written = await payload.find({
        collection: 'pages',
        where: {
          and: [
            { slug: { equals: draft.slug } },
            { unit: { equals: record.id } },
            { _status: { equals: 'published' } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (written.docs[0]) {
        payload.logger.info(`${unit.slug}/${draft.slug}: already written — scaffolding skipped.`)
        continue
      }

      await upsert({
        slug: draft.slug,
        title: draft.title,
        showInNav: true,
        navLabel: draft.navLabel,
        navOrder: 20 + index * 10,
        // Draft, so the guidance below is visible to staff in the admin panel
        // but never to a parent.
        _status: 'draft',
        reviewStatus: 'draft',
        layout: [
          {
            blockType: 'richText',
            heading: 'What to put on this page',
            headingLevel: 'h2',
            width: 'narrow',
            background: 'sea',
            content: richText([
              ...draft.guidance,
              'Replace this section with your own content, then set the status to “Submitted for review”.',
            ]),
          },
        ],
      })
      drafted += 1
    }

    payload.logger.info(`Built ${unit.slug}: 2 published pages, ${drafts.length} drafts.`)
  }

  payload.logger.info(
    `Units complete — ${published} pages published, ${drafted} drafts awaiting content.`,
  )
  payload.logger.warn(
    'TO CONFIRM with SIWS: the class lists offered by each unit, used by the enquiry forms.',
  )
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Unit content seed failed:', error)
    process.exit(1)
  })
