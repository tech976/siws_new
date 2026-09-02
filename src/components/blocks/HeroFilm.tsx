'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Media } from '@/components/Media'
import { toImageSrc } from '@/lib/image-src'
import type { Media as MediaDoc } from '@/payload-types'

/**
 * The banner that is only a film.
 *
 * WHY THIS IS NOT A FLAG ON `HeroStage`
 * -------------------------------------
 * That banner exists to make white type legible over a photograph nobody has
 * seen yet: it blurs the picture, scales it past its own frame to hide the
 * blur's feathered edge, and lays a brand gradient over the result. Every one
 * of those is there to protect the words.
 *
 * With no words there is nothing to protect, and each becomes damage — a blur
 * that softens footage somebody filmed sharp, and a wash that recolours it.
 * Adding a "turn all of that off" switch would have left one component whose
 * two halves share no behaviour and disagree about what a banner is for. So
 * the film gets its own, and `HeroStage` keeps doing the one thing it is good
 * at.
 *
 * WHAT IS DELIBERATELY ABSENT
 * ---------------------------
 * No overlay, no blur, no drift, no parallax and no controls. The film is
 * shown at 16:9 — the ratio it was shot in — so nothing is cropped away on a
 * normal screen, and `object-cover` only starts trimming on a viewport tall
 * enough that the cap below is doing work.
 *
 * `muted` and `playsInline` are not preferences: without both, iOS refuses to
 * autoplay and Safari throws the film into its own fullscreen player.
 *
 * THE STILL IS NOT DECORATION
 * ---------------------------
 * It is the `poster`, so the banner is a photograph rather than a black
 * rectangle for as long as the first frames are downloading — and it is what
 * a visitor who has asked their system for reduced motion gets INSTEAD of the
 * film, rather than a film paused on an arbitrary frame they did not choose
 * (WCAG 2.1 SC 2.3.3).
 */
export const HeroFilm = ({ src, still }: { src: string; still?: MediaDoc | null }) => {
  const frame = useRef<HTMLElement>(null)
  const [stillness, setStillness] = useState(false)

  /* Read on mount: this renders on the server, where matchMedia does not exist. */
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setStillness(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  /*
   * ------------------------------------------------------ filling the screen
   *
   * The banner is meant to be exactly what is left of the viewport once the
   * masthead has taken its share: header and film together fill the screen,
   * and the section under them is the reward for scrolling.
   *
   * THE HEIGHT CANNOT BE WRITTEN DOWN, so it is measured. The masthead is four
   * stacked strips — the unit bar, the crest, the navigation and the tagline —
   * and its height is whatever the type, the logo and the wrapping come to at
   * that width. It is 297px on a 1440 desktop and neither that number nor any
   * other survives a phone, a 4K monitor, a browser at 80% zoom, or a visitor
   * who has set a larger default font size.
   *
   * So the film asks the page how far down it starts. Its own offset from the
   * top of the document IS everything above it, whatever that turns out to be.
   *
   * Re-measured on resize and once the webfonts land, because a masthead set
   * in a fallback face is a different height from the same masthead set in the
   * real one — and that swap happens after this first runs.
   *
   * NO FEEDBACK LOOP: changing this element's own height cannot change where
   * it starts, so a measurement can never invalidate itself.
   */
  const [offset, setOffset] = useState<number | null>(null)

  useLayoutEffect(() => {
    const node = frame.current
    if (!node) return

    const measure = () => {
      const top = node.getBoundingClientRect().top + window.scrollY
      /*
       * A guard, not an optimisation. This block is normally the first thing
       * on the page, but nothing stops an editor putting it halfway down one —
       * and there `100svh minus most of the page` is a negative number. Past
       * half the viewport the intent cannot be "fill the rest of the screen"
       * any more, so it stops trying and keeps its own proportions.
       */
      setOffset(top > window.innerHeight * 0.5 ? null : top)
    }

    measure()
    window.addEventListener('resize', measure, { passive: true })
    document.fonts?.ready.then(measure).catch(() => {})
    return () => window.removeEventListener('resize', measure)
  }, [])

  const poster = still && typeof still.url === 'string' ? toImageSrc(still.url) : undefined

  return (
    <section
      ref={frame}
      data-ground="brand"
      className="relative w-full overflow-hidden bg-brand-deep"
    >
      {/*
        `100svh` rather than `100vh`: on a phone `vh` is measured against the
        viewport with the address bar RETRACTED, so a 100vh banner is taller
        than the screen until the visitor scrolls, and its bottom sits under the
        browser chrome until they do. `svh` is the height actually visible at
        rest, which is the one being divided up here.

        The fallback in the `var()` is what renders for the single frame before
        the measurement lands, and on the server. 18rem is close to a desktop
        masthead, so the correction is small rather than a lurch.

        `min-h` is the floor: on a landscape phone the masthead can be most of
        the screen, and without it the film would be squeezed to a letterbox
        slot a few dozen pixels tall.

        WHAT `object-cover` DOES HERE. The remaining space is wider than 16:9 —
        about 2.4:1 on a laptop — so the film fills the width and is trimmed top
        and bottom rather than being letterboxed into black bars. That trim is
        the only thing that changes between screens; the film is never scaled
        up beyond its own size, so it cannot look zoomed.
      */}
      <div
        className="relative h-[calc(100svh-var(--film-offset,18rem))] max-h-[100svh] min-h-[22rem] w-full"
        style={offset === null ? undefined : ({ '--film-offset': `${offset}px` } as React.CSSProperties)}
      >
        {stillness ? (
          still ? (
            <Media resource={still} sizes="100vw" fill priority className="object-cover" />
          ) : null
        ) : (
          <video
            key={src}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={poster}
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={src} type="video/mp4" />
          </video>
        )}
      </div>
    </section>
  )
}
