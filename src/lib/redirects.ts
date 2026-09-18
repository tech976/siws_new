import type { CollectionAfterChangeHook, Payload, PayloadRequest } from 'payload'

/**
 * BR-SEO-07 — "Changing a published page's URL slug shall offer to create a
 * permanent redirect from the old address, and administrators shall be able to
 * manage redirects without code."
 *
 * It does better than offer: the redirect is created automatically, because the
 * person renaming a page is rarely the person who knows which newsletters,
 * WhatsApp groups and search results still point at the old address. Every
 * automatic redirect is visible and removable under Configuration → Redirects.
 */

const HOME_SLUG = 'home'

/** The public address of a page or news item. */
export const pathFor = async (
  payload: Payload,
  doc: { slug?: string | null; unit?: unknown },
  req?: PayloadRequest,
): Promise<string | null> => {
  if (!doc.slug) return null

  const unitId =
    doc.unit && typeof doc.unit === 'object' && 'id' in doc.unit
      ? (doc.unit as { id: number }).id
      : (doc.unit as number | null | undefined)

  let unitSlug: string | null = null
  if (unitId) {
    const unit = await payload
      .findByID({ collection: 'units', id: unitId, depth: 0, overrideAccess: true, ...(req ? { req } : {}) })
      .catch(() => null)
    unitSlug = (unit as { slug?: string } | null)?.slug ?? null
  }

  if (doc.slug === HOME_SLUG) return unitSlug ? `/${unitSlug}` : '/'
  return unitSlug ? `/${unitSlug}/${doc.slug}` : `/${doc.slug}`
}

/**
 * Records a redirect when a PUBLISHED page or news item moves. A draft that was
 * never public had no address anyone could have saved, so it needs none.
 *
 * Chains are collapsed as they are made: anything that already redirected to
 * the old address is pointed straight at the new one, so a page renamed three
 * times costs a visitor one hop, not three.
 */
export const recordRedirectOnMove: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update' || !previousDoc) return doc
  if ((previousDoc as { _status?: string })._status !== 'published') return doc

  try {
    const [from, to] = await Promise.all([
      pathFor(req.payload, previousDoc as never, req),
      pathFor(req.payload, doc as never, req),
    ])
    if (!from || !to || from === to || from === '/') return doc

    const { docs: pointing } = await req.payload.find({
      collection: 'redirects',
      where: { to: { equals: from } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
      req,
    })
    for (const redirect of pointing) {
      await req.payload.update({
        collection: 'redirects',
        id: redirect.id,
        data: { to } as never,
        overrideAccess: true,
        req,
      })
    }

    // The new address may itself have been redirected away once; it is a real
    // page again now, so that redirect has to go or it would shadow the page.
    const { docs: shadowing } = await req.payload.find({
      collection: 'redirects',
      where: { from: { equals: to } },
      limit: 10,
      depth: 0,
      overrideAccess: true,
      req,
    })
    for (const redirect of shadowing) {
      await req.payload.delete({ collection: 'redirects', id: redirect.id, overrideAccess: true, req })
    }

    const { docs: existing } = await req.payload.find({
      collection: 'redirects',
      where: { from: { equals: from } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (existing[0]) {
      await req.payload.update({
        collection: 'redirects',
        id: existing[0].id,
        data: { to } as never,
        overrideAccess: true,
        req,
      })
    } else {
      await req.payload.create({
        collection: 'redirects',
        data: {
          from,
          to,
          automatic: true,
          note: `Created when “${(doc as { title?: string }).title ?? 'a page'}” moved.`,
        } as never,
        overrideAccess: true,
        req,
      })
    }
  } catch (error) {
    // The move itself succeeded; a missing redirect is logged, not thrown.
    req.payload.logger.error({ err: error }, 'Could not record a redirect for a moved page.')
  }

  return doc
}

/** The redirect for an address that no longer resolves, if there is one. */
export const findRedirect = async (payload: Payload, path: string): Promise<string | null> => {
  try {
    const { docs } = await payload.find({
      collection: 'redirects',
      where: { from: { equals: path } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const to = (docs[0] as { to?: string } | undefined)?.to
    return to && to !== path ? to : null
  } catch {
    return null
  }
}
