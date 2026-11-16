import type { Payload, Where } from 'payload'
import { cache } from 'react'

/**
 * Photographs that must not appear on the public site because they show
 * recognisable students and either carry no parental permission record or
 * were withdrawn at a parent's request.
 *
 * The galleries that fill themselves from the library ("every photograph
 * filed under this section") read with public access, and the permission
 * record is staff-only — so they could not see it and showed such a
 * photograph anyway (found in testing, 2026-11-16). This reads the short list
 * with full access, once per page render, and those galleries leave the ids
 * out. Only ids leave this function; the record itself stays staff-only.
 */
export const unclearedMediaIds = cache(async (payload: Payload): Promise<number[]> => {
  try {
    const { docs } = await payload.find({
      collection: 'media',
      where: {
        and: [
          { depictsChildren: { equals: true } },
          {
            or: [
              { 'parentalConsent.obtained': { not_equals: true } },
              { 'withdrawn.isWithdrawn': { equals: true } },
            ],
          },
        ],
      },
      depth: 0,
      limit: 1000,
      pagination: false,
      overrideAccess: true,
      select: {},
    })
    return docs.map((doc) => doc.id as number)
  } catch (error) {
    payload.logger.error({ err: error }, 'Could not read the list of photographs awaiting permission')
    return []
  }
})

/** A where clause that leaves those photographs out, or none if there are none. */
export const excludeUncleared = async (payload: Payload): Promise<Where[]> => {
  const ids = await unclearedMediaIds(payload)
  return ids.length > 0 ? [{ id: { not_in: ids } }] : []
}
