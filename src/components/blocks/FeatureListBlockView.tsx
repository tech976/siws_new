import {
  Award,
  BadgeCheck,
  BookOpen,
  Brain,
  Bus,
  Check,
  FlaskConical,
  GraduationCap,
  HandHeart,
  Heart,
  MessagesSquare,
  Monitor,
  Music,
  Palette,
  PersonStanding,
  Medal,
  Salad,
  School,
  ShieldCheck,
  Trophy,
  SprayCan,
  Stethoscope,
  ToyBrick,
  Trees,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { FeatureListBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/** Keyed by the values in `FEATURE_ICON_OPTIONS`. */
const FEATURE_ICONS: Record<string, LucideIcon> = {
  classroom: School,
  security: ShieldCheck,
  play: ToyBrick,
  activity: Palette,
  canteen: Salad,
  hygiene: SprayCan,
  staff: Users,
  library: BookOpen,
  study: GraduationCap,
  communication: MessagesSquare,
  thinking: Brain,
  laboratory: FlaskConical,
  computers: Monitor,
  music: Music,
  // Was `Trees`, which is the garden icon — sport is people moving, not foliage.
  sport: PersonStanding,
  garden: Trees,
  health: Stethoscope,
  transport: Bus,
  care: HandHeart,
  /*
   * Achievement, in descending order.
   *
   * Every other icon here names a PLACE or an ACTIVITY, because that is what
   * these lists have carried until now — rooms, subjects, facilities. A set
   * of results is neither, and with nothing to choose the grade cards all
   * fell back to the neutral tick: four identical checks under four different
   * headings, which tells a reader the four are the same thing.
   *
   * Four marks that differ at a glance and rank in an obvious order, so the
   * top band reads as the top band before the label is read at all.
   */
  trophy: Trophy,
  medal: Medal,
  merit: Award,
  pass: BadgeCheck,
}

/**
 * Column span by how many cards share the row, so the last row always fills the
 * width. Written out rather than built as `lg:col-span-${n}`: Tailwind finds
 * class names by scanning the source text, so a name assembled at runtime is
 * never generated and the card silently loses its width.
 */
const SPAN_CLASS: Record<number, string> = {
  1: 'lg:col-span-12',
  2: 'lg:col-span-6',
  3: 'lg:col-span-4',
  4: 'lg:col-span-3',
}

/**
 * The tinted washes behind the cards, cycled in order.
 *
 * Very pale on purpose. The reference this follows uses saturated pastels, but
 * SIWS's palette is blue and orange; six competing hues at full pastel strength
 * would read as a different brand. At this lightness the tints separate one
 * card from the next without arguing with the blue, and every one of them
 * clears 4.5:1 against the brand type that sits on it — checked, not assumed.
 */
const CARD_TINTS = [
  {
    surface: 'bg-white ring-1 ring-line shadow-card',
    disc: 'bg-brand',
    mark: 'text-white',
    accent: 'bg-brand',
  },
]

/**
 * Row sizes for counts where plain chunking reads badly.
 *
 * Five is the case that matters: chunks of four give three cards then two,
 * where the pair on the second row stretch wide and dwarf the trio above them.
 * Two then three puts the wide cards first, which is also where a photograph
 * has room to be worth including.
 */
const ROW_PLAN: Record<number, number[]> = {
  5: [2, 3],
  // Six chunks to four then two, which leaves a pair stretched to half the
  // section width under a row of four. Three and three is the even split.
  6: [3, 3],
}

/**
 * The showcase layout: a photograph beside the words, one card per item.
 *
 * For a handful of items that each have a picture worth showing — prizes,
 * events, achievements. The list layout gave these a tick and a line of text,
 * which is right for rules and curricula and wrong for something a parent
 * would like to SEE. The cards layout was the other option and is worse here:
 * it centres a large icon above the words, and an icon standing in for a
 * photograph that exists is a wasted opportunity.
 *
 * The photograph runs the full width across the top and the words sit centred
 * beneath it. A fixed aspect ratio on the image means three cards in a row
 * stay the same shape whatever length the titles run to.
 *
 * An item with no photograph keeps its card and simply gives the whole width
 * to the words, so a set that is only half illustrated does not come out
 * ragged.
 */
const FeatureShowcase = ({ block }: { block: FeatureListBlock }) => {
  const items = block.items ?? []

  /*
   * One level below whatever the section heading turned out to be, so the
   * outline never skips a rank (WCAG 2.1 SC 1.3.1).
   */
  const CardTitle = block.heading && block.headingLevel === 'h3' ? 'h4' : 'h3'

  return (
    <Section background={block.background as BlockBackground}>
      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
      />

      {block.intro ? (
        <RichText data={block.intro} className="mt-6 siws-centre mx-auto max-w-3xl" />
      ) : null}

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const photo = item.photo
          return (
            <li
              key={item.id ?? index}
              /*
                A COLUMN: photograph across the top, words centred beneath.

                It was a row, with the picture in a 42% side column. That works
                for a dense list, but it caps the photograph at about 150px on a
                three-across row — and these are wide shots of a stage and a
                hall, which need the whole width to read. No height floor any
                more either: the image sets the height now, and `h-full` keeps
                the row level when one title runs to two lines and another to
                one.
              */
              className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line/70 shadow-[0_1px_2px_rgba(36,39,111,0.04),0_8px_24px_-12px_rgba(36,39,111,0.18)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(36,39,111,0.06),0_18px_40px_-16px_rgba(36,39,111,0.32)]"
            >
              {photo ? (
                /*
                 * A RATIO, not a fixed height. Every card then crops its
                 * photograph to the same shape, so three across form a level
                 * row however tall the originals are.
                 *
                 * 3:2 rather than 4:3 because these are wide shots — a stage,
                 * a hall, a blackboard. 4:3 is squarer than any of them and
                 * would shave the sides off the occasion to get there.
                 */
                <div className="relative aspect-[3/2] w-full overflow-hidden">
                  <Media
                    resource={photo}
                    /*
                     * 30vw against a card that measures about 26vw, rounded UP
                     * on purpose: the width picks which stored derivative is
                     * served, and asking for slightly more than is needed means
                     * the browser takes the larger one and scales it down.
                     * Under-asking is what makes a full-width card image soft.
                     */
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : null}

              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-6 text-center">
                <CardTitle className="t-h4 font-bold text-balance text-brand">
                  {item.title}
                </CardTitle>
                {item.description ? (
                  <p className="text-sm leading-snug text-balance text-ink-muted">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      {block.footnote ? (
        <p className="mt-8 text-center text-sm text-ink-muted">{block.footnote}</p>
      ) : null}
    </Section>
  )
}

export const FeatureListBlockView = ({ block }: { block: FeatureListBlock }) => {
  const items = block.items ?? []
  if (items.length === 0) return null

  if (block.layout === 'cards') return <FeatureCards block={block} />
  if (block.layout === 'compact') return <FeatureCompact block={block} />
  if (block.layout === 'showcase') return <FeatureShowcase block={block} />
  if (block.layout === 'panel') return <FeaturePanel block={block} />

  const numbered = block.marker === 'number'
  const twoColumns = block.columns !== '1'
  /*
   * A short two-column list, pulled in and centred under its heading.
   *
   * The grid otherwise takes the full container, which is right for the long
   * lists this layout mostly carries — eighteen school rules fill the width
   * and the columns end level. With four items it does not: each column runs
   * out after a couple of lines and leaves a wide empty tail, so a centred
   * heading sits above two clumps hanging off the left of each half. Capping
   * the grid and centring it makes the whole section one block again.
   */
  const heldTogether = block.columns === '2-centre'
  /*
   * COLUMNS SIZED TO THEIR CONTENT, not to half the grid.
   *
   * Capping the grid at a fixed width and centring it was not enough. Two
   * `1fr` tracks each came out 364px wide while "Standard V / 5 students
   * qualified." only fills about 200 of them, so both columns carried a wide
   * dead margin on their right and all the ink ended up sitting left of the
   * heading it was supposed to sit under — centred by measurement, visibly
   * off by eye, which is the only measurement that counts.
   *
   * `auto` tracks inside a `w-fit` grid shrink to the widest item in each
   * column, so the grid is exactly as wide as its ink and `mx-auto` then
   * centres what a reader can actually see. The gutter has to be set here
   * too: with the tracks no longer padded out by empty space, the columns
   * would otherwise close up on each other.
   */
  const gridClass = twoColumns
    ? heldTogether
      ? 'gap-x-24 gap-y-7 mx-auto w-fit md:grid-cols-[auto_auto]'
      : 'gap-x-16 gap-y-10 md:grid-cols-2'
    : /*
       * CENTRED UNDER ITS HEADING, and with more air between the steps.
       *
       * A single column was capped at 3xl and then left at the container's
       * left margin, while the heading above it centred — 196px apart on a
       * desktop, which reads as two things that were not laid out together.
       * `mx-auto` puts the column under the words that introduce it.
       *
       * The TEXT inside stays ranged left. A centred heading gives a section a
       * top edge; centred body copy takes away the fixed left edge the eye
       * returns to on every line, and these steps carry a paragraph each.
       */
      'gap-x-12 gap-y-10 mx-auto max-w-3xl'

  return (
    <Section background={block.background as BlockBackground}>
      {/*
        `mb-4` is the gap to an intro paragraph, which then carries `mb-9` down
        to the list. With no intro that 16px was the ENTIRE gap between the
        heading and the first tick, so "Our Mission" read as one crowded block.
        Without one, the heading takes the same 40px the compact and card
        layouts below give it.
      */}
      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
        className={block.intro ? 'mb-4' : 'mb-10'}
      />

      {block.intro ? <RichText data={block.intro} className="mb-9 siws-centre mx-auto max-w-3xl" /> : null}

      {/*
        An ordered list when the marker is a number, so the numbering is real
        rather than painted on — a screen reader then announces "1 of 5".
      */}
      {numbered ? (
        <ol className={`grid ${gridClass}`}>
          {items.map((item, index) => (
            <Item key={item.id ?? index} item={item} index={index} numbered />
          ))}
        </ol>
      ) : (
        <ul className={`grid ${gridClass}`}>
          {items.map((item, index) => (
            <Item key={item.id ?? index} item={item} index={index} numbered={false} />
          ))}
        </ul>
      )}
    </Section>
  )
}

/**
 * The panel layout — see docs/MASTER-LAYOUT.md.
 *
 * WHY IT EXISTS. Everything a school publishes that is not prose is a list,
 * and until this there were only two ways to set one: a tick beside a line, or
 * a tile with a tick inside it. A page carrying values, goals and subjects got
 * three of the same device in a row and the reader stopped seeing any of them.
 *
 * WHAT MAKES IT DIFFERENT is not decoration, it is that the row ANSWERS. It
 * rises in when the page loads, one after another, and lifts under the pointer
 * or a keyboard focus. That is the whole idea, and it is why the layout is
 * capped at "two sections a page" in the block's own help text: a lift means
 * nothing on a page where everything lifts.
 *
 * The movement is entirely in `globals.css` under `.siws-panel`, so it sits
 * inside the stylesheet's `prefers-reduced-motion` block and a reader who has
 * asked for stillness gets a plain grid of cards.
 *
 * THE CHIP IS OPTIONAL AND ALL-OR-NOTHING in practice. A chip earns its space
 * by telling the reader which group a point belongs to; ten points all chipped
 * "Value" is ten copies of the section heading. The field's help text says so;
 * this renderer simply omits the element when the text is absent.
 */
const FeaturePanel = ({ block }: { block: FeatureListBlock }) => {
  const items = block.items ?? []

  /*
   * One level below whatever the section heading turned out to be, so the
   * outline never skips a rank (WCAG 2.1 SC 1.3.1).
   */
  const ItemTitle = block.heading && block.headingLevel === 'h3' ? 'h4' : 'h3'
  const numbered = block.marker === 'number'
  const List = numbered ? 'ol' : 'ul'

  return (
    <Section background={block.background as BlockBackground}>
      {block.eyebrow ? (
        <p className="mx-auto mb-5 flex w-fit items-center gap-2.5 rounded-full bg-white px-5 py-2 t-label text-brand uppercase ring-1 ring-line">
          <Heart aria-hidden="true" size={15} strokeWidth={2.4} fill="currentColor" />
          {block.eyebrow}
        </p>
      ) : null}

      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
      />

      {block.intro ? (
        <RichText data={block.intro} className="siws-centre mx-auto mt-6 max-w-3xl" />
      ) : null}

      {/*
        THE COLUMN COUNT IS THE EDITOR'S, because only they know how many
        points there are and how long each one runs.

        Three across is right for a set of one-word labels. It is wrong for
        four points that each run to a phrase: four into three leaves a single
        panel alone on the second row, and the phrases wrap to two lines in a
        third of the width, which pushes the chip off its title's baseline onto
        a line of its own. Two across fixes both at once.
      */}
      <List
        className={`mt-10 grid grid-cols-1 gap-3 ${
          block.columns === '1' ? '' : 'sm:grid-cols-2'
        } ${block.columns === '1' || block.columns === '2' ? '' : 'lg:grid-cols-3'}`}
      >
        {items.map((item, index) => {
          const Icon = item.icon ? FEATURE_ICONS[item.icon] : undefined

          return (
            <li
              key={item.id ?? index}
              className="siws-panel siws-panel-rise flex items-start gap-4 rounded-3xl border border-line bg-white p-5"
            >
              {/*
                The same solid disc every other layout uses. A new shape here
                would make the panel read as a component from somewhere else,
                which is the one thing the master layout is written to prevent.
              */}
              <span
                aria-hidden={numbered ? undefined : 'true'}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white"
              >
                {numbered ? (
                  <span className="text-sm font-semibold">{index + 1}</span>
                ) : Icon ? (
                  <Icon size={19} strokeWidth={1.9} />
                ) : (
                  <Check size={18} strokeWidth={2.4} />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <ItemTitle className="card-title font-semibold text-brand">
                    {item.title}
                  </ItemTitle>
                  {item.chip ? (
                    <span className="rounded-full border border-line px-2.5 py-0.5 t-label text-ink-muted uppercase">
                      {item.chip}
                    </span>
                  ) : null}
                </span>
                {item.description ? (
                  <span className="mt-1.5 block text-sm leading-snug text-ink-muted">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </li>
          )
        })}
      </List>
    </Section>
  )
}

/**
 * The compact layout: a dense grid of labelled tiles.
 *
 * WHY IT EXISTS. A subject list is ten short labels. Given a card each, ten
 * items became ten tall boxes holding one word apiece, most of their area
 * empty, with the last row stretched across the width because ten does not
 * divide by four. The same happened to the teaching methods. A card earns its
 * size when it carries a picture and a sentence; a label does not.
 *
 * So: one row per item, icon beside the words rather than above them, three
 * across on a desktop. The set reads as a syllabus at a glance instead of as a
 * gallery of near-empty cards, and a ragged last row stops mattering because
 * the tiles are the same height whatever falls where.
 */
const FeatureCompact = ({ block }: { block: FeatureListBlock }) => {
  const items = block.items ?? []

  /*
   * One level below whatever the section heading turned out to be, so the
   * outline never skips a rank (WCAG 2.1 SC 1.3.1).
   */
  const ItemTitle = block.heading && block.headingLevel === 'h3' ? 'h4' : 'h3'

  return (
    <Section background={block.background as BlockBackground}>
      {block.eyebrow ? (
        <p className="mx-auto mb-5 flex w-fit items-center gap-2.5 rounded-full bg-white px-5 py-2 t-label text-brand ring-1 ring-line">
          <Heart aria-hidden="true" size={15} strokeWidth={2.4} fill="currentColor" />
          {block.eyebrow}
        </p>
      ) : null}

      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
      />

      {/*
        A WIDER MEASURE THAN THE USUAL 3XL, because this intro is centred and
        balanced.

        `text-wrap: balance` evens the lines of a paragraph instead of filling
        them, so it does not use the measure it is given — it uses roughly the
        text length divided by however many lines the measure forced. At 48rem
        that turned three short statements into 415+477 and 547+529: five
        stubby lines stacked in the middle of a section three times as wide,
        which is what "very tight" meant. Widening the cap does not stretch
        those lines, it removes the wrap that split them, and each statement
        lands on one line of its own.

        Below about 1120px of room they wrap again — and balance is still
        there to split them evenly rather than leaving a tail.
      */}
      {block.intro ? (
        <RichText data={block.intro} className="siws-centre mx-auto mt-6 max-w-6xl" />
      ) : null}

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const Icon = item.icon ? FEATURE_ICONS[item.icon] : undefined
          return (
            <li
              key={item.id ?? index}
              className="flex items-start gap-4 rounded-[10px] border border-line bg-white p-4"
            >
              {/* Solid disc, white mark — the one icon treatment used site-wide. */}
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand text-white"
              >
                {Icon ? (
                  <Icon size={19} strokeWidth={1.9} />
                ) : (
                  <Check size={18} strokeWidth={2.4} />
                )}
              </span>

              <span className="min-w-0">
                <ItemTitle className="card-title font-semibold text-brand">{item.title}</ItemTitle>
                {item.description ? (
                  <span className="mt-1 block text-sm leading-snug text-ink-muted">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

/**
 * The card layout: a picture on a tinted card, centred, in a grid whose last
 * row always fills the width.
 *
 * Rows of four, except that a remainder of one would leave a single card
 * stretched across the full width looking like a mistake — so those counts drop
 * to rows of three instead. Spans are computed on a 12-column grid, and every
 * possible row length (1, 2, 3, 4) divides 12 exactly, so no row can ever end
 * ragged.
 */
const FeatureCards = ({ block }: { block: FeatureListBlock }) => {
  const items = block.items ?? []
  const perRow = items.length > 4 && items.length % 4 === 1 ? 3 : 4
  const numbered = block.marker === 'number'

  /*
   * One card carrying a photograph sets the shape for the section: every card
   * ranges left with its icon in the corner, and the ones with no photograph
   * simply leave that column out. Deciding per card instead left a single
   * centred card sitting in a row of left-aligned ones, looking like a fault.
   */
  const withPhotos = items.some((item) => item.photo)

  /*
   * One level below whatever the section heading turned out to be, so the
   * outline never skips a rank (WCAG 2.1 SC 1.3.1). Hardcoding h4 was wrong
   * the moment an editor left the heading at its default h2.
   */
  const CardTitle = block.heading && block.headingLevel === 'h3' ? 'h4' : 'h3'

  const rows: (typeof items)[] = []
  const plan = ROW_PLAN[items.length]
  if (plan) {
    let at = 0
    for (const size of plan) {
      rows.push(items.slice(at, at + size))
      at += size
    }
  } else {
    for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow))
  }

  /*
   * A real ordered list when the numbers are the point, so a screen reader
   * announces "3 of 5" rather than reading a decorative badge. The badge itself
   * is then hidden from assistive tech — the list already carries the number.
   */
  const List = numbered ? 'ol' : 'ul'

  return (
    <Section background={block.background as BlockBackground}>
      {block.eyebrow ? (
        <p className="mx-auto mb-5 flex w-fit items-center gap-2.5 rounded-full bg-white px-5 py-2 t-label text-brand ring-1 ring-line">
          <Heart aria-hidden="true" size={15} strokeWidth={2.4} fill="currentColor" />
          {block.eyebrow}
        </p>
      ) : null}

      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
      />

      {block.heading ? (
        // A rule broken by a dot, echoing the reference. Decorative only, so it
        // is hidden from screen readers — it carries no meaning to announce.
        <div aria-hidden="true" className="mt-5 flex items-center justify-center gap-2">
          <span className="h-px w-14 bg-line" />
          <span className="size-1.5 rounded-full bg-brand/50" />
          <span className="h-px w-14 bg-line" />
        </div>
      ) : null}

      {block.intro ? <RichText data={block.intro} className="mt-6 siws-centre mx-auto max-w-3xl" /> : null}

      {/*
        THE GUTTER IS AT LEAST THE CARD'S OWN PADDING.
        
        It was 20px between cards that carry 32px of padding inside them, so
        every card had more air around its words than there was between it and
        its neighbour — and four separate cards read as one bar with lines
        ruled across it. A row of cards only reads as a row when the space
        BETWEEN them is the widest space in sight; the moment it is the
        narrowest, the grouping inverts.
      */}
      <List className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        {rows.flatMap((row, rowIndex) =>
          row.map((item, columnIndex) => {
            /*
             * Counted across the rows, not within one — the badge has to read
             * 1…5 down the section, and the tint has to keep cycling rather
             * than restart on every row.
             */
            const index = rows.slice(0, rowIndex).reduce((n, r) => n + r.length, 0) + columnIndex
            const tint = CARD_TINTS[index % CARD_TINTS.length]!
            /*
             * Three ways to fill the disc, in order of how specific they are:
             * a picture the school uploaded, one of the drawn illustrations,
             * or — for the choices not yet drawn — the line icon.
             */
            const Icon = item.icon ? FEATURE_ICONS[item.icon] : undefined

            const disc = (
              <span
                aria-hidden="true"
                className={`grid shrink-0 place-items-center rounded-full ${tint.disc} ${
                  numbered ? 'size-16' : 'size-24 sm:size-28'
                }`}
              >
                {item.illustration ? (
                  /*
                   * An uploaded picture wins over everything. The school can
                   * drop in its own artwork later without anyone touching this
                   * file.
                   */
                  <Media
                    resource={item.illustration}
                    sizes="112px"
                    className={
                      numbered ? 'size-10 object-contain' : 'size-18 object-contain sm:size-21'
                    }
                  />
                ) : Icon ? (
                  <Icon size={numbered ? 26 : 40} strokeWidth={1.6} className={tint.mark} />
                ) : (
                  <Check size={numbered ? 24 : 38} strokeWidth={2} className={tint.mark} />
                )}
              </span>
            )

            /*
             * Numbered cards read left-to-right — badge, title, rule, text, and
             * the photograph down the side. Plain cards stay centred under a
             * large disc. The two need different internals, not one layout
             * bent to cover both.
             */
            if (numbered) {
              return (
                <li
                  key={item.id ?? index}
                  className={`relative isolate flex overflow-hidden rounded-2xl bg-white ring-1 ring-line ${
                    SPAN_CLASS[row.length] ?? SPAN_CLASS[4]
                  }`}
                >
                  {/*
                    No corner wedge. It was drawn in the same colour as the
                    badge, so the badge vanished into it and the numeral was
                    left sitting on a coloured blob rather than in anything.
                    The badge and the rule already carry the card's colour.
                  */}
                  <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={`grid size-9 shrink-0 place-items-center rounded-full t-index font-bold text-white tabular-nums ${tint.accent}`}
                      >
                        {index + 1}
                      </span>
                      <CardTitle className="card-title text-balance pt-0.5 font-bold text-brand">
                        {item.title}
                      </CardTitle>
                    </div>

                    <span
                      aria-hidden="true"
                      className={`ml-12 mt-3.5 block h-1 w-8 rounded-full ${tint.accent}`}
                    />

                    {item.description ? (
                      <p className="ml-12 mt-2.5 t-small text-ink-soft">
                        {item.description}
                      </p>
                    ) : null}

                    {/* No photograph: the icon carries the card instead. */}
                    {!item.photo ? <div className="ml-12 mt-4">{disc}</div> : null}
                  </div>

                  {item.photo ? (
                    /*
                     * A fixed share of the card rather than an aspect ratio, so
                     * the picture fills its column however tall the text beside
                     * it runs. Hidden on a phone, where a third of an
                     * already-narrow card is a sliver, not a photograph.
                     */
                    <div className="relative hidden w-[34%] shrink-0 sm:block">
                      <Media
                        resource={item.photo}
                        fill
                        sizes="(min-width: 1024px) 20vw, 40vw"
                        className="absolute inset-0 object-cover"
                      />
                      {/*
                       * The icon rides the seam between photograph and text, so
                       * the card keeps its icon without the text column giving
                       * up any width for it.
                       */}
                      <span
                        aria-hidden="true"
                        className={`absolute -left-6 bottom-4 grid size-12 place-items-center rounded-full ring-4 ring-white ${tint.disc}`}
                      >
                        {Icon ? (
                          <Icon size={20} strokeWidth={1.8} className={tint.mark} />
                        ) : (
                          <Check size={18} strokeWidth={2.4} className={tint.mark} />
                        )}
                      </span>
                    </div>
                  ) : null}
                </li>
              )
            }

            /*
             * A photograph takes the right of the card, so the text beside it
             * ranges left and the icon moves to the top-left corner. Centring
             * the text against a picture pinned to one side would leave it
             * visibly off-axis.
             */
            if (withPhotos) {
              return (
                <li
                  key={item.id ?? index}
                  className={`flex overflow-hidden rounded-2xl ${
                    SPAN_CLASS[row.length] ?? SPAN_CLASS[4]
                  } ${tint.surface}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col p-5">
                    {/*
                      White, not tinted — the disc sits on a tinted card here,
                      where the usual tinted disc would barely separate from it.
                    */}
                    <span
                      aria-hidden="true"
                      className={`grid size-12 shrink-0 place-items-center rounded-full ${tint.disc} ${tint.mark}`}
                    >
                      {Icon ? (
                        <Icon size={22} strokeWidth={1.9} />
                      ) : (
                        <Check size={20} strokeWidth={2.4} />
                      )}
                    </span>

                    <CardTitle className="card-title mt-5 text-balance font-bold text-brand">
                      {item.title}
                    </CardTitle>

                    <span
                      aria-hidden="true"
                      className={`mt-3 block h-1 w-8 rounded-full ${tint.accent}`}
                    />

                    {item.description ? (
                      <p className="mt-3 t-small text-ink-soft">
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  {/*
                    36%, not 44%. At the wider figure the text column left in a
                    three-across card ran to seven and eight lines, and the
                    cards grew half as tall again as the design they follow.
                  */}
                  {item.photo ? (
                    /*
                     * The photograph floats: inset from all four card edges,
                     * rounded, and lifted on a shadow. Bled to the edges it met
                     * the text column along a hard vertical seam, and the card
                     * read as two flat panels pushed together rather than one
                     * object. Tinted card shows all the way round it now, so
                     * there is no line left to see.
                     */
                    <div className="hidden w-[38%] shrink-0 self-center py-4 pr-4 sm:block">
                      {/*
                        A set 3:4 frame, centred against the text, rather than
                        stretching to the card's full height. A tall card made a
                        tall thin slot, and a landscape photograph filling it
                        showed about a fifth of its width — everyone outside
                        that strip was simply cropped away.
                      */}
                      <div className="relative aspect-3/4 overflow-hidden rounded-2xl shadow-[0_6px_20px_-6px_rgba(15,23,42,0.35)]">
                        <Media
                          resource={item.photo}
                          fill
                          /*
                            Generous on purpose. The frame is around 150px wide,
                            but a landscape photograph covering a portrait slot
                            is scaled up by its height, so the file needs to be
                            far wider than the slot — at 18vw the browser chose
                            a derivative that was then enlarged, and the result
                            was visibly soft.
                          */
                          sizes="(min-width: 1024px) 22vw, 45vw"
                          className="absolute inset-0 object-cover"
                        />
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            }

            return (
              <li
                key={item.id ?? index}
                className={`flex flex-col items-center rounded-2xl p-7 text-center sm:p-8 ${
                  SPAN_CLASS[row.length] ?? SPAN_CLASS[4]
                } ${tint.surface}`}
              >
                {disc}

                <CardTitle className="card-title mt-6 text-balance font-bold text-brand">
                  {item.title}
                </CardTitle>

                {item.description ? (
                  /*
                   * Centred, unlike body copy elsewhere on the site. Centring
                   * costs the eye a fixed left edge to return to, which matters
                   * over a paragraph — but these are one or two lines inside a
                   * centred card, where ranging left would instead leave the
                   * text visibly hanging off the icon above it.
                   */
                  <p className="mt-2.5 text-pretty t-small text-ink-soft">
                    {item.description}
                  </p>
                ) : null}
              </li>
            )
          }),
        )}
      </List>

      {block.footnote ? (
        <p className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-full bg-white px-6 py-3 text-center t-small text-ink-soft ring-1 ring-line">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white"
          >
            <Heart size={16} strokeWidth={2.4} fill="currentColor" />
          </span>
          {block.footnote}
        </p>
      ) : null}
    </Section>
  )
}

const Item = ({
  item,
  index,
  numbered,
}: {
  item: NonNullable<FeatureListBlock['items']>[number]
  index: number
  numbered: boolean
}) => {
  /*
   * An icon an editor CHOSE, rather than a tick in every row.
   *
   * This layout used to ignore `item.icon` outright: the card and compact
   * layouts read it, this one drew a check whatever the item said. So a list
   * whose author had picked out a flask for Science and a monitor for ICT
   * showed ten identical ticks, and the choice was silently thrown away.
   *
   * Numbering still wins where it is asked for — a numbered step is telling
   * the reader its position, and a glyph in that circle would take the number
   * away to say something less useful.
   */
  const Icon = !numbered && item.icon ? FEATURE_ICONS[item.icon] : undefined

  return (
  <li className="flex items-start gap-4">
    {/*
      THE DISC AND THE TITLE ARE THE SAME HEIGHT, so they centre on each other
      without anybody nudging either one.

      It used to be a 32px disc beside a title on default leading, pushed down
      by `mt-0.5` — which left the mark sitting five pixels below the middle of
      the word it belongs to. Close enough to look like a mistake rather than a
      choice, and repeated down a column of seven it reads as a wobble. Both
      are 28px now: no offset, nothing to keep in sync by hand, and it holds if
      the type scale changes.
    */}
    <span
      aria-hidden="true"
      /*
       * The ring is what makes the marker exist on a tinted section.
       *
       * `bg-sea` is the same colour a "sea" section is painted, so on
       * /kindergarten/admissions the numbered steps had their discs dissolve
       * into the background and the numbers floated loose beside the text. The
       * fill is right on white and had simply never been checked against the
       * tint it shares a name with. A hairline of brand at 15% draws the edge
       * on the tint and is barely present on white, where the fill already
       * does the work.
       */
      className="grid size-7 shrink-0 place-items-center rounded-full bg-sea text-sm font-bold text-brand ring-1 ring-brand/15"
    >
      {/* Lighter than the tick's stroke: these glyphs carry detail a 3px
          stroke closes up at 17px. */}
      {numbered ? index + 1 : Icon ? <Icon size={16} strokeWidth={2.1} /> : <Check size={16} strokeWidth={3} />}
    </span>
    <span>
      <strong className="block t-body text-brand">{item.title}</strong>
      {/*
        8px, not 4. A title and its explanation were nearly touching, which
        made each point read as one run-on line instead of a heading and a
        sentence — and `leading-relaxed` because this is the text a parent
        actually reads, not a label.
      */}
      {item.description ? (
        <span className="mt-2 block leading-relaxed text-ink-soft">{item.description}</span>
      ) : null}
    </span>
  </li>
  )
}
