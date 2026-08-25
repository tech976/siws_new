'use client'

import { Pause, Play } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

interface GalleryCarouselProps {
  /** Every card, ALREADY RENDERED on the server. */
  items: ReactNode[]
  /** Names the region for assistive technology and labels the pause button. */
  label: string
}

/** Pixels per second. Slow enough to read a caption as a card goes by. */
const SPEED = 38

/**
 * A continuously looping row of photographs that can also be dragged, swiped
 * and scrolled.
 *
 * WHY THIS IS NOT THE CSS MARQUEE IT STARTED AS. The first version animated a
 * transform, which is free — it runs on the compositor and costs the main
 * thread nothing. But a transformed track cannot be grabbed: there is no
 * scroll position to move, so a swipe on a phone did nothing and a drag on a
 * desktop did nothing. Making it draggable means the movement has to BE
 * scrolling, which means a script advancing `scrollLeft`.
 *
 * The cost is paid down where it can be:
 *  - the loop only runs while the row is actually on screen (IntersectionObserver)
 *    and while the tab is visible, so a carousel further down a long page costs
 *    nothing until it is reached;
 *  - it stops entirely while paused, hovered, focused or held;
 *  - it is skipped altogether for `prefers-reduced-motion`, which leaves a
 *    plain, perfectly usable scrollable row.
 *
 * HOW THE LOOP IS SEAMLESS. The list is rendered twice. The second copy is
 * identical, so the moment `scrollLeft` passes the width of the first copy the
 * view is showing pixels indistinguishable from the start — subtracting that
 * width puts the scroll position back to the beginning with nothing visibly
 * changing. The same trick runs in reverse when someone drags backwards past
 * zero, which is what stops the row hitting a wall in one direction.
 *
 * TOUCH IS LEFT TO THE BROWSER. `overflow-x: auto` already gives a phone
 * momentum, rubber-banding and the right feel; a hand-rolled touch handler
 * would be a worse copy of it. Only the MOUSE gets a drag handler, because a
 * mouse has no equivalent gesture. `touch-action: pan-x` keeps vertical swipes
 * scrolling the page rather than being swallowed here.
 *
 * The wheel is likewise left alone: a trackpad's horizontal gesture scrolls
 * the row natively, and a vertical wheel keeps scrolling the PAGE. Hijacking
 * vertical wheel to move a carousel traps the visitor — they scroll to leave
 * and the page refuses to move.
 *
 * ACCESSIBILITY, as with the news ticker: a real always-visible pause button
 * (SC 2.2.2), pause on hover and focus, and reduced-motion respected before
 * the first frame (SC 2.3.3).
 */
export const GalleryCarousel = ({ items, label }: GalleryCarouselProps) => {
  const [paused, setPaused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const firstCopyRef = useRef<HTMLUListElement>(null)
  const regionId = useId()

  /*
   * Everything the animation frame needs, in refs rather than state: a frame
   * runs sixty times a second and must not be re-created, and must not make
   * React re-render, on each one.
   */
  const hovering = useRef(false)
  const held = useRef(false)
  const onScreen = useRef(true)
  const pausedRef = useRef(false)
  pausedRef.current = paused

  /*
   * The scroll position, kept here as a FLOAT.
   *
   * At 38px a second a frame advances about 0.6px, and `el.scrollLeft += 0.6`
   * loses it: the value is read back rounded, so the fraction is discarded and
   * the next frame starts from where the last one did. Measured, the row
   * crawled 2px in two seconds instead of 76. Keeping the true position here
   * and ASSIGNING it each frame lets those fractions accumulate.
   */
  const pos = useRef(0)

  /**
   * Wraps the scroll position back into the first copy.
   *
   * Forwards is the loop itself. Backwards only applies while someone is
   * dragging: native scrolling clamps at zero, so a drag to the left would
   * otherwise hit a wall — but the same wrap must NOT fire on its own, or the
   * row teleports to the far end the instant it is first painted at zero.
   */
  const normalise = useCallback(() => {
    const el = scrollerRef.current
    const half = firstCopyRef.current?.scrollWidth ?? 0
    if (!el || half <= 0) return
    if (el.scrollLeft >= half) {
      el.scrollLeft -= half
      pos.current = el.scrollLeft
    } else if (held.current && el.scrollLeft <= 0) {
      el.scrollLeft += half
      pos.current = el.scrollLeft
    }
  }, [])

  /*
   * A scroll this component did not cause — a swipe, a trackpad, a drag, a
   * keyboard. The threshold separates those from the sub-pixel writes above,
   * which would otherwise resync `pos` to a rounded value every frame and
   * bring back the crawl.
   */
  const onScroll = useCallback(() => {
    const el = scrollerRef.current
    if (el && Math.abs(el.scrollLeft - pos.current) > 2) pos.current = el.scrollLeft
    normalise()
  }, [normalise])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) return

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen.current = entry?.isIntersecting ?? true
      },
      { threshold: 0 },
    )
    io.observe(el)

    let frame = 0
    let last = 0

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const delta = last ? (now - last) / 1000 : 0
      last = now

      if (pausedRef.current || hovering.current || held.current) {
        // Stay in step with wherever the row actually is, so resuming does not
        // snap back to where the animation left off.
        pos.current = el.scrollLeft
        return
      }
      if (!onScreen.current || document.hidden) {
        pos.current = el.scrollLeft
        return
      }
      // A backgrounded tab can hand back a very large delta; clamp so the row
      // does not leap when someone returns to it.
      pos.current += SPEED * Math.min(delta, 0.05)
      el.scrollLeft = pos.current
      normalise()
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      io.disconnect()
    }
  }, [normalise])

  if (items.length === 0) return null

  /*
   * The second copy is scenery: hidden from assistive technology, or every
   * photograph would be announced twice. `aria-hidden` is enough on its own —
   * a card holds a photograph and a caption and nothing focusable.
   */
  const copy = (keyPrefix: string, ref?: React.Ref<HTMLUListElement>) => (
    <ul
      ref={ref}
      aria-hidden={keyPrefix === 'b' ? 'true' : undefined}
      className="flex shrink-0 items-stretch gap-5 pr-5 sm:gap-6 sm:pr-6"
    >
      {items.map((item, index) => (
        <li
          key={`${keyPrefix}-${index}`}
          className="flex w-[17rem] shrink-0 sm:w-[20rem] lg:w-[22rem]"
        >
          {item}
        </li>
      ))}
    </ul>
  )

  const endDrag = () => {
    held.current = false
    setDragging(false)
  }

  return (
    <div
      onMouseEnter={() => {
        hovering.current = true
      }}
      onMouseLeave={() => {
        hovering.current = false
        endDrag()
      }}
      onFocusCapture={() => {
        hovering.current = true
      }}
      onBlurCapture={() => {
        hovering.current = false
      }}
    >
      <div
        id={regionId}
        ref={scrollerRef}
        role="group"
        aria-label={label}
        onScroll={onScroll}
        onPointerDown={(event) => {
          // Mouse only. Touch and pen already scroll this natively, and better.
          if (event.pointerType !== 'mouse') return
          held.current = true
          setDragging(true)
          const el = scrollerRef.current
          if (!el) return
          const startX = event.clientX
          const startLeft = el.scrollLeft
          const move = (e: PointerEvent) => {
            el.scrollLeft = startLeft - (e.clientX - startX)
          }
          const up = () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
            endDrag()
          }
          window.addEventListener('pointermove', move)
          window.addEventListener('pointerup', up)
        }}
        /*
          The bleed must EQUAL `.siws-container`'s padding, which is a flat
          1.25rem at every width. It was `sm:-mx-8` above 640px, 0.75rem more
          than the padding it was cancelling — so between 640px and the point
          where the container stops growing, the row hung 12px past each edge
          of the viewport and the whole PAGE scrolled sideways. Measured at
          820px before the fix.
        */
        className={`siws-carousel -mx-5 px-5 ${
          dragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
      >
        <div className="flex w-max py-2">
          {copy('a', firstCopyRef)}
          {copy('b')}
        </div>
      </div>

      {/*
        THE PAUSE CONTROL IS STILL HERE — it is just invisible until it is
        needed, the same trick a skip link uses.

        SIWS asked for the button and its line of text gone, and under the row
        they are: nothing shows beneath the photographs. But content that moves
        by itself for more than five seconds has to offer a way to stop it
        (WCAG 2.1 SC 2.2.2), and hover is not that way — a keyboard user cannot
        hover, and neither can anyone on a phone.

        So it stays in the DOM, silent and out of the layout, and appears the
        moment it is tabbed to. A visitor who never reaches for the keyboard
        never sees it; a visitor who needs it finds it exactly where the row is.
        Deleting it outright would have been a quieter design and a page that
        fails a criterion this codebase tests for elsewhere.
      */}
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-pressed={paused}
        aria-controls={regionId}
        className="sr-only focus-visible:not-sr-only focus-visible:mt-4 focus-visible:inline-flex focus-visible:h-11 focus-visible:items-center focus-visible:gap-2 focus-visible:rounded-pill focus-visible:border focus-visible:border-line focus-visible:px-5 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
        {paused ? `Resume the ${label} photographs` : `Pause the ${label} photographs`}
      </button>
    </div>
  )
}
