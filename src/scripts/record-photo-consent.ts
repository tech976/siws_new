import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Records parental permission across a batch of photographs.
 *
 * WHY THIS IS A SEPARATE, DELIBERATE COMMAND
 * ------------------------------------------
 * FR-PRV-11 asks the platform to record "that verifiable parental consent has
 * been obtained, by whom and on what date" — an assertion about paperwork the
 * school holds. Nothing about an image file can establish it, so the importer
 * never sets it, and neither does anything else that runs automatically.
 *
 * It is one command, run knowingly by a person who can answer for the claim,
 * because that is what makes the record worth anything when it is questioned
 * two years from now. The audit log captures who ran it and when.
 *
 * Usage:
 *   npm run photos:consent -- --section=kindergarten \
 *       --method=admission_form --date=2026-06-01 \
 *       --reference="Admission files 2026-27, KG section"
 *
 *   --section    kindergarten | primary | secondary | junior-college | all
 *   --method     admission_form | permission_slip | written_confirmation | other
 *   --date       YYYY-MM-DD, the date permission was obtained
 *   --reference  where the signed paperwork is filed
 *   --dry-run    show what would change, write nothing
 */

const METHODS = new Set(['admission_form', 'permission_slip', 'written_confirmation', 'other'])

const arg = (name: string): string | undefined => {
  const hit = process.argv.find((entry) => entry.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

const main = async () => {
  const section = arg('section')
  const method = arg('method')
  const date = arg('date')
  const reference = arg('reference') ?? ''
  const dryRun = process.argv.includes('--dry-run')

  const problems: string[] = []
  if (!section) problems.push('--section is required (a section slug, or "all")')
  if (!method || !METHODS.has(method)) {
    problems.push(`--method must be one of: ${[...METHODS].join(', ')}`)
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    problems.push('--date must be a real date, as YYYY-MM-DD')
  }
  if (reference.trim().length === 0) {
    // Not pedantry: a consent record with no pointer to the paperwork cannot be
    // checked, and an unverifiable record is the thing FR-PRV-11 exists to stop.
    problems.push('--reference is required — say where the signed paperwork is filed')
  }

  if (problems.length > 0) {
    console.error('\nCannot record consent:\n')
    for (const problem of problems) console.error(`  • ${problem}`)
    console.error('\nExample:')
    console.error(
      '  npm run photos:consent -- --section=kindergarten --method=permission_slip \\\n' +
        '      --date=2026-06-01 --reference="Admission files 2026-27, KG section"\n',
    )
    process.exit(1)
  }

  const payload = await getPayload({ config })

  let unitId: number | null = null
  if (section !== 'all') {
    const { docs: units } = await payload.find({
      collection: 'units',
      where: { slug: { equals: section } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const unit = units[0]
    if (!unit) {
      console.error(`No section called "${section}".`)
      process.exit(1)
    }
    unitId = unit.id as number
  }

  // Only photographs that actually need a record: a student is recognisable and
  // no permission has been recorded yet.
  const { docs } = await payload.find({
    collection: 'media',
    where: {
      and: [
        { depictsChildren: { equals: true } },
        ...(unitId === null ? [] : [{ unit: { equals: unitId } }]),
      ],
    },
    sort: 'id',
    limit: 2000,
    depth: 0,
    overrideAccess: true,
  })

  const pending = docs.filter(
    (doc) => !(doc as { parentalConsent?: { obtained?: boolean } }).parentalConsent?.obtained,
  )

  if (pending.length === 0) {
    console.log('\nNothing to do — every photograph of a recognisable student already has a record.\n')
    process.exit(0)
  }

  console.log(`\n${pending.length} photograph(s) would be marked as having parental permission:`)
  console.log(`  section:   ${section}`)
  console.log(`  method:    ${method}`)
  console.log(`  date:      ${date}`)
  console.log(`  reference: ${reference}\n`)

  if (dryRun) {
    console.log('--dry-run given, so nothing was written.\n')
    process.exit(0)
  }

  let done = 0
  for (const doc of pending) {
    await payload.update({
      collection: 'media',
      id: doc.id,
      data: {
        parentalConsent: {
          obtained: true,
          method,
          obtainedOn: new Date(`${date}T00:00:00Z`).toISOString(),
          reference,
        },
      } as never,
      overrideAccess: true,
    })
    done += 1
  }

  console.log(`Recorded on ${done} photograph(s).`)
  console.log('Now run `npm run seed:galleries` to put them on the gallery pages.\n')
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('Could not record consent:', error)
  process.exit(1)
})
