'use client'

import { Media } from '@/components/Media'

import type { GalleryPhoto } from './types'

/**
 * The tile shapes, by position in the row.
 *
 * A repeating six-slot pattern rather than a size chosen per photograph. An
 * editor adding to a gallery is not deciding which picture deserves a big
 * tile, and asking them to would leave most walls all one size. Six is long
 * enough that the rhythm is not obvious over a dozen tiles and short enough to
 * stay even. `grid-flow-dense` then backfills whatever hole a tall tile leaves,
 * so a wall of any length finishes square instead of trailing off.
 *
 * A photograph marked as a feature overrides its slot and takes 2x2 wherever
 * it lands — that is the one per-picture decision worth offering.
 */
const SPAN = [
  'sm:col-span-2 sm:row-span-2',
  'sm:col-span-1 sm:row-span-1',
  'sm:col-span-1 sm:row-span-1',
  'sm:col-span-1 sm:row-span-2',
  'sm:col-span-2 sm:row-span-1',
  'sm:col-span-1 sm:row-span-1',
]

/**
 * What the browser is told to download for each tile. A two-column tile is
 * genuinely twice the width of a one-column tile, and telling it otherwise is
 * how a wall ends up either soft or four times heavier than it needs to be.
 */
const SIZES = [
  '(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
  '(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw',
]

const FEATURE_SPAN = 'sm:col-span-2 sm:row-span-2'
const FEATURE_SIZES = '(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw'

export const BentoCard = ({
  photo,
  slot,
  onOpen,
  /** The first few tiles are above the fold and are not lazily loaded. */
  eager,
}: {
  photo: GalleryPhoto
  slot: number
  onOpen: () => void
  eager: boolean
}) => {
  const span = photo.feature ? FEATURE_SPAN : SPAN[slot % SPAN.length]
  const sizes = photo.feature ? FEATURE_SIZES : SIZES[slot % SIZES.length]

  return (
    <li
      /*
       * The id is what the layout animation matches tiles by across a filter
       * change — see `BentoGridContainer`. Without it the animation would have
       * nothing to tell "this tile moved" from "a different tile appeared".
       */
      data-photo={photo.id}
      className={[
        'group relative overflow-hidden rounded-3xl',
        // A document sits on white; a photograph on the tint that shows while
        // it loads and is then covered by the picture itself.
        photo.showWhole ? 'bg-white' : 'bg-brand-tint',
        'ring-1 ring-line/60 shadow-[0_1px_2px_rgba(36,39,111,0.04),0_10px_28px_-14px_rgba(36,39,111,0.22)]',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'hover:scale-[1.02] hover:shadow-[0_2px_8px_rgba(36,39,111,0.10),0_26px_50px_-18px_rgba(36,39,111,0.38)]',
        'focus-within:scale-[1.02]',
        span,
      ].join(' ')}
    >
      <Media
        resource={photo.media}
        sizes={sizes}
        /*
         * `next/image` lazy-loads everything it is not told to prioritise, so
         * this one flag covers both halves of the requirement: the first four
         * tiles are above the fold and fetched eagerly, and the rest wait
         * until they are near the viewport.
         */
        priority={eager}
        fill
        /*
         * A document is shown WHOLE, and padded off the tile edge so it reads
         * as a thing lying on a surface rather than as a photograph that has
         * failed to fill its frame. Everything else covers, which is what
         * gives the wall its shapes.
         */
        className={
          photo.showWhole
            ? 'object-contain p-3 transition-transform duration-700 ease-out group-hover:scale-[1.03]'
            : 'object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]'
        }
      />

      {/*
        The scrim only appears on hover or focus. A gallery is the one place a
        photograph should be seen at full strength, and a permanent gradient
        over every tile flattens a whole wall to the same dull cast.
      */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-5 opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
      >
        <span className="block text-xs font-bold uppercase tracking-[0.14em] text-accent">
          {photo.category}
        </span>
        {photo.caption ? (
          <span className="mt-1 block text-[0.9375rem] leading-snug font-medium text-balance text-white">
            {photo.caption}
          </span>
        ) : null}
      </span>

      {/*
        THE WHOLE TILE IS THE BUTTON, and it is a real one.

        Stretched over the card with an inset ring for focus, so it is reached
        by Tab, fires on Enter and Space, and announces what it opens — none of
        which comes free from an onClick on the `<li>`. The accessible name
        carries the caption, because "image, button" tells somebody nothing
        about which of thirty-eight pictures they are about to open.
      */}
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 size-full cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <span className="sr-only">
          {photo.caption ? `View: ${photo.caption}` : `View photograph from ${photo.category}`}
        </span>
      </button>
    </li>
  )
}
