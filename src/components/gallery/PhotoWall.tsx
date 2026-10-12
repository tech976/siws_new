'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'

import { layWall } from '@/lib/photo-wall'

import { PhotoTile } from './PhotoTile'
import type { GalleryPhoto } from './types'

/**
 * The wall of photographs, and the animation that carries tiles between
 * filters.
 *
 * Every tile is the shape of its own photograph — `layWall` works out which
 * pictures share a row and how wide each one is, and is run again whenever
 * the filter changes what is on the wall. See `src/lib/photo-wall.ts`.
 *
 * WHY THIS IS FLIP AND NOT AN ANIMATION LIBRARY
 * ---------------------------------------------
 * Framer Motion's `layout` prop does exactly this and costs about 50 KB
 * gzipped on a site whose visitors are largely on phones on Indian mobile
 * data. The measurement below is the same technique that library uses,
 * written out: read every tile's box before React re-renders (First), read it
 * again after (Last), Invert the difference as a transform so the tile appears
 * not to have moved, then Play it back to zero. Thirty lines, no dependency,
 * and it degrades to an instant swap wherever the Web Animations API is
 * missing.
 *
 * Tiles are matched between the two reads by `data-photo`, so a photograph
 * that survives a filter change is animated from where it was, while one that
 * has just appeared simply fades in rather than flying from the corner.
 */
export const PhotoWall = ({
  photos,
  onOpen,
}: {
  photos: GalleryPhoto[]
  onOpen: (photo: GalleryPhoto) => void
}) => {
  const grid = useRef<HTMLUListElement>(null)
  const previous = useRef<Map<string, DOMRect>>(new Map())

  const placed = useMemo(
    () => layWall(photos.map((photo) => ({ media: photo.media, feature: photo.feature }))),
    [photos],
  )

  useLayoutEffect(() => {
    const node = grid.current
    if (!node) return

    const before = previous.current
    const tiles = [...node.querySelectorAll<HTMLElement>('[data-photo]')]

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    /*
     * SC 2.3.3. Someone who has asked their system for less movement gets the
     * new arrangement outright — the tiles are still all there, they simply do
     * not travel to get there.
     */
    if (!reduced && before.size > 0 && typeof node.animate === 'function') {
      for (const tile of tiles) {
        const id = tile.dataset.photo
        if (!id) continue
        const last = tile.getBoundingClientRect()
        const first = before.get(id)

        if (!first) {
          tile.animate(
            [
              { opacity: 0, transform: 'scale(0.94)' },
              { opacity: 1, transform: 'scale(1)' },
            ],
            { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          )
          continue
        }

        const dx = first.left - last.left
        const dy = first.top - last.top
        const sx = last.width === 0 ? 1 : first.width / last.width
        const sy = last.height === 0 ? 1 : first.height / last.height

        // A tile that has not actually moved is left alone, so a filter that
        // changes nothing about a tile does not make it twitch.
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) {
          continue
        }

        tile.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
            { transform: 'translate(0, 0) scale(1, 1)' },
          ],
          { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        )
      }
    }

    const next = new Map<string, DOMRect>()
    for (const tile of tiles) {
      if (tile.dataset.photo) next.set(tile.dataset.photo, tile.getBoundingClientRect())
    }
    previous.current = next
  }, [photos])

  return (
    <ul ref={grid} className="siws-wall">
      {photos.map((photo, index) => (
        <PhotoTile
          key={photo.id}
          photo={photo}
          tile={placed[index]!}
          eager={index < 4}
          onOpen={() => onOpen(photo)}
        />
      ))}
    </ul>
  )
}
