import { spawnSync } from 'child_process'

import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Re-applies the site's content to this machine's database, in order.
 *
 * WHY THIS EXISTS
 * ---------------
 * The site renders from Postgres, not from the repository. Git carries the
 * recipe — the seed scripts and the image files — and every developer bakes
 * their own copy locally. So `git pull` brings a teammate's changes onto disk
 * and changes nothing on screen until the seeds are run against your database.
 *
 * That much was survivable. What was not is HOW it failed:
 *
 *   • A photograph a page names but cannot find is not left as a gap. The
 *     "Life at SIWS" wall fills the slot from whatever else is in the library,
 *     so the page looks finished while showing pictures nobody chose — which
 *     reads as "someone changed the images", not as "a seed did not run".
 *   • A seed that fails halfway leaves the rows it had not reached alone, so
 *     the previous content survives and looks deliberate.
 *   • Consent records live only in the database and never travel in a commit,
 *     so the publish gate fails on every teammate's machine and never on the
 *     author's.
 *
 * Each of those was invisible in a browser and obvious on a terminal. This runs
 * the seeds in dependency order, stops at the first failure, and says what to do
 * next — so the terminal is the only place anyone needs to look.
 *
 * Run with:
 *   npm run seed:refresh              # after every `git pull`
 *   npm run seed:refresh -- --dry-run # print the order, run nothing
 *   npm run seed:refresh -- --from=seed:kg   # resume after fixing a failure
 */

interface Step {
  /** The npm script to run. */
  script: string
  /** Arguments passed through after `--`. */
  args?: string[]
  /** What it owns, for the progress line. */
  does: string
}

/*
 * ORDER IS DEPENDENCY ORDER, NOT PREFERENCE.
 *
 *   1. Units first — every page, photograph and menu entry is hung off a unit id.
 *   2. The media library next — pages look photographs up BY NAME, so a page
 *      seeded before its photograph exists silently renders without it.
 *   3. Page content after that.
 *   4. Menu and galleries last, because both are built by reading whatever the
 *      earlier steps produced rather than from a list of their own.
 */
const STEPS: Step[] = [
  { script: 'seed', does: 'the four units' },
  { script: 'seed:media', does: 'photographs into the media library' },
  { script: 'seed:onam', does: 'Onam photographs and the Events page' },
  {
    script: 'seed:vision-bg',
    // The source is the committed derivative, not a camera original, so this
    // works on a fresh clone with nothing else set up.
    args: ['--source=media/portal-vision-background.jpg'],
    does: 'the photograph behind the portal’s Vision band',
  },
  { script: 'seed:institution', does: 'the main portal pages' },
  { script: 'seed:scholarships', does: 'the scholarship register' },
  { script: 'seed:kg', does: 'the Kindergarten site' },
  { script: 'seed:primary', does: 'the Primary site' },
  { script: 'seed:secondary', does: 'the Secondary site' },
  { script: 'seed:units', does: 'Primary, Secondary and Junior College build-out' },
  { script: 'seed:pages', does: 'general copy for pages still blank' },

  /*
   * THE LAYOUT LAYER — and leaving it out is what made this list wrong first time.
   *
   * The seeds above write a unit's CONTENT. These arrange it: they turn the
   * opening enquiry form into a photographic banner, lay the alternating
   * picture-and-text bands the portal established, and put each photograph on
   * the page its folder says it belongs to.
   *
   * They were held back on the reasoning that they were one-time passes and
   * re-running them would undo later work. That was wrong in the direction that
   * mattered: running the content seeds WITHOUT them rewrites every home page
   * back to its plain, pictureless base, so a machine that ran the refresh
   * ended up with less than the live site. The photographs did not fail to
   * arrive — they were arranged, and then the arrangement was overwritten.
   *
   * Order matters twice over:
   *   unit-home BEFORE unit-composition, because the composition keeps the
   *     hero block it finds (`source: 'keep'`) and unit-home is what creates it.
   *   kg-home AFTER unit-composition, or the shared pattern overwrites the
   *     Kindergarten page's own arrangement.
   */
  { script: 'seed:unit-home', does: 'photographic banners on each unit home page' },
  { script: 'seed:unit-composition', does: 'the shared home-page composition' },
  { script: 'seed:kg-home', does: 'the Kindergarten home page arrangement' },
  { script: 'seed:move-enquiry', does: 'the enquiry form off home, onto Admissions' },
  { script: 'seed:section-images', does: 'photographs onto the pages they belong to' },
  { script: 'seed:portal-hero', does: 'the portal’s opening banner' },

  { script: 'seed:nav', does: 'the menus' },
  { script: 'seed:galleries', does: 'the gallery pages' },
]

/*
 * DELIBERATELY NOT IN THE LIST, and why:
 *
 *   seed:hod              creates real login accounts and prints passwords.
 *                         Running it on a schedule is how credentials leak.
 *   seed:preview          builds a design mock-up page, not site content.
 *   photos:consent        asserts that the school holds signed parental
 *                         permission. A person answers for that, not a script.
 *   photos:import         reads camera originals that are not in the repository.
 *
 *   seed:apply-placement  reads a curated plan from `/tmp/placement.json` — a
 *                         file that exists only on the machine that generated
 *                         it and is in no commit. It cannot be reproduced from
 *                         a clone, so anything it placed lives in one person's
 *                         database and nowhere else. See the note in the README.
 */

const arg = (name: string): string | undefined =>
  process.argv.find((entry) => entry.startsWith(`--${name}=`))?.slice(name.length + 3)

const main = async () => {
  const dryRun = process.argv.includes('--dry-run')
  const from = arg('from')

  let steps = STEPS
  if (from) {
    const index = STEPS.findIndex((step) => step.script === from)
    if (index === -1) {
      console.error(`\n  No step called "${from}". The steps are:\n`)
      for (const step of STEPS) console.error(`    ${step.script}`)
      console.error('')
      process.exit(1)
    }
    steps = STEPS.slice(index)
  }

  console.log(`\n  Re-applying site content — ${steps.length} step(s).\n`)

  if (dryRun) {
    steps.forEach((step, i) => {
      const args = step.args?.length ? ` -- ${step.args.join(' ')}` : ''
      console.log(`  ${String(i + 1).padStart(2)}. npm run ${step.script}${args}`)
      console.log(`      ${step.does}`)
    })
    console.log('\n  --dry-run given, so nothing was run.\n')
    process.exit(0)
  }

  /* ------------------------------------------------------------- preflight */
  /*
   * The consent gate refuses to publish a page showing identifiable children
   * without a permission record, and those records are database-only — they
   * never arrive in a commit. Left to itself the run would get five steps in
   * and die on a 422 stack trace from inside Payload. Checking here turns that
   * into one sentence naming the command that fixes it.
   */
  const payload = await getPayload({ config })
  const { totalDocs: unconsented } = await payload.find({
    collection: 'media',
    where: {
      and: [
        { depictsChildren: { equals: true } },
        { 'parentalConsent.obtained': { not_equals: true } },
      ],
    },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  if (unconsented > 0) {
    console.error(
      `\n  STOPPING BEFORE ANYTHING RUNS.\n\n` +
        `  ${unconsented} photograph(s) show identifiable students with no parental\n` +
        `  permission recorded. Publishing is blocked for those (FR-PRV-11), so the\n` +
        `  content seeds would fail part-way and leave the site half-updated.\n\n` +
        `  Consent records live only in this database — they never travel in a commit,\n` +
        `  which is why this happens after a pull even though it works for whoever\n` +
        `  added the photographs.\n\n` +
        `  Once the school has confirmed the permissions, record them:\n\n` +
        `    npm run photos:consent -- --section=all --method=other \\\n` +
        `        --date=YYYY-MM-DD --reference="where the signed records are filed"\n\n` +
        `  Then run this again.\n`,
    )
    process.exit(1)
  }

  /* ------------------------------------------------------------------- run */
  const started = STEPS.length - steps.length
  let done = 0

  for (const [index, step] of steps.entries()) {
    const n = started + index + 1
    const args = step.args?.length ? ['--', ...step.args] : []
    console.log(`\n  [${n}/${STEPS.length}] ${step.script} — ${step.does}`)

    const result = spawnSync('npm', ['run', step.script, ...args], {
      stdio: 'inherit',
      // Windows resolves `npm` through npm.cmd, which needs a shell.
      shell: true,
    })

    if (result.status !== 0) {
      console.error(
        `\n  FAILED at step ${n} of ${STEPS.length}: ${step.script}\n\n` +
          `  Nothing after this step has run, so the site is part-updated: the pages\n` +
          `  this step owns still hold what they held before, and they will look\n` +
          `  deliberate rather than stale. Read the error above — the seeds report\n` +
          `  their own problems in full.\n\n` +
          `  Once it is fixed, carry on from where it stopped:\n\n` +
          `    npm run seed:refresh -- --from=${step.script}\n`,
      )
      process.exit(result.status ?? 1)
    }

    done += 1
  }

  console.log(
    `\n  Done — ${done} step(s), no failures.\n\n` +
      `  Read the warnings above before assuming the site is right. A seed that\n` +
      `  cannot find a photograph it names still succeeds; it says so on the\n` +
      `  terminal and fills the gap with whatever else is in the library.\n`,
  )
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('\n  seed:refresh failed:', error, '\n')
  process.exit(1)
})
