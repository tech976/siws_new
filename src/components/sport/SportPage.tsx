import {
  ArrowRight,
  Building2,
  Check,
  ChessKnight,
  CircleDot,
  ClipboardCheck,
  Dumbbell,
  Flag,
  Flame,
  Footprints,
  Goal,
  HandFist,
  MapPin,
  Sparkles,
  Swords,
  Target,
  Timer,
  Trophy,
  Volleyball,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import { FEATURE_ICONS } from '@/components/blocks/FeatureListBlockView'
import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import type { Page } from '@/payload-types'

import { HonoursBoard } from './HonoursBoard'
import { SportMotion } from './SportMotion'

/**
 * MATCH DAY — the Sports and Fencing pages in a design of their own.
 *
 * SIWS asked for the sports section to be "cool and fun to watch… a different
 * design from the rest of the website… different elements, different formats,
 * different styles, more modern", keeping the fonts (2026-10-16). The
 * pages are still built from the same blocks in the panel — nothing about how
 * they are edited changes — and this renders each block in the match-day
 * style instead of the site's. A block it has no treatment for falls back to
 * the site's own renderer, so adding one in the panel can never break the
 * page.
 *
 * Which pages: those named in `SPORT_PAGES`, on the main site. A school's own
 * Sports page keeps its school's look.
 *
 * The styles are in `app/(frontend)/sport.css`, scoped under `.sp`.
 */

/** The main-site pages that get this design. */
export const SPORT_PAGES = new Set(['sports', 'fencing'])

type Block = NonNullable<Page['layout']>[number]
type Of<T extends Block['blockType']> = Extract<Block, { blockType: T }>
type Tone = 'white' | 'light' | 'dark' | 'amber'

const ROOT_ID = 'sp-root'

/* --- small pieces ------------------------------------------------------- */

const toneOf = (background: unknown): Tone =>
  background === 'sea' ? 'dark' : background === 'brand' ? 'amber' : background === 'tint' ? 'light' : 'white'

const Shell = ({
  tone,
  watermark,
  slant = tone === 'dark',
  className,
  children,
}: {
  tone: Tone
  watermark?: string | null
  slant?: boolean
  className?: string
  children: ReactNode
}) => (
  <section
    className={['sp-section', `sp-${tone}`, slant ? 'sp-slant' : '', className].filter(Boolean).join(' ')}
    data-invert={tone === 'dark' ? 'true' : undefined}
  >
    {watermark ? (
      <span className="sp-watermark" aria-hidden="true">
        {watermark}
      </span>
    ) : null}
    <div className="siws-container">{children}</div>
  </section>
)

/** A heading with one word in accent, as the site's own headings do. */
const Accented = ({ text, accent }: { text: string; accent?: string | null }) => {
  const word = accent?.trim()
  const at = word ? text.indexOf(word) : -1
  if (!word || at === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <span className="heading-accent">{word}</span>
      {text.slice(at + word.length)}
    </>
  )
}

/**
 * The heading of a section: ranged left on a skewed amber bar, with what
 * follows it either beneath or — on a wide screen — beside it.
 */
const Heading = ({
  heading,
  accent,
  level,
  aside,
  small,
}: {
  heading?: string | null
  accent?: string | null
  level?: string | null
  aside?: ReactNode
  small?: boolean
}) => {
  if (!heading && !aside) return null
  const Tag = level === 'h1' ? 'h1' : level === 'h3' ? 'h3' : 'h2'
  return (
    <div
      className={`mb-10 grid gap-6 ${aside ? 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end' : ''}`}
      data-reveal="left"
    >
      {heading ? (
        <div>
          <span className="sp-bar" aria-hidden="true" />
          <Tag className={`sp-heading ${small ? 'sp-heading--small' : ''}`}>
            <Accented text={heading} accent={accent} />
          </Tag>
        </div>
      ) : null}
      {aside ? <div className="sp-muted text-[1.0625rem] leading-relaxed">{aside}</div> : null}
    </div>
  )
}

/**
 * A figure that counts up when it comes into view. The server renders the
 * finished value; only the number part is animated, and only when the value
 * starts with one ("85%+", "300+", "1st" — not "Gold").
 */
const Count = ({ value, className }: { value: string; className?: string }) => {
  const match = /^(\D*)(\d+)(.*)$/.exec(value)
  if (!match) return <span className={className}>{value}</span>
  return (
    <span className={className} data-count={match[2]} data-before={match[1]} data-after={match[3]}>
      {value}
    </span>
  )
}

const delay = (index: number, step = 80): CSSProperties =>
  ({ ['--sp-delay' as string]: `${Math.min(index, 8) * step}ms` }) as CSSProperties

/** An icon for a sport, read from its name. */
const SPORT_ICONS: [RegExp, LucideIcon][] = [
  [/fenc/i, Swords],
  [/foot/i, Goal],
  [/cricket/i, Target],
  [/basket|volley|ball/i, Volleyball],
  [/athlet|track|run/i, Footprints],
  [/badminton|tennis/i, CircleDot],
  [/chess/i, ChessKnight],
  [/kho|kabaddi/i, Flame],
  [/carrom/i, CircleDot],
  [/yoga/i, Sparkles],
  [/karate/i, HandFist],
  [/skat/i, Timer],
  [/gym|fitness|condition/i, Dumbbell],
]
const sportIcon = (name: string, fallback: LucideIcon = Trophy): LucideIcon =>
  SPORT_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? fallback

const iconFor = (item: { icon?: string | null; title?: string | null }): LucideIcon =>
  (item.icon ? FEATURE_ICONS[item.icon] : undefined) ?? sportIcon(item.title ?? '', Flag)

/* --- the banner and the ticker ----------------------------------------- */

const Hero = ({ block, ticker }: { block: Of<'hero'>; ticker: string[] }) => (
  <>
    <section className="sp-hero" data-invert="true">
      {block.image ? (
        <div className="sp-hero__photo">
          <Media resource={block.image} fill priority sizes="100vw" className="object-cover" />
        </div>
      ) : null}
      <div className="sp-hero__shade" aria-hidden="true" />

      <div className="siws-container w-full pt-24">
        <div className="max-w-4xl">
          {block.eyebrow ? <p className="sp-live" data-reveal>{block.eyebrow}</p> : null}
          <h1 className="sp-hero__title mt-6" data-reveal style={delay(1, 120)}>
            <Accented text={block.title} accent={block.accentWord} />
          </h1>
          {block.subtitle ? (
            <p className="mt-5 text-xl font-semibold text-white sm:text-2xl" data-reveal style={delay(2, 120)}>
              {block.subtitle}
            </p>
          ) : null}
          {block.intro ? (
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/85" data-reveal style={delay(2, 120)}>
              {block.intro}
            </p>
          ) : null}
          {block.links?.length ? (
            <div className="mt-8 flex flex-wrap gap-3" data-reveal style={delay(3, 120)}>
              {block.links.map((entry, i) => (
                <CMSLink
                  key={entry.id ?? i}
                  link={entry.link}
                  overrideClassName
                  className={`sp-btn ${i > 0 ? 'sp-btn--ghost' : ''}`}
                >
                  {entry.link?.label}
                  <ArrowRight size={18} aria-hidden="true" />
                </CMSLink>
              ))}
            </div>
          ) : null}
        </div>

        {block.highlights?.length ? (
          <dl className="mt-12 grid max-w-4xl gap-3 sm:grid-cols-3" data-reveal style={delay(4, 120)}>
            {block.highlights.map((fact, i) => (
              <div key={fact.id ?? i} className="sp-score">
                <dt className="sr-only">{fact.label ?? fact.value}</dt>
                <dd>
                  <Count value={fact.value} className="sp-score__value" />
                  {fact.label ? <span className="sp-score__label">{fact.label}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>

    {ticker.length > 0 ? (
      /*
       * The sports, running past. Decoration: the same names are listed, and
       * read, in the section below — so the band is hidden from assistive
       * technology rather than read out twice.
       */
      <div className="sp-ticker" aria-hidden="true">
        <div className="sp-ticker__track">
          {[...ticker, ...ticker].map((name, i) => (
            <span key={`${name}-${i}`} className="sp-ticker__item">
              {name}
            </span>
          ))}
        </div>
      </div>
    ) : null}
  </>
)

/* --- photograph and words ---------------------------------------------- */

const Split = ({ block }: { block: Of<'mediaText'> }) => {
  const tone = toneOf(block.background)
  const imageLeft = block.imagePosition === 'left'
  return (
    <Shell tone={tone} watermark={block.accentWord}>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div
          className={`sp-frame ${imageLeft ? 'sp-frame--left lg:order-1' : 'lg:order-2'}`}
          data-reveal={imageLeft ? 'left' : 'right'}
        >
          <div className="sp-frame__inner">
            <Media
              resource={block.image}
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
        <div className={imageLeft ? 'lg:order-2' : 'lg:order-1'} data-reveal style={delay(1)}>
          <Heading heading={block.heading} accent={block.accentWord} level={block.headingLevel} />
          <RichText data={block.content} className="-mt-4 text-[1.0625rem]" />
          {block.cta?.[0]?.link ? (
            <div className="mt-8">
              <CMSLink link={block.cta[0].link} overrideClassName className="sp-btn">
                {block.cta[0].link.label}
                <ArrowRight size={18} aria-hidden="true" />
              </CMSLink>
            </div>
          ) : null}
        </div>
      </div>
    </Shell>
  )
}

/* --- lists -------------------------------------------------------------- */

type Item = NonNullable<Of<'featureList'>['items']>[number]

/**
 * What a sport's line in the table says, as labels. The table's three columns
 * arrive as a sentence ("Regular coaching. School teams: boys and girls."),
 * and a parent scanning fifteen tiles reads labels faster than sentences.
 * Anything the sentence says beyond the labels is kept as text.
 */
const sportFacts = (description?: string | null) => {
  const text = description ?? ''
  const chips: { label: string; gold?: boolean }[] = []
  if (/champion/i.test(text)) chips.push({ label: 'Champions', gold: true })
  if (/regular coaching/i.test(text)) chips.push({ label: 'Coached' })
  if (/boys and girls/i.test(text)) chips.push({ label: 'Boys & girls teams' })
  else if (/school team/i.test(text)) chips.push({ label: 'School team' })
  const rest = text
    .replace(/regular coaching\.?/i, '')
    .replace(/school teams?:? ?(boys and girls)?\.?/i, '')
    .trim()
  return { chips, rest: rest.length > 3 ? text : null }
}

/** The fifteen sports: a tile each, the flagship larger and lit. */
const SportTiles = ({ block }: { block: Of<'featureList'> }) => {
  const items = block.items ?? []
  const tone = toneOf(block.background)
  return (
    <Shell tone={tone} watermark={block.accentWord}>
      <Heading
        heading={block.heading}
        accent={block.accentWord}
        level={block.headingLevel}
        aside={block.intro ? <RichText data={block.intro} /> : null}
      />
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {items.map((item, i) => {
          const { chips, rest } = sportFacts(item.description)
          const star = chips.some((chip) => chip.gold)
          const Icon = sportIcon(item.title)
          return (
            <li
              key={item.id ?? i}
              className={`sp-card p-5 ${star ? 'sp-card--star col-span-2 sm:p-7 lg:row-span-2' : ''}`}
              data-reveal="pop"
              style={delay(i, 45)}
            >
              <span className="sp-icon" aria-hidden="true">
                <Icon size={star ? 28 : 22} strokeWidth={2} />
              </span>
              <h3
                className={`mt-4 leading-tight font-bold ${star ? 'sp-heading sp-heading--small text-white' : `text-lg ${tone === 'dark' ? 'text-white' : 'text-brand'}`}`}
              >
                {item.title}
              </h3>
              {chips.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chips.map((chip) => (
                    <span key={chip.label} className={`sp-chip ${chip.gold ? 'sp-chip--gold' : ''}`}>
                      {chip.label}
                    </span>
                  ))}
                </div>
              ) : null}
              {star && rest ? <p className="mt-4 leading-relaxed text-white/85">{rest}</p> : null}
            </li>
          )
        })}
      </ul>
    </Shell>
  )
}

/**
 * A count read off a facility's name: "2 basketball courts", "200 m athletic
 * track", "Table tennis hall with 6 tables". Nothing is invented; a name with
 * no number in it gets an icon instead.
 */
const facilityFigure = (title: string): { figure: string; label: string } | null => {
  const leading = /^(\d+(?:\s?m)?)\s+(.+)$/i.exec(title)
  if (leading) return { figure: leading[1]!, label: leading[2]! }
  const trailing = /^(.+?)\s+with\s+(\d+)\s+(.+)$/i.exec(title)
  if (trailing) return { figure: trailing[2]!, label: `${trailing[3]} · ${trailing[1]}` }
  return null
}

const FigureTiles = ({ block }: { block: Of<'featureList'> }) => {
  const items = block.items ?? []
  const tone = toneOf(block.background)
  return (
    <Shell tone={tone} watermark={block.accentWord}>
      <Heading
        heading={block.heading}
        accent={block.accentWord}
        level={block.headingLevel}
        aside={block.intro ? <RichText data={block.intro} /> : null}
      />
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item, i) => {
          const figure = facilityFigure(item.title)
          const Icon = item.title.match(/room/i) ? Building2 : sportIcon(item.title, Building2)
          return (
            <li key={item.id ?? i} className="sp-card flex min-h-40 flex-col justify-between p-5 sm:p-6" data-reveal="pop" style={delay(i, 60)}>
              {figure ? (
                <Count value={figure.figure} className="sp-figure" />
              ) : (
                <span className="sp-icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={2} />
                </span>
              )}
              <p className="mt-4 text-[1.02rem] leading-snug font-semibold text-brand first-letter:uppercase">
                {figure ? figure.label : item.title}
              </p>
            </li>
          )
        })}
      </ul>
    </Shell>
  )
}

const Cards = ({ block }: { block: Of<'featureList'> }) => {
  const items = block.items ?? []
  const tone = toneOf(block.background)
  const columns =
    items.length === 2 ? 'md:grid-cols-2' : items.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'
  return (
    <Shell tone={tone} watermark={block.accentWord}>
      <Heading
        heading={block.heading}
        accent={block.accentWord}
        level={block.headingLevel}
        small={block.headingLevel === 'h3'}
        aside={block.intro ? <RichText data={block.intro} /> : null}
      />
      <ul className={`grid gap-5 ${columns}`}>
        {items.map((item, i) => {
          const Icon = iconFor(item)
          return (
            <li key={item.id ?? i} className="sp-card flex flex-col p-6 sm:p-7" data-reveal="pop" style={delay(i, 90)}>
              <span className="sp-icon" aria-hidden="true">
                <Icon size={24} strokeWidth={2} />
              </span>
              <h3 className={`mt-5 text-xl leading-snug font-bold ${tone === 'dark' ? 'text-white' : 'text-brand'}`}>
                {item.title}
              </h3>
              {item.description ? (
                <p className={`mt-2 leading-relaxed ${tone === 'dark' ? 'text-white/75' : 'text-ink-muted'}`}>{item.description}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </Shell>
  )
}

const Pills = ({ block }: { block: Of<'featureList'> }) => {
  const items = block.items ?? []
  const tone = toneOf(block.background)
  return (
    <Shell tone={tone} watermark={block.accentWord}>
      <Heading
        heading={block.heading}
        accent={block.accentWord}
        level={block.headingLevel}
        aside={block.intro ? <RichText data={block.intro} /> : null}
      />
      <ul className="flex flex-wrap gap-3">
        {items.map((item, i) => (
          <li key={item.id ?? i} className="sp-pill" data-reveal="pop" style={delay(i, 70)}>
            <span className="sp-pill__dot" aria-hidden="true">
              <Check size={16} strokeWidth={3} />
            </span>
            <span>
              {item.title}
              {item.description ? <span className="block text-sm font-normal opacity-80">{item.description}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

const Honours = ({ block }: { block: Of<'featureList'> }) => (
  <Shell tone={toneOf(block.background)} watermark={block.accentWord ?? block.heading}>
    <Heading
      heading={block.heading}
      accent={block.accentWord}
      level={block.headingLevel}
      aside={block.intro ? <RichText data={block.intro} /> : null}
    />
    <HonoursBoard
      items={(block.items ?? []).map((item: Item, i) => ({
        id: item.id ?? String(i),
        title: item.title,
        description: item.description,
        group: item.chip,
      }))}
    />
  </Shell>
)

const Spec = ({ block }: { block: Of<'featureList'> }) => {
  const items = block.items ?? []
  return (
    <Shell tone={toneOf(block.background)} watermark={block.accentWord}>
      <Heading
        heading={block.heading}
        accent={block.accentWord}
        level={block.headingLevel}
        aside={block.intro ? <RichText data={block.intro} /> : null}
      />
      <dl className="grid gap-5 md:grid-cols-2">
        {items.map((item, i) => {
          const Icon = /locat|where|address/i.test(item.title)
            ? MapPin
            : /enrol|join|admission|regist/i.test(item.title)
              ? ClipboardCheck
              : iconFor(item)
          return (
            <div key={item.id ?? i} className="sp-card flex gap-5 p-6 sm:p-7" data-reveal="pop" style={delay(i, 90)}>
              <span className="sp-icon" aria-hidden="true">
                <Icon size={24} strokeWidth={2} />
              </span>
              <div>
                <dt className="t-label text-accent-deep">{item.title}</dt>
                <dd className="mt-2 text-[1.0625rem] leading-relaxed">{item.description}</dd>
              </div>
            </div>
          )
        })}
      </dl>
    </Shell>
  )
}

const FeatureList = ({ block }: { block: Of<'featureList'> }) => {
  const items = block.items ?? []
  if (items.length === 0) return null
  if (block.layout === 'compact') {
    return items.some((item) => item.description) ? <SportTiles block={block} /> : <FigureTiles block={block} />
  }
  if (block.layout === 'cards') return <Cards block={block} />
  if (block.layout === 'spec') return <Spec block={block} />
  if (block.layout === 'panel' && items.some((item) => item.chip)) return <Honours block={block} />
  if (block.layout === 'panel' || block.layout === 'list') return <Pills block={block} />
  return <RenderBlocks blocks={[block]} />
}

/* --- photographs, figures, words, the call ------------------------------ */

const Strip = ({ block }: { block: Of<'gallery'> }) => {
  const images = (block.images ?? []).filter((row) => row.image && typeof row.image === 'object')
  if (images.length === 0) return null
  return (
    <Shell tone={toneOf(block.background)} watermark={block.accentWord}>
      <Heading heading={block.heading} accent={block.accentWord} level={block.headingLevel} />
      <ul className="sp-strip">
        {images.map((row, i) => {
          const media = row.image as { caption?: string | null }
          const caption = row.caption || media.caption
          return (
            <li key={row.id ?? i} className="sp-polaroid" data-reveal="pop" style={delay(i, 110)}>
              <figure>
                <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-brand-tint">
                  <Media resource={row.image} fill sizes="(min-width: 1024px) 30vw, 80vw" className="object-cover" />
                </div>
                {caption ? (
                  <figcaption className="mt-3 px-1 text-[0.95rem] leading-snug font-semibold text-brand">
                    {caption}
                  </figcaption>
                ) : null}
              </figure>
            </li>
          )
        })}
      </ul>
    </Shell>
  )
}

const Scoreboard = ({ block }: { block: Of<'statistics'> }) => {
  const stats = block.stats ?? []
  return (
    <section className="sp-section sp-dark sp-slant" data-invert="true">
      {block.image ? (
        <div className="absolute inset-0 -z-10 opacity-20 mix-blend-luminosity" aria-hidden="true">
          <Media resource={block.image} fill sizes="100vw" className="object-cover" />
        </div>
      ) : null}
      <div className="siws-container">
        <Heading
          heading={block.heading}
          accent={block.accentWord}
          level={block.headingLevel}
          aside={block.intro ? <p>{block.intro}</p> : null}
        />
        <dl className={`grid gap-4 sm:grid-cols-2 ${stats.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {stats.map((stat, i) => (
            <div key={stat.id ?? i} className="sp-score p-6" data-reveal="pop" style={delay(i, 110)}>
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <Count value={stat.value} className="sp-score__value text-[clamp(2.75rem,2rem+3vw,4.5rem)]" />
                <span className="sp-score__label text-base">{stat.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

const Words = ({ block }: { block: Of<'richText'> }) => {
  const tone = toneOf(block.background)

  /* A short statement, given the whole band. */
  if (block.width === 'narrow') {
    return (
      <Shell tone={tone}>
        <div className="mx-auto max-w-4xl" data-reveal>
          {block.heading ? (
            <p className="t-label mb-6 text-accent-deep">
              <Accented text={block.heading} />
            </p>
          ) : null}
          <span className="sp-quote-mark block" aria-hidden="true">
            “
          </span>
          <RichText data={block.content} className="sp-quote mt-6" />
        </div>
      </Shell>
    )
  }

  return (
    <Shell tone={tone} watermark={block.accentWord}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:gap-16">
        <div data-reveal="left">
          {block.heading ? (
            <>
              <span className="sp-bar" aria-hidden="true" />
              {block.headingLevel === 'h1' ? (
                <h1 className="sp-heading">
                  <Accented text={block.heading} accent={block.accentWord} />
                </h1>
              ) : (
                <h2 className="sp-heading sp-heading--small">
                  <Accented text={block.heading} accent={block.accentWord} />
                </h2>
              )}
            </>
          ) : null}
        </div>
        <div data-reveal style={delay(1)}>
          <RichText data={block.content} className="text-[1.0625rem]" />
        </div>
      </div>
    </Shell>
  )
}

const Call = ({ block }: { block: Of<'callToAction'> }) => (
  <section className="sp-section sp-amber sp-slant">
    <div className="siws-container">
      <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center" data-reveal>
        <div className="max-w-2xl">
          <h2 className="sp-heading">{block.heading}</h2>
          {block.text ? <RichText data={block.text} className="mt-4 text-lg font-medium text-[#0a0d33]" /> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {(block.links ?? []).map((entry, i) => (
            <CMSLink
              key={entry.id ?? i}
              link={entry.link}
              overrideClassName
              className={`sp-btn ${i === 0 ? 'sp-btn--dark' : 'sp-btn--ghost'}`}
            >
              {entry.link?.label}
              <ArrowRight size={18} aria-hidden="true" />
            </CMSLink>
          ))}
        </div>
      </div>
    </div>
  </section>
)

/* --- the page ------------------------------------------------------------ */

export const SportPage = ({ blocks }: { blocks: Page['layout'] }) => {
  const layout = blocks ?? []

  /* The ticker runs the names of the first list of sports on the page. */
  const sportsList = layout.find(
    (block): block is Of<'featureList'> =>
      block.blockType === 'featureList' &&
      block.layout === 'compact' &&
      (block.items ?? []).some((item) => item.description),
  )
  const ticker = (sportsList?.items ?? []).map((item) => item.title)

  return (
    <div id={ROOT_ID} className="sp">
      {layout.map((block, index) => {
        const key = block.id ?? `${block.blockType}-${index}`
        switch (block.blockType) {
          case 'hero':
            return <Hero key={key} block={block} ticker={index === 0 ? ticker : []} />
          case 'mediaText':
            return <Split key={key} block={block} />
          case 'featureList':
            return <FeatureList key={key} block={block} />
          case 'gallery':
            return <Strip key={key} block={block} />
          case 'statistics':
            return <Scoreboard key={key} block={block} />
          case 'richText':
            return <Words key={key} block={block} />
          case 'callToAction':
            return <Call key={key} block={block} />
          default:
            return <RenderBlocks key={key} blocks={[block]} />
        }
      })}
      <SportMotion rootId={ROOT_ID} />
    </div>
  )
}
