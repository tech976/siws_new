import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import type { HeroMarqueeBlock, Media as MediaDoc } from '@/payload-types'

import { type BlockBackground } from './Section'

const BACKGROUND_CLASS: Record<BlockBackground, string> = {
  white: 'bg-white',
  sea: 'bg-sea',
  tint: 'bg-brand-tint',
  brand: 'bg-brand',
}

/**
 * How long one full pass takes, per row.
 *
 * Each row is a little slower than the one above it. Identical durations make
 * two rows read as one mechanism sliding in two pieces; a few seconds of
 * difference is enough for them to read as independent, and it is the cheapest
 * way to stop a marquee looking like a conveyor belt.
 *
 * These are long. A photograph should cross the screen at the speed of
 * something noticed at the edge of the eye, not something being watched — and
 * a hero that hurries is a hero that competes with its own heading.
 */
const DURATIONS: Record<string, string[]> = {
  calm: ['92s', '104s', '86s'],
  steady: ['64s', '73s', '60s'],
  brisk: ['44s', '51s', '41s'],
}

/**
 * A banner whose picture is a drifting wall of photographs.
 *
 * WHY THE PHOTOGRAPHS ARE HIDDEN FROM SCREEN READERS
 * --------------------------------------------------
 * The whole moving region carries `aria-hidden`. That is deliberate, and it is
 * the opposite of the decision the testimonial wall makes with the same
 * machinery.
 *
 * A quote is content: it exists only in that row, so hiding it would delete
 * it. These photographs are not — every one of them is in the Gallery, filed
 * by subject, with the same alt text and a lightbox to open it in. Announcing
 * forty alt texts here would put a recital of the entire photo library between
 * a screen-reader user and the first sentence of the page, to tell them
 * something the Gallery link tells them in four words.
 *
 * So the band is marked decorative and a single line names what it is and
 * where the photographs live. WCAG 2.1 SC 1.1.1: an image whose information is
 * available elsewhere in text is decorative here.
 *
 * MOTION, PAUSING AND REDUCED MOTION are all inherited from `.siws-marquee` in
 * globals.css — one CSS transform per row, no JavaScript, no measurement at
 * runtime, paused on hover and on focus-within, and replaced by a static
 * wrapped grid when the visitor has asked for less motion (SC 2.2.2, SC 2.3.3).
 */
export const HeroMarqueeBlockView = ({ block }: { block: HeroMarqueeBlock }) => {
  const variant = (block.background ?? 'white') as BlockBackground
  const inverted = variant === 'brand'
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
   * Only populated uploads survive. A row built from a deleted or
   * unreadable image would be a run of empty boxes sliding past, which is
   * worse than a shorter row.
   */
  const photos = (block.images ?? [])
    .map((entry) => entry.image)
    .filter((image): image is MediaDoc => typeof image === 'object' && image !== null)

  const rowCount = Math.min(Number(block.rows ?? '2') || 2, 3)
  const durations = DURATIONS[block.speed ?? 'calm'] ?? DURATIONS.calm!

  /*
   * Dealt round-robin rather than sliced into blocks.
   *
   * Slicing would put the first third of the library in row one and the last
   * third in row three — and because the library is ordered by section, that
   * means a row of nothing but Kindergarten above a row of nothing but Junior
   * College. Dealing puts a different school in every few tiles of every row,
   * which is the whole argument this banner is making.
   */
  const rows: MediaDoc[][] = Array.from({ length: rowCount }, () => [])
  photos.forEach((photo, i) => rows[i % rowCount]!.push(photo))

  const populated = rows.filter((row) => row.length > 0)

  return (
    <section
      data-invert={inverted ? 'true' : undefined}
      data-ground={variant}
      className={`relative isolate overflow-hidden ${BACKGROUND_CLASS[variant] ?? BACKGROUND_CLASS.white}`}
    >
      {/* ---------------------------------------------------------- the words */}
      <div className="siws-container pt-16 pb-12 text-center sm:pt-24 sm:pb-16">
        {block.eyebrow ? (
          <p
            className={`inline-flex w-fit items-center rounded-pill px-4 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase ${
              inverted
                ? 'border border-white/40 bg-white/10 text-white backdrop-blur-sm'
                : 'bg-brand-tint text-brand'
            }`}
          >
            {block.eyebrow}
          </p>
        ) : null}

        {/* The global h1 scale; the tight leading is this banner's own, so a
            two-line title stays one block rather than drifting apart. */}
        <h1
          className={`mt-7 leading-[1.06] tracking-tight text-balance ${inverted ? 'text-white' : ''}`}
        >
          {title}
        </h1>

        {/*
          The same three-step ladder the photographic hero uses — 700 / 600 /
          400 in weight, and a visible drop in size at each step, so the order
          survives even where one of the three runs to a single line.
        */}
        {block.subtitle ? (
          <p
            className={`mx-auto mt-5 max-w-3xl text-xl leading-snug font-semibold text-balance sm:text-[1.625rem] ${
              inverted ? 'text-white' : 'text-brand'
            }`}
          >
            {block.subtitle}
          </p>
        ) : null}

        {block.intro ? (
          <p
            className={`mx-auto mt-4 max-w-2xl text-[0.9375rem] leading-relaxed font-normal text-balance sm:text-[1.0625rem] ${
              inverted ? 'text-white/75' : 'text-ink-soft'
            }`}
          >
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
          <dl
            className={`mx-auto mt-12 grid w-full max-w-4xl grid-cols-1 gap-y-8 border-t pt-9 sm:grid-cols-3 sm:gap-x-10 ${
              inverted ? 'border-white/25' : 'border-line'
            }`}
          >
            {highlights.map((entry, i) => (
              <div
                key={entry.id ?? i}
                className={`sm:border-l sm:first:border-l-0 ${inverted ? 'border-white/25' : 'border-line'}`}
              >
                <dt
                  className={`text-3xl leading-none whitespace-nowrap sm:text-4xl ${
                    inverted ? 'text-white' : 'text-brand'
                  }`}
                >
                  {entry.value}
                </dt>
                {entry.label ? (
                  <dd className={`mt-1.5 text-sm ${inverted ? 'text-white/75' : 'text-ink-muted'}`}>
                    {entry.label}
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {/* --------------------------------------------------- the drifting wall */}
      {populated.length > 0 ? (
        <>
          <span className="sr-only">
            Photographs from across the four SIWS schools drift past here. Every one of them is in
            the Gallery, filed by subject.
          </span>

          <div aria-hidden="true" className="pb-16 sm:pb-20">
            <div className="grid gap-4 sm:gap-5">
              {populated.map((row, rowIndex) => (
                <div key={rowIndex} className="siws-marquee siws-marquee--photos">
                  <div
                    className="siws-marquee-track"
                    /*
                     * Rows alternate direction, so the second reads as moving
                     * against the first rather than trailing it.
                     */
                    data-direction={rowIndex % 2 === 1 ? 'right' : undefined}
                    style={{
                      ['--siws-marquee-duration' as string]: durations[rowIndex % durations.length],
                    }}
                  >
                    {/*
                      The row twice over. The second copy carries `aria-hidden`
                      inside an already-hidden region purely so the reduced-
                      motion rule in globals.css — which hides the duplicate —
                      still finds it.
                    */}
                    {[false, true].map((isCopy) => (
                      <ul
                        key={String(isCopy)}
                        className="flex gap-4 pr-4 sm:gap-5 sm:pr-5"
                        aria-hidden={isCopy ? 'true' : undefined}
                      >
                        {row.map((photo, i) => {
                          /*
                           * NO LAYOUT SHIFT, AND NO SQUASHED PHOTOGRAPHS.
                           *
                           * The tile's HEIGHT is fixed by the breakpoint and
                           * its WIDTH comes from the picture's own stored
                           * dimensions via `aspect-ratio`. The browser
                           * therefore knows the full size of every tile before
                           * a single byte of image arrives — nothing reflows on
                           * load — and each photograph keeps its true
                           * proportions instead of being forced into a
                           * uniform box.
                           *
                           * 3:2 is the fallback for a record written before
                           * Payload stored dimensions.
                           */
                          const ratio =
                            typeof photo.width === 'number' &&
                            typeof photo.height === 'number' &&
                            photo.width > 0 &&
                            photo.height > 0
                              ? `${photo.width} / ${photo.height}`
                              : '3 / 2'

                          return (
                            <li
                              key={`${photo.id}-${i}-${String(isCopy)}`}
                              className="relative h-36 shrink-0 overflow-hidden rounded-2xl bg-brand-tint ring-1 ring-line/50 sm:h-44 lg:h-52"
                              style={{ aspectRatio: ratio }}
                            >
                              <Media
                                resource={photo}
                                fill
                                /*
                                 * The tiles are a fixed height, so their width
                                 * is a few hundred pixels whatever the
                                 * viewport — a viewport-relative `sizes` would
                                 * make the browser fetch a full-width
                                 * derivative for a 300px tile.
                                 */
                                sizes="(min-width: 1024px) 320px, (min-width: 640px) 260px, 200px"
                                className="object-cover"
                              />
                            </li>
                          )
                        })}
                      </ul>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
