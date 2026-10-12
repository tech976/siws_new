import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { intoTeams } = await import('@/lib/faculty-teams')

/**
 * Puts Mrs. Bagayatkar's list first on the Primary teachers page.
 *
 * SIWS, 2026-10-12: "on the left side there should be Sreedevi and her
 * teachers list below her name, and on the right side Geeta Raja and below
 * her name the rest of the teachers."
 *
 * The page now shows one list per head teacher, and a head teacher leads
 * whoever follows her in the roster's order (`src/lib/faculty-teams.ts`). So
 * which list is on the left is simply which one has the lower numbers — and
 * the roster was numbered the other way round, Mrs. Geeta Raja at 1 and Mrs.
 * Bagayatkar at 15. This renumbers it: her list 1–10, the other 11–24.
 *
 * NOTHING ELSE IS TOUCHED. Nobody moves between lists and nobody's place
 * inside her list changes; the lists are read off the roster as it stands and
 * put back whole, so a teacher the school has added or moved since is carried
 * with her list rather than overwritten from a copy kept here.
 *
 * WHY IT WRITES THE NUMBER DIRECTLY and not through `payload.update`. These
 * records keep drafts, and a save through Payload starts from the latest
 * version: on a teacher with an unpublished edit waiting it would publish the
 * edit, or take her off the page. The number is written to the record and to
 * its latest version in one statement, so nothing else about either changes
 * and the next save from the panel does not put the old number back.
 *
 * Safe to repeat: it says "nothing to do" once her list is first.
 *
 * Usage:  npx tsx src/scripts/primary-teacher-lists.ts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 */

const APPLY = process.argv.includes('--apply')
const LEADS_THE_FIRST_LIST = 'Mrs. Sreedevi Prasanna Bagayatkar'

type Teacher = { id: number; name: string; designation?: string | null; order: number }

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
  if (!primary) throw new Error('No Primary unit found.')

  const { docs } = await payload.find({
    collection: 'faculty',
    where: { unit: { equals: primary.id } },
    sort: 'order',
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })
  const roster = docs as unknown as Teacher[]

  const teams = intoTeams(roster)
  const first = teams.find((team) => team.heads.some((head) => head.name === LEADS_THE_FIRST_LIST))
  if (!first) {
    throw new Error(
      `${LEADS_THE_FIRST_LIST} is not on the Primary roster as a head teacher — nothing was changed.`,
    )
  }

  const wanted = [first, ...teams.filter((team) => team !== first)]
    .flatMap((team) => [...team.heads, ...team.rest])
    .map((teacher, index) => ({ teacher, order: index + 1 }))

  for (const team of [first, ...teams.filter((other) => other !== first)]) {
    const lead = team.heads.map((head) => head.name).join(' and ') || 'no head teacher'
    console.log(`  ${lead} — ${team.rest.length} teacher(s) in her list`)
  }

  const moves = wanted.filter(({ teacher, order }) => teacher.order !== order)
  if (moves.length === 0) {
    console.log('  nothing to do: her list is already first and the numbers run 1 to ' + wanted.length)
    return
  }

  if (!APPLY) {
    for (const { teacher, order } of moves) {
      console.log(`  would renumber ${String(teacher.order).padStart(3)} → ${String(order).padStart(3)}  ${teacher.name}`)
    }
    console.log(`  ${moves.length} of ${wanted.length} would change. Run again with --apply to write.`)
    return
  }

  const pool = (
    payload.db as unknown as {
      pool: { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, string>[] }> }
    }
  ).pool

  const pairs = moves.map((_, index) => `($${index * 2 + 1}::int, $${index * 2 + 2}::int)`).join(', ')
  const values = moves.flatMap(({ teacher, order }) => [teacher.id, order])

  const { rows } = await pool.query(
    `WITH wanted(id, n) AS (VALUES ${pairs}),
          main AS (
            UPDATE faculty f SET "order" = w.n FROM wanted w WHERE f.id = w.id RETURNING f.id
          ),
          versions AS (
            UPDATE _faculty_v v SET version_order = w.n FROM wanted w
            WHERE v.parent_id = w.id AND v.latest RETURNING v.id
          )
     SELECT (SELECT count(*) FROM main) AS main, (SELECT count(*) FROM versions) AS versions`,
    values,
  )

  console.log(
    `  renumbered ${rows[0]?.main} teacher(s) and ${rows[0]?.versions} latest version(s). The page follows within a minute.`,
  )
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
