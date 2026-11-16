import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

import type { Media } from '@/payload-types'
import { collectUploadIds } from '@/utilities/collect-uploads'

/**
 * Stops a page, news item or popup from being published with a photograph that
 * was WITHDRAWN at a parent's request — so a picture taken down cannot quietly
 * return on the next unrelated edit.
 *
 * A missing parental-permission record does NOT block anything. The school's
 * rule (2026-11-16): a photograph uploaded by a teacher already has the
 * parents' permission, so publishing and the galleries never wait on the
 * permission record. Withdrawing a picture is the one deliberate "take it
 * down" control, and that is what this enforces.
 */
export const blockUnconsentedChildImages: CollectionBeforeChangeHook = async ({
  data,
  req,
  collection,
}) => {
  if ((data as { _status?: string })?._status !== 'published') return data

  const mediaIds = collectUploadIds(collection.fields, data, 'media')
  if (mediaIds.length === 0) return data

  const { docs } = await req.payload.find({
    collection: 'media',
    where: { and: [{ id: { in: mediaIds } }, { 'withdrawn.isWithdrawn': { equals: true } }] },
    limit: mediaIds.length,
    depth: 0,
    overrideAccess: true,
  })

  if (docs.length > 0) {
    const what = collection.slug === 'posts' ? 'news item' : collection.slug === 'popups' ? 'popup' : 'page'
    throw new APIError(
      [
        `This ${what} cannot be published, because it uses a picture that was taken down at a parent’s request:`,
        '',
        ...(docs as Media[]).map((media) => `• “${media.filename || media.alt || `media #${media.id}`}”`),
        '',
        'Remove that picture from this item, then publish again.',
      ].join(String.fromCharCode(10)),
      422,
    )
  }

  return data
}
