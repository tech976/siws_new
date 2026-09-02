import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { NewsGridBlock, Media as MediaDoc } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * The date, as a label rather than a sentence.
 *
 * Small, spaced and in the brand colour, so it reads as metadata at a glance
 * and never competes with the headline underneath it. Rendered as a `<time>`
 * only when it parses — "August 2024" does, "2024–25" does not, and a
 * `datetime` attribute holding something a machine cannot read is worse than
 * no attribute at all.
 */
const DateLabel = ({ value, className = '' }: { value: string; className?: string }) => (
  <p
    className={`text-[0.75rem] font-bold uppercase tracking-[0.14em] text-brand/70 ${className}`}
  >
    {value}
  </p>
)

/**
 * Latest news: one lead story across the width, the rest in a grid.
 *
 * THE SHAPE, AND WHY IT IS THIS SHAPE
 * -----------------------------------
 * A news list has one job a grid of equal cards cannot do: say what matters
 * most. Equal cards make every story the same size, so the reader has to read
 * all of them to find the one worth reading. The lead takes the full width and
 * roughly half of it in photograph, which is enough to carry a picture with
 * people in it at a size where faces are visible; everything after it is a
 * third of a row.
 *
 * TEXT RANGES LEFT, unlike the card grid this sits beside on other pages.
 * These carry two and three sentences, and centred copy costs the eye the
 * fixed left edge it returns to on every line. A caption can be centred; a
 * paragraph should not be.
 *
 * ROUNDING AND SPACE. `rounded-3xl` on both the photographs and the cards, and
 * a gap wider than the padding inside any card, so the row reads as separate
 * stories rather than one ruled block. The photograph is the largest thing in
 * every card because on a school news page the photograph IS the news — a
 * parent is looking for their own child before they read a word.
 */
export const NewsGridBlockView = ({ block }: { block: NewsGridBlock }) => {
  const items = (block.items ?? []).filter((item) => item.photo && typeof item.photo === 'object')
  if (items.length === 0) return null

  const [lead, ...rest] = items

  /*
   * One level below the section heading, so the outline never skips a rank
   * (WCAG 2.1 SC 1.3.1) — the same rule the card and feature-list blocks
   * follow, and for the same reason.
   */
  const StoryTitle = block.heading && block.headingLevel === 'h3' ? 'h4' : 'h3'

  return (
    <Section background={block.background as BlockBackground}>
      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
        className={block.intro ? 'mb-4' : 'mb-10'}
      />

      {block.intro ? (
        <RichText data={block.intro} className="mb-10 siws-centre mx-auto max-w-3xl" />
      ) : null}

      {lead ? (
        /*
         * The lead. Photograph and words side by side above `lg`, stacked
         * below it — at a phone's width a half-width photograph is a strip,
         * and half-width type is four words a line.
         */
        <article className="group grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="relative aspect-16/10 overflow-hidden rounded-3xl bg-brand-tint ring-1 ring-line/60">
            <Media
              resource={lead.photo as MediaDoc}
              fill
              sizes="(min-width: 1024px) 48vw, 100vw"
              priority
              className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
            />
          </div>

          <div className="min-w-0">
            {lead.date ? <DateLabel value={lead.date} className="mb-3" /> : null}
            <StoryTitle className="text-balance text-[1.5rem] font-bold leading-tight text-brand sm:text-[1.75rem]">
              {lead.title}
            </StoryTitle>
            {lead.summary ? (
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">{lead.summary}</p>
            ) : null}
          </div>
        </article>
      ) : null}

      {rest.length > 0 ? (
        /*
         * `mt-14` rather than the grid's own gap: the distance from the lead
         * down to the row below it has to be larger than the distance between
         * two cards in that row, or the lead reads as the first item of the
         * grid rather than as the story above it.
         */
        <ul className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((item, index) => (
            <li
              key={item.id ?? index}
              className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line shadow-[0_1px_2px_rgba(36,39,111,0.04),0_10px_28px_-16px_rgba(36,39,111,0.20)] transition-[transform,box-shadow] duration-300 ease-out hover:shadow-[0_2px_8px_rgba(36,39,111,0.10),0_22px_44px_-20px_rgba(36,39,111,0.32)] motion-safe:hover:-translate-y-1"
            >
              {/*
                3:2, not 4:3. At a third of a row a 4:3 crop is a thumbnail;
                the wider frame keeps the photograph the biggest thing in the
                card, which is the point of the layout.
              */}
              <div className="relative aspect-3/2 overflow-hidden bg-brand-tint">
                <Media
                  resource={item.photo as MediaDoc}
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                  className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.04]"
                />
              </div>

              <div className="flex flex-1 flex-col p-6">
                {item.date ? <DateLabel value={item.date} className="mb-2" /> : null}
                <StoryTitle className="text-balance text-[1.0625rem] font-bold leading-snug text-brand">
                  {item.title}
                </StoryTitle>
                {item.summary ? (
                  <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft">
                    {item.summary}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  )
}
