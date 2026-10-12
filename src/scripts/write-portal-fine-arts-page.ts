import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('@/seed/lexical')

/**
 * Writes the Fine Arts page from the three sheets SIWS sent (2026-10-12): the
 * Centre's own description of itself and its annual report, both signed by its
 * Head, Mrs. Bhavana Narayanan.
 *
 * THE SAME PAGE AS SPORTS, for the same reasons — see
 * `write-portal-sports-page.ts`, whose three rounds with SIWS settled the
 * form: paragraphs rather than points, centred and justified, written and not
 * merely transcribed. A `richText` section at normal width is all of that.
 *
 * THE HEADING IS THE CENTRE'S NAME. The tab says "Fine Arts", which is what
 * SIWS asked for on the menu, but the Centre also teaches three languages and
 * the Bhagavad Gita, and a page headed "Fine Arts" that opens on Tamil reads
 * as the wrong page. So the title becomes the name on the sheets, the menu
 * label and the address stay as they were, and the first section carries the
 * title exactly — which is what makes the route drop its own left-ranged
 * header.
 *
 * EVERY FACT IS THEIRS. The argument is ours; a sentence may say what a fact
 * means and may not supply a year, a name or a claim the sheets do not make.
 * Where the two sheets differ, the narrower statement is the one published:
 * one says the courses are "accessible to everyone", the other that they are
 * "free of cost to the students of our SIWS", and the page says the second.
 * "Bhagwat Gita" and "Bharat Natyam" are set as the sheets' own list sets
 * them, Bhagavad Gita and Bharatanatyam.
 *
 * THREE THINGS ARE DELIBERATELY NOT PUBLISHED:
 *   - that enrolment "has gradually decreased year by year which is a matter
 *     of concern". The annual report is written to the Society, and that
 *     sentence is the Head telling the management what worries her. It is not
 *     something a parent choosing a class needs to be told, and no school
 *     prints it over its own door;
 *   - the six recommendations that follow it — more awareness, workshops,
 *     flexible timings, modern methods, awards, parental involvement. They are
 *     proposals, not things the Centre does, and a page that listed them would
 *     be promising what nobody has yet agreed to;
 *   - "48 students successfully completed the three years programme and were
 *     awarded certificates", because the sheet does not say in which year.
 *     Undated, on the page of a Centre founded in 1997–98, it reads as
 *     forty-eight in twenty-eight years. It goes in the last section the day
 *     SIWS says which year it counts.
 *
 * REFUSES A PAGE SOMEBODY HAS WRITTEN. It fills the placeholder created on
 * 2026-10-12 and stops if the page has sections on it, so it can never
 * overwrite the school's own work. `--force` is there for a re-run after a
 * change to this script.
 *
 * Usage:  npx tsx src/scripts/write-portal-fine-arts-page.ts [--apply] [--force]
 */

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')

/** The address and the menu label, neither of which this script changes. */
const SLUG = 'fine-arts'

/** The Centre's name as its own sheets head it. */
const TITLE = 'SIWS Arts, Fine Arts & Philosophical Centre'

const INTRO =
  'The SIWS Arts, Fine Arts & Philosophical Centre has taught languages, classical music, dance and the Bhagavad Gita since 1997–98. Every course is optional and free of cost to the students of SIWS.'

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
  section(
    TITLE,
    null,
    [
      'The SIWS Arts, Fine Arts & Philosophical Centre was established in the academic year 1997–98 under the South Indians’ Welfare Society, with the aim of nurturing young minds through culture, creativity and values. From its inception the Centre has been dedicated to a holistic education, one that brings together the arts, languages, music and philosophy.',
      'Its purpose is to enhance the intellectual and emotional growth of our students by promoting self-expression, by developing analytical skills, and by fostering a deeper appreciation of culture, of ideas and of the human condition. This is an education that complements the work of the classroom, and the Society founded the Centre so that it might be open to every student who wishes to pursue it.',
    ],
    0,
    'h1',
  ),
  section(
    'What the Centre teaches',
    'teaches',
    [
      'The teaching of the Centre falls into three parts. The first is the study of languages, which is one of its distinctive features. Classes are held in Tamil, Malayalam and Sanskrit, and through them students learn to appreciate linguistic diversity and the cultural richness that accompanies it.',
      'The second is the Fine Arts section, which offers training in classical music and in dance. Students may learn vocal music, the violin or the veena, and may study Bharatanatyam. Each is a discipline in which progress comes only through regular practice under the guidance of a teacher, and the patience and attention it demands serve a student well in every other field of study.',
      'The third is the Philosophical Centre, which introduces students to Indian philosophy and culture, above all through the Bhagavad Gita. Students learn to chant the text and to understand its teachings, which guide them towards moral values and a disciplined way of living.',
    ],
    1,
  ),
  section(
    'How the courses are run',
    'courses',
    [
      'Every course is optional, and every course is offered entirely free of cost to the students of SIWS. It is a remarkable feature of the Centre, for it places a cultural education of quality within the reach of all.',
      'Classes are held every Saturday throughout the academic year, an arrangement that allows students to follow their chosen subject while keeping a proper balance with their regular studies. Each course follows a structured programme of three years, which ensures that learning is systematic and that skill is built steadily from one year to the next. A student who completes the course successfully is awarded the Centre’s own certificate.',
      'The quality of such teaching depends upon the teacher. For each subject the Society appoints eminent, experienced and dedicated teachers, who guide their students through every stage of the course.',
    ],
    2,
  ),
  section(
    'Competitions and recognition',
    'recognition',
    [
      'The Centre does more than provide a foundation. It encourages its students to test what they have learned, and they take part in competitions and examinations conducted by well-known organisations, as well as in cultural events. There they present their work in Tamil, Malayalam and Sanskrit, in music, in Bharatanatyam, on the veena and the violin, and in the recitation of the Bhagavad Gita.',
      'Over the years a number of our students have gone on to excel in their chosen fields. Their effort is recognised within the Centre as well: every year an award for the best outgoing student of each section is presented by our sponsors.',
    ],
    3,
  ),
  section(
    'Preserving our heritage',
    'heritage',
    [
      'Over the years the Centre has contributed significantly to the cultural and moral development of the students who have passed through it. Under its Head, Mrs. Bhavana Narayanan, it stands as a beacon of cultural education and of learning founded upon values, and its purpose remains what it has always been: to inspire each new generation of students while preserving our rich heritage.',
    ],
    4,
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
        'The SIWS Arts, Fine Arts & Philosophical Centre: free Saturday classes in Tamil, Malayalam and Sanskrit, vocal music, violin, veena, Bharatanatyam and the Bhagavad Gita.',
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
