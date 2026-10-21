import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { JC_STAFF, designationOf } = await import('@/seed/data/jc-staff')

/**
 * Brings the Junior College's teachers on the live site to the college's
 * printed staff list (SIWS, 2026-10-21) — full names, subjects,
 * qualifications and the sheet's order. The list itself, and how it was read,
 * is in `src/seed/data/jc-staff.ts`.
 *
 * Each teacher is found by the name the record has carried since the site was
 * set up (`was`), or by the new name on a second run. One teacher on the
 * sheet has no record and is added.
 *
 * LEAVES ALONE:
 *   - a record someone has edited in the panel since it was created — its
 *     name no longer matches either name, so it is reported, not touched;
 *   - the teachers on the site who are not on the sheet. The sheet is the
 *     college's list, but removing a teacher is not something to infer from a
 *     name being absent from one page of it; they are listed at the end for
 *     SIWS to confirm;
 *   - photographs and messages: neither is on the sheet.
 *
 * Usage:  npx tsx src/scripts/update-jc-staff-list.ts [--apply]
 * Without --apply it prints what it would do and writes nothing. Safe to run
 * twice.
 */

const APPLY = process.argv.includes('--apply')

type Teacher = {
  id: number
  name: string
  designation?: string | null
  qualifications?: string | null
  order?: number | null
}

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    where: { slug: { equals: 'junior-college' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const college = units[0]
  if (!college) throw new Error('The Junior College unit was not found.')

  const { docs } = await payload.find({
    collection: 'faculty',
    where: { unit: { equals: college.id } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  const roster = docs as unknown as Teacher[]
  const byName = new Map(roster.map((teacher) => [teacher.name.trim(), teacher]))
  const matched = new Set<number>()

  let changed = 0
  let added = 0
  for (const teacher of JC_STAFF) {
    const record = byName.get(teacher.name) ?? (teacher.was ? byName.get(teacher.was) : undefined)
    const want = {
      name: teacher.name,
      designation: designationOf(teacher),
      order: teacher.order,
      // No qualification on the sheet keeps whatever the record has.
      ...(teacher.qualifications ? { qualifications: teacher.qualifications } : {}),
    }
    const note = teacher.doubt ? `   (check: ${teacher.doubt})` : ''

    if (!record) {
      if (teacher.was) {
        console.log(`  SKIPPED  ${teacher.name} — no record named “${teacher.was}” or “${teacher.name}”; edited in the panel?`)
        continue
      }
      added += 1
      console.log(`  add      ${String(teacher.order).padStart(2)}  ${teacher.name} — ${want.designation}, ${teacher.qualifications ?? 'no qualification given'}${note}`)
      if (APPLY) {
        await payload.create({
          collection: 'faculty',
          data: { ...want, unit: college.id, _status: 'published', reviewStatus: 'approved' } as never,
          overrideAccess: true,
        })
      }
      continue
    }

    matched.add(record.id)
    const differs =
      record.name !== want.name ||
      record.designation !== want.designation ||
      record.order !== want.order ||
      (want.qualifications !== undefined && record.qualifications !== want.qualifications)
    if (!differs) {
      console.log(`  same     ${String(teacher.order).padStart(2)}  ${teacher.name}`)
      continue
    }
    changed += 1
    const renamed = record.name !== want.name ? `${record.name} → ` : ''
    console.log(`  update   ${String(teacher.order).padStart(2)}  ${renamed}${teacher.name} — ${want.designation}, ${want.qualifications ?? record.qualifications ?? 'no qualification'}${note}`)
    if (APPLY) {
      await payload.update({
        collection: 'faculty',
        id: record.id,
        data: want as never,
        overrideAccess: true,
      })
    }
  }

  const others = roster.filter((teacher) => !matched.has(teacher.id) && !JC_STAFF.some((t) => t.name === teacher.name))
  if (others.length > 0) {
    console.log(`\n  NOT ON THE SHEET, left as they are (${others.length}) — for SIWS to confirm:`)
    for (const teacher of others) console.log(`           ${teacher.name}`)
  }

  console.log(`\n  ${changed} to update, ${added} to add.`)
  if (!APPLY) console.log('  Nothing was written. Re-run with --apply to do it.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
