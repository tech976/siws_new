'use client'

import { Pause, Play } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

interface GalleryCarouselProps {
  /** Every card, ALREADY RENDERED on the server. */
  items: ReactNode[]
  /** Names the region for assistive technology and labels the pause button. */
  label: string
}

/**
 * A continuously looping row of photographs.
 *
 * WHY THIS REPLACED A SCROLLBAR. The row used to be `overflow-x: auto` with
 * `[scrollbar-width:thin]` and a line of text underneath telling the visitor to
 * scroll sideways. That works, but it asks: nothing moves until the visitor
 * discovers the affordance, and on a desktop with no touchpad gesture the
 * photographs past the third are effectively hidden behind a grey bar. A loop
 * shows every picture without being asked.
 *
 * WHY IT IS STILL NOT A CAROUSEL LIBRARY. The block this belongs to argued
 * against one for good reasons — ~40 KB of JavaScript to reimplement native
 * scrolling, and controls screen readers navigate poorly. None of that changes
 * here: the movement is a CSS transform on the compositor, this component holds
 * only a boolean, and the reduced-motion fallback is the plain scrollable row
 * it replaced, so nothing is lost for anyone who cannot take the motion.
 *
 * ACCESSIBILITY IS THE DESIGN PROBLEM, exactly as with the news ticker:
 *  - a real pause button, always visible, never a hover-only trick a keyboard
 *    or touch user can never reach (SC 2.2.2);
 *  - `prefers-reduced-motion` stops it before the first frame (SC 2.3.3);
 *  - hover or focus anywhere inside pauses it, so a visitor can finish looking
 *    at a photograph, and a keyboard user tabbing through is not carried along.
 *
 * Takes already-rendered items rather than raw data, like `GalleryPager`: each
 * `<Media>` is a Server Component that resolves its own derivatives, so the
 * image pipeline stays on the server and this component only decides whether
 * the track is moving.
 */
export const GalleryCarousel = ({ items, label }: GalleryCarouselProps) => {
  const [paused, setPaused] = useState(false)
  const regionId = useId()

  if (items.length === 0) return null

  /*
   * The second copy is what makes the loop seamless, and it is scenery: it is
   * hidden from assistive technology, or every photograph would be announced
   * twice.
   *
   * `aria-hidden` is enough on its own here — unlike the news ticker, a gallery
   * card holds a photograph and a caption and nothing focusable, so there is no
   * tab stop to remove. `inert` was tried and is worse than useless: React
   * renders `inert=""`, which the DOM reads as FALSE, so it does nothing at all
   * while warning about it on every render.
   */
  const copy = (keyPrefix: string, ariaHidden: boolean) => (
    <ul
      aria-hidden={ariaHidden ? 'true' : undefined}
      className="flex shrink-0 items-stretch gap-5 pr-5"
    >
      {items.map((item, index) => (
        <li key={`${keyPrefix}-${index}`} className="flex w-76 shrink-0 sm:w-84">
          {item}
        </li>
      ))}
    </ul>
  )

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/*
        The negative margin lets the row bleed to the viewport edge, which is
        what makes a loop read as continuing past the page rather than sitting
        in a box. The container's own padding is restored inside the mask.
      */}
      <div id={regionId} className="siws-carousel -mx-5 px-5 sm:-mx-8 sm:px-8">
        <div className="siws-carousel-track py-2" data-paused={paused ? 'true' : undefined}>
          {copy('a', false)}
          {copy('b', true)}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
          aria-controls={regionId}
          /* 44px target — SC 2.5.8. */
          className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-brand transition-colors hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
          <span className="sr-only">
            {paused ? `Resume the ${label} photographs` : `Pause the ${label} photographs`}
          </span>
        </button>
        <p className="text-sm text-ink-muted">
          {items.length} photographs. Hover or pause to look at one.
        </p>
      </div>
    </div>
  )
}
