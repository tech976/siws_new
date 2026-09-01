'use client'

import { useEffect, useRef, useState } from 'react'

import { Media } from '@/components/Media'
import type { Media as MediaDoc } from '@/payload-types'

/** How long each photograph is held, and how long the crossfade takes. */
const DWELL_MS = 4500
const FADE_MS = 900

/**
 * The hero's photograph, crossfading.
 *
 * WHY THIS IS A CLIENT COMPONENT WHEN THE MARQUEES ARE NOT
 * --------------------------------------------------------
 * Every other moving thing on this site is pure CSS, and that was tried first
 * here. A staggered set of `@keyframes` can crossfade N images with negative
 * animation delays and no JavaScript at all — but the keyframe percentages
 * depend on N. Four photographs at 4.5s each is an 18s cycle in which each one
 * is visible for 25% of the track; five photographs makes it 20%. Percentages
 * inside `@keyframes` cannot read a custom property, so a CSS-only version
 * would hard-code a count the block lets an editor change.
 *
 * The progress indicator settles it. It has to fill over exactly the dwell of
 * the photograph currently showing and reset when the next one starts, which
 * is the index as state whether or not JavaScript is the thing holding it.
 *
 * WHAT IT COSTS: one `setInterval` at 4.5s and a re-render of four `<img>`
 * wrappers. The crossfade itself is a CSS `opacity` transition — compositor
 * work, no layout, no paint — so the animation does not touch React at all.
 *
 * THE WORDS ARE NOT IN HERE. They stay in the server component that renders
 * this, so nothing about them re-renders or re-animates when the picture
 * changes. That is the point of the split.
 */
export const HeroCarousel = ({ photos }: { photos: MediaDoc[] }) => {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  /*
   * Read once on mount rather than at module scope: this renders on the server
   * too, where `matchMedia` does not exist, and the value has to be the
   * visitor's own rather than the build machine's.
   */
  const [stillness, setStillness] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setStillness(query.matches)
    const onChange = () => setStillness(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const count = photos.length
  const running = count > 1 && !paused && !stillness

  /*
   * The timer is recreated whenever it stops or starts, so resuming after a
   * hover gives the photograph a full dwell rather than whatever was left of
   * the previous one — a picture that appears and vanishes half a second later
   * reads as a glitch.
   */
  const tick = useRef<() => void>(undefined)
  tick.current = () => setIndex((i) => (i + 1) % count)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => tick.current?.(), DWELL_MS)
    return () => window.clearInterval(id)
  }, [running, index])

  if (count === 0) return null

  return (
    <div
      /*
       * `aria-hidden`, like the still hero's photograph. These are decorative
       * here — every one is in the Gallery with its own alt text — and a
       * screen reader announcing four descriptions in front of the page's h1
       * would be reciting the picture library at somebody trying to read the
       * heading.
       */
      aria-hidden="true"
      className="absolute inset-0 -z-20"
      /*
       * Pointer events rather than mouse events, so a touch counts. Tapping
       * the banner holds the picture; tapping away releases it. `onFocus` is
       * not needed — nothing in here is focusable — but the section wrapping
       * this pauses on focus-within for the keyboard case.
       */
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      {photos.map((photo, i) => (
        <div
          key={photo.id}
          className="absolute inset-0"
          style={{
            opacity: i === index ? 1 : 0,
            /*
             * Reduced motion swaps rather than fades. The photograph still
             * changes — the information is not withheld — but nothing moves
             * across the screen while somebody is reading the heading over it.
             */
            transition: stillness ? 'none' : `opacity ${FADE_MS}ms ease-in-out`,
          }}
        >
          <Media
            resource={photo}
            sizes="100vw"
            /*
             * Only the first is eager: it is the LCP candidate. The rest are
             * fetched normally and are on screen long before they are needed,
             * because the first dwell is four and a half seconds.
             */
            priority={i === 0}
            fill
            /*
             * The still hero's exact treatment. Blur removes the fine detail
             * that fights with type so the tint above can stay light, and
             * `scale-110` pushes the feathered edge a CSS blur leaves outside
             * the frame.
             */
            className="scale-110 object-cover object-[center_35%] blur-[3px]"
          />
        </div>
      ))}

      {/* ------------------------------------------------------- indicators */}
      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2 sm:bottom-8">
          {photos.map((photo, i) => (
            <span
              key={photo.id}
              className="h-1 w-10 overflow-hidden rounded-pill bg-white/30 sm:w-12"
            >
              {/*
                The fill is a scaled span rather than an animated width:
                `transform` is composited, `width` is layout, and this runs for
                four and a half seconds of every four and a half.

                `key` carries the index so React replaces the node when the
                photograph changes, which restarts the animation from zero.
                Without that the bar would keep whatever progress it had.
              */}
              <span
                key={`${i}-${index}-${String(paused)}`}
                className="siws-hero-progress block h-full w-full origin-left rounded-pill bg-white"
                style={{
                  transform: i < index ? 'scaleX(1)' : i > index ? 'scaleX(0)' : undefined,
                  animation:
                    i === index && !stillness
                      ? `siws-hero-progress ${DWELL_MS}ms linear forwards`
                      : undefined,
                  animationPlayState: paused ? 'paused' : 'running',
                  ...(i === index && stillness ? { transform: 'scaleX(1)' } : {}),
                }}
              />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
