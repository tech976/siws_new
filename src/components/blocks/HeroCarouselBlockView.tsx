'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import type { HeroCarouselBlock } from '@/payload-types'

/**
 * The banner carousel.
 *
 * Built on CSS scroll-snap rather than a JavaScript slider. The consequence is
 * that it is a horizontally scrollable list first and a carousel second: it
 * works before the JavaScript loads, it swipes natively on a phone, and the
 * arrows are an enhancement over something already usable. A transform-based
 * slider gives none of that and needs a keyboard implementation written by hand.
 *
 * Nothing moves on its own — see the note on the block for why.
 */
export const HeroCarouselBlockView = ({ block }: { block: HeroCarouselBlock }) => {
  const slides = (block.slides ?? [])
    .filter((slide) => slide.image)
    // The button is an array of at most one, so a slide may have none.
    .map((slide) => ({ ...slide, link: slide.cta?.[0]?.link ?? null }))
  const trackRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  const height =
    block.height === 'standard' ? 'h-[clamp(18rem,42vw,26rem)]' : 'h-[clamp(22rem,56vw,34rem)]'

  /** Reads the nearest slide from scroll position, so dots track a swipe too. */
  const syncActive = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const index = Math.round(track.scrollLeft / track.clientWidth)
    setActive(Math.max(0, Math.min(index, slides.length - 1)))
  }, [slides.length])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    track.addEventListener('scroll', syncActive, { passive: true })
    return () => track.removeEventListener('scroll', syncActive)
  }, [syncActive])

  const goTo = (index: number) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(index, slides.length - 1))
    track.scrollTo({
      left: clamped * track.clientWidth,
      // Honours the visitor's reduced-motion setting rather than always animating.
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  if (slides.length === 0) return null

  const multiple = slides.length > 1

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      className="siws-container py-6"
    >
      <div className="relative">
        <ul
          ref={trackRef}
          tabIndex={0}
          className={`flex ${height} snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
        >
          {slides.map((slide, index) => (
            <li
              key={slide.id ?? index}
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${slides.length}`}
              className="relative w-full shrink-0 snap-start"
            >
              <Media
                resource={slide.image}
                fill
                priority={index === 0}
                sizes="(min-width: 1240px) 1200px, 100vw"
                className="size-full object-cover"
              />

              {slide.title || slide.caption ? (
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  {/*
                    A solid panel rather than text straight on the photograph.
                    These captions run to two or three lines of real detail, and
                    contrast against an arbitrary uploaded image cannot be
                    guaranteed any other way.
                  */}
                  <div className="max-w-3xl rounded-xl bg-white/95 p-4 backdrop-blur-sm sm:p-5">
                    {slide.title ? <h2 className="card-title text-brand">{slide.title}</h2> : null}

                    {slide.caption ? (
                      <p
                        className={`text-sm leading-relaxed text-ink-soft  ${
                          slide.title ? 'mt-2' : ''
                        }`}
                      >
                        {slide.caption}
                      </p>
                    ) : null}

                    {slide.link ? <CMSLink link={slide.link} className="mt-3 inline-flex" /> : null}
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {multiple ? (
          <div className="mt-4 flex items-center justify-end gap-3">
            <ul className="mr-auto flex items-center gap-2">
              {slides.map((slide, index) => (
                <li key={slide.id ?? index}>
                  <button
                    type="button"
                    onClick={() => goTo(index)}
                    aria-current={index === active ? 'true' : undefined}
                    /* 44px hit area via padding, with a smaller visible dot —
                       SC 2.5.8 without a row of oversized circles. */
                    className="grid size-11 place-items-center"
                  >
                    <span
                      aria-hidden="true"
                      className={`block size-2.5 rounded-full transition-colors ${
                        index === active ? 'bg-accent-deep' : 'bg-line'
                      }`}
                    />
                    <span className="sr-only">Go to slide {index + 1}</span>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              className="grid size-11 place-items-center rounded-full bg-accent text-brand transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
              <span className="sr-only">Previous slide</span>
            </button>

            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active === slides.length - 1}
              className="grid size-11 place-items-center rounded-full bg-accent text-brand transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRight size={18} strokeWidth={2.5} />
              <span className="sr-only">Next slide</span>
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
