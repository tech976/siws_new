import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

import type { Media } from '@/payload-types'
import { collectUploadIds } from '@/utilities/collect-uploads'

/**
 * FR-SW-03 / FR-PRV-11 — "content without a recorded consent shall not be
 * publishable", and the platform "shall block publication where no consent is
 * recorded".
 *
 * The check runs on the transition into `published` only. Saving a draft that
 * uses a photograph still awaiting its permission record is deliberately
 * allowed: staff need to be able to build the page while the office chases the
 * paperwork. What they cannot do is put it in front of the public.
 *
 * It also blocks re-publishing a page whose photograph has since been withdrawn
 * (FR-SW-05), which is the case that matters most in practice — a parent asks
 * for a picture to come down, and the page must not quietly restore it on the
 * next unrelated edit.
 */
export const blockUnconsentedChildImages: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
  collection,
}) => {
  const nextStatus = (data as { _status?: string })?._status
  const previousStatus = (originalDoc as { _status?: string } | undefined)?._status

  // Only guard the moment content becomes, or stays, public.
  if (nextStatus !== 'published') return data

  const mediaIds = collectUploadIds(collection.fields, data, 'media')
  if (mediaIds.length === 0) return data

  const { docs } = await req.payload.find({
    collection: 'media',
    where: { id: { in: mediaIds } },
    limit: mediaIds.length,
    depth: 0,
    overrideAccess: true,
  })

  const problems: string[] = []

  for (const media of docs as Media[]) {
    if (media.depictsChildren !== true) continue

    const name = media.filename || media.alt || `media #${media.id}`

    if (media.withdrawn?.isWithdrawn === true) {
      problems.push(`“${name}” has been withdrawn at a parent’s request`)
      continue
    }

    if (media.parentalConsent?.obtained !== true) {
      problems.push(`“${name}” has no parental permission recorded`)
    }
  }

  if (problems.length > 0) {
    throw new APIError(
      [
        `This ${collection.slug === 'posts' ? 'news item' : collection.slug === 'popups' ? 'popup' : 'page'} cannot be published yet, because it shows students whose parental permission is not recorded:`,
        '',
        ...problems.map((problem) => `• ${problem}`),
        '',
        'Open each picture in the Media library, tick “Written parental permission has been obtained” and fill in how and when it was given. Then publish again.',
      ].join('\n'),
      // 422: the request is well-formed but cannot be acted on in this state.
      422,
    )
  }

  // Publishing was previously blocked and is now allowed — worth a log line, so
  // the audit trail shows when the content actually went live.
  if (previousStatus !== 'published') {
    req.payload.logger.info(
      `Published ${collection.slug} with ${mediaIds.length} media item(s); child-image consent checks passed.`,
    )
  }

  return data
}
