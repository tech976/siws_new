import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Records parental permission against the photographs that show identifiable
 * students (FR-SW-03, FR-PRV-11).
 *
 * SIWS has confirmed the permissions exist. This writes that confirmation into
 * the consent record so the images are publishable and the position is
 * evidenced — but it deliberately does NOT invent the supporting detail. The
 * method, date and filing reference are left for SIWS to complete in the admin
 * panel, and the reference field says so in as many words, so an incomplete
 * record is visible rather than looking finished.
 *
 * Optional arguments let the real detail be supplied directly:
 *
 *   npm run record:consent -- --method=admission_form \
 *       --on=2026-06-01 --ref="Jr. KG permission file, school office"
 *
 * Valid methods: admission_form | permission_slip | written_confirmation | other
 */

const arg = (name: string): string | undefined => {
  const match = process.argv.find((value) => value.startsWith(`--${name}=`))
  return match?.slice(name.length + 3)
}

const VALID_METHODS = ['admission_form', 'permission_slip', 'written_confirmation', 'other']

const main = async () => {
  const payload = await getPayload({ config })

  const method = arg('method')
  if (method && !VALID_METHODS.includes(method)) {
    throw new Error(`--method must be one of: ${VALID_METHODS.join(', ')}`)
  }

  const obtainedOn = arg('on')
  if (obtainedOn && Number.isNaN(new Date(obtainedOn).getTime())) {
    throw new Error('--on must be a valid date, e.g. --on=2026-06-01')
  }

  const reference =
    arg('ref') ??
    'Confirmed by SIWS management — please add where the signed records are filed.'

  const { docs } = await payload.find({
    collection: 'media',
    where: { depictsChildren: { equals: true } },
    sort: 'id',
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })

  if (docs.length === 0) {
    payload.logger.info('No images are marked as showing identifiable students.')
    process.exit(0)
  }

  let recorded = 0
  let alreadyDone = 0

  for (const doc of docs) {
    const existing = doc.parentalConsent

    if (existing?.obtained === true && !method && !obtainedOn && !arg('ref')) {
      // Already recorded and no new detail supplied — leave the existing
      // evidence untouched rather than overwriting its timestamp.
      alreadyDone += 1
      continue
    }

    await payload.update({
      collection: 'media',
      id: doc.id,
      overrideAccess: true,
      data: {
        parentalConsent: {
          obtained: true,
          ...(method ? { method } : {}),
          ...(obtainedOn ? { obtainedOn: new Date(obtainedOn).toISOString() } : {}),
          reference,
        },
      } as never,
    })

    recorded += 1
    payload.logger.info(`Consent recorded: ${doc.filename}`)
  }

  payload.logger.info(
    `Done — ${recorded} record(s) written, ${alreadyDone} already had consent recorded.`,
  )

  if (!method || !obtainedOn) {
    payload.logger.warn(
      'Still to complete in the admin panel, per image: how permission was obtained, and the date it was given.',
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Recording consent failed:', error)
    process.exit(1)
  })
