'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Media } from '@/components/Media'
import type { Media as MediaDoc } from '@/payload-types'

/** How long each photograph is held, and how long one dissolves into the next. */
const DWELL_MS = 5000
const FADE_MS = 1200

/**
 * The portal banner: photography that changes without announcing it.
 *
 * WHAT IS MOVING, AND WHY EACH ONE EARNS IT
 * -----------------------------------------
 * Four things move here and nothing else. Each answers a different question,
 * which is the test any one of them had to pass to stay:
 *
 *   the dissolve   — atmosphere. A school is not one photograph, and a banner
 *                    that holds still for a minute is a poster of one morning.
 *   the drift      — life. A still photograph under a still headline reads as
 *                    a screenshot; 2% of scale over five seconds is under the
 *                    threshold of being noticed and over the threshold of
 *                    being felt.
 *   the parallax   — depth. The photography lags the page, so the banner
 *                    recedes rather than scrolling away, and the section under
 *                    it arrives as the next thing in one composition.
 *   the first rise — hierarchy. Heading, then the line under it, then the
 *                    button, each a breath apart, so the order is read before
 *                    it is parsed. Once. Never again.
 *
 * WHY SCROLL AND POINTER DO NOT USE REACT STATE
 * ---------------------------------------------
 * They write CSS custom properties straight onto the section inside a rAF
 * callback. A scroll handler that called `setState` would re-render this
 * component on every frame of every scroll — sixty times a second, to change
 * two numbers that only CSS reads. The properties feed `transform` and
 * `opacity` on two elements, so the browser does the work on the compositor
 * and React never hears about it.
 *
 * The carousel index is the one piece of real state, and it changes once every
 * five seconds.
 *
 * WHY THE WORDS ARE A CHILD AND NOT MARKUP
 * ----------------------------------------
 * `children` is rendered by the server component that uses this and handed
 * over as a prop. React sees the same element reference on every re-render, so
 * the whole text subtree is skipped — the heading cannot re-render, re-animate
 * or re-flow when a photograph changes. It is the reason the type sits
 * perfectly still through all of this.
 */
export const HeroStage = ({ photos, children }: { photos: MediaDoc[]; children: ReactNode }) => {
  const section = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [stillness, setStillness] = useState(false)

  /* Read on mount: this renders on the server, where matchMedia does not exist. */
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setStillness(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const count = photos.length
  const running = count > 1 && !paused && !stillness

  const advance = useRef<() => void>(undefined)
  advance.current = () => setIndex((i) => (i + 1) % count)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => advance.current?.(), DWELL_MS)
    return () => window.clearInterval(id)
  }, [running, index])

  /* ------------------------------------------------------------- parallax */
  useEffect(() => {
    const node = section.current
    if (!node || stillness) return

    let frame = 0
    const measure = () => {
      frame = 0
      const rect = node.getBoundingClientRect()
      /*
       * How far the banner has travelled off the top, as a fraction of its own
       * height. 0 while it is fully in place, 1 once it has gone. Clamped, so
       * over-scroll on iOS cannot push the transforms past their range.
       */
      const progress = Math.min(Math.max(-rect.top / Math.max(rect.height, 1), 0), 1)
      node.style.setProperty('--hero-p', progress.toFixed(4))
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [stillness])

  /* ------------------------------------------------------- pointer depth */
  useEffect(() => {
    const node = section.current
    if (!node || stillness) return

    /*
     * Desktop pointers only. On a touch screen there is no hover to respond
     * to, and a `pointermove` from a finger would shove the photograph
     * sideways at the exact moment somebody is trying to scroll past it.
     */
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    let frame = 0
    let x = 0
    let y = 0

    const apply = () => {
      frame = 0
      node.style.setProperty('--hero-mx', `${x.toFixed(2)}px`)
      node.style.setProperty('--hero-my', `${y.toFixed(2)}px`)
    }

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      /*
       * Six pixels at the very edge, nothing in the middle. Enough that the
       * photograph reads as sitting behind the words rather than printed on
       * them, and far too little to be mistaken for a tilting card.
       */
      x = ((event.clientX - rect.left) / rect.width - 0.5) * -12
      y = ((event.clientY - rect.top) / rect.height - 0.5) * -8
      if (!frame) frame = window.requestAnimationFrame(apply)
    }

    const onLeave = () => {
      x = 0
      y = 0
      if (!frame) frame = window.requestAnimationFrame(apply)
    }

    node.addEventListener('pointermove', onMove, { passive: true })
    node.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [stillness])

  return (
    <section
      ref={section}
      data-invert="true"
      data-ground="brand"
      data-still={stillness ? 'true' : undefined}
      className="siws-hero relative isolate overflow-hidden"
      /*
       * Holding a photograph is a pointer gesture, so it is bound here rather
       * than on the media: the words are part of the banner, and somebody who
       * has moved to read them has as much claim to a still picture as
       * somebody hovering the photograph itself.
       */
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      {/* ------------------------------------------------------ photography */}
      {count > 0 ? (
        <div aria-hidden="true" className="siws-hero-media absolute inset-0 -z-20">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className="absolute inset-0"
              style={{
                opacity: i === index ? 1 : 0,
                transition: stillness
                  ? 'none'
                  : `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            >
              {/*
                The drift is on its own layer because the photograph below it
                is already scaled — `scale-110` pushes the feathered edge a CSS
                blur leaves outside the frame, and animating the same transform
                would cancel it.

                Keyed on the index so the animation restarts as the photograph
                becomes the current one, and runs a little longer than the
                dwell so it is still moving all the way through the dissolve.
              */}
              <div
                key={`${photo.id}-${index === i}`}
                className={
                  i === index && !stillness
                    ? 'siws-hero-drift absolute inset-0'
                    : 'absolute inset-0'
                }
              >
                <Media
                  resource={photo}
                  sizes="100vw"
                  /*
                   * All four are in the document from the first paint and none
                   * is lazy: they occupy the viewport even at zero opacity, so
                   * the browser fetches them immediately and the second
                   * photograph is decoded long before its turn. There is
                   * nothing to flash.
                   */
                  priority={i === 0}
                  fill
                  className="scale-110 object-cover object-[center_35%] blur-[3px]"
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/*
        The brand gradient that makes white type legible on any photograph,
        and under it a foot of shade so the banner meets the section below as
        a darkening rather than an edge.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-brand/85 via-brand/70 to-brand/55"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-brand-deep/45"
      />

      {/* ----------------------------------------------------------- the words */}
      <div className="siws-hero-content">{children}</div>

      {/*
        THE ONLY INDICATOR: one hairline along the foot of the banner, filling
        over the life of the photograph above it.

        Not dots, not numbered, not a bar in a tray. It sits exactly where the
        banner already ends, so at rest it reads as the edge of the section
        rather than as a control — and the only thing it ever says is that
        something is about to change.
      */}
      {count > 1 && !stillness ? (
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-10 h-px bg-white/15">
          <div
            key={index}
            className="siws-hero-tick h-full w-full origin-left bg-white/55"
            style={{
              animationDuration: `${DWELL_MS}ms`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
          />
        </div>
      ) : null}
    </section>
  )
}
