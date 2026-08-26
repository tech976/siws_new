import { loadEnv } from '@/utilities/load-env'
import { findMediaId } from '@/utilities/media-lookup'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Puts the photograph and its facts into the portal's opening banner.
 *
 * Saved as a DRAFT, deliberately. Every photograph SIWS has supplied so far
 * shows identifiable children, and `blockUnconsentedChildImages` refuses to
 * publish a page that uses one until a parental-consent record exists
 * (FR-PRV-11 / DPDPA 2023). A draft may use them, so the design can be
 * reviewed now and published the moment consent is recorded — which is the
 * order those two things should happen in anyway.
 *
 * The three facts are the ones the page already publishes in its statistics
 * band, so nothing new is claimed about the institution here.
 *
 * Run with:  npm run seed:portal-hero
 */

const HIGHLIGHTS = [
  { value: '1934', label: 'Serving Mumbai since' },
  { value: '90+', label: 'Years of educational legacy' },
  { value: 'KG–PG', label: 'A complete journey' },
]

/** The classroom photograph — the one that best reads as "a school", not a portrait. */
const IMAGE_FILENAME = 'kg-classroom-activity.jpg'

const run = async () => {
  const payload = await getPayload({ config })

  // Suffix-tolerant: `media/` is committed, so the stored row is very often
  // `kg-classroom-activity-1.jpg` rather than the name written above.
  const imageId = await findMediaId(payload, IMAGE_FILENAME)

  if (imageId === null) {
    payload.logger.error(`${IMAGE_FILENAME} is not in the media library. Run: npm run seed:media`)
    process.exit(1)
  }

  const { docs: pages } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'home' } }, { unit: { exists: false } }] },
    limit: 1,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })

  const page = pages[0]
  if (!page) {
    payload.logger.error('The portal home page does not exist. Run: npm run seed:institution')
    process.exit(1)
  }

  const layout = (page.layout ?? []).map((block) =>
    block.blockType === 'hero' ? { ...block, image: imageId, highlights: HIGHLIGHTS } : block,
  )

  if (!layout.some((block) => block.blockType === 'hero')) {
    payload.logger.error('The portal home page has no banner block to put the photograph in.')
    process.exit(1)
  }

  await payload.update({
    collection: 'pages',
    id: page.id,
    data: { layout },
    draft: true,
    overrideAccess: true,
  })

  payload.logger.info(`Draft updated — banner now uses ${IMAGE_FILENAME} with 3 facts.`)
  payload.logger.warn(
    'NOT PUBLISHED. This photograph shows identifiable children and has no parental-consent ' +
      'record, so publishing is blocked by design. Record consent (npm run record:consent) and ' +
      'publish the page from the admin panel.',
  )

  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
