import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { GalleryBlock, Media as MediaDoc } from '@/payload-types'

import { GalleryCarousel } from './GalleryCarousel'
import { GalleryPager } from './GalleryPager'
import { headingAnchor } from '@/lib/anchor'

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
/*
 * The shape of each tile in the collage, by position.
 *
 * A repeating pattern rather than a size chosen per photograph: an editor
 * uploading to a gallery page is not deciding which picture deserves a big
 * tile, and asking them to would leave most galleries all one size anyway.
 * Six is long enough that the rhythm is not obvious over a dozen tiles and
 * short enough to stay even.
 *
 * `grid-flow-dense` then backfills any hole a tall tile leaves, so a gallery
 * of any length finishes square instead of trailing off with a gap.
 */
const BENTO_SPAN = [
  'sm:col-span-2 sm:row-span-2',
  'sm:col-span-1 sm:row-span-1',
  'sm:col-span-1 sm:row-span-1',
  'sm:col-span-1 sm:row-span-2',
  'sm:col-span-2 sm:row-span-1',
  'sm:col-span-1 sm:row-span-1',
]

/*
 * What the browser is told to download for each tile. A two-column tile on a
 * desktop is genuinely twice the width of a one-column tile, and telling it
 * otherwise is how a collage ends up either soft or four times heavier than
 * it needs to be.
 */
/*
 * A FIVE-PICTURE WALL TILES EXACTLY; the repeating pattern above does not.
 *
 * Those six spans cover 4+1+1+2+2 = ten cells over their first five entries,
 * and ten does not divide into a four-column grid: the collage came out two
 * cells short of square with a hole in the bottom corner, which reads as a
 * picture that failed to load rather than as a considered shape.
 *
 * One big tile and four small ones is 4+1+1+1+1 = eight, which is two full
 * rows of four. Five is a common enough set — a prize-giving and the pictures
 * around it — to be worth its own arrangement.
 */
const BENTO_SPAN_FIVE = [
  'sm:col-span-2 sm:row-span-2',
  'sm:col-span-1 sm:row-span-1',
  'sm:col-span-1 sm:row-span-1',
  'sm:col-span-1 sm:row-span-1',
  'sm:col-span-1 sm:row-span-1',
]

const BENTO_SIZES_FIVE = [
  '(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
]

const BENTO_SIZES = [
  '(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
  '(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
]

/**
 * The collage layout: mixed-size tiles on a dense grid.
 *
 * For a gallery page, where the photographs ARE the page. The grid layout is
 * an even chequerboard, which is right for an album a visitor scans and flat
 * for a page whose whole job is to show a school off.
 *
 * Captions sit over the foot of each tile under a gradient rather than on a
 * card below it. On a collage the card would be the thing with the varying
 * height, and a wall of tiles whose white strips all end at different points
 * reads as broken. The gradient is dark enough for white text at every tile
 * size and only covers the bottom third, so the photograph is still the tile.
 */
const BentoGallery = ({ images }: { images: NonNullable<GalleryBlock['images']> }) => (
  /*
   * The row height is TALLER on a phone, not shorter.
   *
   * Below `sm` the spans do not apply, so every tile is one column by one
   * row — and at 9rem that made eleven 350x144 letterboxes with the caption
   * filling a third of each. A single-column collage is really a stack of
   * photographs, and a photograph wants height. 13rem gives roughly 3:2, and
   * the rows can shrink again from `sm` up, where a two-row span is available
   * to compensate.
   */
  <ul className="grid auto-rows-[13rem] grid-flow-dense grid-cols-1 gap-4 sm:auto-rows-[10rem] sm:grid-cols-3 lg:auto-rows-[11rem] lg:grid-cols-4">
    {images.map((entry, index) => {
      const media = entry.image as MediaDoc
      const caption = entry.caption || media.caption
      const exact = images.length === 5
      const spans = exact ? BENTO_SPAN_FIVE : BENTO_SPAN
      const sizes = exact ? BENTO_SIZES_FIVE : BENTO_SIZES
      const slot = index % spans.length

      return (
        <li
          key={entry.id ?? index}
          className={`group relative overflow-hidden rounded-3xl bg-brand-tint ring-1 ring-line/60 shadow-[0_1px_2px_rgba(36,39,111,0.04),0_10px_28px_-14px_rgba(36,39,111,0.22)] transition-shadow duration-300 hover:shadow-[0_2px_6px_rgba(36,39,111,0.08),0_22px_46px_-18px_rgba(36,39,111,0.34)] ${spans[slot]}`}
        >
          <Media
            resource={media}
            sizes={sizes[slot]}
            priority={index < 2}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />

          {/*
            THE SCRIM, SOFTENED (2026-09-02) — kept rather than removed. It was
            85% brand at the foot falling through 45%, which on the smaller
            tiles read as a painted band with an edge rather than as a fade.

            72% still carries white type over any photograph in the library —
            it is a contrast floor, not a taste decision, so it does not go
            lower — and the taller `pt-14` is what does the real work: the same
            ink spread over more distance has no visible edge to it.
          */}
          {caption ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-deep/72 via-brand-deep/30 to-transparent p-4 pt-14">
              <p className="t-small leading-snug font-medium text-balance text-white">
                {caption}
              </p>
            </div>
          ) : null}
        </li>
      )
    })}
  </ul>
)

export const GalleryBlockView = ({ block }: { block: GalleryBlock }) => {
  const images = (block.images ?? []).filter(
    (entry) => entry.image && typeof entry.image === 'object',
  )

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
        <div className="relative aspect-[4/3] w-full overflow-hidden">
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
          <p className="flex-1 px-5 py-4 t-small leading-snug font-medium text-balance text-ink-soft">
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
        <BentoGallery images={images} />
      ) : isGrid ? (
        images.length > perPage ? (
          <GalleryPager items={gridCards} perPage={perPage} />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{gridCards}</ul>
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
