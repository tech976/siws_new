import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { GalleryBlock, Media as MediaDoc } from '@/payload-types'

import { GalleryCarousel } from './GalleryCarousel'
import { GalleryPager } from './GalleryPager'
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
   * Headings come from staff-entered category names, so the slug is built by
   * stripping rather than trusting: anything that is not a letter, digit or
   * space becomes nothing, and runs of whitespace become a single dash.
   */
  const anchorId = block.heading
    ? block.heading
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-') || undefined
    : undefined

  return (
    <Section background={block.background as BlockBackground} id={anchorId}>
      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
        className="mb-4"
      />

      {block.intro ? (
        <RichText data={block.intro} className="mb-8 siws-centre mx-auto max-w-3xl" />
      ) : null}

      {isGrid ? (
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
