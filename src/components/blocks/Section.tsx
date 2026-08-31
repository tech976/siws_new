import type { ReactNode } from 'react'

/**
 * The shared shell every content block renders inside.
 *
 * Centralising background, spacing and heading treatment here is what keeps
 * four independently-managed unit sites visually identical (SRS 2.5) — a block
 * author cannot accidentally introduce different padding or an off-brand
 * colour.
 */

export type BlockBackground = 'white' | 'sea' | 'tint' | 'brand'

const BACKGROUND_CLASS: Record<BlockBackground, string> = {
  white: 'bg-white',
  sea: 'bg-sea',
  tint: 'bg-brand-tint',
  brand: 'bg-brand',
}

interface SectionProps {
  background?: BlockBackground | null
  children: ReactNode
  className?: string
  id?: string
}

export const Section = ({ background = 'white', children, className, id }: SectionProps) => {
  const variant = (background ?? 'white') as BlockBackground
  const inverted = variant === 'brand'

  return (
    <section
      id={id}
      // `data-invert` lets the stylesheet flip heading and body colours in one
      // place rather than every block re-deciding what "on brand" means.
      data-invert={inverted ? 'true' : undefined}
      /*
       * The ground this section is painted on, so the stylesheet can tell a
       * white section from a coloured one without knowing the class names.
       *
       * Used for the gap under a page heading: a white first section should
       * sit close, because it shares the header's own ground and the two read
       * as one flow — but a coloured one draws a hard edge across the page,
       * and an edge butting straight up against the standfirst reads as a
       * banner that has landed on top of it.
       */
      data-ground={variant}
      className={[BACKGROUND_CLASS[variant] ?? BACKGROUND_CLASS.white, 'py-14 sm:py-20', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="siws-container">{children}</div>
    </section>
  )
}

interface SplitProps {
  heading?: string | null
  accentWord?: string | null
  level?: 'h1' | 'h2' | 'h3' | null
  /** A short line under the heading in the rail — context, not a summary. */
  kicker?: string | null
  children: ReactNode
}

/**
 * The shell every text section is laid out on: a centred heading with the
 * prose in a measured column beneath it.
 *
 * The heading centres over the section it introduces. The body copy inside
 * that column stays ranged left — centred headings give a long page a clear
 * rhythm of section starts, but centred body copy gives the eye no fixed left
 * edge to return to on each line and is measurably harder to read.
 *
 * The column also caps the measure. Prose in a full-width container runs to
 * 120-odd characters a line on a desktop, well past the ~75 that stays
 * comfortable.
 */
export const SectionSplit = ({ heading, accentWord, level, kicker, children }: SplitProps) => (
  <div>
    <SectionHeading heading={heading} accentWord={accentWord} level={level} />
    {kicker ? <p className="mx-auto mt-4 max-w-xl text-center text-ink-muted">{kicker}</p> : null}
    {/*
      The prose keeps its own measure and is centred as a column beneath the
      heading. The text itself stays ranged left — a centred heading gives a
      section a clear top, but centred body copy gives the eye no fixed left
      edge to return to on each line, which is what makes it harder to read.
    */}
    <div className="mx-auto mt-8 max-w-3xl">{children}</div>
  </div>
)

interface SectionHeadingProps {
  heading?: string | null
  /** A phrase within the heading to highlight, per the SIWS house style. */
  accentWord?: string | null
  level?: 'h1' | 'h2' | 'h3' | null
  className?: string
}

/**
 * Renders a section heading, optionally highlighting one phrase.
 *
 * The heading level is authored rather than fixed, because visual prominence
 * and document outline position are independent — a section can look major
 * while correctly sitting at H3 (WCAG 2.1 SC 1.3.1).
 */
export const SectionHeading = ({
  heading,
  accentWord,
  level = 'h2',
  className,
}: SectionHeadingProps) => {
  if (!heading) return null

  /*
   * H1 is available so that a page's OPENING section can carry the page
   * heading itself, inside its own band, instead of the route printing a bare
   * title on white above it. The route already suppresses its header when the
   * first block's heading matches the page title; without an h1 here that
   * suppression left the page with no h1 at all.
   */
  const Tag = level === 'h1' ? 'h1' : level === 'h3' ? 'h3' : 'h2'
  /*
   * Centred over its own section, and capped so a long heading wraps into a
   * balanced block rather than one full-width line and one short one.
   * `mx-auto` matters as much as `text-center`: without it the element still
   * fills the row and only its glyphs centre, which leaves the heading
   * optically off from a narrower column beneath it.
   */
  const classes = [
    /*
     * NO SIZE HERE. The h2/h3 sizes come from the global scale in globals.css,
     * so a section heading is the same size in every block on every page. This
     * used to set 30px for an h3 and 36px for an h2, which quietly disagreed
     * with the sizes other blocks chose for the same ranks.
     */
    /*
     * No width cap. Capping at 3xl forced a heading to wrap before it had run
     * out of room — "About South Indians' Welfare Society" broke onto a second
     * line with 400px of empty space either side of it. Centred and uncapped,
     * a heading takes the line it needs and only wraps when it genuinely
     * cannot fit.
     */
    'mx-auto text-center text-balance',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const accent = accentWord?.trim()
  const index = accent ? heading.indexOf(accent) : -1

  // Split on the first occurrence only; highlighting every instance of a common
  // word would be visually noisy and is never what the editor meant.
  if (!accent || index === -1) {
    return <Tag className={classes}>{heading}</Tag>
  }

  return (
    <Tag className={classes}>
      {heading.slice(0, index)}
      <span className="heading-accent">{accent}</span>
      {heading.slice(index + accent.length)}
    </Tag>
  )
}
