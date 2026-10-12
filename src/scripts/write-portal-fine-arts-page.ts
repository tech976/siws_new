import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { bulletList, richTextNodes } = await import('@/seed/lexical')

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

/* --- Lexical, as much of it as this page needs ---------------------------- */

const BOLD = 1
const ITALIC = 2

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

/** A line set in the middle: the strapline, not a paragraph of prose. */
const centred = (children: Inline[]) => ({ ...p(children), format: 'center' as const })

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

const layout = [
  section(TITLE, null, [centred([t(STRAPLINE, ITALIC)]), centred([b(FREE_CLASSES)])], 0, 'h1'),
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
    5,
  ),
]

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

  console.log(`  ${APPLY ? 'Writing' : 'Would write'} ${layout.length} sections to the Fine Arts page:`)
  for (const block of layout) console.log(`    ${block.heading}`)
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
