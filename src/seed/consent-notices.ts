import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { CONSENT_NOTICES } = await import('@/lib/consent-notices')

/**
 * BR-DPA-07 — moves the consent notices out of the code and into
 * Data protection → Consent notices, with the SAME version strings they carry
 * today, so every consent already recorded still points at the wording it was
 * given against. A purpose that already has a record is left alone.
 *
 * Run with:  npm run seed:consent-notices
 */
const TITLES: Record<string, string> = {
  admission_enquiry: 'Admission enquiry form',
  feedback: 'Parent feedback form',
  data_request: 'Data rights request form',
}

const main = async () => {
  const payload = await getPayload({ config })

  for (const notice of Object.values(CONSENT_NOTICES)) {
    const { totalDocs } = await payload.count({
      collection: 'consent-notices',
      where: { purpose: { equals: notice.purpose } },
      overrideAccess: true,
    })
    if (totalDocs > 0) {
      payload.logger.info(`${notice.purpose}: already in the panel — left alone.`)
      continue
    }
    await payload.create({
      collection: 'consent-notices',
      overrideAccess: true,
      data: {
        title: TITLES[notice.purpose] ?? notice.purpose,
        purpose: notice.purpose,
        version: notice.version,
        checkboxLabel: notice.checkboxLabel,
        ...notice.items,
      } as never,
    })
    payload.logger.info(`${notice.purpose}: created at version ${notice.version}.`)
  }

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
