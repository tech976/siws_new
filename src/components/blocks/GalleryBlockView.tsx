import config from '@payload-config'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { GalleryBlock, Media as MediaDoc, Unit } from '@/payload-types'

import { GalleryCarousel } from './GalleryCarousel'
import { GalleryPager } from './GalleryPager'
import { headingAnchor } from '@/lib/anchor'
import { layWall } from '@/lib/photo-wall'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * Renders a photo gallery, as a grid or as a continuously looping row.
 *
 * The scrolling variant used to be `overflow-x: auto` with a thin scrollbar, a
 * pair of arrows and a line of text telling the visitor to scroll sideways. It
 * is now a row that loops by itself and can be dragged, swiped or scrolled —
 * see `GalleryCarousel` for how, and for how it stays usable for anyone who
 * cannot take the motion.
 *
 * It is still not a carousel library. A Swiper-style component would need
 * ~40 KB of JavaScript to reimplement behaviour the browser already has, and
 * would hide most of the photographs behind controls that screen readers
 * navigate poorly. What is scripted here is one `scrollLeft` advance per frame
 * and a mouse-drag handler; the touch feel, the momentum and the scrolling
 * itself are all still the browser's.
 */
/**
 * The wall layout: rows of photographs, each tile the shape of its picture.
 *
 * For a gallery page, where the photographs ARE the page. Nothing is cropped
 * to fit — `layWall` gives every tile its photograph's own proportions and
 * fills each row to both edges. See `src/lib/photo-wall.ts` for how, and for
 * the collage of fixed shapes this replaced.
 *
 * It is still stored as `bento`, the name the layout had as a collage. A
 * select's value is a column in the database, and renaming one for the sake
 * of the code would be a migration on a live site for no visible gain.
 *
 * Captions sit over the foot of each tile under a gradient rather than on a
 * card below it. On a wall the card would be the thing with the varying
 * height, and a row of tiles whose white strips all end at different points
 * reads as broken. The gradient is dark enough for white text at every tile
 * size and only covers the foot, so the photograph is still the tile.
 */
const WallGallery = ({ images }: { images: NonNullable<GalleryBlock['images']> }) => {
  const tiles = layWall(images.map((entry) => ({ media: entry.image as MediaDoc })))

  return (
    <ul className="siws-wall">
      {images.map((entry, index) => {
        const media = entry.image as MediaDoc
        const caption = entry.caption || media.caption
        const tile = tiles[index]!

        return (
          <li
            key={entry.id ?? index}
            style={tile.style}
            className="@container group relative overflow-hidden rounded-2xl bg-brand-tint ring-1 ring-line/60 shadow-[0_1px_2px_rgba(36,39,111,0.04),0_10px_28px_-14px_rgba(36,39,111,0.22)] transition-shadow duration-300 hover:shadow-[0_2px_6px_rgba(36,39,111,0.08),0_22px_46px_-18px_rgba(36,39,111,0.34)]"
          >
            {/*
              No zoom on hover. The tile is exactly the photograph's shape, so
              scaling the picture inside it would push its edges out of the
              frame — cropping, for as long as the pointer rested, the one
              thing this layout exists not to crop.
            */}
            <Media
              resource={media}
              sizes={tile.sizes}
              priority={index < 2}
              fill
              className={tile.measured ? 'object-cover' : 'object-contain'}
            />

            {/*
              THE SCRIM, SOFTENED (2026-09-02) — kept rather than removed. It was
              85% brand at the foot falling through 45%, which on the smaller
              tiles read as a painted band with an edge rather than as a fade.

              72% still carries white type over any photograph in the library —
              it is a contrast floor, not a taste decision, so it does not go
              lower — and the tall padding above the text is what does the real
              work: the same ink spread over more distance has no visible edge
              to it.

              SIZED TO THE TILE, not to the screen. An upright photograph gets
              a tile a third the width of a group photograph's in the same
              row, and a caption set for the wide one would bury the narrow
              one under six lines of type. So the tile is the container: a
              narrow tile gets smaller type held to four lines — which is the
              whole of nearly every caption in the library — and shows the
              rest under the pointer, and one too narrow to carry a caption
              at all keeps it for a screen reader only.
            */}
            {caption ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-deep/72 via-brand-deep/30 to-transparent p-3 pt-10 @max-[8rem]:sr-only @[14rem]:p-4 @[14rem]:pt-14">
                <p className="line-clamp-4 t-caption leading-snug font-medium text-balance text-white group-hover:line-clamp-none @[14rem]:line-clamp-none @[14rem]:text-[0.9375rem]">
                  {caption}
                </p>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export const GalleryBlockView = async ({
  block,
  unit,
  includeExtras = true,
  shown = [],
}: {
  block: GalleryBlock
  unit?: Unit | null
  /**
   * Photographs the rest of the page already shows, in any kind of block.
   *
   * A Sports page is built from the school's sports photographs, and those are
   * also filed under Sports — so a gallery added to it to catch new uploads
   * would open by repeating the page above it.
   */
  shown?: number[]
  /**
   * Whether to add photographs filed under this heading that the block does
   * not list. "Every other section" turns it off: it has already worked out
   * which photographs belong in each group, and letting the lookup run again
   * would put back the ones it deliberately left out.
   */
  includeExtras?: boolean
}) => {
  const stored = (block.images ?? []).filter(
    (entry) => entry.image && typeof entry.image === 'object',
  )

  /**
   * PHOTOGRAPHS ADDED SINCE THIS BLOCK WAS BUILT.
   *
   * The list above is written by `seed:galleries` and then frozen, so a teacher
   * who uploaded a photograph, filed it under this section and ticked "Include
   * in the photo gallery" saw nothing appear — the seed had to be re-run from
   * the command line before the wall knew the picture existed. That is not
   * something a school can be asked to do, and it is the one place on the site
   * where publishing did not publish.
   *
   * So the stored list is treated as the floor rather than the whole truth: it
   * renders exactly as before — nothing already live moves or disappears — and
   * anything newer carrying the same section is appended to it.
   *
   * Matching is by the block's own heading, which is what the seed names each
   * block after, so no new field is needed to join the two.
   */
  const extra = await (async () => {
    const section = block.heading?.trim()
    if (!section || !includeExtras) return []

    const known = new Set([
      ...shown,
      ...stored
        .map((entry) => (typeof entry.image === 'object' ? entry.image?.id : null))
        .filter((id): id is number => typeof id === 'number'),
    ])

    try {
      const payload = await getPayload({ config })

      const clauses: Where[] = [
        { category: { equals: section } },
        { showInGallery: { equals: true } },
      ]
      /*
       * A photograph with no school is shared by all four, so it belongs on
       * this wall as much as one filed to the school itself.
       */
      clauses.push(
        unit
          ? ({ or: [{ unit: { equals: unit.id } }, { unit: { exists: false } }] } as Where)
          : ({ unit: { exists: false } } as Where),
      )

      const { docs } = await payload.find({
        collection: 'media',
        where: { and: clauses },
        sort: '-createdAt',
        limit: 40,
        depth: 0,
        overrideAccess: false,
      })

      return docs
        .filter((doc) => !known.has(doc.id))
        .map((doc) => ({ id: `live-${doc.id}`, image: doc as MediaDoc, caption: doc.caption }))
    } catch {
      /*
       * A failed lookup leaves the wall exactly as it was built. A gallery
       * missing its newest photograph is a much smaller fault than a gallery
       * that fails to render at all.
       */
      return []
    }
  })()

  const images = [...stored, ...extra]

  if (images.length === 0) return null

  const isGrid = block.layout === 'grid'
  /**
   * 12 fills four rows of three on a desktop and reads as a complete page.
   * Only applied to the grid: the looping row shows everything by itself, and
   * paginating something that scrolls on its own would be two controls for one
   * job.
   */
  const perPageSetting = Number(block.perPage ?? '12')
  const perPage = perPageSetting > 0 ? perPageSetting : images.length

  /*
   * The card's INSIDE, with no list item around it.
   *
   * The grid needs each card to be an `<li>`, because it and `GalleryPager`
   * drop them straight into a `<ul>`. The carousel supplies its own `<li>`
   * around each card so that the two copies of the track are each a proper
   * list. Returning an `<li>` from here served the grid and gave the carousel
   * `<li>` inside `<li>` — invalid HTML, and React refused to hydrate it.
   */
  const cardBody = (entry: (typeof images)[number], index: number) => {
    const media = entry.image as MediaDoc
    const caption = entry.caption || media.caption

    return (
      <>
        {/*
          The ratio lives on this wrapper with the photograph filling it.
          `aspect-*` on the image itself is overridden by the base
          `img { height: auto }` rule, because `next/image` writes real width
          and height attributes — so a grid of mixed portrait and landscape
          uploads came out ragged, every tile a different height.
        */}
        {/*
          SQUARE, NOT 4:3.
          
          A single ratio has to hold both orientations, because the wall is one
          grid and a row of ragged heights is what the wrapper exists to
          prevent. 4:3 was the wrong one to pick: a phone photograph is 9:16,
          and forcing that into a landscape frame keeps two-fifths of its
          height and takes the crop out of the middle — which is where the
          faces are. Heads were being cut off across the top of the wall.

          A square keeps roughly three-quarters of a landscape photograph's
          width and well over half a portrait one's height, and it is wrong by
          the same amount in both directions rather than badly wrong in one.
          The grid, the gutters and the columns are unchanged.

          The real fix for any single photograph is its focal point, which
          `Media` already honours — fifteen carry one. This is what the other
          hundred and fifty-five get for free.
        */}
        <div className="relative aspect-square w-full overflow-hidden">
          <Media
            resource={media}
            sizes={
              isGrid
                ? '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw'
                : '(min-width: 1024px) 22rem, (min-width: 640px) 20rem, 17rem'
            }
            // Only the first image is likely above the fold.
            priority={index === 0}
            fill
            className="pointer-events-none object-cover transition-transform duration-500 select-none group-hover:scale-[1.06]"
          />
          {/*
            A gallery is the one place the photographs should be seen at full
            strength. The page's blue wash sat over every tile at 45% and
            flattened the whole wall to the same dull cast — the tint that ties
            a single feature image to the palette turns a grid of twelve into
            mud. It now appears only under the pointer, where it reads as a
            response to the visitor rather than as a filter over the picture.
          */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand/55 via-brand/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        </div>

        {caption ? (
          <p className="flex-1 px-5 py-4 text-[0.9375rem] leading-snug font-medium text-balance text-ink-soft">
            {caption}
          </p>
        ) : null}
      </>
    )
  }

  const GRID_CARD =
    'group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card'
  /*
   * `h-full` so a row of cards whose captions run to different lengths still
   * finishes level, and a lift on hover so a card the pointer has stopped on
   * separates from the ones sliding past it.
   */
  const CAROUSEL_CARD =
    'group flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line/70 shadow-[0_1px_2px_rgba(36,39,111,0.04),0_8px_24px_-12px_rgba(36,39,111,0.18)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_2px_4px_rgba(36,39,111,0.06),0_18px_40px_-16px_rgba(36,39,111,0.32)]'

  const gridCards = images.map((entry, index) => (
    <li key={entry.id ?? index} className={GRID_CARD}>
      {cardBody(entry, index)}
    </li>
  ))

  const loopCards = images.map((entry, index) => (
    <article key={entry.id ?? index} className={CAROUSEL_CARD}>
      {cardBody(entry, index)}
    </article>
  ))

  /*
   * An anchor derived from the heading, so one group on a gallery page can be
   * linked to directly — `/primary/gallery#onam-event` lands on the Onam
   * photographs rather than at the top of a page holding every group the
   * section has. The gallery seed builds one block per category, so this gives
   * every category a stable address without anything else having to name it.
   *
   * The slug comes from `headingAnchor` rather than being built here, because
   * `CMSLink` has to derive the SAME string from the anchor an editor typed.
   * Two copies of the rule in two files is one copy too many: they were in
   * fact already disagreeing on accents and on hyphens the editor typed, and a
   * fragment that matches no id fails silently.
   */
  return (
    <Section background={block.background as BlockBackground} id={headingAnchor(block.heading)}>
      {/*
        `mb-4` is the gap down to an INTRO, which then carries its own `mb-8`
        on to the photographs. A gallery with no intro was left with that 16px
        as the entire distance from its heading to the first tile, so the two
        touched — the third block on this site to be caught by the same wiring.
        Without an intro the heading takes the 40px the intro would have
        passed on.
      */}
      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
        className={block.intro ? 'mb-4' : 'mb-10'}
      />

      {block.intro ? (
        <RichText data={block.intro} className="mb-8 siws-centre mx-auto max-w-3xl" />
      ) : null}

      {block.layout === 'bento' ? (
        <WallGallery images={images} />
      ) : isGrid ? (
        images.length > perPage ? (
          <GalleryPager items={gridCards} perPage={perPage} />
        ) : (
          <ul className="siws-flow siws-flow-3 [--flow-gap:1.25rem]">{gridCards}</ul>
        )
      ) : images.length > 2 ? (
        <GalleryCarousel items={loopCards} label={block.heading ?? 'gallery'} />
      ) : (
        /*
         * Two photographs are not a loop. Sliding them past themselves for ever
         * is worse than simply showing them, so below the threshold the row
         * stays put and centres.
         */
        <ul className="mx-auto flex max-w-4xl justify-center gap-5">
          {loopCards.map((card, index) => (
            <li key={index} className="flex w-76 shrink-0 sm:w-84">
              {card}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
