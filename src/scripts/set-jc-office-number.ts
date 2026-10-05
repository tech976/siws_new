import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Puts the Junior College office number on the header, in place of the mobile
 * that was there (SIWS, 2026-10-05: "+9122 24180390 add this number instead
 * there in the header").
 *
 * The number SIWS sent, exactly as sent. It prints beside the address at the
 * top of every Junior College page, and on the contact page and in the footer
 * — the section has one `phone`, and all three read it.
 *
 * THE MOBILE IS REPLACED, NOT MOVED. +91 98927 03893 was the section's only
 * number and was taken off the header earlier the same day; the office number
 * now takes its place everywhere. Putting the mobile in the second number
 * field would print it on the header again, beside this one, which is what
 * was asked to stop.
 *
 * Usage:  npx tsx src/scripts/set-jc-office-number.ts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 */

const APPLY = process.argv.includes('--apply')
const SECTION = 'junior-college'
const NUMBER = '+9122 24180390'

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

  if (unit.phone === NUMBER && !unit.hidePhoneInHeader) {
    console.log(`  ${unit.name}: the header already shows ${NUMBER}.`)
    process.exit(0)
  }

  console.log(`  ${unit.name}`)
  console.log(`    number: ${unit.phone ?? '(none)'} → ${NUMBER}`)
  if (unit.hidePhoneInHeader) console.log('    header: hidden → shown')
  console.log('    It appears in the header, on the contact page and in the footer.')

  if (!APPLY) {
    console.log('\n  Nothing was written. Re-run with --apply to do it.')
    process.exit(0)
  }

  await payload.update({
    collection: 'units',
    id: unit.id,
    data: { phone: NUMBER, hidePhoneInHeader: false } as never,
    overrideAccess: true,
  })
  console.log('  Written.')
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
