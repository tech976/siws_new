import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import type { HeroBlock } from '@/payload-types'

import { type BlockBackground } from './Section'

const BACKGROUND_CLASS: Record<BlockBackground, string> = {
  white: 'bg-white',
  sea: 'bg-sea',
  tint: 'bg-brand-tint',
  brand: 'bg-brand',
}

/**
 * A page-opening banner.
 *
 * WITH A PHOTOGRAPH the picture fills the banner, blurred, with the words on
 * top of it.
 *
 * Four arrangements were tried before this one, and the reasons they failed
 * are worth keeping.
 *
 * A sharp photograph under type needed a 95%-opacity scrim to make the words
 * readable, which turned the banner muddy and wasted the picture. Blurring the
 * image instead removes the fine detail that fights with type, so the tint can
 * sit far lighter and the photograph still reads as a photograph.
 *
 * A two-column split needed its text column's padding computed so the words
 * landed on the same spine as the headings below; that held only while a
 * column percentage, a container width and a gutter all agreed, and it drifted
 * twice. A card overlapping the image had the same fault one level in — the
 * card's own padding pushed its text off the spine. Everything here is a plain
 * container child, so there is nothing left to drift.
 *
 * Figures stacked inside the text column made five elements compete for one
 * measure and read as cramped; they sit under a rule at the foot instead.
 *
 * WITHOUT A PHOTOGRAPH it falls back to type on the section's colour, so an
 * inner page that never gets a picture still opens properly.
 */
export const HeroBlockView = ({ block }: { block: HeroBlock }) => {
  const variant = (block.background ?? 'brand') as BlockBackground
  const links = block.links ?? []
  const highlights = (block.highlights ?? []).filter((entry) => entry.value?.trim())

  const accent = block.accentWord?.trim()
  const index = accent && block.title ? block.title.indexOf(accent) : -1

  const title =
    index >= 0 && accent ? (
      <>
        {block.title.slice(0, index)}
        <span className="heading-accent">{accent}</span>
        {block.title.slice(index + accent.length)}
      </>
    ) : (
      block.title
    )

  /* ---------------------------------------------------------------- no image */

  if (!block.image) {
    const inverted = variant === 'brand'
    return (
      <section
        data-invert={inverted ? 'true' : undefined}
        className={`relative isolate ${BACKGROUND_CLASS[variant] ?? BACKGROUND_CLASS.brand}`}
      >
        {/*
          CENTRED, like the banner that has a photograph.

          This branch used to range left while the photographic banner centred,
          so a visitor moving between a unit's home page and its inner pages
          met two different openings. The eyebrow is `inline-flex`, which is
          inline-level, so `text-center` on this container centres the pill
          itself rather than only the words inside it; the capped columns need
          `mx-auto` because a max-width block still sits at the left edge of
          its container however its text is aligned.
        */}
        <div className="siws-container py-16 text-center sm:py-24">
          {block.eyebrow ? (
            <p
              className={`inline-flex items-center rounded-pill border px-4 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase ${
                inverted ? 'border-white/30 text-accent' : 'border-line text-brand'
              }`}
            >
              {block.eyebrow}
            </p>
          ) : null}

          <h1 className="mx-auto mt-6 max-w-4xl text-balance">{title}</h1>

          {block.subtitle ? (
            /* The same three-step ladder as the banner above — see there. */
            <p
              className={`mx-auto mt-5 max-w-3xl text-center text-xl leading-snug font-semibold text-balance ${inverted ? "text-white" : "text-brand"}`}
            >
              {block.subtitle}
            </p>
          ) : null}

          {block.intro ? (
            <p
              className={`mx-auto mt-4 max-w-2xl text-center t-small leading-relaxed font-normal text-balance ${inverted ? "text-white/75" : "text-ink-muted"}`}
            >
              {block.intro}
            </p>
          ) : null}

          {links.length > 0 ? (
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {links.map((entry, i) => (
                <CMSLink key={entry.id ?? i} link={entry.link} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  /* -------------------------------------------------------------- with image */

  return (
    <section data-invert="true" className="relative isolate overflow-hidden">
      {/*
        The photograph fills the banner and is BLURRED, with the words on top.
        Blur is doing the work a heavy dark scrim used to do: it removes the
        fine detail that makes type hard to read, so the tint over it can stay
        light. An earlier version darkened the picture to 95% brand to
        guarantee contrast and the whole banner went muddy — blur buys the same
        legibility at a fraction of the darkening.

        `scale-110` is not decoration. A CSS blur samples past the element's
        edge and leaves a feathered, semi-transparent border; scaling the image
        beyond the frame pushes that artefact outside the visible area.
      */}
      <Media
        resource={block.image}
        sizes="100vw"
        priority
        fill
        className="absolute inset-0 -z-20 scale-110 object-cover object-[center_35%] blur-[3px]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-brand/85 via-brand/70 to-brand/55"
      />

      <div className="siws-container flex min-h-[32rem] flex-col items-center justify-center py-16 text-center sm:min-h-[36rem] sm:py-20">
        {block.eyebrow ? (
          <p className="inline-flex w-fit items-center rounded-pill border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.14em] text-white uppercase backdrop-blur-sm">
            {block.eyebrow}
          </p>
        ) : null}

        {/* Size from the global h1 scale; the tight leading is this banner's own,
            so a two-line title stays a block over the photograph. */}
        <h1 className="mt-7 leading-[1.06] tracking-tight text-balance">{title}</h1>

        {block.subtitle ? (
          /*
           * A LADDER IN THREE STEPS, and weight carries it as much as size.
           *
           * The subheading was 24px at normal weight against an 18px
           * description at normal weight — close enough in both that the two
           * read as one block of body copy and the eye had nothing to land on
           * after the heading. Semibold is what separates them: at a glance
           * the middle line is now plainly a statement, not the first
           * sentence of the paragraph under it.
           *
           * Heading 48 / subheading 26 / description 17, at weights 700 / 600
           * / 400. Both gaps are visible on their own, so the order survives
           * even where one of the two happens to run to a single line.
           */
          <p className="mx-auto mt-5 max-w-3xl text-center text-xl leading-snug font-semibold text-balance text-white">
            {block.subtitle}
          </p>
        ) : null}

        {block.intro ? (
          /* The bottom step: lighter weight, smaller, and dimmed. It supports
             the two lines above rather than competing with them. */
          <p className="mx-auto mt-4 max-w-2xl text-center t-small leading-relaxed font-normal text-balance text-white/75">
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
          <dl className="mt-14 w-full max-w-4xl grid grid-cols-1 gap-y-8 border-t border-white/25 pt-9 sm:grid-cols-3 sm:gap-x-10">
            {highlights.map((entry, i) => (
              <div key={entry.id ?? i} className="border-white/25 sm:border-l sm:first:border-l-0">
                <dt className="text-3xl leading-none whitespace-nowrap text-white sm:text-4xl">
                  {entry.value}
                </dt>
                {entry.label ? (
                  <dd className="mt-2.5 text-base font-medium text-white/75">{entry.label}</dd>
                ) : null}
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  )
}
