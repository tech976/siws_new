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
 * WRITTEN, NOT LISTED. The prose version was still the brief with full stops
 * in it, and SIWS said so the same day: "information only… act as a content
 * writer, use standard and high-level English and write that section
 * properly." Each section now makes its point before it gives its figures —
 * why sport matters to the school, why the range is as wide as it is, why
 * participation is counted before trophies.
 *
 * The rule above still holds, and it is what the writing has to be checked
 * against: the argument is ours, the facts are theirs. A sentence may say what
 * a figure means; it may not supply a figure, a name, a date or a claim the
 * sheet does not make. (The one expansion is ZP, to Zilla Parishad.)
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
  'At SIWS, sport is an essential part of a child’s education. Guided by the principle of “Healthy Body, Healthy Mind” and a “Sports for All” policy, the school gives every student the opportunity, the coaching and the encouragement to play.'

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
      'At SIWS, sport is regarded as an essential part of a child’s education and never as a diversion from it. Our guiding principle, “Healthy Body, Healthy Mind”, expresses a simple conviction: that physical vigour and intellectual growth advance together, and that a school which cares for the one must care equally for the other.',
      'The playing field teaches lessons that no textbook can fully convey. It is there that our students acquire discipline through regular practice, learn teamwork through shared effort, grow into leadership by accepting responsibility, and develop resilience by meeting both victory and defeat with composure. These qualities remain with a young person long after the final whistle, and we count their cultivation among the most important work that the school undertakes.',
      'This belief finds its practical expression in our “Sports for All” policy. Sport at SIWS is not the preserve of the naturally gifted. Every child is encouraged to take part, to discover an activity suited to their ability and temperament, and to enjoy the confidence that comes with steady improvement.',
    ],
    0,
    'h1',
  ),
  section(
    'The sports we play',
    'we play',
    [
      'The breadth of our programme reflects the variety of the children it serves. Fourteen sports are offered across the school: football, cricket, basketball, volleyball, athletics, kho-kho, kabaddi, badminton, table tennis, chess, carrom, yoga, karate and skating. The range is deliberate. It brings together the major team games, the traditional sports of India, contests of strategy and concentration, and disciplines that build balance, flexibility and self-control, so that every student may find a pursuit of their own.',
      'Seven of these sports, namely football, cricket, basketball, athletics, badminton, table tennis and chess, are supported by structured coaching, which is held after school on four days of every week. Such regular and sustained instruction enables students to progress from early enthusiasm to genuine proficiency, and gives those who show particular promise the foundation they need to compete at a higher level.',
    ],
    1,
  ),
  section(
    'Participation and school teams',
    'school teams',
    [
      'We judge the strength of our sporting culture first by the number of students who take part in it. More than 85% of students from Std 1 to Std 10 participate actively in sport, and more than three hundred are enrolled in regular after-school coaching. These figures matter to us more than any single result, for they show that sport at SIWS belongs to the many and not to a select few.',
      'For those who wish to test themselves in competition, the school fields representative teams in a wide range of sports. Football and basketball are played by both boys’ and girls’ teams, and the school is also represented in cricket, athletics, badminton, table tennis, chess, volleyball and kho-kho. Squads are organised in the under-10, under-12, under-14 and under-16 age groups, so that students compete alongside their peers and advance steadily, year by year, as their skill and confidence grow.',
    ],
    2,
  ),
  section(
    'Our facilities',
    'facilities',
    [
      'Good sport depends upon good provision, and our students train in facilities set aside for the purpose. Outdoors, the school offers a football ground, two basketball courts, cricket practice nets and a 200-metre athletics track. Indoors, there is a badminton hall with four courts and a table tennis hall furnished with six tables.',
      'A dedicated yoga room provides a calm setting for a discipline that calls for stillness and concentration, while a fully equipped sports room supplies everything else that our teachers and coaches require. Taken together, these facilities ensure that every student has the space and the equipment to practise properly.',
    ],
    3,
  ),
  section(
    'Where our students compete',
    'compete',
    [
      'Competition at SIWS begins at home. In the inter-house championship, every child experiences the excitement of representing a team, the discipline of preparing for an event and the satisfaction of contributing to a common cause. It is the foundation upon which all further competition is built.',
      'Beyond the school gates, our teams take part in a full calendar of external fixtures. They compete in the tournaments of the Mumbai Schools Sports Association (MSSA), in the District Sports Office (DSO) competitions in Raigad, in Zilla Parishad (ZP) inter-school tournaments, and in private inter-school tournaments across the Navi Mumbai and Panvel region. These occasions allow our students to measure themselves against able opponents from other schools and to acquire the composure that only genuine competition can give.',
    ],
    4,
  ),
  section(
    'Recent achievements',
    'achievements',
    [
      'The commitment of our students and their coaches has been rewarded with a record of which the school is justly proud. SIWS was overall champion in DSO Athletics in 2023–24, has won the DSO Basketball under-16 girls’ title in three consecutive years, and was runner-up in MSSA Football at under-14 level in 2024. In the past three years our students have won more than a hundred medals at district and inter-school level.',
      'A number of students have earned selection beyond the school. Five have represented Raigad District and the Mumbai Division in football, basketball and athletics, and two had the distinction of representing Maharashtra in chess at the State Level Championship in 2024.',
      'Individual achievement has been equally notable. In the past two years our students have won more than forty individual medals, among them gold in the 100 metres and the 200 metres and gold in chess at district level, together with Best Player awards in football and basketball at MSSA tournaments.',
    ],
    5,
  ),
  section(
    'The sporting year',
    'year',
    [
      'The sporting calendar gives the school year much of its rhythm. It begins with the inter-house sports championship and continues with the inter-class football league, the cricket premier league and the chess and carrom championship, and it includes the school’s celebration of International Yoga Day.',
      'The highlight of the year is Annual Sports Day, held every December. The occasion opens with a ceremonial march past, the lighting of the torch and the oath ceremony, and proceeds to displays of aerobic dance and pyramid formation before the track and field events take centre stage. The day concludes with the distribution of prizes. Every child takes part, and parents join in as well, which makes Sports Day a celebration shared by the whole school community.',
    ],
    6,
  ),
  section(
    'Coaching and training',
    'training',
    [
      'Behind every achievement stands careful teaching. The programme is led by three full-time physical education teachers, whose work is complemented by external professional coaches of recognised standing: a BCCI-certified coach for cricket, MSSA-certified coaches for football and basketball, and a FIDE-rated coach for chess. Our students therefore receive instruction that is both expert and consistent.',
      'Regular after-school coaching is supplemented by a number of specialised programmes. A fifteen-day summer sports camp is held each April, and fitness and conditioning sessions build the strength and stamina on which sound technique depends. A talent identification camp, open to students from Std 3 upwards, helps us to recognise ability at an early age, while those selected for the DSO and MSSA teams receive special training in preparation for competition.',
    ],
    7,
  ),
  section(
    'Our alumni and the road ahead',
    'the road ahead',
    [
      'The value of a school’s sporting education is seen most clearly in those who have passed through it. Former students of SIWS have gone on to represent the district in cricket at under-19 level and to win medals in athletics at state level. Some have been awarded sports scholarships, and two have made sport their profession as certified coaches.',
      'We continue to build upon this foundation. For 2025–26 the school plans to introduce lawn tennis, to host an inter-school basketball tournament, to upgrade the cricket nets with a bowling machine, and to enter students in the CBSE and State Nationals for athletics and chess. Each of these steps reflects our commitment to offer every student wider opportunity and a higher standard of sport.',
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
        'Sport at South Indians’ Welfare Society: fourteen sports, professional coaching, school teams, and achievements at district, division and state level.',
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
