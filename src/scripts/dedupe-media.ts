import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Removes photographs the seeds uploaded more than once.
 *
 * WHAT MADE THE COPIES
 * --------------------
 * `media.ts` matched an already-uploaded photograph with `/-d+(.[^.]+)$/`,
 * which matches a literal letter "d" rather than a digit. It never matched, so
 * every run re-uploaded the whole set; Payload appended its collision counter
 * and the library grew a `-1`, then a `-2`, then a `-3` of each. Pages pointed
 * at whichever copy was written last, which is why two people running the same
 * seeds saw different photographs. The regex is fixed; this clears what it left
 * behind.
 *
 * WHY IT MATCHES ON BYTES, NOT ON NAMES
 * -------------------------------------
 * A name is not evidence. `photos:import` names photographs after their folder
 * and a sequence number, so `wadala-primary-images-cultural-and-festivals-1.jpg`
 * through `-33.jpg` are THIRTY-THREE DIFFERENT PHOTOGRAPHS, not thirty-three
 * copies of one. Stripping the trailing number and grouping would delete the
 * school's entire cultural-and-festivals set.
 *
 * So a row is only treated as a copy when it shares its base name AND its exact
 * byte size AND its pixel dimensions with an older row. Two different
 * photographs do not agree on all three.
 *
 * It reports and writes nothing unless you pass `--delete`.
 *
 * Run with:
 *   npx tsx src/scripts/dedupe-media.ts            # report only
 *   npx tsx src/scripts/dedupe-media.ts --delete   # remove the copies
 *
 * AFTER DELETING, RUN `npm run seed:refresh`. Pages holding a reference to a
 * removed row render without that photograph until a seed re-points them by
 * name, which the refresh does.
 */

interface Row {
  id: number
  filename: string
  filesize: number | null
  width: number | null
  height: number | null
}

/** `siws-natya-tarang-2.jpg` → `siws-natya-tarang.jpg`. */
const baseName = (filename: string) => filename.replace(/-\d+(\.[^.]+)$/, '$1')

const main = async () => {
  const doDelete = process.argv.includes('--delete')
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'media',
    limit: 5000,
    sort: 'id',
    depth: 0,
    overrideAccess: true,
  })

  const rows = docs as unknown as Row[]

  /* Grouped by everything that must agree for one to be a copy of another. */
  const groups = new Map<string, Row[]>()
  for (const row of rows) {
    const key = [baseName(row.filename), row.filesize ?? '?', row.width ?? '?', row.height ?? '?'].join(
      '|',
    )
    const bucket = groups.get(key)
    if (bucket) bucket.push(row)
    else groups.set(key, [row])
  }

  const copies: { keep: Row; remove: Row[] }[] = []
  for (const bucket of groups.values()) {
    if (bucket.length < 2) continue
    // Sorted by id already, so the first is the original.
    const [keep, ...remove] = bucket
    copies.push({ keep, remove })
  }

  if (copies.length === 0) {
    console.log('\n  No duplicate uploads found.\n')
    process.exit(0)
  }

  const total = copies.reduce((sum, group) => sum + group.remove.length, 0)
  console.log(`\n  ${total} duplicate upload(s) across ${copies.length} photograph(s):\n`)
  for (const { keep, remove } of copies) {
    console.log(`    keep    ${keep.filename}  (${keep.filesize}b, ${keep.width}x${keep.height})`)
    for (const row of remove) console.log(`    remove  ${row.filename}`)
    console.log('')
  }

  if (!doDelete) {
    console.log('  Reporting only. Pass --delete to remove the copies.\n')
    process.exit(0)
  }

  /*
   * A copy a page still points at is SKIPPED, not forced.
   *
   * `Media` refuses to delete a file still in use, and that guard is right —
   * forcing past it would leave a page with a hole where a photograph was. The
   * way out is to run the seeds, which re-point every page at the copy being
   * kept, and then run this again. So a reference is reported as work still to
   * do rather than treated as a failure, and everything nothing points at is
   * cleared on this pass.
   */
  let removed = 0
  const stillUsed: string[] = []

  for (const { remove } of copies) {
    for (const row of remove) {
      try {
        await payload.delete({ collection: 'media', id: row.id, overrideAccess: true })
        removed += 1
      } catch (error) {
        if ((error as { status?: number })?.status === 409) {
          stillUsed.push(row.filename)
          continue
        }
        throw error
      }
    }
  }

  console.log(`\n  Removed ${removed} duplicate upload(s).`)

  if (stillUsed.length > 0) {
    console.log(
      `\n  ${stillUsed.length} still in use by a page, so left alone for now:\n` +
        stillUsed.map((name) => `    • ${name}`).join('\n') +
        `\n\n  Run the seeds to re-point those pages at the copy being kept, then run\n` +
        `  this again to clear them.\n`,
    )
  } else {
    console.log(`\n  Run the seeds so every page points at the copy that was kept.\n`)
  }
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('\n  dedupe-media failed:', error, '\n')
  process.exit(1)
})
