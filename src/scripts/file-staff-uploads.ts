import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { unitIdsOf, usesSimpleScreen } = await import('@/access')

/**
 * Files the schools' own uploads under the school that uploaded them.
 *
 * WHAT WENT WRONG. A photograph a teacher uploads is meant to belong to their
 * school without their saying so — "Belongs to" is hidden from them — and the
 * rule that filed it only recognised an account that was an HOD and nothing
 * else. The schools' accounts are Editors, or HODs and Editors, so from
 * 2026-10-05 to 2026-10-12 every one of their uploads was saved belonging to
 * no school: forty-three photographs on the live site by the time the Junior
 * College asked why its sports photographs were not visible.
 *
 * WHY IT MATTERS BEYOND TIDINESS. A photograph with no school is shared by
 * all four. Each of those filed under a section — Primary's prize-giving
 * under Achievements — was therefore appearing on the Kindergarten's and the
 * Secondary School's pages of the same name, and none of them was counted as
 * its own school's.
 *
 * `Media.ts` now files a new upload correctly. This puts the earlier ones
 * where they should have gone: each photograph with no school goes to its
 * uploader's school, when the uploader works on the simple screen and belongs
 * to exactly one. An administrator's, a Unit Head's or a Content Manager's
 * upload with no school is left alone — they can see "Belongs to", and an
 * empty one is their decision. So is anybody's who works for two schools.
 *
 * Nothing else about a photograph changes: not its section, its caption, its
 * permission record, nor where it is used. A news item that shows it still
 * shows it.
 *
 * Usage:  npx tsx src/scripts/file-staff-uploads.ts [--apply]
 * Without --apply it prints what it would do and writes nothing. Safe to
 * repeat: a photograph that has a school is never looked at again.
 */

const APPLY = process.argv.includes('--apply')

type Picture = {
  id: number
  filename?: string | null
  category?: string | null
  uploadedBy?: number | { id: number } | null
}

const idOf = (value: unknown): number | null =>
  value && typeof value === 'object' && 'id' in value
    ? Number((value as { id: unknown }).id)
    : typeof value === 'number'
      ? value
      : null

const main = async () => {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'media',
    where: { and: [{ unit: { exists: false } }, { uploadedBy: { exists: true } }] },
    limit: 2000,
    depth: 0,
    sort: 'createdAt',
    overrideAccess: true,
  })
  const pictures = docs as unknown as Picture[]

  if (pictures.length === 0) {
    console.log('  Nothing to do: every uploaded photograph already belongs to a school.')
    process.exit(0)
  }

  const { docs: units } = await payload.find({ collection: 'units', limit: 20, depth: 0, overrideAccess: true })
  const unitName = new Map(units.map((unit) => [String(unit.id), (unit as { shortName?: string }).shortName ?? String(unit.slug)]))

  const byUploader = new Map<number, Picture[]>()
  for (const picture of pictures) {
    const uploader = idOf(picture.uploadedBy)
    if (uploader === null) continue
    byUploader.set(uploader, [...(byUploader.get(uploader) ?? []), picture])
  }

  let filed = 0
  let left = 0

  for (const [uploader, theirs] of byUploader) {
    const user = await payload
      .findByID({ collection: 'users', id: uploader, depth: 0, overrideAccess: true })
      .catch(() => null)

    const account = user as unknown as Parameters<typeof usesSimpleScreen>[0]
    const schools = unitIdsOf(account)
    const sectioned = theirs.filter((picture) => (picture.category ?? '').trim().length > 0).length

    if (!user || !usesSimpleScreen(account) || schools.length !== 1) {
      const why = !user
        ? 'the account no longer exists'
        : !usesSimpleScreen(account)
          ? 'an administrator, Unit Head or Content Manager, who may share a photograph on purpose'
          : schools.length === 0
            ? 'the account belongs to no school'
            : 'the account belongs to more than one school'
      console.log(`  account ${uploader}: ${theirs.length} photograph(s) left as they are — ${why}`)
      left += theirs.length
      continue
    }

    const school = schools[0]!
    console.log(
      `  account ${uploader} (${unitName.get(school) ?? school}): ${theirs.length} photograph(s) ${APPLY ? 'filed' : 'would be filed'} under ${unitName.get(school) ?? school}` +
        (sectioned > 0 ? ` — ${sectioned} of them carry a section and were showing on every school’s pages` : ''),
    )
    if (!APPLY) {
      filed += theirs.length
      continue
    }

    for (const picture of theirs) {
      await payload.update({
        collection: 'media',
        id: picture.id,
        data: { unit: /^\d+$/.test(school) ? Number(school) : school } as never,
        overrideAccess: true,
      })
      filed += 1
    }
  }

  console.log(`\n  ${filed} photograph(s) ${APPLY ? 'filed' : 'to file'}, ${left} left as they are.`)
  if (!APPLY) console.log('  Nothing was written. Re-run with --apply to do it.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
