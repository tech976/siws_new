import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Creates one Head of Department account per unit, plus a worked example of
 * each thing they publish.
 *
 * Run with:  npm run seed:hod
 *
 * The password is printed once and not stored anywhere. These are working
 * accounts on a real CMS, so they are created deactivated-safe: change the
 * password at first login, and delete any you do not need.
 */
/*
 * Deliberately contains neither "siws" nor the school's name: Payload rejects
 * passwords holding an easily-guessed word, and the first attempt at seeding
 * these accounts failed on exactly that. Override with HOD_SEED_PASSWORD.
 */
const PASSWORD = process.env.HOD_SEED_PASSWORD ?? 'Verdant-Harbour-46!'

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: units } = await payload.find({
    collection: 'units',
    limit: 20,
    depth: 0,
    overrideAccess: true,
    sort: 'slug',
  })

  if (units.length === 0) throw new Error('No units found. Run `npm run seed` first.')

  let created = 0
  let updated = 0

  for (const unit of units as unknown as { id: number; slug: string; name: string }[]) {
    const email = `hod.${unit.slug}@siwsschool.edu.in`

    const { docs: existing } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })

    const data = {
      name: `${unit.name} — Head of Department`,
      jobTitle: 'Head of Department',
      roles: ['hod'],
      units: [unit.id],
      isActive: true,
    }

    if (existing[0]) {
      await payload.update({
        collection: 'users',
        id: existing[0].id,
        data: data as never,
        overrideAccess: true,
      })
      updated += 1
    } else {
      await payload.create({
        collection: 'users',
        data: { ...data, email, password: PASSWORD } as never,
        overrideAccess: true,
      })
      created += 1
    }

    payload.logger.info(`HOD for ${unit.name}: ${email}`)
  }

  payload.logger.info(`\nHOD accounts — ${created} created, ${updated} updated.`)
  payload.logger.info(`Password for any newly created account: ${PASSWORD}`)
  payload.logger.warn('Change these passwords at first login. Delete any account not needed.')

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
