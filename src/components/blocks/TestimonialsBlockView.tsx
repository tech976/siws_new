import { Quote } from 'lucide-react'

import type { TestimonialsBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

type Entry = NonNullable<TestimonialsBlock['quotes']>[number]

/**
 * Below this the drifting rows are not worth having: two rows of two slide
 * past mostly empty track, which reads as something broken rather than as
 * motion. The grid is the better shape for a handful of quotes, and this is
 * the same judgement `GalleryBlockView` makes about looping a short row.
 */
const MARQUEE_MINIMUM = 4

const Card = ({ entry, showAttribution }: { entry: Entry; showAttribution: boolean }) => (
  <>
    <span aria-hidden="true" className="text-accent-deep">
      <Quote size={26} strokeWidth={2.5} />
    </span>

    {/*
      `<blockquote>` marks this as quoted speech, and the quotation marks are
      added by the `“”` below rather than being typed into the CMS — so an
      editor cannot end up with doubled quotes.
    */}
    <blockquote className="mt-3 flex-1 text-[1.02rem] leading-relaxed text-ink-soft">
      &ldquo;{entry.quote}&rdquo;
    </blockquote>

    {showAttribution && entry.attribution ? (
      <footer className="mt-5 border-t border-line pt-4">
        <cite className="block font-semibold not-italic text-brand">{entry.attribution}</cite>
        {entry.detail ? (
          <span className="mt-0.5 block text-sm text-ink-muted">{entry.detail}</span>
        ) : null}
      </footer>
    ) : null}
  </>
)

const CARD =
  'flex flex-col rounded-2xl border border-line bg-white p-6 shadow-[0_6px_15px_rgba(0,0,0,0.06)]'

/**
 * One drifting row.
 *
 * The quotes are listed twice. The first list is the real one; the second is a
 * copy carrying `aria-hidden`, there only so that when the track has travelled
 * half its width the copy sits exactly where the original began and the loop
 * has no seam. A screen reader hears each quote once.
 */
const Row = ({
  entries,
  direction,
  showAttribution,
}: {
  entries: Entry[]
  direction: 'left' | 'right'
  showAttribution: boolean
}) => {
  const list = (hidden: boolean) => (
    <ul className="flex gap-6 pr-6" aria-hidden={hidden ? 'true' : undefined}>
      {entries.map((entry, index) => (
        <li
          key={(entry.id ?? index) + (hidden ? '-copy' : '')}
          className={`${CARD} w-80 shrink-0 sm:w-96`}
        >
          <Card entry={entry} showAttribution={showAttribution} />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="siws-marquee -mx-5 px-5">
      <div className="siws-marquee-track" data-direction={direction}>
        {list(false)}
        {list(true)}
      </div>
    </div>
  )
}

export const TestimonialsBlockView = ({ block }: { block: TestimonialsBlock }) => {
  const quotes = block.quotes ?? []
  if (quotes.length === 0) return null

  /*
   * ONE ROW OR TWO.
   *
   * Two rows moving against each other read as drift and fill a wide section,
   * which is right for ten or more quotes. Eight split into four and four, and
   * four cards make a track barely wider than the viewport — so the loop point
   * comes round often enough to notice, and the section is twice as tall as
   * the quotes justify.
   *
   * A single row takes all eight, so the track is long, the loop is far away,
   * and the section is the height of one card. The minimum is the same: below
   * four quotes nothing drifts, it becomes a grid.
   */
  const single = block.layout === 'marquee-single'
  const drifting = (block.layout === 'marquee' || single) && quotes.length >= MARQUEE_MINIMUM
  // Defaults to showing it, so every block written before the field existed
  // reads exactly as it did.
  const showAttribution = block.showAttribution !== false

  return (
    <Section background={block.background as BlockBackground}>
      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
        className="mb-10"
      />

      {drifting && single ? (
        /*
         * Travelling LEFT, which is the direction reading English already
         * moves in — with one row there is no second row to move against, so
         * the only thing that makes it read as drift rather than as a control
         * is that it never stops and never snaps back.
         */
        <Row entries={quotes} direction="left" showAttribution={showAttribution} />
      ) : drifting ? (
        /*
         * Split down the middle rather than by odd and even, so the two rows
         * hold roughly equal track and neither runs out while the other is
         * still going.
         */
        <div className="grid gap-6">
          {/*
            Top row travels RIGHT, bottom row LEFT — the two moving against
            each other is what makes the pair read as drift rather than as a
            conveyor belt, and it is the way round SIWS asked for.
          */}
          <Row
            entries={quotes.slice(0, Math.ceil(quotes.length / 2))}
            direction="right"
            showAttribution={showAttribution}
          />
          <Row
            entries={quotes.slice(Math.ceil(quotes.length / 2))}
            direction="left"
            showAttribution={showAttribution}
          />
        </div>
      ) : (
        <ul
          className={`grid gap-6 ${
            quotes.length === 1
              ? 'max-w-2xl mx-auto'
              : quotes.length === 2
                ? 'sm:grid-cols-2'
                : 'sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {quotes.map((entry, index) => (
            <li key={entry.id ?? index} className={CARD}>
              <Card entry={entry} showAttribution={showAttribution} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
