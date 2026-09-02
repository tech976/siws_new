import Link from 'next/link'

import { RichText } from '@/components/RichText'
import type { UnitLinksBlock, Unit } from '@/payload-types'
import { accentHex } from '@/theme/tokens'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * A pastel of the school's own accent, mixed with white.
 *
 * Computed rather than picked, so the four cards are guaranteed to be the same
 * WEIGHT of tint as each other — four hand-chosen pastels never are, and the
 * odd one out reads as a mistake. It also means a fifth school added later
 * gets its card colour from the accent it already has, with nobody choosing
 * anything.
 *
 * Done here and not with `color-mix` in CSS because the value is inline: a
 * computed hex is one string in the style attribute and works everywhere,
 * where `color-mix` would leave the card white on any browser that lacks it.
 */
const pastel = (hex: string, strength: number): string => {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const value = Number.parseInt(full, 16)
  if (!Number.isFinite(value)) return '#ffffff'

  const mix = (channel: number) => Math.round(channel + (255 - channel) * (1 - strength))
  const r = mix((value >> 16) & 255)
  const g = mix((value >> 8) & 255)
  const b = mix(value & 255)
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
}

/**
 * The four schools as one journey, Kindergarten through to Junior College.
 *
 * WHY THIS IS NOT A ROW OF CARDS ANY MORE
 * ---------------------------------------
 * It was four identical bordered cards, each with a photograph, a tagline and
 * a thirty-word description set justified — about a hundred and twenty words
 * of near-identical prose across a single row. Every card said "Maharashtra
 * State Board" and every card ended "Visit site", so nothing on the row told a
 * parent which school was theirs except the name at the top, and the name was
 * the smallest confident thing on the card.
 *
 * The information here is a SEQUENCE — a parent arrives knowing their child's
 * age, not the name of a school — so the section is now built as one. A rule
 * runs through all four stages with a marker on it at each, numbered 01 to 04,
 * and the type does the work the card boxes were doing: the school's name is
 * the largest thing in its column, the grade range sits under it, and one line
 * says what the stage is for. The rest is tags.
 *
 * There are no boxes and no shadows. Four rectangles side by side read as four
 * of the same thing; four columns hanging off one line read as four steps of
 * one thing, which is what they are.
 */
export const UnitLinksBlockView = ({
  block,
  units,
}: {
  block: UnitLinksBlock
  units: Unit[]
}) => {
  if (units.length === 0) return null

  /*
   * The portal's own short copy, looked up per school. `unit` on a stage is a
   * relationship with `maxDepth: 0`, so it arrives as an id rather than a
   * populated document.
   */
  const stageFor = (unit: Unit) =>
    (block.stages ?? []).find((stage) => {
      const id = typeof stage.unit === 'object' && stage.unit !== null ? stage.unit.id : stage.unit
      return String(id) === String(unit.id)
    })

  return (
    <Section background={block.background as BlockBackground}>
      <div className="siws-centre mx-auto max-w-2xl text-center">
        <SectionHeading
          heading={block.heading}
          accentWord={block.accentWord}
          level={block.headingLevel}
          className="mb-3"
        />
        {block.intro ? <RichText data={block.intro} /> : null}
      </div>

      {/*
        `<ol>`, not `<ul>`. The order is the information — this is the sequence
        a child moves through — and a screen reader saying "list item 2 of 4"
        is telling somebody the same thing the rule and the numbers tell a
        sighted reader.
      */}
      {/*
        The rule lives OUTSIDE the list.
        
        It was a `<span>` among the `<li>`s, which is not valid inside an
        `<ol>` and, worse, counted: the list held five children, so assistive
        technology announced four schools as "5 items" and the browser's own
        numbering ran one ahead of the numerals on the page. A wrapper costs a
        div and keeps the list to the four things that are actually in it.
      */}
      <div className="relative mt-14 lg:mt-16">
        {/*
          THE RULE THE MARKERS SIT ON.

          Horizontal from `lg`, where the four stages are one row. Below that
          they stack, and a horizontal line through a stacked list would mean
          nothing — so it turns and runs down the left instead, which is the
          same journey read the only way a narrow screen can read it.

          It is inset by half a marker at each end so the line begins and ends
          at the first and last stage rather than running off into the margin.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[5px] top-2 bottom-2 w-px bg-line lg:left-0 lg:right-0 lg:top-[5px] lg:bottom-auto lg:h-px lg:w-auto"
        />

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
        {units.map((unit, index) => {
          const stage = stageFor(unit)
          const colour = accentHex(unit.accent)
          const tags = (stage?.tags ?? []).map((tag) => tag.label).filter(Boolean)

          return (
            <li
              key={unit.id}
              /*
               * WHITE, WITH THE SCHOOL'S COLOUR AS THE BORDER.
               *
               * These were filled with a tint of each accent. It worked for
               * the blue and the ink, and not for the two orange schools —
               * Kindergarten and Secondary both came out a pale yellow that
               * read as a highlighter rather than as a card.
               *
               * All four are white rather than only those two. A tint is a
               * weight as much as a colour: two filled cards beside two empty
               * ones reads as two of them being more important, which is not
               * true of any school here. The colour has not gone — it is in
               * the border, the marker, and the arrow — it has simply moved
               * off the largest surface, which is where a pale yellow was
               * always going to be hardest to make work.
               *
               * `h-full` so four cards of different text lengths finish level.
               */
              className="group relative flex h-full flex-col rounded-3xl bg-white p-7 pt-9 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 lg:p-8 lg:pt-10"
              style={{
                boxShadow: `inset 0 0 0 1.5px ${pastel(colour, 0.38)}`,
              }}
            >
              {/*
                The marker, sitting ON the rule. Its ring is the page's own
                background rather than a colour, so the rule appears to pass
                behind the marker instead of touching it.
              */}
              {/*
                The marker sits ON the card's top edge, centred over it, so the
                rule behind still reads as one line running through all four.
                Its ring is the page's own white, which is what makes the rule
                appear to pass behind the marker rather than touch it.
              */}
              <span
                aria-hidden="true"
                className="absolute -top-[5px] left-8 size-[11px] rounded-full ring-4 ring-white lg:left-9"
                style={{ backgroundColor: colour }}
              />

              {/*
                The number is decoration carrying no information a reader needs
                — the ordered list already states the position — so it is
                hidden from assistive technology rather than read out as "zero
                one" before every school name.
              */}
              <span
                aria-hidden="true"
                className="t-figure mb-3 block font-bold text-brand/15 lg:mb-4"
              >
                {String(index + 1).padStart(2, '0')}
              </span>

              <h3 className="t-h3 font-bold text-brand">
                {/*
                  The overlay makes the whole stage clickable while keeping the
                  accessible name to just the school.
                */}
                <Link
                  href={`/${unit.slug}`}
                  className="after:absolute after:inset-0 after:content-['']"
                >
                  {unit.shortName}
                </Link>
              </h3>

              {stage?.gradeRange ? (
                <p className="t-small mt-1.5 font-semibold text-ink-muted">
                  {stage.gradeRange}
                </p>
              ) : null}

              {/*
                One line for the portal, the school's own tagline if nobody has
                written one yet.
              */}
              {stage?.blurb || unit.tagline ? (
                <p className="t-body mt-4 text-ink-soft">
                  {stage?.blurb ?? unit.tagline}
                </p>
              ) : null}

              {/*
                PILLS, NOT A MIDDOT-SEPARATED RUN.

                The separators were their own flex children, so when the row
                wrapped it broke BEFORE one and the next line began with a
                stray "·  Value-based education". A tag is a self-contained
                thing; giving each its own chip means a wrap can only ever
                happen between two whole tags.
              */}
              {tags.length > 0 ? (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <li
                      key={tag}
                      /*
                        The chips carried `bg-white/70`, which was visible
                        against a tinted card and invisible on a white one.
                        They take the school's own colour at a tenth instead,
                        so they still read as set into the card.
                      */
                      className="t-caption rounded-pill px-3 py-1.5 font-semibold text-ink-soft"
                      style={{ backgroundColor: pastel(colour, 0.12) }}
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}

              <span
                aria-hidden="true"
                className="t-small mt-auto inline-flex items-center gap-1.5 pt-7 font-semibold"
                style={{ color: colour }}
              >
                Visit site
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </li>
          )
        })}
        </ol>
      </div>
    </Section>
  )
}
