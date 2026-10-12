import { revalidatePath } from 'next/cache'
import type { Endpoint, PayloadRequest } from 'payload'

import { isAdmin, type AccessUser } from '@/access/user'
import { setOnMainHomepage, type MainHomepageCollection } from '@/utilities/main-homepage'

/**
 * POST /api/{posts|announcements}/:id/main-homepage   { "show": true | false }
 *
 * The tick-and-cross in the list of News & Events, and on the dashboard. It
 * exists so that an administrator can choose what runs on the main SIWS site
 * with one click per item, without opening and re-saving somebody else's story
 * — see `setOnMainHomepage` for why a save is the wrong tool.
 *
 * Administrators only, and checked here rather than left to the collection:
 * a head of department may update their own items, and this is the one thing
 * about them that is not theirs to decide.
 */
const handler =
  (collection: MainHomepageCollection) =>
  async (req: PayloadRequest): Promise<Response> => {
    if (!req.user) {
      return Response.json({ error: 'You must be signed in.' }, { status: 401 })
    }
    if (!isAdmin(req.user as AccessUser)) {
      return Response.json(
        { error: 'Only an administrator chooses what appears on the main SIWS homepage.' },
        { status: 403 },
      )
    }

    const id = req.routeParams?.id
    const body = (await req.json?.().catch(() => null)) as { show?: unknown } | null
    if ((typeof id !== 'string' && typeof id !== 'number') || typeof body?.show !== 'boolean') {
      return Response.json({ error: 'Say whether to show it: { "show": true } or false.' }, { status: 400 })
    }

    /*
     * Only what is live can be put on the main homepage. Taking something off
     * is always allowed, so an item unpublished after it was ticked can still
     * be cleared.
     */
    if (body.show) {
      const item = (await req.payload
        .findByID({ collection, id, depth: 0, overrideAccess: true, disableErrors: true })
        .catch(() => null)) as { _status?: string } | null
      if (!item) return Response.json({ error: 'That item no longer exists.' }, { status: 404 })
      if (item._status !== 'published') {
        return Response.json(
          { error: 'Publish it first. Only a published item can run on the main SIWS homepage.' },
          { status: 409 },
        )
      }
    }

    const found = await setOnMainHomepage({ payload: req.payload, collection, id, show: body.show })
    if (!found) return Response.json({ error: 'That item no longer exists.' }, { status: 404 })

    try {
      // The strip is on every page of the main site.
      revalidatePath('/', 'layout')
    } catch {
      // Not in a request context. Nothing to drop.
    }

    return Response.json({ show: body.show })
  }

export const mainHomepageEndpoint = (collection: MainHomepageCollection): Endpoint => ({
  path: '/:id/main-homepage',
  method: 'post',
  handler: handler(collection),
})
