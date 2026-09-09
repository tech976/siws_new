import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('./lexical')

/**
 * The three pages FR-PRV-15 requires to be reachable from the footer of every
 * page: the privacy and data protection page, the cookie policy, and the
 * accessibility statement.
 *
 * WHY THE TEXT HERE IS A PLACEHOLDER, DELIBERATELY
 * ------------------------------------------------
 * SRS 1.3 puts the drafting of legal text outside this project, and SRS 2.6
 * makes SIWS responsible for supplying and approving it: "SIWS will supply, and
 * take responsibility for, all legal text — privacy policy, cookie policy,
 * data-retention schedule, terms of use and statutory disclosures". A privacy
 * policy invented by a developer is worse than none: it makes representations
 * about what the school does with a child's data that nobody at the school has
 * agreed to, and under the DPDPA 2023 those representations bind the school.
 *
 * So this seeds the STRUCTURE — the pages, their addresses, their place in the
 * footer, and the headings each must cover — with every passage of actual
 * policy marked as awaiting SIWS. The headings are drawn from FR-PRV-05,
 * FR-PRV-06 and FR-PRV-14 so nothing the SRS requires is silently missed when
 * the text is written.
 *
 * Run with:  npm run seed:legal
 *
 * SAFE TO RUN TWICE — matched by slug, and an existing page is updated rather
 * than duplicated. It will overwrite text SIWS has since put in, so once the
 * real policy is in the CMS this should not be re-run.
 */

/** Marks a passage nobody has written yet, in the page itself. */
const AWAITING = (what: string) =>
  `[ To be supplied by SIWS — ${what}. This placeholder is visible on the published page and should be replaced before go-live. ]`

const main = async () => {
  const payload = await getPayload({ config })

  /** Upserts an institution-wide page, matched by slug with no unit. */
  const upsert = async (page: Record<string, unknown> & { slug: string; title: string }) => {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { and: [{ slug: { equals: page.slug } }, { unit: { exists: false } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (docs[0]) {
      await payload.update({
        collection: 'pages',
        id: docs[0].id,
        data: page as never,
        overrideAccess: true,
      })
      payload.logger.info(`Updated: ${page.title}  (/${page.slug})`)
      return
    }

    await payload.create({ collection: 'pages', data: page as never, overrideAccess: true })
    payload.logger.info(`Created: ${page.title}  (/${page.slug})`)
  }

  // ------------------------------------------------------- PRIVACY (FR-PRV-05)
  await upsert({
    slug: 'privacy',
    title: 'Privacy and Data Protection',
    showInNav: false,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      "How South Indians' Welfare Society collects, uses and protects personal data, and the rights available to you under the Digital Personal Data Protection Act, 2023.",
    layout: [
      {
        blockType: 'richText',
        heading: 'Privacy and Data Protection',
        headingLevel: 'h1',
        background: 'white',
        content: richText([
          AWAITING('the introduction to the privacy policy'),
        ]),
      },
      {
        blockType: 'richText',
        heading: 'What personal data we collect, and why',
        headingLevel: 'h2',
        background: 'white',
        /* FR-PRV-05: "what personal data is collected and for what purpose". */
        content: richText([
          AWAITING(
            'each category of personal data the school collects — admission enquiries, newsletter subscriptions, parent feedback, alumni registrations and job applications — and the purpose of each',
          ),
        ]),
      },
      {
        blockType: 'richText',
        heading: 'How it is used, and who it is shared with',
        headingLevel: 'h2',
        background: 'tint',
        content: richText([AWAITING('how the data is used and with whom it is shared')]),
      },
      {
        blockType: 'richText',
        heading: 'How long we keep it',
        headingLevel: 'h2',
        background: 'white',
        /* FR-PRV-05 and BR-DPA-02 — the retention schedule SIWS confirms. */
        content: richText([
          AWAITING('the retention period for each category of data (the retention schedule)'),
        ]),
      },
      {
        blockType: 'richText',
        heading: 'Your rights, and how to exercise them',
        headingLevel: 'h2',
        background: 'white',
        /* FR-PRV-05 / FR-PRV-12 — access, correction, erasure, withdrawal. */
        content: richText([
          AWAITING(
            'the rights available under the DPDPA 2023 — access, correction, erasure and withdrawal of consent — and the route by which a person exercises them',
          ),
        ]),
      },
      {
        blockType: 'richText',
        heading: 'Children’s data',
        headingLevel: 'h2',
        background: 'tint',
        /* FR-PRV-10 / FR-PRV-11 — parental consent, no profiling of children. */
        content: richText([
          AWAITING(
            'how verifiable parental consent is obtained before a child’s photograph or work is published, and the school’s undertaking not to profile or target advertising at children (Section 9, DPDPA 2023)',
          ),
        ]),
      },
      {
        blockType: 'richText',
        heading: 'Data Protection Officer and grievance redressal',
        headingLevel: 'h2',
        background: 'white',
        /* FR-PRV-06 / FR-CON-04 — the DPO must be named with contact details. */
        content: richText([
          AWAITING(
            'the name and contact details of the Data Protection Officer nominated by SIWS, and the grievance redressal route',
          ),
        ]),
      },
      {
        blockType: 'richText',
        heading: 'Changes to this policy',
        headingLevel: 'h2',
        background: 'white',
        /* FR-PRV-14 — versioned, with the effective date shown. */
        content: richText([
          AWAITING('the effective date of this version, and where previous versions can be seen'),
        ]),
      },
    ],
  })

  // -------------------------------------------------------- COOKIES (FR-PRV-04)
  await upsert({
    slug: 'cookies',
    title: 'Cookie Policy',
    showInNav: false,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'The cookies and similar technologies used on this website, what each is for, and how to change your choice at any time.',
    layout: [
      {
        blockType: 'richText',
        heading: 'Cookie Policy',
        headingLevel: 'h1',
        background: 'white',
        content: richText([AWAITING('the introduction to the cookie policy')]),
      },
      {
        blockType: 'richText',
        heading: 'The cookies this site uses',
        headingLevel: 'h2',
        background: 'white',
        /*
         * FR-PRV-04 requires a cookie INVENTORY — name, provider, purpose,
         * category and duration — kept current as embeds change. BR-DPA-06 puts
         * that inventory in the admin panel. Neither exists yet: the consent
         * module is unbuilt, so this names what the page must carry rather than
         * listing cookies nobody has surveyed.
         */
        content: richText([
          AWAITING(
            'the cookie inventory — for each cookie: name, provider, purpose, category and duration. This is required by FR-PRV-04 and is not yet compiled; it depends on the cookie consent module, which is not built',
          ),
        ]),
      },
      {
        blockType: 'richText',
        heading: 'Changing your choice',
        headingLevel: 'h2',
        background: 'tint',
        /* FR-PRV-03 — withdrawal must be as easy as consent, and reachable. */
        content: richText([
          AWAITING(
            'how a visitor reviews and withdraws consent at any time. The consent banner and its persistent control are not yet built',
          ),
        ]),
      },
    ],
  })

  // -------------------------------------------------- ACCESSIBILITY (SRS 7)
  await upsert({
    slug: 'accessibility',
    title: 'Accessibility',
    showInNav: false,
    _status: 'published',
    reviewStatus: 'approved',
    metaDescription:
      'Our commitment to making this website usable by everyone, the standard we work to, and how to tell us about a barrier you have met.',
    layout: [
      {
        blockType: 'richText',
        heading: 'Accessibility',
        headingLevel: 'h1',
        background: 'white',
        content: richText([
          'This website is built to be usable by everyone, including people who browse with a keyboard alone, with a screen reader, or with text enlarged.',
          'Every page carries accessibility controls in the footer: you can enlarge the text and switch to a high-contrast view, and your choice is remembered as you move around the site.',
        ]),
      },
      {
        blockType: 'richText',
        heading: 'The standard we work to',
        headingLevel: 'h2',
        background: 'tint',
        /*
         * SRS 7 targets WCAG 2.1 AA and requires a published statement. The
         * conformance report is a deliverable in its own right and has not been
         * produced, so this states the target rather than claiming the result —
         * an accessibility statement that overstates conformance is itself a
         * barrier, because it tells a disabled visitor not to expect trouble.
         */
        content: richText([
          'We work to the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA.',
          AWAITING(
            'the outcome of the accessibility conformance review — the date it was carried out, what was tested, and any areas known not yet to conform',
          ),
        ]),
      },
      {
        blockType: 'richText',
        heading: 'Telling us about a problem',
        headingLevel: 'h2',
        background: 'white',
        content: richText([
          'If you meet a barrier on this website — a page you cannot read, a form you cannot complete, or anything that does not work with the assistive technology you use — please tell us, and we will put it right.',
          AWAITING('the email address and telephone number for accessibility enquiries'),
        ]),
      },
    ],
  })

  payload.logger.info('')
  payload.logger.info('Three pages seeded. EVERY passage marked "To be supplied by SIWS"')
  payload.logger.info('is visible on the published page and must be replaced before go-live.')

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
