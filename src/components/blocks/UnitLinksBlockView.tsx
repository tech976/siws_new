import Link from 'next/link'

import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { UnitLinksBlock, Unit } from '@/payload-types'
import { accentHex } from '@/theme/tokens'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * Renders a card per active unit.
 *
 * The units are passed in by the route rather than fetched here, so the whole
 * page still costs one query for them however many times the block appears.
 *
 * The cards are ordered by `unit.order`, which is age order — Kindergarten
 * through to Junior College. That sequence is the actual information here: a
 * parent arrives knowing their child's age, not the name of a school, so the
 * row is read as a progression and each card states the stage it covers.
 *
 * Each card carries its own school's accent colour as a rule along the top.
 * The colour is already held on the unit and already used on that unit's site,
 * so it links the card to the place it leads rather than decorating it.
 */
export const UnitLinksBlockView = ({
  block,
  units,
}: {
  block: UnitLinksBlock
  units: Unit[]
}) => {
  if (units.length === 0) return null

  return (
    <Section background={block.background as BlockBackground}>
      {/* `siws-centre` and not `text-center` alone: `.siws-prose` justifies by
          default, which leaves a one-line intro ranged left inside its centred
          box and optically off from the heading above it. */}
      <div className="siws-centre mx-auto max-w-2xl text-center">
        <SectionHeading
          heading={block.heading}
          accentWord={block.accentWord}
          level={block.headingLevel}
          className="mb-3"
        />
        {block.intro ? <RichText data={block.intro} /> : null}
      </div>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {units.map((unit) => (
          <li
            key={unit.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-transform focus-within:-translate-y-1 hover:-translate-y-1"
          >
            {/* The school's own colour, as a rule rather than a fill. */}
            <span
              aria-hidden="true"
              className="h-1.5 w-full shrink-0"
              style={{ backgroundColor: accentHex(unit.accent) }}
            />

            {unit.heroImage ? (
              /*
               * The ratio is held by this wrapper with the photograph filling
               * it. An `aspect-*` class on the image itself does nothing —
               * `next/image` writes real width and height attributes and the
               * base `img { height: auto }` rule then overrides the ratio, so
               * a portrait upload made one card twice the height of the rest.
               */
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Media
                  resource={unit.heroImage}
                  sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 100vw"
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : null}

            <div className="flex flex-1 flex-col p-6">
              <h3 className="card-title">
                {/* The overlay makes the whole card clickable while keeping the
                    accessible name to just the school. */}
                <Link
                  href={`/${unit.slug}`}
                  className="after:absolute after:inset-0 after:content-['']"
                >
                  {unit.shortName}
                </Link>
              </h3>

              {unit.tagline ? (
                <p className="mt-2 text-base font-semibold text-brand">{unit.tagline}</p>
              ) : null}

              {unit.description ? (
                <p className="siws-justify mt-3 text-base leading-relaxed text-ink-muted">{unit.description}</p>
              ) : null}

              {/*
                `mt-auto` pins this to the bottom of every card whatever the
                length of the description above it, so the row of cards ends on
                one line instead of four ragged ones.
              */}
              <span
                aria-hidden="true"
                className="mt-auto pt-5 text-sm font-semibold text-brand"
              >
                Visit site
                <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
