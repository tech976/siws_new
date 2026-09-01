import { CMSLink } from '@/components/CMSLink'
import type { HeroMarqueeBlock, Media as MediaDoc } from '@/payload-types'

import { HeroStage } from './HeroStage'

/**
 * A page-opening banner whose background photograph slides.
 *
 * WHAT IT IS
 * ----------
 * The photographic hero, with more than one photograph. The treatment is
 * identical — the picture fills the banner, is blurred, is scaled past its own
 * frame, and carries the brand gradient over it — and the only difference is
 * that the pictures move.
 *
 * The blur does the work a heavy scrim used to do: it removes the fine detail
 * that makes type hard to read, so the tint over it can stay light. An earlier
 * hero darkened its picture to 95% brand to guarantee contrast and the whole
 * banner went muddy. `scale-110` is not decoration either — a CSS blur samples
 * past the element's edge and leaves a feathered border, and scaling beyond
 * the frame pushes that artefact out of sight.
 *
 * HOW THE SLIDE WORKS
 * -------------------
 * One flex track holding every photograph twice, each slide exactly the width
 * of the banner. The track is animated from 0 to -50%, at which point the
 * second copy sits precisely where the first began — so the loop has no seam
 * and nothing is measured at runtime.
 *
 * The widths are percentages OF THE TRACK rather than viewport units. `w-screen`
 * would have been simpler and wrong: `100vw` counts the scrollbar and the
 * banner does not, so every slide would sit a few pixels further out of
 * register than the last.
 *
 * It is one GPU-composited transform on one element — no JavaScript, no layout
 * work per frame. It pauses on hover and on focus, and reduced motion stops it
 * on the first photograph. Both rules live in `globals.css`.
 */
export const HeroMarqueeBlockView = ({ block }: { block: HeroMarqueeBlock }) => {
  const links = block.links ?? []
  const highlights = (block.highlights ?? []).filter((entry) => entry.value?.trim())

  const accent = block.accentWord?.trim()
  const at = accent && block.title ? block.title.indexOf(accent) : -1
  const title =
    at >= 0 && accent ? (
      <>
        {block.title.slice(0, at)}
        <span className="heading-accent">{accent}</span>
        {block.title.slice(at + accent.length)}
      </>
    ) : (
      block.title
    )

  /*
   * Only populated uploads survive — a deleted or unreadable image would slide
   * a blank panel through the banner, which reads as the page having broken.
   */
  const photos = (block.images ?? [])
    .map((entry) => entry.image)
    .filter((image): image is MediaDoc => typeof image === 'object' && image !== null)

  /*
   * EVERYTHING BELOW IS RENDERED ON THE SERVER AND HANDED TO `HeroStage` AS
   * CHILDREN.
   *
   * That is what keeps the type still. React sees the same element reference
   * every time the stage re-renders for a new photograph, so it skips this
   * whole subtree — the heading cannot re-render, re-animate or re-flow when
   * the picture behind it changes.
   *
   * The reveal classes run once, on load, and are staged a breath apart so the
   * order of the three lines is read before it is parsed.
   */
  return (
    <HeroStage photos={photos}>
      <div className="siws-container flex min-h-[32rem] flex-col items-center justify-center py-16 text-center sm:min-h-[36rem] sm:py-20">
        {block.eyebrow ? (
          <p className="siws-hero-rise inline-flex w-fit items-center rounded-pill border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-sm">
            {block.eyebrow}
          </p>
        ) : null}

        <h1
          className="siws-hero-rise mt-7 leading-[1.06] tracking-tight text-balance"
          style={{ animationDelay: '60ms' }}
        >
          {title}
        </h1>

        {/*
          The three-step ladder the still hero established: 48 / 26 / 17 in
          size at 700 / 600 / 400 in weight. Both gaps are visible on their own,
          so the order survives where one of the three runs to a single line.
        */}
        {block.subtitle ? (
          <p
            className="siws-hero-rise mx-auto mt-5 max-w-3xl text-xl leading-snug font-semibold text-balance text-white sm:text-[1.625rem]"
            style={{ animationDelay: '150ms' }}
          >
            {block.subtitle}
          </p>
        ) : null}

        {block.intro ? (
          <p
            className="siws-hero-rise mx-auto mt-4 max-w-2xl text-[0.9375rem] leading-relaxed font-normal text-balance text-white/75 sm:text-[1.0625rem]"
            style={{ animationDelay: '230ms' }}
          >
            {block.intro}
          </p>
        ) : null}

        {links.length > 0 ? (
          <div
            className="siws-hero-rise mt-9 flex flex-wrap justify-center gap-4"
            style={{ animationDelay: '310ms' }}
          >
            {links.map((entry, i) => (
              <CMSLink key={entry.id ?? i} link={entry.link} />
            ))}
          </div>
        ) : null}

        {highlights.length > 0 ? (
          <dl
            className="siws-hero-rise mt-14 grid w-full max-w-4xl grid-cols-1 gap-y-8 border-t border-white/25 pt-9 sm:grid-cols-3 sm:gap-x-10"
            style={{ animationDelay: '390ms' }}
          >
            {highlights.map((entry, i) => (
              <div key={entry.id ?? i} className="border-white/25 sm:border-l sm:first:border-l-0">
                <dt className="text-3xl leading-none whitespace-nowrap text-white sm:text-4xl">
                  {entry.value}
                </dt>
                {entry.label ? (
                  <dd className="mt-1.5 text-sm text-white/75">{entry.label}</dd>
                ) : null}
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </HeroStage>
  )
}
