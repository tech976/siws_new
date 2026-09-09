import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Reports what every real account on this installation can actually SEE.
 *
 * `verify-access.ts` covers writes thoroughly — who may create, publish and
 * delete what — against users it invents for the purpose. It barely covers
 * reads, and it never looks at the accounts that exist. Both gaps mattered:
 * a Primary head of department could read every published document from every
 * school, and no test noticed, because no test asked what a real user's list
 * screens contain.
 *
 * This asks exactly that, per user and per collection, by running the same
 * queries the admin panel runs — `overrideAccess: false` with that user
 * attached. It writes nothing.
 *
 * Usage:  npx tsx src/scripts/audit-access.ts
 */

const COLLECTIONS = [
  'posts',
  'pages',
  'announcements',
  'faculty',
  'media',
  'enquiries',
  'feedback',
  'users',
  'units',
  'audit-logs',
] as const

interface Row {
  unit?: unknown
  id: number | string
}

const unitKey = (value: unknown): string => {
  if (value === null || value === undefined) return 'shared'
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as { id: unknown }).id)
  }
  return String(value)
}

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  const unitName = new Map<string, string>()
  for (const unit of units as unknown as { id: number; slug: string }[]) {
    unitName.set(String(unit.id), unit.slug)
  }

  const { docs: users } = await payload.find({
    collection: 'users',
    limit: 200,
    depth: 1,
    overrideAccess: true,
    sort: 'email',
  })

  console.log('')
  console.log('WHAT EACH ACCOUNT CAN SEE')
  console.log('='.repeat(78))

  for (const user of users as unknown as {
    id: number
    email: string
    roles?: string[]
    isActive?: boolean
    units?: { id: number }[] | number[]
    editableSections?: string[]
  }[]) {
    const roles = (user.roles ?? []).join(', ') || 'none'
    const own = (user.units ?? []).map((u) =>
      unitName.get(String(typeof u === 'object' ? u.id : u)) ?? '?',
    )

    console.log('')
    console.log(`${user.email}`)
    console.log(`  roles: ${roles}${user.isActive === false ? '   [DEACTIVATED]' : ''}`)
    console.log(`  units: ${own.length > 0 ? own.join(', ') : '(none)'}`)
    if (user.editableSections?.length) {
      console.log(`  sections: ${user.editableSections.join(', ')}`)
    }

    for (const collection of COLLECTIONS) {
      try {
        const { docs, totalDocs } = await payload.find({
          collection,
          limit: 500,
          depth: 0,
          overrideAccess: false,
          user: user as never,
        })

        const spread = new Map<string, number>()
        for (const doc of docs as Row[]) {
          const key = unitKey(doc.unit)
          spread.set(key, (spread.get(key) ?? 0) + 1)
        }

        const detail = [...spread.entries()]
          .map(([key, n]) => `${key === 'shared' ? 'shared' : (unitName.get(key) ?? key)}:${n}`)
          .sort()
          .join('  ')

        /*
         * The line that matters: a unit-scoped user seeing rows from a unit
         * that is not theirs. Media and units are institution-wide by design
         * and are reported without the flag.
         */
        const foreign =
          own.length > 0 && !(user.roles ?? []).includes('admin')
            ? [...spread.keys()].filter(
                (key) => key !== 'shared' && !own.includes(unitName.get(key) ?? key),
              )
            : []

        const flag =
          foreign.length > 0 && !['media', 'units', 'users', 'audit-logs'].includes(collection)
            ? '   <-- OTHER SCHOOLS'
            : ''

        console.log(
          `    ${collection.padEnd(14)} ${String(totalDocs).padStart(4)}  ${detail}${flag}`,
        )
      } catch (error) {
        console.log(`    ${collection.padEnd(14)}    -  (refused: ${(error as Error).message})`)
      }
    }
  }

  console.log('')
  console.log('='.repeat(78))
  console.log('Counts are what that account sees in the panel. "shared" means no unit.')
  console.log('')

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
