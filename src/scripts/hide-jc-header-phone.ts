import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Takes the telephone number off the Junior College header (SIWS, 2026-10-05).
 *
 * The header prints the address and the office number on one line. The number
 * stays on the contact page, in the footer and in the search-engine details —
 * only the header line loses it, which is what was asked for. Anyone can turn
 * it back on: Configuration → Sections → SIWS Junior College → "Keep the
 * telephone number out of the header".
 *
 * Usage:  npx tsx src/scripts/hide-jc-header-phone.ts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 */

const APPLY = process.argv.includes('--apply')
const SECTION = 'junior-college'

const main = async () => {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'units',
    where: { slug: { equals: SECTION } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const unit = docs[0] as unknown as
    | { id: number; name: string; phone?: string | null; hidePhoneInHeader?: boolean | null }
    | undefined
  if (!unit) throw new Error(`No "${SECTION}" section found.`)

  if (unit.hidePhoneInHeader) {
    console.log(`  ${unit.name}: the header already leaves the number out.`)
    process.exit(0)
  }

  console.log(
    `  ${unit.name}: ${APPLY ? 'taking' : 'would take'} ${unit.phone ?? 'the number'} off the header line.`,
  )
  console.log('          It stays on the contact page and in the footer.')

  if (!APPLY) {
    console.log('\n  Nothing was written. Re-run with --apply to do it.')
    process.exit(0)
  }

  await payload.update({
    collection: 'units',
    id: unit.id,
    data: { hidePhoneInHeader: true } as never,
    overrideAccess: true,
  })
  console.log('  Written.')
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
