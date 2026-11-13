import type { CollectionAfterChangeHook } from 'payload'

import { AUTO_ALT } from '@/lib/media-alt'

/**
 * Gives photographs added to a News & Events item a description from its
 * title — "Diwali Event — photo 3 of 8" — when the teacher left the
 * description empty. That is what a blind visitor hears instead of the
 * picture, and it is far better than "Photograph from the school".
 *
 * Only photos still carrying the automatic text are touched; a description
 * somebody typed is never replaced.
 */
export const nameNewsPhotos: CollectionAfterChangeHook = async ({ doc, req }) => {
  try {
    const title = typeof doc.title === 'string' ? doc.title.trim() : ''
    const photos = Array.isArray(doc.photos) ? doc.photos : []
    if (!title || photos.length === 0) return doc

    const ids = photos
      .map((photo: unknown) =>
        photo && typeof photo === 'object' ? (photo as { id: number }).id : (photo as number),
      )
      .filter((id: unknown) => typeof id === 'number' || typeof id === 'string')

    const { docs } = await req.payload.find({
      collection: 'media',
      where: { and: [{ id: { in: ids } }, { alt: { equals: AUTO_ALT } }] },
      depth: 0,
      limit: ids.length,
      overrideAccess: true,
      req,
    })

    for (const media of docs) {
      const position = ids.findIndex((id: unknown) => String(id) === String(media.id)) + 1
      const alt =
        ids.length > 1 ? `${title} — photo ${position} of ${ids.length}` : `${title} — photo`
      await req.payload.update({
        collection: 'media',
        id: media.id,
        data: { alt: alt.slice(0, 250) },
        overrideAccess: true,
        req,
      })
    }
  } catch (error) {
    // Never the reason a news item fails to save.
    req.payload.logger.error({ err: error }, 'Could not name the photos of a news item')
  }
  return doc
}
