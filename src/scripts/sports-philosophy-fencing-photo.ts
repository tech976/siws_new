import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { findMediaId } = await import('@/utilities/media-lookup')

/**
 * Puts a fencing photograph beside "Our philosophy" on the Sports page, and
 * changes nothing else.
 *
 * SIWS, 2026-10-16: "in the sports section here this image should change —
 * have fencing images we already have on the website". The photograph is
 * Devayani Balekar of the Junior College in her fencing whites with her
 * coach at the district competition (j2.jpeg, already in the library). The
 * district bout, the site's other fencing photograph, is the Fencing
 * spotlight further down the same page, so it is not used twice.
 *
 * Why not re-run `write-portal-sports-page.ts`: that rewrites every section,
 * and anything the office has changed on the live page since would go with
 * it. This reads the page as it is, swaps the one picture, and writes it
 * back. The writer script has been changed to match, so a later full run
 * gives the same result.
 *
 * Usage:  npx tsx src/scripts/sports-philosophy-fencing-photo.ts [--apply]
 */

const APPLY = process.argv.includes('--apply')
const PHOTO = 'j2.jpeg'
const HEADING = 'Our philosophy'

const main = async () => {
  const payload = await getPayload({ config })

  const photo = await findMediaId(payload, PHOTO)
  if (photo === null) throw new Error(`${PHOTO} is not in the media library. Nothing was changed.`)

  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'sports' } }, { unit: { exists: false } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = docs[0] as unknown as { id: number; layout?: Record<string, unknown>[] } | undefined
  if (!page) throw new Error('The main Sports page was not found. Nothing was changed.')

  const layout = page.layout ?? []
  const at = layout.findIndex(
    (block) => block.blockType === 'mediaText' && String(block.heading ?? '').trim() === HEADING,
  )
  if (at === -1) throw new Error(`No picture-and-text section headed “${HEADING}” on the Sports page. Nothing was changed.`)

  const current = layout[at]!.image
  if (current === photo) {
    console.log(`  “${HEADING}” already shows ${PHOTO}. Nothing to do.`)
    process.exit(0)
  }
  console.log(`  “${HEADING}”: picture #${String(current)} → #${photo} (${PHOTO})`)

  if (!APPLY) {
    console.log('  Nothing was written. Re-run with --apply to do it.')
    process.exit(0)
  }

  await payload.update({
    collection: 'pages',
    id: page.id,
    data: {
      layout: layout.map((block, i) => (i === at ? { ...block, image: photo } : block)),
      _status: 'published',
    } as never,
    overrideAccess: true,
  })
  console.log('  Written.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
