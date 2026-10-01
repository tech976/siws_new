import config from '@payload-config'
import type { Unit } from '@/payload-types'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import { headingAnchor } from '@/lib/anchor'

import { GalleryBlockView } from './GalleryBlockView'

/**
 * Renders a gallery group for every section this page does not already show.
 *
 * It builds an EMPTY gallery block per remaining section and lets
 * `GalleryBlockView` fill it: that component already adds every published
 * photograph whose section matches its heading, so the two cannot drift apart
 * and there is one query shape to maintain rather than two.
 *
 * `covered` comes from the page's own blocks, passed in by `RenderBlocks` — a
 * block cannot see its siblings, and a section would otherwise appear twice on
 * a page that already has a gallery for it.
 */
export const GalleryRestBlockView = async ({
  unit,
  covered = [],
  startBackground = 'white',
}: {
  unit?: Unit | null
  /** Headings of the gallery blocks already on this page. */
  covered?: string[]
  /** So the bands keep alternating from whatever came before. */
  startBackground?: 'sea' | 'white'
}) => {
  const sections = await (async () => {
    try {
      const payload = await getPayload({ config })

      const where: Where = {
        and: [
          { showInGallery: { equals: true } },
          { category: { exists: true } },
          // A photograph with no school is shared by all four.
          unit
            ? ({ or: [{ unit: { equals: unit.id } }, { unit: { exists: false } }] } as Where)
            : ({ unit: { exists: false } } as Where),
        ],
      }

      const { docs } = await payload.find({
        collection: 'media',
        where,
        sort: '-createdAt',
        limit: 500,
        depth: 0,
        overrideAccess: false,
      })

      /*
       * Newest section first: a group added this term belongs above one from
       * two years ago, and `-createdAt` already has them in that order.
       */
      const names: string[] = []
      for (const doc of docs) {
        const name = typeof doc.category === 'string' ? doc.category.trim() : ''
        if (name && !names.includes(name)) names.push(name)
      }
      return names
    } catch {
      /*
       * A failed lookup leaves the page exactly as its own blocks render it.
       * A gallery short of its newest group is a smaller fault than one that
       * fails to render at all.
       */
      return []
    }
  })()

  const seen = new Set(covered.map((heading) => headingAnchor(heading)).filter(Boolean))
  const remaining = sections.filter((name) => !seen.has(headingAnchor(name)))
  if (remaining.length === 0) return null

  return (
    <>
      {remaining.map((name, index) => (
        <GalleryBlockView
          key={name}
          unit={unit}
          block={{
            id: `rest-${headingAnchor(name)}`,
            blockType: 'gallery',
            heading: name,
            headingLevel: 'h2',
            layout: 'bento',
            perPage: '12',
            images: [],
            background:
              (index % 2 === 0) === (startBackground === 'sea') ? 'sea' : 'white',
          }}
        />
      ))}
    </>
  )
}
