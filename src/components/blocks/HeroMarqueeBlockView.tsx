import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import type { HeroMarqueeBlock, Media as MediaDoc } from '@/payload-types'

/**
 * How long the backdrop takes to move through the whole set, per photograph.
 *
 * The track runs from 0 to -50%, which is exactly one pass of the original
 * list, so the total is this multiplied by the number of photographs. Nine
 * seconds each is slow enough that a visitor reading the heading never catches
 * a picture changing under it.
 */
const SECONDS_PER_PHOTO: Record<string, number> = {
  calm: 9,
  steady: 7,
  brisk: 5,
}

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
   * With one photograph there is nothing to slide, so the banner falls back to
   * the still version of itself rather than animating a single panel.
   */
  const sliding = photos.length > 1
  const slides = sliding ? [...photos, ...photos] : photos

  const seconds = SECONDS_PER_PHOTO[block.speed ?? 'calm'] ?? SECONDS_PER_PHOTO.calm!
  const duration = `${seconds * Math.max(photos.length, 1)}s`

  return (
    <section data-invert="true" data-ground="brand" className="relative isolate overflow-hidden">
      {/* ------------------------------------------------ the sliding backdrop */}
      {photos.length > 0 ? (
        <div aria-hidden="true" className="siws-hero-slides absolute inset-0 -z-20">
          <div
            className="siws-hero-slides-track"
            style={{
              width: `${slides.length * 100}%`,
              ...(sliding ? { animationDuration: duration } : { animation: 'none' }),
            }}
          >
            {slides.map((photo, i) => (
              <div
                key={`${photo.id}-${i}`}
                className="relative h-full shrink-0"
                style={{ width: `${100 / slides.length}%` }}
              >
                <Media
                  resource={photo}
                  sizes="100vw"
                  /*
                   * Only the first is eager. It is the largest thing above the
                   * fold and so the LCP candidate; the rest are minutes away
                   * and have no business competing for bandwidth on first
                   * paint.
                   */
                  priority={i === 0}
                  fill
                  className="scale-110 object-cover object-[center_35%] blur-[3px]"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/*
        The same gradient the still hero uses, over whichever photograph is
        passing. It is what makes white type legible on all of them without
        anybody having to check each picture individually.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-brand/85 via-brand/70 to-brand/55"
      />

      {/* ----------------------------------------------------------- the words */}
      <div className="siws-container flex min-h-[32rem] flex-col items-center justify-center py-16 text-center sm:min-h-[36rem] sm:py-20">
        {block.eyebrow ? (
          <p className="inline-flex w-fit items-center rounded-pill border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-sm">
            {block.eyebrow}
          </p>
        ) : null}

        <h1 className="mt-7 leading-[1.06] tracking-tight text-balance">{title}</h1>

        {/*
          The three-step ladder the still hero established: 48 / 26 / 17 in
          size at 700 / 600 / 400 in weight. Both gaps are visible on their own,
          so the order survives where one of the three runs to a single line.
        */}
        {block.subtitle ? (
          <p className="mx-auto mt-5 max-w-3xl text-xl leading-snug font-semibold text-balance text-white sm:text-[1.625rem]">
            {block.subtitle}
          </p>
        ) : null}

        {block.intro ? (
          <p className="mx-auto mt-4 max-w-2xl text-[0.9375rem] leading-relaxed font-normal text-balance text-white/75 sm:text-[1.0625rem]">
            {block.intro}
          </p>
        ) : null}

        {links.length > 0 ? (
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            {links.map((entry, i) => (
              <CMSLink key={entry.id ?? i} link={entry.link} />
            ))}
          </div>
        ) : null}

        {highlights.length > 0 ? (
          <dl className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-y-8 border-t border-white/25 pt-9 sm:grid-cols-3 sm:gap-x-10">
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
    </section>
  )
}
