import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

import { loadEnv } from '@/utilities/load-env'
import { baseName } from '@/utilities/media-lookup'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Checks this database for the faults that do not announce themselves.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every failure this project has had with images looked the same from a
 * browser: a finished-looking page showing the wrong photograph. None of them
 * produced an error, a broken image icon or a gap. A stale database, a missing
 * photograph silently substituted from the library, a page pointing at a row
 * that was deleted — all of them render.
 *
 * So the question "is what I am looking at actually right?" could only be
 * answered by knowing what to suspect. This answers it in one command, reads
 * nothing but the database and git, and writes nothing at all.
 *
 * Run with:  npm run seed:verify
 *
 * Exit code 0 when clean, 1 when something needs attention — so it can gate a
 * deploy as easily as it answers a question.
 */

const STATE_FILE = path.resolve(process.cwd(), '.seed-state.json')

/** Paths that change what the site shows. Matches the post-merge hook. */
const CONTENT_PATHS = /^(src\/seed\/|src\/collections\/|src\/blocks\/|assets\/images\/|media\/)/

interface Problem {
  title: string
  detail: string
  fix: string
}

const git = (command: string): string | null => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

const main = async () => {
  const payload = await getPayload({ config })
  const pool = (
    payload.db as unknown as {
      pool: { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }
    }
  ).pool

  const problems: Problem[] = []
  const notes: string[] = []

  /* ------------------------------------------------------- 1. is it stale? */
  /*
   * The question everyone actually has after a pull. The stamp records the
   * commit the database was last built from; anything touching content since
   * then is sitting on disk and not in the database.
   */
  const head = git('git rev-parse HEAD')
  if (!head) {
    notes.push('Not a git checkout, so staleness could not be checked.')
  } else if (!existsSync(STATE_FILE)) {
    problems.push({
      title: 'This database has never been built by `seed:refresh`',
      detail:
        'There is no record of which commit it was built from, so it cannot be\n' +
        '    compared against the code you have checked out. It may be correct; there\n' +
        '    is simply no way to tell from here.',
      fix: 'npm run seed:refresh',
    })
  } else {
    const stamped = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as { commit?: string }
    const built = stamped.commit ?? ''

    if (built === head) {
      notes.push(`Built from the commit you are on (${head.slice(0, 7)}).`)
    } else {
      const changed = (git(`git diff --name-only ${built} ${head}`) ?? '')
        .split('\n')
        .filter((line) => CONTENT_PATHS.test(line))

      if (changed.length === 0) {
        notes.push(
          `Built from ${built.slice(0, 7)}, now on ${head.slice(0, 7)} — no content files changed between them.`,
        )
      } else {
        const seeds = changed.filter((f) => f.startsWith('src/seed/'))
        problems.push({
          title: `Stale — ${changed.length} content file(s) changed since this database was built`,
          detail:
            `Built from ${built.slice(0, 7)}, you are on ${head.slice(0, 7)}.\n` +
            (seeds.length
              ? `    Seed scripts changed: ${seeds.map((f) => f.replace('src/seed/', '')).join(', ')}\n`
              : '') +
            '    Those changes are on disk and not in this database, so pages still\n' +
            '    render the previous content.',
          fix: 'npm run seed:refresh',
        })
      }
    }
  }

  /* ------------------------------------------- 1b. is the DUMP stale? */
  /*
   * THE FAILURE THIS CATCHES IS "MY CHANGES CAME BACK".
   *
   * `db/siws-content.sql.gz` is a build product: generated FROM the seeds,
   * never edited beside them. The README's setup line restores it —
   *
   *     gunzip -c db/siws-content.sql.gz | psql "$DATABASE_URI"
   *
   * — and that REPLACES the whole database. Run after a seed, it silently
   * puts back whatever snapshot the file holds and the seeded content is
   * gone. Nothing errors. The file is a binary blob, so `git diff` cannot
   * show it has drifted, and a merge resolves it by picking one side whole —
   * which is how it ends up older than the seeds that are supposed to have
   * produced it.
   *
   * Checked against the seeds rather than against HEAD: a commit touching
   * only components leaves the dump perfectly valid, and warning then would
   * teach everyone to ignore this.
   */
  const DUMP = 'db/siws-content.sql.gz'
  if (head && existsSync(path.resolve(process.cwd(), DUMP))) {
    const dumpCommit = git(`git log -1 --format=%H -- ${DUMP}`)
    if (dumpCommit) {
      const seedsSince = (git(`git diff --name-only ${dumpCommit} ${head}`) ?? '')
        .split('\n')
        .filter((line) => CONTENT_PATHS.test(line))

      if (seedsSince.length > 0) {
        problems.push({
          title: `The committed dump is older than the seeds — ${seedsSince.length} content file(s) newer`,
          detail:
            `${DUMP} was last written at ${dumpCommit.slice(0, 7)}, and content has\n` +
            '    changed since. Restoring it — which is how a teammate sets up, and how\n' +
            '    a database gets reset — would put that older content back and discard\n' +
            '    what the seeds now produce.',
          fix: 'npm run seed:refresh && npm run db:dump   # then commit the dump',
        })
      }
    }
  }

  /* ------------------------------------- 2. pages pointing at nothing */
  /*
   * Found by walking the foreign keys rather than a list of block tables, so a
   * block added next year is covered without anyone remembering to add it here.
   * A dangling reference is the one fault that DOES show — as a gap — but it is
   * easy to scroll past on a long page.
   */
  const { rows: fks } = await pool.query(`
    SELECT tc.table_name AS tbl, kcu.column_name AS col
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND ccu.table_name = 'media'
       AND tc.table_schema = 'public'
  `)

  let dangling = 0
  const danglingWhere: string[] = []
  for (const fk of fks) {
    const tbl = String(fk.tbl)
    const col = String(fk.col)
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM "${tbl}" t
         LEFT JOIN media m ON t."${col}" = m.id
        WHERE t."${col}" IS NOT NULL AND m.id IS NULL`,
    )
    const n = Number(rows[0]?.n ?? 0)
    if (n > 0) {
      dangling += n
      danglingWhere.push(`${tbl}.${col} (${n})`)
    }
  }

  if (dangling > 0) {
    problems.push({
      title: `${dangling} reference(s) to a photograph that no longer exists`,
      detail: `In: ${danglingWhere.join(', ')}.\n    Those places render nothing at all.`,
      fix: 'npm run seed:refresh',
    })
  }

  /* ------------------------------------------- 3. library rows with no file */
  const { docs: allMedia } = await payload.find({
    collection: 'media',
    limit: 5000,
    sort: 'id',
    depth: 0,
    overrideAccess: true,
  })

  const missingFiles = allMedia.filter(
    (m) => m.filename && !existsSync(path.resolve(process.cwd(), 'media', String(m.filename))),
  )

  if (missingFiles.length > 0) {
    problems.push({
      title: `${missingFiles.length} library row(s) whose file is not on disk`,
      detail:
        `For example: ${missingFiles.slice(0, 3).map((m) => m.filename).join(', ')}.\n` +
        '    The row exists, so a page can point at it, but there is no image to serve.',
      fix: 'npm run seed:media   (or restore media/ from git)',
    })
  }

  /* ------------------------------------------------- 4. duplicate uploads */
  /*
   * Byte size and pixel dimensions, never names alone — `photos:import` numbers
   * photographs after their folder, so `...-festivals-1.jpg` through `-33.jpg`
   * are thirty-three different pictures.
   */
  const groups = new Map<string, number>()
  for (const m of allMedia) {
    const key = [baseName(String(m.filename)), m.filesize, m.width, m.height].join('|')
    groups.set(key, (groups.get(key) ?? 0) + 1)
  }
  const duplicates = [...groups.values()].reduce((sum, n) => sum + (n > 1 ? n - 1 : 0), 0)

  if (duplicates > 0) {
    problems.push({
      title: `${duplicates} duplicate upload(s) in the library`,
      detail:
        'The same photograph stored more than once. Pages end up pointing at\n' +
        '    different copies, which is how two machines show different pictures.',
      fix: 'npm run media:dedupe            (report)\n         npm run media:dedupe -- --delete  (remove)',
    })
  }

  /* -------------------------------------------------------- 5. consent */
  const unconsented = allMedia.filter(
    (m) => m.depictsChildren && m.parentalConsent?.obtained !== true,
  )

  if (unconsented.length > 0) {
    problems.push({
      title: `${unconsented.length} photograph(s) of identifiable students with no permission recorded`,
      detail:
        'Pages carrying these cannot be published (FR-PRV-11), so the next seed\n' +
        '    run will fail part-way and leave the site half-updated. Consent records\n' +
        '    live only in this database — they never arrive in a commit.',
      fix: 'npm run photos:consent -- --section=all --method=other \\\n           --date=YYYY-MM-DD --reference="where the records are filed"',
    })
  }

  /* ------------------------------------------------- 6. unpublished pages */
  const { totalDocs: drafts } = await payload.find({
    collection: 'pages',
    where: { _status: { not_equals: 'published' } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  if (drafts > 0) {
    notes.push(
      `${drafts} page(s) are not published — they return 404 to visitors while looking correct in the CMS.`,
    )
  }

  /* --------------------------------------------------------------- report */
  const { totalDocs: pages } = await payload.find({
    collection: 'pages',
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  console.log(`\n  ${pages} pages, ${allMedia.length} photographs.\n`)

  for (const note of notes) console.log(`  · ${note}`)
  if (notes.length) console.log('')

  if (problems.length === 0) {
    console.log('  Nothing to report — this database matches the code you have checked out.\n')
    process.exit(0)
  }

  console.log(`  ${problems.length} thing(s) need attention:\n`)
  for (const [i, problem] of problems.entries()) {
    console.log(`  ${i + 1}. ${problem.title}`)
    console.log(`     ${problem.detail}`)
    console.log(`     FIX: ${problem.fix}\n`)
  }

  process.exit(1)
}

main().catch((error: unknown) => {
  console.error('\n  seed:verify failed:', error, '\n')
  process.exit(1)
})
