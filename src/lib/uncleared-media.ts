import type { Payload, Where } from 'payload'
import { cache } from 'react'

/**
 * Photographs WITHDRAWN at a parent's request, which must not appear on the
 * public site.
 *
 * A missing permission record no longer hides anything: the school's rule
 * (2026-11-16) is that a photograph uploaded by a teacher already has the
 * parents' permission. The galleries that fill themselves from the library read
 * with public access and cannot see the (staff-only) withdrawal record, so this
 * reads the short list with full access, once per page render, and those
 * galleries leave the ids out.
 */
export const unclearedMediaIds = cache(async (payload: Payload): Promise<number[]> => {
  try {
    const { docs } = await payload.find({
      collection: 'media',
      where: { 'withdrawn.isWithdrawn': { equals: true } },
      depth: 0,
      limit: 1000,
      pagination: false,
      overrideAccess: true,
      select: {},
    })
    return docs.map((doc) => doc.id as number)
  } catch (error) {
    payload.logger.error({ err: error }, 'Could not read the list of withdrawn photographs')
    return []
  }
})

/** A where clause that leaves those photographs out, or none if there are none. */
export const excludeUncleared = async (payload: Payload): Promise<Where[]> => {
  const ids = await unclearedMediaIds(payload)
  return ids.length > 0 ? [{ id: { not_in: ids } }] : []
}
