import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('@/seed/lexical')

/**
 * Writes the institution's Sports page from the brief SIWS sent (2026-10-12),
 * a numbered Q&A on two sheets.
 *
 * PROSE, NOT POINTS. The first version set the brief as tick lists, a figures
 * band and an accordion, and SIWS rejected it on sight: "just pointers and
 * tickers… I need more texty info… keep it in paragraph format". Every section
 * is now paragraphs — the lists read as paragraphs anyway, since a list of
 * fourteen sports is a sentence with commas in it.
 *
 * CENTRED AND JUSTIFIED, as asked. A `richText` section at normal width is
 * exactly that: `SectionSplit` centres the heading and the column under it,
 * and `.siws-prose` justifies the type. The first section's heading is the
 * page's title, which is what makes the route drop its own left-ranged
 * header — so the top of the page is centred too, and that heading is an h1.
 *
 * EVERY FIGURE AND NAME IS THEIRS. Nothing is rounded, upgraded or invented:
 * where the sheet says "More than 85%" the page says more than 85%, and where
 * it names Raigad, MSSA or a BCCI-certified coach, so does the page.
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

/** White and sea alternate down the page, so each section reads as its own. */
const section = (
  heading: string,
  accentWord: string | null,
  paragraphs: string[],
  index: number,
  level: 'h1' | 'h2' = 'h2',
) => ({
  blockType: 'richText',
  heading,
  ...(accentWord ? { accentWord } : {}),
  headingLevel: level,
  width: 'normal',
  background: index % 2 === 0 ? 'white' : 'sea',
  content: richText(paragraphs),
})

const layout = [
  /*
   * The page's own heading, which is why it carries the title exactly: the
   * route prints its plain left-ranged header only when the first section
   * does not already say the same thing.
   */
  section(
    'Sports',
    null,
    [
      'Sport is part of the school day at SIWS, not an add-on. Our philosophy is “Healthy Body, Healthy Mind”: we believe sport is integral to education, and that through it children develop discipline, teamwork, leadership and resilience.',
      'Our “Sports for All” policy means every child plays — not only the children who win.',
    ],
    0,
    'h1',
  ),
  section(
    'The sports we play',
    'we play',
    [
      'Fourteen sports are played here: football, cricket, basketball, volleyball, athletics, kho-kho, kabaddi, badminton, table tennis, chess, carrom, yoga, karate and skating.',
      'Seven of them — football, cricket, basketball, athletics, badminton, table tennis and chess — are coached regularly, four days a week after school.',
    ],
    1,
  ),
  section(
    'Taking part',
    'part',
    [
      'More than 85% of the children from Std 1 to Std 10 take part in sport, and more than three hundred are enrolled in regular after-school coaching.',
      'The school fields teams in football and basketball for both boys and girls, and in cricket, athletics, badminton, table tennis, chess, volleyball and kho-kho, with squads in the under-10, under-12, under-14 and under-16 age groups.',
    ],
    2,
  ),
  section(
    'Our facilities',
    'facilities',
    [
      'Children train on a football ground, two basketball courts and cricket practice nets, in an indoor badminton hall of four courts and a table tennis hall of six tables, and on a 200-metre athletics track.',
      'There is a yoga room, and a sports room equipped for everything else.',
    ],
    3,
  ),
  section(
    'Where our children compete',
    'compete',
    [
      'Every child competes first at home, in the inter-house championship.',
      'Beyond the school our teams play in the tournaments of the Mumbai Schools Sports Association, the District Sports Office competitions in Raigad, ZP inter-school tournaments, and private inter-school tournaments in the Navi Mumbai and Panvel region.',
    ],
    4,
  ),
  section(
    'Recent results',
    'results',
    [
      'In the last few years our children have been overall champions in DSO Athletics 2023–24, winners of the DSO Basketball under-16 girls’ title three years running, and runners-up in MSSA Football under-14 in 2024. More than a hundred medals have been won at district and inter-school level in three years.',
      'Five children have represented Raigad District and the Mumbai Division in football, basketball and athletics, and two represented Maharashtra in chess at the State Level Championship in 2024.',
      'Individually they have won more than forty medals in two years, among them gold in the 100 metres and the 200 metres, gold in chess at district level, and Best Player awards in football and basketball at MSSA tournaments.',
    ],
    5,
  ),
  section(
    'Through the year',
    'the year',
    [
      'The sporting year runs from the inter-house sports championship through the inter-class football league, the cricket premier league, the chess and carrom championship, and the celebration of International Yoga Day.',
      'Annual Sports Day is the flagship, held every December: the march past, the lighting of the torch and the oath ceremony, aerobic dance and pyramid formation, the track and field events, and the prize distribution to close. Every child takes part, and so do the parents.',
    ],
    6,
  ),
  section(
    'Coaching and training',
    'training',
    [
      'Three full-time physical education teachers lead the programme, with external professional coaches alongside them: a BCCI-certified coach for cricket, MSSA-certified coaches for football and basketball, and a FIDE-rated coach for chess.',
      'Beyond the regular evening coaching there is a summer sports camp of fifteen days in April, fitness and conditioning sessions, a talent identification camp from Std 3 upwards, and special training for the children chosen for the DSO and MSSA teams.',
    ],
    7,
  ),
  section(
    'Former pupils, and what comes next',
    'what comes next',
    [
      'Former pupils have represented the district in cricket at under-19 level and won state-level medals in athletics; some have gone on to sports scholarships, and two are now certified sports coaches.',
      'For 2025–26 the school plans to introduce lawn tennis, to host an inter-school basketball tournament, to upgrade the cricket nets with a bowling machine, and to enter the CBSE and State Nationals for athletics and chess.',
    ],
    8,
  ),
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
