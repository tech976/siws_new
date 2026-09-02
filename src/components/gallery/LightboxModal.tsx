'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Media } from '@/components/Media'

import type { GalleryPhoto } from './types'

/**
 * The full-screen view.
 *
 * Built on `<dialog>` rather than a div with a high z-index. The element
 * brings the things a modal has to get right and which are tedious to
 * reimplement: the rest of the page becomes inert, focus is trapped inside,
 * Escape closes it, and it sits in the top layer so no stacking context on the
 * page can appear above it. What is added here is the backdrop click, the
 * arrow keys, and returning focus to the tile that opened it.
 */
export const LightboxModal = ({
  photo,
  onClose,
  onPrevious,
  onNext,
  position,
  total,
}: {
  photo: GalleryPhoto | null
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
  position: number
  total: number
}) => {
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    const node = dialog.current
    if (!node) return

    if (photo && !node.open) {
      opener.current = document.activeElement
      node.showModal()
      // The page behind must not scroll under the modal on iOS.
      document.body.style.overflow = 'hidden'
    } else if (!photo && node.open) {
      node.close()
    }
  }, [photo])

  useEffect(() => {
    if (photo) return
    document.body.style.overflow = ''
    /*
     * Focus goes back to the tile that was clicked, not to the top of the
     * document. Somebody who opened the twentieth photograph and closed it
     * should still be at the twentieth photograph.
     */
    const target = opener.current
    if (target instanceof HTMLElement) target.focus()
    opener.current = null
  }, [photo])

  useEffect(() => {
    if (!photo) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onPrevious()
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        onNext()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [photo, onPrevious, onNext])

  return (
    <dialog
      ref={dialog}
      /* `<dialog>` fires this on Escape and on `close()` alike. */
      onClose={onClose}
      onCancel={onClose}
      /*
       * Click outside to dismiss. The dialog's own box is the only child, so a
       * press whose target IS the dialog element landed on the backdrop.
       */
      onMouseDown={(event) => {
        if (event.target === dialog.current) onClose()
      }}
      aria-label={photo?.caption ?? 'Photograph'}
      className="siws-lightbox m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-brand-deep/85 backdrop:backdrop-blur-sm"
    >
      {photo ? (
        <div className="flex max-h-[92vh] w-[min(94vw,72rem)] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)] lg:flex-row">
          {/*
            The picture, on black so a portrait photograph letterboxes the way
            it would in any viewer rather than sitting on a white surround.
          */}
          <div className="relative flex min-h-[42vh] flex-1 items-center justify-center bg-black lg:min-h-[70vh]">
            <Media
              resource={photo.media}
              sizes="(min-width: 1024px) 60vw, 94vw"
              priority
              fill
              className="object-contain"
            />

            {total > 1 ? (
              <>
                <button
                  type="button"
                  onClick={onPrevious}
                  aria-label="Previous photograph"
                  className="absolute left-3 grid size-12 place-items-center rounded-full bg-white/90 text-brand shadow-card transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
                >
                  <ChevronLeft size={24} strokeWidth={2.4} />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  aria-label="Next photograph"
                  className="absolute right-3 grid size-12 place-items-center rounded-full bg-white/90 text-brand shadow-card transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
                >
                  <ChevronRight size={24} strokeWidth={2.4} />
                </button>
              </>
            ) : null}
          </div>

          {/* The side panel: what this picture is. */}
          <div className="flex w-full shrink-0 flex-col p-7 lg:w-80 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              {photo.category ? (
                <span className="inline-block rounded-pill bg-accent px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-brand-deep">
                  {photo.category}
                </span>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-sea text-brand transition-colors hover:bg-brand-tint focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
              >
                <X size={20} strokeWidth={2.4} />
              </button>
            </div>

            {photo.caption ? (
              <p className="mt-5 t-body leading-relaxed font-medium text-brand">
                {photo.caption}
              </p>
            ) : null}

            {photo.detail ? (
              <p className="mt-3 t-small leading-relaxed text-ink-soft">{photo.detail}</p>
            ) : null}

            {/*
              The alt text is shown here as well as read to a screen reader.
              It is the fullest description of the photograph anybody has
              written, and on a page whose captions are one line, it is the
              part that says what is actually happening.
            */}
            {photo.media.alt && photo.media.alt !== photo.caption ? (
              <p className="mt-3 t-small leading-relaxed text-ink-soft">
                {photo.media.alt}
              </p>
            ) : null}

            <p className="mt-auto pt-6 text-sm font-semibold tabular-nums text-ink-muted">
              {position} of {total}
            </p>
          </div>
        </div>
      ) : null}
    </dialog>
  )
}
