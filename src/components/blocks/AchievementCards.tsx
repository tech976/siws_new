import Link from 'next/link'
import { ArrowRight, Trophy } from 'lucide-react'

import { Media } from '@/components/Media'
import type { Media as MediaDoc } from '@/payload-types'

export interface AchievementCardItem {
  id?: string | null
  title?: string | null
  date?: string | null
  summary?: string | null
  photo?: MediaDoc | null
  href?: string | null
}

/**
 * "Latest achievements": each win as a card.
 *
 * The news layout (one big story, then a grid) suited news, but an achievement
 * published without a photograph came out as a bare headline across the page.
 * Here every card is the same shape: a photograph, or a gold trophy panel when
 * there is none, then the date, the title, a line or two, and a link to the
 * item's own page.
 */
export const AchievementCards = ({
  items,
  titleTag: Title,
}: {
  items: AchievementCardItem[]
  titleTag: 'h3' | 'h4'
}) => {
  const single = items.length === 1
  const columns =
    items.length === 2 ? 'sm:grid-cols-2 max-w-4xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <ul className={single ? 'mx-auto max-w-4xl' : `grid grid-cols-1 gap-7 ${columns}`}>
      {items.map((item, index) => {
        const picture = item.photo ? (
          <Media
            resource={item.photo}
            fill
            sizes={single ? '(min-width: 640px) 40vw, 100vw' : '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw'}
            className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.04]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#ffd27a_0%,var(--color-accent)_45%,var(--color-accent-deep)_100%)]"
          >
            <span className="flex size-24 items-center justify-center rounded-full bg-white/25 ring-8 ring-white/15">
              <Trophy className="size-12 text-brand-deep" strokeWidth={1.75} />
            </span>
          </div>
        )

        const body = (
          <div className={`flex flex-1 flex-col ${single ? 'p-7 sm:p-9' : 'p-6'}`}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-brand">
                <Trophy className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
                Achievement
              </span>
              {item.date ? (
                <span className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-brand/70">
                  {item.date}
                </span>
              ) : null}
            </div>
            <Title
              className={`text-balance font-bold leading-snug text-brand ${single ? 'text-[1.375rem] sm:text-[1.5rem]' : 'text-[1.125rem]'}`}
            >
              {item.title}
            </Title>
            {item.summary ? (
              <p className="mt-3 line-clamp-4 text-[0.975rem] leading-relaxed text-ink-soft">
                {item.summary}
              </p>
            ) : null}
            {item.href ? (
              <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[0.95rem] font-semibold text-brand">
                Read more
                <ArrowRight
                  className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            ) : null}
          </div>
        )

        const card = (
          <>
            <div
              className={`relative overflow-hidden bg-brand-tint ${single ? 'aspect-4/3 sm:aspect-auto sm:min-h-72' : 'aspect-4/3'}`}
            >
              {picture}
            </div>
            {body}
          </>
        )

        const shell = `group flex h-full overflow-hidden rounded-3xl bg-white ring-1 ring-line shadow-[0_1px_2px_rgba(36,39,111,0.04),0_10px_28px_-16px_rgba(36,39,111,0.20)] transition-[transform,box-shadow] duration-300 ease-out hover:shadow-[0_2px_8px_rgba(36,39,111,0.10),0_22px_44px_-20px_rgba(36,39,111,0.32)] motion-safe:hover:-translate-y-1 ${single ? 'flex-col sm:grid sm:grid-cols-[2fr_3fr]' : 'flex-col'}`

        return (
          <li key={item.id ?? index} className="h-full">
            {item.href ? (
              <Link href={item.href} className={`${shell} focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-brand`}>
                {card}
              </Link>
            ) : (
              <article className={shell}>{card}</article>
            )}
          </li>
        )
      })}
    </ul>
  )
}
