'use client'

import { useCallback, useState } from 'react'

import { Media } from '@/components/Media'
import { LightboxModal } from '@/components/gallery/LightboxModal'
import type { GalleryPhoto } from '@/components/gallery/types'
import type { Media as MediaDoc } from '@/payload-types'

export interface ArtPiece {
  id: string
  media: MediaDoc
  /** The school, from the caption's "Kindergarten · …" prefix. */
  label?: string
  caption?: string
}

/**
 * The student art gallery: a wall of whole photographs, each in its own
 * proportions — a column layout rather than a grid, so an upright rangoli and
 * a wide stage photograph are hung as they were taken instead of being cut to
 * the same box. Width and height come from the upload, so nothing shifts as
 * the images arrive.
 *
 * Each print opens the site's own lightbox, the one the photo library uses,
 * with the arrow keys for previous and next, and focus returned on close.
 */
const tall = (media: MediaDoc) =>
  typeof media.width === 'number' && typeof media.height === 'number' && media.height / media.width > 1.25

export const ArtGallery = ({ pieces }: { pieces: ArtPiece[] }) => {
  const [open, setOpen] = useState<number | null>(null)

  const photos: GalleryPhoto[] = pieces.map((piece) => ({
    id: piece.id,
    media: piece.media,
    caption: [piece.label, piece.caption].filter(Boolean).join(' · ') || undefined,
    category: piece.label ?? '',
    feature: false,
    showWhole: true,
  }))

  const close = useCallback(() => setOpen(null), [])
  const previous = useCallback(
    () => setOpen((at) => (at === null ? at : (at - 1 + pieces.length) % pieces.length)),
    [pieces.length],
  )
  const next = useCallback(
    () => setOpen((at) => (at === null ? at : (at + 1) % pieces.length)),
    [pieces.length],
  )

  return (
    <>
      <ul className="fa-wall">
        {pieces.map((piece, index) => (
          <li key={piece.id} className="fa-wall__item" data-reveal style={{ transitionDelay: `${(index % 4) * 70}ms` }}>
            <button
              type="button"
              className="fa-wall__button"
              onClick={() => setOpen(index)}
              aria-label={`View larger: ${piece.caption ?? piece.media.alt ?? 'photograph'}`}
            >
              <span className={`fa-mat block ${index % 3 === 0 ? 'fa-tilt-s' : ''}`}>
                {/*
                  Whole, at its own proportions — except a phone photograph
                  taller than 4:5, which would be a column on its own and
                  leave the others short. That one is cut to 4:5 about its
                  focal point; the lightbox shows it whole.
                */}
                {tall(piece.media) ? (
                  <span className="fa-mat__photo block aspect-[4/5]">
                    <Media
                      resource={piece.media}
                      fill
                      sizes="(min-width: 72rem) 280px, (min-width: 48rem) 33vw, 50vw"
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span className="fa-mat__photo block">
                    <Media
                      resource={piece.media}
                      sizes="(min-width: 72rem) 280px, (min-width: 48rem) 33vw, 50vw"
                      className="block h-auto w-full"
                    />
                  </span>
                )}
                {piece.label || piece.caption ? (
                  <span className="fa-wall__label">
                    {piece.label ? (
                      <strong className="mb-0.5 block text-[0.7rem] tracking-[0.08em] text-brand uppercase">
                        {piece.label}
                      </strong>
                    ) : null}
                    {piece.caption}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <LightboxModal
        photo={open === null ? null : (photos[open] ?? null)}
        onClose={close}
        onPrevious={previous}
        onNext={next}
        position={(open ?? 0) + 1}
        total={photos.length}
      />
    </>
  )
}
