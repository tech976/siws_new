import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { bulletList, para, richText, richTextNodes } = await import('@/seed/lexical')

/**
 * Writes the institution's Sports page from the brief SIWS sent (2026-10-12),
 * a numbered Q&A on two sheets.
 *
 * EVERY FIGURE AND NAME IS THEIRS. Nothing is rounded, upgraded or invented:
 * where the sheet says "More than 85%" the page says more than 85%, and where
 * it names Raigad, MSSA or a BCCI-certified coach, so does the page. The
 * wording is tightened for reading on a screen — the sheet is written as
 * answers to questions, and a visitor arrives with no questions in front of
 * them — but no claim is added or dropped.
 *
 * TWO ANSWERS ARE DELIBERATELY NOT PUBLISHED:
 *   - the photo and video archive "available for media, website and brochure
 *     use", which tells a parent nothing and is a note to staff;
 *   - the contact person, because the sheet leaves the name blank: "Mr. —
 *     Head of Department, Physical Education". A page cannot name somebody
 *     the school has not named.
 *
 * The plans are published under the year the sheet gives them, 2025–26, so
 * they date themselves rather than reading as this year's promises.
 *
 * REFUSES A PAGE SOMEBODY HAS WRITTEN. It fills the placeholder created on
 * 2026-10-12 and stops if the page has sections on it, so it can never
 * overwrite the school's own work. `--force` is there for a re-run after a
 * change to this script.
 *
 * Usage:  npx tsx src/scripts/write-portal-sports-page.ts [--apply] [--force]
 */

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')

const INTRO =
  'Sport is part of the school day at SIWS, not an add-on. Our philosophy is “Healthy Body, Healthy Mind”, and our “Sports for All” policy means every child plays.'

const layout = [
  {
    blockType: 'richText',
    heading: 'Healthy body, healthy mind',
    accentWord: 'healthy mind',
    headingLevel: 'h2',
    background: 'white',
    content: richText([
      'We believe sport is integral to education, not an add-on. Through it children develop discipline, teamwork, leadership and resilience.',
      'Our “Sports for All” policy means every child plays — not only the children who win.',
    ]),
  },
  {
    blockType: 'statistics',
    heading: 'Sport at SIWS',
    headingLevel: 'h2',
    background: 'sea',
    stats: [
      { value: '85%+', label: 'of children from Std 1 to 10 take part' },
      { value: '300+', label: 'enrolled in after-school coaching' },
      { value: '100+', label: 'medals in three years, district and inter-school' },
      { value: '40+', label: 'individual medals in the last two years' },
    ],
  },
  {
    blockType: 'featureList',
    heading: 'The sports we play',
    headingLevel: 'h2',
    background: 'white',
    layout: 'list',
    marker: 'tick',
    columns: '3',
    items: [
      'Football',
      'Cricket',
      'Basketball',
      'Volleyball',
      'Athletics',
      'Kho-Kho',
      'Kabaddi',
      'Badminton',
      'Table tennis',
      'Chess',
      'Carrom',
      'Yoga',
      'Karate',
      'Skating',
    ].map((title) => ({ title })),
  },
  {
    blockType: 'featureList',
    heading: 'Regular coaching',
    headingLevel: 'h2',
    background: 'sea',
    layout: 'list',
    marker: 'tick',
    columns: '3',
    intro: richText(['Coaching runs four days a week after school in seven sports.']),
    items: [
      'Football',
      'Cricket',
      'Basketball',
      'Athletics',
      'Badminton',
      'Table tennis',
      'Chess',
    ].map((title) => ({ title })),
  },
  {
    blockType: 'featureList',
    heading: 'Our facilities',
    headingLevel: 'h2',
    background: 'white',
    layout: 'list',
    marker: 'tick',
    columns: '2',
    items: [
      { title: 'Football ground' },
      { title: 'Two basketball courts' },
      { title: 'Cricket practice nets' },
      { title: 'Indoor badminton hall', description: 'Four courts.' },
      { title: 'Table tennis hall', description: 'Six tables.' },
      { title: '200m athletics track' },
      { title: 'Yoga room' },
      { title: 'Sports room', description: 'Fully equipped.' },
    ],
  },
  {
    blockType: 'featureList',
    heading: 'School teams',
    headingLevel: 'h2',
    background: 'sea',
    layout: 'list',
    marker: 'tick',
    columns: '3',
    items: [
      { title: 'Football', description: 'Boys and girls.' },
      { title: 'Cricket' },
      { title: 'Basketball', description: 'Boys and girls.' },
      { title: 'Athletics' },
      { title: 'Badminton' },
      { title: 'Table tennis' },
      { title: 'Chess' },
      { title: 'Volleyball' },
      { title: 'Kho-Kho' },
    ],
    footnote: 'Teams are formed for the under-10, under-12, under-14 and under-16 age groups.',
  },
  {
    blockType: 'featureList',
    heading: 'Where our children compete',
    headingLevel: 'h2',
    background: 'white',
    layout: 'list',
    marker: 'tick',
    columns: '2',
    items: [
      { title: 'Inter-house', description: 'Our own championship, within the school.' },
      { title: 'MSSA', description: 'Mumbai Schools Sports Association.' },
      { title: 'DSO', description: 'District Sports Office, Raigad.' },
      { title: 'ZP inter-school tournaments' },
      {
        title: 'Private inter-school tournaments',
        description: 'In the Navi Mumbai and Panvel region.',
      },
    ],
  },
  {
    blockType: 'featureList',
    heading: 'Recent results',
    accentWord: 'results',
    headingLevel: 'h2',
    background: 'sea',
    layout: 'list',
    marker: 'icon',
    columns: '2',
    items: [
      {
        title: 'Overall champions, DSO Athletics 2023–24',
        icon: 'trophy',
      },
      {
        title: 'DSO Basketball, under-16 girls',
        description: 'Winners three years running.',
        icon: 'trophy',
      },
      {
        title: 'MSSA Football, under-14, 2024',
        description: 'Runners-up.',
        icon: 'medal',
      },
      {
        title: 'Five children played for the district',
        description:
          'Raigad District and Mumbai Division, in football, basketball and athletics.',
        icon: 'merit',
      },
      {
        title: 'Two children played for Maharashtra',
        description: 'Chess, at the State Level Championship in 2024.',
        icon: 'merit',
      },
      {
        title: 'Over 40 individual medals in two years',
        description:
          'Including gold in the 100m and 200m, gold in chess at district level, and Best Player awards in football and basketball at MSSA tournaments.',
        icon: 'medal',
      },
    ],
  },
  {
    blockType: 'accordion',
    heading: 'More about sport at SIWS',
    headingLevel: 'h2',
    background: 'white',
    items: [
      {
        question: 'What are the major sporting events through the year?',
        answer: richTextNodes([
          bulletList([
            'Inter-house sports championship',
            'Annual Sports Day',
            'Inter-class football league',
            'Cricket premier league',
            'Chess and carrom championship',
            'International Yoga Day celebration',
          ]),
        ]),
      },
      {
        question: 'Tell me about Annual Sports Day.',
        answer: richTextNodes([
          para(
            'Our flagship event, held every December, with 100% participation from children and parents.',
          ),
          bulletList([
            'March past',
            'Torch lighting',
            'Oath ceremony',
            'Aerobic dance',
            'Pyramid formation',
            'Track and field events',
            'Prize distribution',
          ]),
        ]),
      },
      {
        question: 'Who coaches the children?',
        answer: richTextNodes([
          para(
            'Three full-time physical education teachers, with external professional coaches alongside them.',
          ),
          bulletList([
            'A BCCI-certified coach for cricket',
            'MSSA-certified coaches for football and basketball',
            'A FIDE-rated coach for chess',
          ]),
        ]),
      },
      {
        question: 'What training is offered beyond the school day?',
        answer: richTextNodes([
          bulletList([
            'Regular evening coaching',
            'A summer sports camp, fifteen days in April',
            'Fitness and conditioning sessions',
            'A talent identification camp from Std 3 upwards',
            'Special training for the DSO and MSSA teams',
          ]),
        ]),
      },
      {
        question: 'Have former pupils gone on in sport?',
        answer: richText([
          'Yes. Our alumni have represented the district in cricket at under-19 level, won state-level medals in athletics, and gone on to sports scholarships. Two are now certified sports coaches.',
        ]),
      },
      {
        question: 'What is planned for 2025–26?',
        answer: richTextNodes([
          bulletList([
            'Lawn tennis, as a new sport',
            'An inter-school basketball tournament hosted here',
            'Cricket nets upgraded with a bowling machine',
            'Entry to the CBSE and State Nationals for athletics and chess',
          ]),
        ]),
      },
    ],
  },
]

const main = async () => {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'sports' } }, { unit: { exists: false } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = docs[0] as unknown as
    | { id: number; title: string; layout?: unknown[]; intro?: string | null }
    | undefined
  if (!page) throw new Error('The institution-wide Sports page does not exist — create the tab first.')

  const written = (page.layout ?? []).length
  if (written > 0 && !FORCE) {
    console.log(`  The page already has ${written} section(s) — left alone. Re-run with --force to replace them.`)
    process.exit(0)
  }

  console.log(`  ${APPLY ? 'Writing' : 'Would write'} ${layout.length} sections to the Sports page:`)
  for (const block of layout) {
    const heading = (block as { heading?: string }).heading ?? block.blockType
    const count =
      (block as { items?: unknown[] }).items?.length ?? (block as { stats?: unknown[] }).stats?.length
    console.log(`    ${heading}${count ? ` (${count})` : ''}`)
  }

  if (!APPLY) {
    console.log('\n  Nothing was written. Re-run with --apply to do it.')
    process.exit(0)
  }

  await payload.update({
    collection: 'pages',
    id: page.id,
    data: {
      intro: INTRO,
      layout,
      metaDescription:
        'Sport at South Indians’ Welfare Society — the sports we play, our coaching and facilities, school teams, the competitions our children enter and what they have won.',
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
