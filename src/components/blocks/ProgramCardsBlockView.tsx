import { ArrowRight } from 'lucide-react'

import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { ProgramCardsBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * Picture cards with the title over the image.
 *
 * The gradient beneath the text is not decoration. Contrast against a
 * photograph cannot be predicted — a content manager may upload a bright
 * classroom or a dark corridor — so the bottom of every card is darkened to a
 * near-solid brand blue behind the words, and the caption sits on that rather
 * than on the picture.
 */
export const ProgramCardsBlockView = ({ block }: { block: ProgramCardsBlock }) => {
  const cards = (block.cards ?? [])
    .filter((card) => card.image)
    // The link is an array of at most one, so a card may have none.
    .map((card) => ({ ...card, link: card.cta?.[0]?.link ?? null }))
  if (cards.length === 0) return null

  const columns =
    cards.length >= 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : cards.length === 3
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : 'sm:grid-cols-2'

  return (
    <Section background={block.background as BlockBackground}>
      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
        className=""
      />

      {block.intro ? (
        <RichText data={block.intro} className="mb-10 siws-centre mx-auto max-w-3xl" />
      ) : null}

      <ul className={`grid gap-6 ${columns}`}>
        {cards.map((card, index) => (
          <li key={card.id ?? index} className="group relative overflow-hidden rounded-2xl">
            <div className="relative aspect-4/3">
              <Media
                resource={card.image}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-brand via-brand/70 to-transparent"
              />
            </div>

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
              <div className="min-w-0">
                <h3 className="text-xl leading-tight text-white">
                  {card.link ? (
                    /* The whole card is the target — `after:absolute` stretches
                       the link over it, so the hit area is the card while the
                       accessible name stays just the title. */
                    <CMSLink
                      link={card.link}
                      overrideClassName
                      className="after:absolute after:inset-0"
                    >
                      {card.title}
                    </CMSLink>
                  ) : (
                    card.title
                  )}
                </h3>

                {card.caption ? (
                  <p className="mt-1.5 text-sm text-white/90">{card.caption}</p>
                ) : null}
              </div>

              {card.link ? (
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-brand transition-transform group-hover:translate-x-1"
                >
                  <ArrowRight size={18} strokeWidth={2.5} />
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
