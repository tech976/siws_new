import config from '@payload-config'
import { getPayload } from 'payload'

import { CONSENT_NOTICES, type ConsentNotice, type ConsentPurpose } from './consent-notices'

/**
 * BR-DPA-07 — the notice a form shows, as currently worded in the admin panel.
 *
 * Server-only, and deliberately a separate file from `consent-notices`: that
 * one is imported by the forms in the browser, and pulling the database client
 * into it would ship it to every visitor.
 *
 * FALLS BACK to the wording in code if the record is missing or the lookup
 * fails. A form must never render without a notice — FR-PRV-07 makes the
 * notice a condition of collecting anything at all — and the built-in wording
 * is the version every consent was recorded against before the notices moved
 * into the panel.
 */
export const getConsentNotice = async (purpose: ConsentPurpose): Promise<ConsentNotice> => {
  const fallback = CONSENT_NOTICES[purpose]

  try {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'consent-notices',
      where: { purpose: { equals: purpose } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const doc = docs[0] as unknown as
      | (Partial<ConsentNotice['items']> & { version?: string; checkboxLabel?: string })
      | undefined
    if (!doc?.version) return fallback

    return {
      version: doc.version,
      purpose: fallback.purpose,
      checkboxLabel: doc.checkboxLabel || fallback.checkboxLabel,
      items: {
        whatWeCollect: doc.whatWeCollect || fallback.items.whatWeCollect,
        whyWeCollect: doc.whyWeCollect || fallback.items.whyWeCollect,
        howLongWeKeepIt: doc.howLongWeKeepIt || fallback.items.howLongWeKeepIt,
        yourRights: doc.yourRights || fallback.items.yourRights,
      },
    }
  } catch {
    return fallback
  }
}
