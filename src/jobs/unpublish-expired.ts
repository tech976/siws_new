import type { Field, Payload } from 'payload'

/**
 * Switches content back to Draft once its "Take it off on" time has passed.
 *
 * The website already hides it at that moment (`publishedWhere` checks the
 * date on every read), so this is what makes the panel agree: the item shows
 * as Draft, not Published, and nobody wonders why a "published" story is
 * missing. Nothing is deleted.
 *
 * Runs once a minute inside the website's own server process, started from
 * `onInit`. No separate cron or queue table is needed.
 */

const EVERY_MS = 60_000

const hasField = (fields: Field[], name: string): boolean =>
  fields.some((field) => {
    if ('name' in field && field.name === name) return true
    if (field.type === 'tabs') return field.tabs.some((tab) => hasField(tab.fields, name))
    if ((field.type === 'row' || field.type === 'collapsible') && Array.isArray(field.fields)) {
      return hasField(field.fields, name)
    }
    return false
  })

export const unpublishExpired = async (payload: Payload): Promise<number> => {
  const now = new Date().toISOString()
  let count = 0

  for (const collection of payload.config.collections) {
    const drafts = typeof collection.versions === 'object' && collection.versions?.drafts
    if (!drafts || !hasField(collection.fields as Field[], 'unpublishAt')) continue

    const { docs } = await payload.find({
      collection: collection.slug,
      where: {
        and: [{ _status: { equals: 'published' } }, { unpublishAt: { less_than_equal: now } }],
      },
      depth: 0,
      limit: 50,
      overrideAccess: true,
    })

    for (const doc of docs) {
      try {
        await payload.update({
          collection: collection.slug,
          id: doc.id,
          data: { _status: 'draft' } as never,
          overrideAccess: true,
          context: { autoUnpublish: true },
        })
        count += 1
        payload.logger.info(`Timer: took ${collection.slug} #${doc.id} off the website (end time passed).`)
      } catch (error) {
        payload.logger.error({ err: error }, `Timer: could not unpublish ${collection.slug} #${doc.id}`)
      }
    }
  }

  return count
}

const started = Symbol.for('siws.unpublishTimer')

/** Starts the once-a-minute check, once per server process. */
export const startUnpublishTimer = (payload: Payload): void => {
  // Not while building, migrating, or in one-off scripts that ask not to.
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  if (process.env.PAYLOAD_MIGRATING === 'true' || process.env.SIWS_NO_TIMERS === 'true') return

  const store = globalThis as unknown as Record<symbol, boolean>
  if (store[started]) return
  store[started] = true

  let running = false
  const timer = setInterval(() => {
    if (running) return
    running = true
    unpublishExpired(payload)
      .catch((error: unknown) => payload.logger.error({ err: error }, 'Timer check failed'))
      .finally(() => {
        running = false
      })
  }, EVERY_MS)
  // Never keeps a script alive on its own.
  timer.unref?.()
}
