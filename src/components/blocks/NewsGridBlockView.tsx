import config from '@payload-config'
import { getPayload } from 'payload'

import Link from 'next/link'
import { ArrowRight, Images } from 'lucide-react'

import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import { newestFirst } from '@/lib/newest-first'
import type { NewsGridBlock, Media as MediaDoc, Unit } from '@/payload-types'
import { hiddenTwins, sameTitle } from '@/utilities/typed-news'

import { AchievementCards } from './AchievementCards'
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

/** "8 photos" over a card's picture, when an item has more than one. */
const PhotoCount = ({ count }: { count: number }) =>
  count > 1 ? (
    <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-brand-deep/80 px-3 py-1 text-[0.8rem] font-semibold text-white backdrop-blur-sm">
      <Images className="size-4" aria-hidden="true" />
      {count} photos
    </span>
  ) : null

/** The line at the foot of a card that opens the item. */
const OpenLine = ({ count }: { count: number }) => (
  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[0.95rem] font-semibold text-brand">
    {count > 1 ? `See all ${count} photos` : 'Read more'}
    <ArrowRight
      className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
      aria-hidden="true"
    />
  </span>
)

/**
 * The card's link, or a plain wrapper for a story typed into the page, which
 * has no page of its own.
 */
const CardLink = ({
  href,
  className,
  children,
}: {
  href?: string | null
  className: string
  children: React.ReactNode
}) =>
  href ? (
    <Link
      href={href}
      className={`${className} focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-brand`}
    >
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
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
export const NewsGridBlockView = async ({
  block,
  unit,
}: {
  block: NewsGridBlock
  unit?: Unit | null
}) => {
  const typed = (block.items ?? []).filter((item) => item.photo && typeof item.photo === 'object')
  // Blocks placed before the setting existed carry no value, and were listing news.
  const shows = block.shows ?? 'news'

  /**
   * A TYPED STORY ANSWERS TO ITS ITEM IN THE PANEL.
   *
   * Some stories are here twice: typed into this block when the site was
   * built, and as an item in News & Events made from it. The typed copy is the
   * one shown, and it was shown whatever became of the item — so a teacher who
   * unpublished a story in the panel still found it on the page, on the
   * Kindergarten's News page for every one of its seven.
   *
   * A typed story with an item of the same name in this school is therefore
   * shown only while that item is live. One with no item is the page's own,
   * and is shown as before. See `typed-news.ts`.
   *
   * Every state is read here, drafts included, which is the one thing the
   * listing below must not do — it is only ever used to leave a story OUT.
   */
  const hidden =
    typed.length === 0
      ? new Set<string>()
      : await (async () => {
          try {
            const payload = await getPayload({ config })
            const { docs } = await payload.find({
              collection: 'posts',
              where: unit ? { unit: { equals: unit.id } } : { unit: { exists: false } },
              limit: 500,
              depth: 0,
              select: { title: true, _status: true, publishAt: true, unpublishAt: true },
              overrideAccess: true,
            })
            return hiddenTwins(
              typed.map((item) => item.title),
              docs,
            )
          } catch {
            // Unsure is not a reason to take a story down.
            return new Set<string>()
          }
        })()
  const stored = typed.filter((item) => !hidden.has(sameTitle(item.title)))

  /**
   * STORIES PUBLISHED IN NEWS & EVENTS.
   *
   * News was published two different ways: these stories, typed into a block on
   * this page, and the News & Events collection in the sidebar — which is where
   * a teacher is told to add news, and which appeared nowhere on the site.
   * Neither knew about the other, so the panel showed nothing of what was
   * published and anything published in the panel was invisible.
   *
   * THE LATEST IS AT THE TOP (SIWS, 2026-10-12: "the latest news,
   * achievement should be on the top of the page… latest, then below the
   * older and older"). What is published comes newest first, each item above
   * any typed story that is older than it or has no date — see
   * `newestFirst`. It used to follow the typed stories, all of them, so a
   * prize won last week sat under a story from July.
   *
   * The block's own stories keep the order somebody chose among themselves,
   * and a page with nothing published reads exactly as before. A story that
   * has been migrated into the collection is matched by title and shown once,
   * not twice.
   */
  const fromCollection = await (async () => {
    try {
      const payload = await getPayload({ config })

      const seen = new Set(
        stored
          .map((item) => (typeof item.title === 'string' ? item.title.trim().toLowerCase() : ''))
          .filter(Boolean),
      )

      const { docs } = await payload.find({
        collection: 'posts',
        /*
         * `kind` is null on items published before the News/Event choice
         * existed, and those were all news — so "news" means "not an event"
         * rather than an exact match, or the News page would empty itself.
         *
         * That also keeps an achievement under News, as well as on the
         * Achievements page: a prize is news, and a school with no
         * Achievements page yet still has somewhere its wins appear.
         */
        where: {
          and: [
            /*
             * A school's page lists that school's. A page of the main site
             * lists only what an administrator has ticked for it — never
             * every school's, unpicked.
             */
            unit ? { unit: { equals: unit.id } } : { showOnHome: { equals: true } },
            shows === 'news' ? { kind: { not_equals: 'event' } } : { kind: { equals: shows } },
          ],
        },
        sort: '-date',
        limit: 24,
        depth: 1,
        /*
         * `false` so a draft stays invisible until it is published — the same
         * rule the rest of the site reads by, rather than one written here.
         */
        overrideAccess: false,
      })

      return docs
        .filter((doc) => !seen.has(String(doc.title ?? '').trim().toLowerCase()))
        .map((doc) => {
          const photo = Array.isArray(doc.photos) ? doc.photos[0] : null
          const unitRef = doc.unit as unknown
          const unitSlug =
            unitRef && typeof unitRef === 'object' && 'slug' in unitRef
              ? String((unitRef as { slug: string }).slug)
              : null
          return {
            /** The item's own page. */
            href: doc.slug ? (unitSlug ? `/${unitSlug}/${doc.slug}` : `/${doc.slug}`) : null,
            id: `post-${doc.id}`,
            /** For placing it among the typed stories; not rendered. */
            at: new Date(doc.date).getTime(),
            title: doc.title,
            date: doc.date
              ? new Date(doc.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : null,
            summary: doc.summary ?? null,
            photo: photo as MediaDoc | null,
            /** How many photographs the item has, for the "8 photos" badge. */
            photoCount: Array.isArray(doc.photos) ? doc.photos.length : 0,
          }
        })
    } catch {
      /*
       * A failed lookup leaves the page showing exactly what it showed before.
       * A news list missing its newest story is a far smaller fault than a news
       * page that fails to render.
       */
      return []
    }
  })()

  const items = newestFirst(stored, fromCollection) as typeof stored
  if (items.length === 0) return null

  const [lead, ...rest] = items
  /** The link and photo count an item from News & Events carries. */
  const more = (item: (typeof items)[number]) =>
    item as typeof item & { href?: string | null; photoCount?: number }

  /*
   * One level below the section heading, so the outline never skips a rank
   * (WCAG 2.1 SC 1.3.1) — the same rule the card and feature-list blocks
   * follow, and for the same reason.
   */
  const StoryTitle = block.heading && block.headingLevel === 'h3' ? 'h4' : 'h3'

  /*
   * Achievements are cards of one shape, each opening onto its own page, so a
   * win published without a photograph gets a trophy panel instead of
   * appearing as a bare headline.
   */
  if (shows === 'achievement') {
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
        <AchievementCards
          titleTag={StoryTitle}
          items={items.map((item) => {
            const entry = item as typeof item & { href?: string | null }
            return {
              id: item.id ?? null,
              title: item.title,
              date: item.date ?? null,
              summary: item.summary ?? null,
              photo: (item.photo && typeof item.photo === 'object' ? item.photo : null) as MediaDoc | null,
              href: entry.href ?? null,
            }
          })}
        />
      </Section>
    )
  }

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
         * below it. The whole card opens the item, where every photograph is
         * shown: a list card can only carry the first one, and with no link
         * a teacher who added eight saw one and thought the rest were lost.
         */
        <CardLink
          href={more(lead).href}
          className={`group grid items-center gap-8 lg:gap-12${lead.photo ? ' lg:grid-cols-2' : ''}`}
        >
          {lead.photo ? (
            <div className="relative aspect-16/10 overflow-hidden rounded-3xl bg-brand-tint ring-1 ring-line/60">
              <Media
                resource={lead.photo as MediaDoc}
                fill
                sizes="(min-width: 1024px) 48vw, 100vw"
                className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
              />
              <PhotoCount count={more(lead).photoCount ?? 0} />
            </div>
          ) : null}

          <div className="flex min-w-0 flex-col">
            {lead.date ? <DateLabel value={lead.date} className="mb-3" /> : null}
            <StoryTitle className="text-balance text-[1.5rem] font-bold leading-tight text-brand sm:text-[1.75rem]">
              {lead.title}
            </StoryTitle>
            {lead.summary ? (
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">{lead.summary}</p>
            ) : null}
            {more(lead).href ? <OpenLine count={more(lead).photoCount ?? 0} /> : null}
          </div>
        </CardLink>
      ) : null}

      {rest.length > 0 ? (
        <ul className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((item, index) => (
            <li key={item.id ?? index} className="h-full">
              <CardLink
                href={more(item).href}
                className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line shadow-[0_1px_2px_rgba(36,39,111,0.04),0_10px_28px_-16px_rgba(36,39,111,0.20)] transition-[transform,box-shadow] duration-300 ease-out hover:shadow-[0_2px_8px_rgba(36,39,111,0.10),0_22px_44px_-20px_rgba(36,39,111,0.32)] motion-safe:hover:-translate-y-1"
              >
                {item.photo ? (
                  <div className="relative aspect-3/2 overflow-hidden bg-brand-tint">
                    <Media
                      resource={item.photo as MediaDoc}
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                      className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.04]"
                    />
                    <PhotoCount count={more(item).photoCount ?? 0} />
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col p-6">
                  {item.date ? <DateLabel value={item.date} className="mb-2" /> : null}
                  <StoryTitle className="text-balance text-[1.0625rem] font-bold leading-snug text-brand">
                    {item.title}
                  </StoryTitle>
                  {item.summary ? (
                    <p className="mt-2.5 line-clamp-4 text-[0.95rem] leading-relaxed text-ink-soft">
                      {item.summary}
                    </p>
                  ) : null}
                  {more(item).href ? <OpenLine count={more(item).photoCount ?? 0} /> : null}
                </div>
              </CardLink>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  )
}
