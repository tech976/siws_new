import { CMSLink, resolveCMSHref } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { CardGridBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

const COLUMN_CLASS: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
}

const SIZES: Record<string, string> = {
  '2': '(min-width: 640px) 45vw, 100vw',
  '3': '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw',
  '4': '(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 100vw',
}

/*
 * A photograph fills its window and is cropped to it; a poster is fitted whole
 * inside one. `object-contain` leaves bars where the image does not fill the
 * frame, so the poster frame paints a tinted ground behind it rather than
 * leaving the card's white showing through as a mismatched border.
 */
const FRAME_CLASS: Record<string, string> = {
  photo: 'aspect-4/3 w-full object-cover',
  poster: 'aspect-4/3 w-full object-contain bg-brand-tint',
}

export const CardGridBlockView = ({ block }: { block: CardGridBlock }) => {
  const columns = block.columns ?? '3'
  const cards = block.cards ?? []
  const frame = FRAME_CLASS[block.imageFrame ?? 'photo'] ?? FRAME_CLASS.photo

  if (cards.length === 0) return null

  return (
    <Section background={block.background as BlockBackground}>
      {block.heading ? (
        /*
         * `mb-4` is the gap down to an INTRO, which then carries its own
         * `mb-10` on to the cards. With no intro that 16px was the entire
         * distance from the heading to the top of the first card, so the two
         * read as one lump — the same trap the feature list fell into. Without
         * an intro the heading takes the 40px the intro would have passed on.
         */
        <SectionHeading
          heading={block.heading}
          accentWord={block.accentWord}
          level={block.headingLevel}
          className={block.intro ? 'mb-4' : 'mb-10'}
        />
      ) : null}

      {block.intro ? (
        <RichText data={block.intro} className="mb-10 siws-centre mx-auto max-w-3xl" />
      ) : null}

      <ul className={`grid gap-6 ${COLUMN_CLASS[columns] ?? COLUMN_CLASS['3']}`}>
        {cards.map((card, index) => {
          const link = card.cta?.[0]?.link
          const href = resolveCMSHref(link)

          /*
           * IS THE WHOLE PICTURE AN UPRIGHT ONE?
           *
           * "Show the whole picture" and "needs a narrow card" are not the
           * same question, and treating them as one made the #SwachhtaMonitor
           * certificate three-quarters the width of the card beside it on the
           * news page — a row of two where one had visibly failed.
           *
           * The narrow cap exists for the Onam invitation, which is 4:5: in a
           * full-width card an upright picture leaves about 130px of white
           * down either side and floats. A landscape picture has no such
           * problem — it fills the width and is simply short — so it keeps the
           * card the grid gave it and the row stays level.
           *
           * Unknown dimensions read as landscape, which is the safe default:
           * the worst case is a card the same width as its neighbours.
           */
          const image = card.image && typeof card.image === 'object' ? card.image : null
          const upright =
            typeof image?.width === 'number' &&
            typeof image?.height === 'number' &&
            image.height > image.width

          return (
            <li
              key={card.id ?? index}
              // `relative` is what the title link's ::after overlay anchors to,
              // turning the whole card into the click target.
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-transform focus-within:-translate-y-1 hover:-translate-y-1${
                /*
                 * A card showing a whole UPRIGHT picture is sized to that
                 * picture: 20rem across, so a 4:5 poster comes out 320x400
                 * with its edges flush to the card and the caption under it
                 * set to the same measure. See `upright` above for why a wide
                 * picture does not get this.
                 */
                card.fit === 'whole' && upright ? ' max-w-80' : ''
              }`}
            >
              {card.image ? (
                /*
                 * A card crops to 4:3 so a row of them lines up, which is
                 * right for photographs and wrong for anything with words on
                 * it. The Onam invitation is 4:5 and lost its crest, the
                 * school's name and the date, the venue and the time — every
                 * part a reader needed — to the top and bottom of that crop.
                 *
                 * "Whole" drops the fixed ratio and lets the picture set its
                 * own height. The card grows taller than its neighbours, and
                 * for a poster that is the correct trade.
                 */
                <Media
                  resource={card.image}
                  sizes={SIZES[columns] ?? SIZES['3']}
                  className={
                    card.fit === 'whole'
                      ? /*
                         * Fills the card's width, and the card is what is
                         * narrow — see the `max-w-80` on the list item.
                         *
                         * Capping the IMAGE's height instead worked out to the
                         * same picture size but left the card at its full grid
                         * width with the poster floating in the middle of it,
                         * about 130px of white down either side. An upright
                         * picture needs an upright card, not a wide card with
                         * an upright picture parked in it.
                         *
                         * This overrides the block's own `imageFrame`, which
                         * is the coarser setting: the frame says what KIND of
                         * picture the grid holds, and this says that one card
                         * is not like the others.
                         */
                        'h-auto w-full'
                      : frame
                  }
                />
              ) : null}

              {/*
                Centred inside the card. A three-card row of ranged-left text
                reads as three fragments pushed to the left of their boxes; the
                row only looks deliberate when each card is symmetrical about
                its own middle. Justification is dropped here for the same
                reason — a two-line card has nothing to distribute.
              */}
              <div className="flex flex-1 flex-col p-6 text-center">
                <h3 className="card-title">
                  {href && link ? (
                    /*
                     * The link wraps the title rather than the card. A card-wide
                     * anchor swallows the text selection and reads as one long
                     * link to a screen reader; the ::after span below restores
                     * the whole-card click target without either problem.
                     */
                    <CMSLink
                      link={link}
                      overrideClassName
                      className="after:absolute after:inset-0 after:content-[''] focus:outline-none"
                    >
                      {card.title}
                    </CMSLink>
                  ) : (
                    card.title
                  )}
                </h3>

                {card.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">{card.description}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
