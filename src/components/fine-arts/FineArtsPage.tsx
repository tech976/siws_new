import { ArrowRight, BookOpen, Mic, Music, Music2, Palette, Sparkles, type LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { SportMotion } from '@/components/sport/SportMotion'
import { headingAnchor } from '@/lib/anchor'
import type { Media as MediaDoc, Page, Unit } from '@/payload-types'

import { ArtGallery, type ArtPiece } from './ArtGallery'

/**
 * THE FINE ARTS PAGE — a curated student gallery kept in a sketchbook.
 *
 * Asked for on 2026-10-16: a more expressive Fine Arts page that still feels
 * like the rest of the SIWS site — its colours, type, spacing and buttons —
 * led by real photographs of SIWS students from all four schools.
 *
 * Like the Sports page, it is built from ordinary blocks in the panel and
 * this decides how each one looks; anything it has no treatment for falls
 * back to the site's own renderer. Unlike Sports it is not a design of its
 * own: the styles in `app/(frontend)/fine-arts.css` only arrange the site's
 * existing pieces more freely.
 *
 * How the blocks are read, so an editor can change the page from the panel:
 *
 *   - the BANNER is the hero block. A photo gallery placed DIRECTLY after it
 *     is the collage beside the headline (its first four photographs); its
 *     own heading is never shown.
 *   - a POINTS LIST whose points carry a small label is the "creativity at
 *     every age" chapters: points with the same label are one chapter, the
 *     first with a description leads it and the others are its extra prints.
 *     A label naming a school ("Kindergarten", "Junior College") links the
 *     chapter to that school's site.
 *   - a TEXT section with sub-headings and lists is drawn as the discipline
 *     panels; one whose list items open on a bold term ("Free of cost: …") as
 *     the reasons to join; any other as an editorial column.
 *   - the LAST photo gallery is the student art gallery wall; any other
 *     gallery is a featured moment, its first photograph large.
 *   - a caption written "Primary · On stage at Natya Tarang" shows "Primary"
 *     as the school's tag and the rest as the caption.
 *
 * THE PHOTOGRAPHS ARE THE SCHOOLS', NOT THE CENTRE'S. There are no
 * photographs of the Centre's own Saturday classes yet, so the discipline
 * panels are drawn rather than photographed, and nothing captions a school
 * photograph as a Centre class.
 */

/** The main-site pages that get this design. */
export const FINE_ARTS_PAGES = new Set(['fine-arts'])

type Block = NonNullable<Page['layout']>[number]
type Of<T extends Block['blockType']> = Extract<Block, { blockType: T }>
type Tone = 'white' | 'sea' | 'brand'

const ROOT_ID = 'fa-root'

/* --- small pieces ------------------------------------------------------- */

const toneOf = (background: unknown): Tone =>
  background === 'sea' || background === 'tint' ? 'sea' : background === 'brand' ? 'brand' : 'white'

const asMedia = (value: unknown): MediaDoc | null =>
  value && typeof value === 'object' && 'url' in value ? (value as MediaDoc) : null

/** "Primary · On stage" → { label: "Primary", text: "On stage" }. */
const splitCaption = (caption?: string | null): { label?: string; text?: string } => {
  const value = caption?.trim()
  if (!value) return {}
  const at = value.indexOf(' · ')
  if (at === -1) return { text: value }
  return { label: value.slice(0, at).trim(), text: value.slice(at + 3).trim() }
}

const delay = (index: number, step = 90): CSSProperties => ({ transitionDelay: `${index * step}ms` })

const Shell = ({
  tone,
  paper,
  id,
  className,
  children,
}: {
  tone: Tone
  paper?: boolean
  id?: string
  className?: string
  children: ReactNode
}) => (
  <section
    id={id}
    className={['fa-section', `fa-${tone}`, paper ? 'fa-paper' : '', className].filter(Boolean).join(' ')}
    data-invert={tone === 'brand' ? 'true' : undefined}
  >
    <div className="siws-container">{children}</div>
  </section>
)

/** A heading with its accent word, brushed underneath as the house style's highlight. */
const Accented = ({ text, accent }: { text: string; accent?: string | null }) => {
  const word = accent?.trim()
  const at = word ? text.indexOf(word) : -1
  if (!word || at === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <span className="heading-accent fa-brush">{word}</span>
      {text.slice(at + word.length)}
    </>
  )
}

const Heading = ({
  heading,
  accent,
  level,
  className,
}: {
  heading?: string | null
  accent?: string | null
  level?: string | null
  className?: string
}) => {
  if (!heading) return null
  const Tag = level === 'h1' ? 'h1' : level === 'h3' ? 'h3' : 'h2'
  return (
    <Tag className={`fa-heading fa-brush-host ${className ?? ''}`}>
      <Accented text={heading} accent={accent} />
    </Tag>
  )
}

/** A short hand-drawn arrow for a handwritten note. Decorative. */
const Squiggle = ({ flip }: { flip?: boolean }) => (
  <svg
    width="38"
    height="22"
    viewBox="0 0 38 22"
    fill="none"
    aria-hidden="true"
    style={flip ? { transform: 'scaleX(-1)' } : undefined}
  >
    <path
      d="M2 4c8 10 18 13 30 10M26 8l6 6-8 3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** A photograph on a white mat. `fill` crops it to the box the CSS gives it. */
const Print = ({
  media,
  sizes,
  tilt,
  tape,
  tag,
  priority,
  className,
}: {
  media: MediaDoc
  sizes: string
  tilt?: 'l' | 'r' | 's'
  tape?: 'top' | 'corner'
  tag?: string
  priority?: boolean
  className?: string
}) => (
  <div
    className={[
      'fa-mat',
      tilt ? `fa-tilt-${tilt}` : '',
      tape ? `fa-tape ${tape === 'corner' ? 'fa-tape--corner' : ''}` : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div className="fa-mat__photo">
      <Media resource={media} fill priority={priority} sizes={sizes} className="object-cover" />
    </div>
    {tag ? <span className="fa-tag">{tag}</span> : null}
  </div>
)

/* --- Lexical, read just far enough to lay it out ------------------------- */

interface LexNode {
  type?: string
  tag?: string
  text?: string
  format?: number | string
  children?: LexNode[]
}

const rootOf = (content: unknown): LexNode[] =>
  ((content as { root?: { children?: LexNode[] } } | null)?.root?.children ?? []) as LexNode[]

const textOf = (node: LexNode): string =>
  typeof node.text === 'string' ? node.text : (node.children ?? []).map(textOf).join('')

interface Discipline {
  title: string
  paragraphs: string[]
  subjects: string[]
}

/** Sub-heading, paragraph, list — repeated. Null when the text is not shaped that way. */
const disciplinesOf = (content: unknown): Discipline[] | null => {
  const groups: Discipline[] = []
  for (const node of rootOf(content)) {
    if (node.type === 'heading') groups.push({ title: textOf(node).trim(), paragraphs: [], subjects: [] })
    else if (!groups.length) return null
    else if (node.type === 'paragraph' && textOf(node).trim()) groups.at(-1)!.paragraphs.push(textOf(node).trim())
    else if (node.type === 'list') groups.at(-1)!.subjects.push(...(node.children ?? []).map((item) => textOf(item).trim()))
  }
  return groups.length >= 2 && groups.every((group) => group.subjects.length > 0) ? groups : null
}

interface Reason {
  term: string
  detail: string
}

/** One list whose every item opens on a bold term. Null otherwise. */
const reasonsOf = (content: unknown): Reason[] | null => {
  const nodes = rootOf(content)
  const list = nodes.find((node) => node.type === 'list')
  if (!list || nodes.some((node) => node.type === 'heading')) return null
  const reasons: Reason[] = []
  for (const item of list.children ?? []) {
    const [first, ...rest] = item.children ?? []
    const bold = typeof first?.format === 'number' && (first.format & 1) === 1
    if (!first || !bold) return null
    reasons.push({
      term: textOf(first).replace(/:\s*$/, '').trim(),
      detail: rest.map(textOf).join('').trim(),
    })
  }
  return reasons.length >= 3 ? reasons : null
}

/* --- the banner --------------------------------------------------------- */

const Hero = ({ block, collage }: { block: Of<'hero'>; collage: Of<'gallery'> | null }) => {
  const pieces = (collage?.images ?? [])
    .map((entry) => ({ media: asMedia(entry.image), ...splitCaption(entry.caption) }))
    .filter((piece): piece is { media: MediaDoc; label?: string; text?: string } => piece.media !== null)
    .slice(0, 4)
  const lone = pieces.length === 0 ? asMedia(block.image) : null

  return (
    <Shell tone="white" paper className="!pt-10 sm:!pt-14 lg:!pb-24">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
        <div>
          {block.eyebrow ? (
            <p className="fa-eyebrow" data-reveal>
              {block.eyebrow}
            </p>
          ) : null}
          <h1 className="fa-heading fa-brush-host mt-6" data-reveal style={delay(1)}>
            <Accented text={block.title} accent={block.accentWord} />
          </h1>
          {block.intro ? (
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft" data-reveal style={delay(2)}>
              {block.intro}
            </p>
          ) : null}
          {block.links?.length ? (
            <div className="mt-8 flex flex-wrap gap-3" data-reveal style={delay(3)}>
              {block.links.map((entry, i) => (
                <CMSLink key={entry.id ?? i} link={entry.link} />
              ))}
            </div>
          ) : null}
          {block.highlights?.length ? (
            <dl
              className="mt-10 grid max-w-xl grid-cols-3 gap-x-6 gap-y-6 border-t border-line pt-8"
              data-reveal
              style={delay(4)}
            >
              {block.highlights.map((entry, i) => (
                <div key={entry.id ?? i}>
                  <dt className="fa-figure whitespace-nowrap">{entry.value}</dt>
                  <dd className="mt-2 text-sm leading-snug font-medium text-ink-muted">{entry.label}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {pieces.length > 0 ? (
          <div className="fa-collage" data-reveal="right" style={delay(2)}>
            {pieces.map((piece, i) => (
              <div key={i} className={`fa-collage__piece fa-collage__piece--${i}`}>
                <Print
                  media={piece.media}
                  priority={i < 2}
                  sizes={i === 0 ? '(min-width: 64rem) 420px, 72vw' : '(min-width: 64rem) 320px, 55vw'}
                  tilt={(['s', 'r', 'l', 'l'] as const)[i]}
                  tape={i === 1 ? 'top' : i === 3 ? 'corner' : undefined}
                  tag={piece.label}
                />
              </div>
            ))}
            {pieces.length >= 3 ? (
              <span className="fa-collage__note hidden sm:inline-flex" aria-hidden="true">
                <span className="fa-note">
                  <Squiggle flip />
                  KG to Junior College
                </span>
              </span>
            ) : null}
          </div>
        ) : lone ? (
          <Print media={lone} priority sizes="(min-width: 64rem) 560px, 100vw" tilt="r" className="aspect-[4/3]" />
        ) : null}
      </div>
    </Shell>
  )
}

/* --- disciplines -------------------------------------------------------- */

/** The script a classical language is written in, as its tile's picture. */
const SCRIPTS: [RegExp, string][] = [
  [/tamil/i, 'அ'],
  [/malayalam/i, 'അ'],
  [/sanskrit/i, 'अ'],
]

const INSTRUMENTS: [RegExp, LucideIcon][] = [
  [/vocal|sing/i, Mic],
  [/veena/i, Music],
  [/violin/i, Music2],
  [/dance|natyam/i, Sparkles],
  [/gita|philosoph/i, BookOpen],
]

const iconFor = (subject: string): LucideIcon =>
  INSTRUMENTS.find(([pattern]) => pattern.test(subject))?.[1] ?? Palette

/** "Arts – Classical Languages" → kicker "Arts", name "Classical Languages". */
const splitTitle = (title: string) => {
  const parts = title.split(/\s+[–—-]\s+/)
  return parts.length > 1 ? { kicker: parts[0], name: parts.slice(1).join(' – ') } : { kicker: null, name: title }
}

const Disciplines = ({ block, groups }: { block: Of<'richText'>; groups: Discipline[] }) => (
  <Shell tone={toneOf(block.background)} paper id={headingAnchor(block.heading)}>
    <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end" data-reveal>
      <div>
        <span className="fa-note mb-3" aria-hidden="true">
          Every Saturday
          <Squiggle />
        </span>
        <Heading heading={block.heading} accent={block.accentWord} level={block.headingLevel} />
      </div>
      <p className="max-w-xl text-lg leading-relaxed text-ink-soft lg:justify-self-end">
        {groups.map((group) => splitTitle(group.title).name).join(', ').replace(/, ([^,]*)$/, ' and $1')} —{' '}
        {groups.reduce((sum, group) => sum + group.subjects.length, 0)} subjects at the Centre.
      </p>
    </div>

    <div className="grid gap-6 lg:grid-cols-12">
      {groups.map((group, index) => {
        const { kicker, name } = splitTitle(group.title)
        const scripted = group.subjects.every((subject) => SCRIPTS.some(([pattern]) => pattern.test(subject)))
        const variant = index === 0 ? 'brand' : index === groups.length - 1 && groups.length > 2 ? 'accent' : 'white'
        const span =
          groups.length > 2 ? (index === groups.length - 1 ? 'lg:col-span-12' : index === 0 ? 'lg:col-span-5' : 'lg:col-span-7') : 'lg:col-span-6'

        return (
          <article
            key={group.title}
            className={`${span} ${variant === 'white' ? 'fa-tape' : ''} relative`}
            data-reveal
            style={delay(index, 120)}
          >
            <div className={`fa-panel fa-panel--${variant} overflow-hidden`}>
              {variant === 'accent' ? (
                <span className="fa-watermark font-display" aria-hidden="true" lang="sa">
                  गीता
                </span>
              ) : null}
              <div className={variant === 'accent' ? 'relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center' : 'relative'}>
                <div>
                  {kicker ? <span className="fa-kicker">{kicker}</span> : null}
                  <h3 className="mt-1">{name}</h3>
                  {group.paragraphs.map((text) => (
                    <p
                      key={text}
                      className={`mt-3 leading-relaxed ${variant === 'brand' ? 'text-white/85' : variant === 'accent' ? 'text-brand-ink' : 'text-ink-soft'}`}
                    >
                      {text}
                    </p>
                  ))}
                </div>

                {scripted ? (
                  <ul className="mt-7 grid grid-cols-3 gap-3">
                    {group.subjects.map((subject) => (
                      <li key={subject} className="fa-subject flex flex-col items-center gap-2 text-center">
                        <span className="fa-glyph" aria-hidden="true">
                          {SCRIPTS.find(([pattern]) => pattern.test(subject))?.[1]}
                        </span>
                        <span className="text-sm font-bold text-white">{subject}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className={`grid gap-3 ${variant === 'accent' ? '' : 'mt-7 sm:grid-cols-2'}`}>
                    {group.subjects.map((subject) => {
                      const Icon = iconFor(subject)
                      return (
                        <li
                          key={subject}
                          className={`fa-subject flex items-center gap-3 rounded-2xl p-3 ${variant === 'accent' ? 'bg-white/70' : 'bg-sea'}`}
                        >
                          <span className="fa-instrument" aria-hidden="true">
                            <Icon size={20} strokeWidth={1.8} />
                          </span>
                          <span className="font-bold text-brand">{subject}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  </Shell>
)

/* --- reasons to join ---------------------------------------------------- */

const Reasons = ({ block, reasons }: { block: Of<'richText'>; reasons: Reason[] }) => (
  <Shell tone={toneOf(block.background)} id={headingAnchor(block.heading)}>
    <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <li className="flex flex-col justify-center sm:col-span-2 lg:col-span-1" data-reveal="left">
        <Heading heading={block.heading} accent={block.accentWord} level={block.headingLevel} />
        <span className="fa-note mt-4" aria-hidden="true">
          {reasons.length} good reasons
          <Squiggle />
        </span>
      </li>
      {reasons.map((reason, index) => (
        <li key={reason.term} data-reveal style={delay(index % 4, 80)}>
          <div className={`fa-page ${index % 2 === 0 ? 'fa-tilt-s' : ''}`}>
            <span className="fa-figure block text-accent-deep" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="card-title mt-3">{reason.term}</h3>
            {reason.detail ? (
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                {/* The list reads "Free of cost: quality…"; on its own card the detail starts a sentence. */}
                {reason.detail.charAt(0).toUpperCase() + reason.detail.slice(1)}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  </Shell>
)

/* --- prose -------------------------------------------------------------- */

/*
 * A drop cap only where the section opens on a real paragraph. "We are
 * expanding." followed by a list leaves the capital hanging over the bullets.
 */
const opensLong = (content: unknown) => {
  const first = rootOf(content)[0]
  return first?.type === 'paragraph' && textOf(first).length > 160
}

const Prose = ({ block }: { block: Of<'richText'> }) => (
  <Shell tone={toneOf(block.background)} id={headingAnchor(block.heading)}>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] lg:gap-16">
      <div data-reveal="left">
        <div className="lg:sticky lg:top-28">
          <Heading heading={block.heading} accent={block.accentWord} level={block.headingLevel} />
        </div>
      </div>
      <div data-reveal style={delay(1)}>
        <RichText
          data={block.content}
          className={`fa-prose max-w-3xl text-[1.0625rem] ${opensLong(block.content) ? 'fa-prose--dropcap' : ''}`}
        />
      </div>
    </div>
  </Shell>
)

/* --- creativity at every age -------------------------------------------- */

interface Chapter {
  label: string
  title: string
  description?: string | null
  lead: MediaDoc | null
  extras: { media: MediaDoc; caption: string }[]
}

const chaptersOf = (block: Of<'featureList'>): Chapter[] => {
  const chapters: Chapter[] = []
  for (const item of block.items ?? []) {
    const label = item.chip?.trim()
    if (!label) continue
    let chapter = chapters.find((entry) => entry.label === label)
    const photo = asMedia(item.photo)
    if (!chapter) {
      chapter = { label, title: item.title, description: item.description, lead: photo, extras: [] }
      chapters.push(chapter)
    } else if (photo) {
      chapter.extras.push({ media: photo, caption: item.title })
    }
  }
  return chapters
}

const slugOf = (text: string) => headingAnchor(text) ?? ''

/** The school a chapter's label names, if it names one. */
const unitFor = (label: string, units: Unit[]) =>
  units.find((unit) => {
    const wanted = slugOf(label)
    return unit.slug === wanted || slugOf(unit.shortName) === wanted
  })

const WASHES = [
  'var(--color-brand-tint)',
  'color-mix(in srgb, var(--color-accent) 30%, white)',
  'var(--color-sea)',
  'color-mix(in srgb, var(--color-accent-deep) 22%, white)',
]

const Journeys = ({ block, units }: { block: Of<'featureList'>; units: Unit[] }) => {
  const chapters = chaptersOf(block)
  return (
    <Shell tone={toneOf(block.background)} id={headingAnchor(block.heading)}>
      <div className="mx-auto mb-14 max-w-3xl text-center" data-reveal>
        <Heading heading={block.heading} accent={block.accentWord} className="!text-center" />
        {block.intro ? (
          <RichText data={block.intro} className="mt-5 text-lg text-ink-soft [&_p]:!text-center" />
        ) : null}
      </div>

      {chapters.map((chapter, index) => {
        const unit = unitFor(chapter.label, units)
        const flip = index % 2 === 1
        return (
          <article key={chapter.label} className={`fa-chapter ${flip ? 'fa-chapter--flip' : ''}`}>
            <div
              className={`fa-chapter__art fa-stack ${chapter.extras.length === 0 ? 'fa-stack--single' : ''}`}
              style={{ '--fa-wash': WASHES[index % WASHES.length] } as CSSProperties}
              data-reveal={flip ? 'right' : 'left'}
            >
              {chapter.lead ? (
                <figure className="fa-stack__lead m-0">
                  <Print
                    media={chapter.lead}
                    sizes="(min-width: 64rem) 560px, 100vw"
                    tilt={flip ? 'r' : 'l'}
                    tape="top"
                  />
                </figure>
              ) : null}
              {chapter.extras.slice(0, 2).map((extra, i) => (
                <figure key={extra.media.id} className={`fa-stack__extra fa-stack__extra--${i} m-0`}>
                  <Print
                    media={extra.media}
                    sizes="(min-width: 64rem) 240px, 40vw"
                    tilt={(i + index) % 2 === 0 ? 'r' : 'l'}
                    tape={i === 0 ? 'corner' : undefined}
                  />
                  <figcaption className="sr-only">{extra.caption}</figcaption>
                </figure>
              ))}
            </div>

            <div data-reveal style={delay(1)}>
              <div className="flex items-end gap-4">
                <span className="fa-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="fa-tag mb-2">{chapter.label}</span>
              </div>
              <h3 className="mt-5 text-[clamp(1.5rem,1.3rem+0.8vw,2rem)]">{chapter.title}</h3>
              {chapter.description ? (
                <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">{chapter.description}</p>
              ) : null}
              {chapter.extras.length ? (
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted" aria-label="Also in the photographs">
                  {chapter.extras.map((extra) => (
                    <li key={extra.media.id} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-accent-deep" aria-hidden="true" />
                      {extra.caption}
                    </li>
                  ))}
                </ul>
              ) : null}
              {unit ? (
                <a href={`/${unit.slug}`} className="fa-link mt-7">
                  Visit {unit.name}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </article>
        )
      })}
    </Shell>
  )
}

/* --- a featured moment -------------------------------------------------- */

const Feature = ({ block }: { block: Of<'gallery'> }) => {
  const photos = (block.images ?? [])
    .map((entry) => ({ media: asMedia(entry.image), ...splitCaption(entry.caption ?? asMedia(entry.image)?.caption) }))
    .filter((photo): photo is { media: MediaDoc; label?: string; text?: string } => photo.media !== null)
  const [main, ...rest] = photos
  if (!main) return null

  return (
    <Shell tone="brand" id={headingAnchor(block.heading)}>
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
        <figure className="fa-feature__main m-0 lg:col-span-7" data-reveal="left">
          <Print media={main.media} sizes="(min-width: 64rem) 680px, 100vw" tilt="l" tape="top" tag={main.label} />
          {main.text ? <figcaption className="mt-4 text-sm text-white/75">{main.text}</figcaption> : null}
        </figure>

        <div className="lg:col-span-5" data-reveal style={delay(1)}>
          <span className="fa-note" aria-hidden="true">
            Featured moment
            <Squiggle />
          </span>
          <Heading heading={block.heading} accent={block.accentWord} className="mt-3 !text-white" />
          {block.intro ? <RichText data={block.intro} className="mt-5 text-[1.0625rem] text-white/85" /> : null}

          {rest.length ? (
            <ul className="mt-8 grid grid-cols-3 gap-4">
              {rest.slice(0, 3).map((photo, i) => (
                <li key={photo.media.id}>
                  <figure className="fa-feature__small m-0">
                    <Print media={photo.media} sizes="(min-width: 64rem) 150px, 30vw" tilt={i % 2 ? 'r' : 'l'} />
                    {photo.text ? (
                      <figcaption className="mt-3 text-xs leading-snug text-white/80">{photo.text}</figcaption>
                    ) : null}
                  </figure>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </Shell>
  )
}

/* --- the gallery wall --------------------------------------------------- */

const Wall = ({ block }: { block: Of<'gallery'> }) => {
  const pieces: ArtPiece[] = (block.images ?? []).flatMap((entry, i) => {
    const media = asMedia(entry.image)
    if (!media) return []
    const { label, text } = splitCaption(entry.caption ?? media.caption)
    return [{ id: entry.id ?? `piece-${i}`, media, label, caption: text }]
  })
  if (!pieces.length) return null

  return (
    <Shell tone={toneOf(block.background)} paper id={headingAnchor(block.heading)}>
      <div className="mb-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end" data-reveal>
        <div>
          <span className="fa-note mb-3" aria-hidden="true">
            From all four schools
            <Squiggle />
          </span>
          <Heading heading={block.heading} accent={block.accentWord} />
        </div>
        {block.intro ? <RichText data={block.intro} className="max-w-xl text-lg text-ink-soft lg:justify-self-end" /> : null}
      </div>
      <ArtGallery pieces={pieces} />
    </Shell>
  )
}

/* --- the page ----------------------------------------------------------- */

export const FineArtsPage = ({ blocks, units }: { blocks: Page['layout']; units: Unit[] }) => {
  const list = blocks ?? []
  const heroAt = list.findIndex((block) => block.blockType === 'hero')
  const afterHero = heroAt === -1 ? undefined : list[heroAt + 1]
  const collage = afterHero?.blockType === 'gallery' ? afterHero : null
  const lastGallery = list.findLastIndex((block) => block.blockType === 'gallery' && block !== collage)

  return (
    <div id={ROOT_ID} className="fa">
      {list.map((block, index) => {
        const key = block.id ?? `${block.blockType}-${index}`
        if (block === collage) return null
        switch (block.blockType) {
          case 'hero':
            return <Hero key={key} block={block} collage={collage} />
          case 'richText': {
            const groups = disciplinesOf(block.content)
            if (groups) return <Disciplines key={key} block={block} groups={groups} />
            const reasons = reasonsOf(block.content)
            if (reasons) return <Reasons key={key} block={block} reasons={reasons} />
            return <Prose key={key} block={block} />
          }
          case 'featureList':
            if ((block.items ?? []).some((item) => item.chip?.trim()))
              return <Journeys key={key} block={block} units={units} />
            break
          case 'gallery':
            return index === lastGallery ? <Wall key={key} block={block} /> : <Feature key={key} block={block} />
        }
        return <RenderBlocks key={key} blocks={[block]} units={units} />
      })}
      <SportMotion rootId={ROOT_ID} armedClass="fa-armed" />
    </div>
  )
}
