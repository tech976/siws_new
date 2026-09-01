import type { getPayload } from 'payload'

type Payload = Awaited<ReturnType<typeof getPayload>>

/**
 * Finding a photograph in the library by the name a page asks for.
 *
 * WHY THIS IS ONE FUNCTION AND NOT NINE
 * -------------------------------------
 * Payload appends `-1`, `-2`, `-3`… when the filename it wants to write is
 * already taken on disk. This repository commits `media/`, so every name a seed
 * ships is taken before the first upload ever runs: a photograph the seed calls
 * `siws-natya-tarang.jpg` is stored as `siws-natya-tarang-1.jpg`.
 *
 * That single fact broke the site in two directions at once, and every seed had
 * its own attempt at handling it:
 *
 *   • Seeds that matched on the EXACT name found nothing, so the page rendered
 *     without its photograph — or, worse, uploaded the file again. Each run
 *     added another copy: `-1`, then `-2`, then `-3`, with the pages pointing
 *     at whichever one happened to be written last.
 *   • `media.ts` did try to strip the counter, with `/-d+(.[^.]+)$/` — which
 *     matches a literal letter "d", not a digit. It never matched anything, so
 *     the seed that was written to stop duplicates was itself creating ten of
 *     them on every run.
 *
 * The symptom of both is the same and it is not an error message: a teammate
 * pulls, runs the seeds, and sees photographs nobody chose. So the logic lives
 * here once, with the escaping right, and every seed calls it.
 */

/** `siws-natya-tarang-2.jpg` → `siws-natya-tarang.jpg`. Leaves other names alone. */
export const baseName = (filename: string): string => filename.replace(/-\d+(\.[^.]+)$/, '$1')

/** `kg-play-area.jpg` → `kg-play-area`, for a prefix query. */
export const stemOf = (filename: string): string => filename.replace(/\.[^.]+$/, '')

/**
 * The id of the library row holding `filename`, or null.
 *
 * Tries the exact name first, then a collision-suffixed variant of the same
 * name. The suffix is Payload's counter for one file written repeatedly — not a
 * different photograph — so `kg-play-area-2.jpg` answers for `kg-play-area.jpg`
 * while `kg-play-area-closeup.jpg` does not.
 */
export const findMediaId = async (payload: Payload, filename: string): Promise<number | null> => {
  const exact = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (exact.docs[0]) return exact.docs[0].id as number

  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { like: `${stemOf(filename)}-` } },
    /*
     * Sorted, and low ids first. Where a broken run has already left several
     * copies, the ORIGINAL is the one other pages are most likely to point at,
     * so it is the one answered with — rather than whichever the database
     * happened to return, which is how two machines running the same seed
     * ended up pointing at different rows.
     */
    sort: 'id',
    limit: 25,
    depth: 0,
    overrideAccess: true,
  })

  const match = docs.find((doc) => baseName(String(doc.filename)) === filename)
  return (match?.id as number | undefined) ?? null
}

/**
 * Every row that is a collision-suffixed copy of `filename`, oldest first.
 *
 * Used by the duplicate cleanup: the first is the one to keep, the rest are
 * copies a broken seed made of the same photograph.
 */
export const findMediaDuplicates = async (
  payload: Payload,
  filename: string,
): Promise<{ id: number; filename: string }[]> => {
  const { docs } = await payload.find({
    collection: 'media',
    where: { filename: { like: `${stemOf(filename)}` } },
    sort: 'id',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  return docs
    .filter((doc) => baseName(String(doc.filename)) === filename)
    .map((doc) => ({ id: doc.id as number, filename: String(doc.filename) }))
}
