import type { Payload } from 'payload'

/**
 * Writes to the consent register (BR-DPA-01). Server-only.
 *
 * NEVER THROWS. Recording the consent is evidence about an action, not the
 * action itself: a parent's enquiry that was stored and emailed must not be
 * reported to them as failed because the register write hiccuped. A failure is
 * logged loudly instead, so it can be found and put right.
 */

export type ConsentPurpose = 'admission_enquiry' | 'feedback' | 'data_request' | 'cookies'

interface RecordInput {
  subject: string
  subjectName?: string | null
  purpose: ConsentPurpose
  noticeVersion: string
  source?: string | null
  categories?: string[]
  relatedCollection?: string
  relatedId?: string | number
  unit?: number | string | null
}

export const recordConsent = async (payload: Payload, input: RecordInput): Promise<void> => {
  try {
    /*
     * A later choice from the same subject for the same purpose replaces the
     * earlier one rather than sitting beside it. Only cookies work this way —
     * two enquiries from one parent are two consents, each for its own
     * enquiry, and both stand.
     */
    if (input.purpose === 'cookies') {
      await supersede(payload, input.subject, 'cookies')
    }

    await payload.create({
      collection: 'consent-records',
      overrideAccess: true,
      data: {
        subject: input.subject.slice(0, 200),
        subjectName: input.subjectName?.slice(0, 120) || undefined,
        purpose: input.purpose,
        noticeVersion: input.noticeVersion,
        status: 'given',
        givenAt: new Date().toISOString(),
        source: input.source?.slice(0, 250) || undefined,
        categories: input.categories,
        relatedCollection: input.relatedCollection,
        relatedId: input.relatedId !== undefined ? String(input.relatedId) : undefined,
        unit: input.unit ? Number(input.unit) : undefined,
      } as never,
    })
  } catch (error) {
    payload.logger.error(
      { err: error },
      `CONSENT REGISTER WRITE FAILED (${input.purpose}) — the submission itself was saved.`,
    )
  }
}

const supersede = async (payload: Payload, subject: string, purpose: ConsentPurpose) => {
  const { docs } = await payload.find({
    collection: 'consent-records',
    where: {
      and: [
        { subject: { equals: subject } },
        { purpose: { equals: purpose } },
        { status: { equals: 'given' } },
      ],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })

  for (const doc of docs) {
    await payload.update({
      collection: 'consent-records',
      id: doc.id,
      data: { status: 'superseded' } as never,
      overrideAccess: true,
    })
  }
}

/**
 * FR-PRV-13 — marks every standing consent for a subject as withdrawn.
 * Returns how many were changed, so the caller can report it.
 */
export const withdrawConsents = async (
  payload: Payload,
  subject: string,
  purpose?: ConsentPurpose,
): Promise<number> => {
  try {
    const { docs } = await payload.find({
      collection: 'consent-records',
      where: {
        and: [
          { subject: { equals: subject } },
          { status: { equals: 'given' } },
          ...(purpose ? [{ purpose: { equals: purpose } }] : []),
        ],
      },
      limit: 200,
      depth: 0,
      overrideAccess: true,
    })

    const now = new Date().toISOString()
    for (const doc of docs) {
      await payload.update({
        collection: 'consent-records',
        id: doc.id,
        data: { status: 'withdrawn', withdrawnAt: now } as never,
        overrideAccess: true,
      })
    }
    return docs.length
  } catch (error) {
    payload.logger.error({ err: error }, 'CONSENT REGISTER WITHDRAWAL FAILED.')
    return 0
  }
}
