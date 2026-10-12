'use client'

import { Media } from '@/components/Media'
import type { WallTile } from '@/lib/photo-wall'

import type { GalleryPhoto } from './types'

/**
 * One photograph on the wall, in a tile that is exactly its own shape.
 *
 * The shape and the width come from `layWall` as custom properties and are
 * turned into a size by `.siws-wall`; nothing here decides how big the tile
 * is, and nothing here crops the picture to make it fit.
 */
export const PhotoTile = ({
  photo,
  tile,
  onOpen,
  /** The first few tiles are above the fold and are not lazily loaded. */
  eager,
}: {
  photo: GalleryPhoto
  tile: WallTile
  onOpen: () => void
  eager: boolean
}) => {
  return (
    <li
      /*
       * The id is what the layout animation matches tiles by across a filter
       * change — see `PhotoWall`. Without it the animation would have
       * nothing to tell "this tile moved" from "a different tile appeared".
       */
      data-photo={photo.id}
      style={tile.style}
      className={[
        // The tile is the container its caption is sized against.
        '@container group relative overflow-hidden rounded-2xl',
        // A document sits on white; a photograph on the tint that shows while
        // it loads and is then covered by the picture itself.
        photo.showWhole ? 'bg-white' : 'bg-brand-tint',
        'ring-1 ring-line/60 shadow-[0_1px_2px_rgba(36,39,111,0.04),0_10px_28px_-14px_rgba(36,39,111,0.22)]',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'hover:scale-[1.02] hover:shadow-[0_2px_8px_rgba(36,39,111,0.10),0_26px_50px_-18px_rgba(36,39,111,0.38)]',
        'focus-within:scale-[1.02]',
      ].join(' ')}
    >
      <Media
        resource={photo.media}
        sizes={tile.sizes}
        /*
         * `next/image` lazy-loads everything it is not told to prioritise, so
         * this one flag covers both halves of the requirement: the first four
         * tiles are above the fold and fetched eagerly, and the rest wait
         * until they are near the viewport.
         */
        priority={eager}
        fill
        /*
         * A document is padded off the tile edge, on white, so it reads as a
         * thing lying on a surface. A photograph fills its tile — which crops
         * nothing, because the tile is the photograph's own shape. Only a
         * record with no dimensions is fitted inside a tile whose shape had
         * to be guessed.
         *
         * The photograph does not zoom on hover: scaled up inside a tile its
         * own size, its edges would leave the frame.
         */
        className={
          photo.showWhole
            ? 'object-contain p-3 transition-transform duration-700 ease-out group-hover:scale-[1.03]'
            : tile.measured
              ? 'object-cover'
              : 'object-contain'
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
        className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 @[14rem]:p-5"
      >
        <span className="block text-xs font-bold uppercase tracking-[0.14em] text-accent">
          {photo.category}
        </span>
        {photo.caption ? (
          <span className="mt-1 line-clamp-4 t-small leading-snug font-medium text-balance text-white @[14rem]:line-clamp-none">
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
        className="absolute inset-0 size-full cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <span className="sr-only">
          {photo.caption ? `View: ${photo.caption}` : `View photograph from ${photo.category}`}
        </span>
      </button>
    </li>
  )
}
