import { BookOpen, GraduationCap, NotebookPen, Palette, type LucideIcon } from 'lucide-react'
import config from '@payload-config'
import { getPayload } from 'payload'

import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import { intoTeams } from '@/lib/faculty-teams'
import type { Faculty, FacultyBlock, Unit } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * Renders the unit's published teacher profiles.
 *
 * An async Server Component that fetches its own data, rather than having the
 * roster threaded down from the route. That keeps the query where it is used —
 * a page with no teachers block costs nothing — and `overrideAccess: false`
 * applies the same publish rules as every other public query.
 */
export const FacultyBlockView = async ({
  block,
  unit,
}: {
  block: FacultyBlock
  unit: Unit | null
}) => {
  // Profiles belong to a school; on the institution-wide portal there is no
  // roster to show.
  if (!unit) return null

  const payload = await getPayload({ config })

  /**
   * The school is published as a single entity, so the roster is never narrowed
   * by campus. The block's own campus setting is ignored rather than honoured:
   * Wadala and Matunga are no longer presented as separate places, and a
   * filter that quietly hid two thirds of the teachers would be the one
   * visible trace of a distinction the school has dropped.
   */
  const grouped = block.layout === 'teams'

  /*
   * Where the monogram sits, which is a separate question from whether the
   * roster is grouped.
   *
   * Unset means beside the name, because that is how every block saved before
   * the field existed was rendered — a new default would silently restyle the
   * Secondary and Junior College rosters, which nobody asked for.
   *
   * It applies to the flat grid only. In the grouped columns each team already
   * leads with a larger head-teacher card, and centring the text under it as
   * well left the column with two competing centres.
   */
  const centred = block.cardLayout === 'centred'
  const { docs: teachers } = await payload
    .find({
      collection: 'faculty',
      where: { unit: { equals: unit.id } },
      sort: 'order',
      limit: 100,
      depth: 1,
      overrideAccess: false,
    })
    .catch(() => ({ docs: [] as Faculty[] }))

  if (teachers.length === 0) return null

  /**
   * The roster as lists, each led by its head teacher.
   *
   * Primary has two head teachers and SIWS lists its staff under each (asked
   * again, 2026-10-12: Mrs. Bagayatkar and her teachers on the left, Mrs.
   * Geeta Raja and hers on the right). When the campuses stopped being shown
   * the two lists were pooled into one column under both heads, which is not
   * the same thing: whose teachers were whose went with the campus name.
   *
   * `intoTeams` splits on the roster's own order — a head teacher leads
   * whoever follows her, up to the next head teacher — so the lists are back
   * and the stored campus value is still not read. A section with one head
   * teacher is one list, exactly as it was.
   */
  const teams = grouped ? intoTeams(teachers) : []

  /** The monogram or photograph. Bigger for a head teacher, bigger again when stacked. */
  const face = (teacher: (typeof teachers)[number], lead: boolean, stacked = false) =>
    teacher.photo ? (
      <Media
        resource={teacher.photo}
        sizes={stacked ? '104px' : '96px'}
        className={
          (stacked ? 'size-24' : lead ? 'size-20' : 'size-16') +
          ' shrink-0 rounded-full object-cover'
        }
      />
    ) : (
      /* A neutral monogram rather than a stock silhouette — most of the
         roster has no photograph yet, and a placeholder face would read
         as a real person. */
      <span
        aria-hidden="true"
        className={
          (stacked
            ? 'size-24 bg-brand-tint text-xl'
            : lead
              ? 'size-20 bg-white text-lg'
              : 'size-16 bg-brand-tint text-base') +
          ' grid shrink-0 place-items-center rounded-full font-bold text-brand'
        }
      >
        {initials(teacher.name)}
      </span>
    )

  /** Name, role and qualifications. */
  const details = (teacher: (typeof teachers)[number], stacked = false) => (
    /*
     * `min-w-0` only in the row layout, where the text shares its line with
     * the monogram and has to be allowed to shrink. Stacked, the text owns the
     * full card width and needs no such permission.
     */
    <span className={stacked ? 'mt-4' : 'min-w-0'}>
      <strong className="block text-[1.02rem] leading-snug text-brand">{teacher.name}</strong>

      {teacher.designation ? (
        <span className="mt-0.5 block text-sm font-semibold text-ink-soft">
          {teacher.designation}
        </span>
      ) : null}

      {block.showQualifications !== false && teacher.qualifications ? (
        <span className="mt-1 block text-sm text-ink-muted">{teacher.qualifications}</span>
      ) : null}

      {teacher.message ? <RichText data={teacher.message} className="mt-2 text-sm" /> : null}
    </span>
  )

  /**
   * The mark in the corner of an assistant teacher's card.
   *
   * Decoration, not information: it says nothing about the person and is
   * hidden from assistive technology. A roster of nine identical white
   * cards in a column reads as a table that lost its rules, and four marks
   * in rotation give the eye something to count down.
   *
   * Chosen by POSITION, not at random, so the same card carries the same
   * mark on every render — a server component that shuffled would disagree
   * with itself between the HTML and the hydration.
   *
   * An art teacher gets the palette wherever she sits in the list, because
   * that one is not decoration.
   */
  const CORNER_MARKS: LucideIcon[] = [BookOpen, NotebookPen, GraduationCap, Palette]
  const cornerMark = (person: { designation?: string | null }, index: number): LucideIcon =>
    /art/i.test(person.designation ?? '') ? Palette : CORNER_MARKS[index % CORNER_MARKS.length]!

  const initials = (name: string) =>
    name
      .replace(/^(Mrs|Mr|Ms|Miss|Dr)\.?\s+/i, '')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')

  return (
    <Section background={block.background as BlockBackground}>
      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
        className="mb-4"
      />

      {block.intro ? (
        <RichText data={block.intro} className="mb-9 siws-centre mx-auto max-w-3xl" />
      ) : null}

      {/*
        One person, in the shape used everywhere on this page. Pulled out so
        the grid and the grouped columns cannot drift apart: a head teacher
        and an assistant differ only in the size of the monogram beside them.
      */}
      {grouped ? (
        <div
          /*
           * TWO COLUMNS ONLY WHEN THERE ARE TWO TEAMS.
           *
           * Primary is the section this layout was built for and it has two
           * lists, so the columns were hard-coded. Every other section has one
           * — Kindergarten has a single head teacher, and Secondary and the
           * Junior College none by that title — and a lone column in a
           * two-column grid leaves half the page blank beside it.
           *
           * One team therefore runs full width, which is the same page in one
           * column rather than a narrow strip with a hole to its right.
           *
           * `items-start` because the two lists are not the same length: left
           * to stretch, the shorter column's cards would be spread down to
           * the foot of the longer one.
           */
          className={`grid items-start gap-10 lg:gap-8 ${teams.length > 1 ? 'lg:grid-cols-2' : ''}`}
        >
          {teams.map((team, at) => (
            <div key={team.heads[0]?.id ?? `team-${at}`}>
              {team.heads.length > 0 ? (
                // Side by side where two heads share one list, so neither
                // reads as the other's deputy.
                <div className={`grid gap-3 ${team.heads.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                  {team.heads.map((head) => (
                    <article
                      key={head.id}
                      className="flex items-start gap-4 rounded-2xl bg-brand-tint p-5 ring-1 ring-brand/20"
                    >
                      {face(head, true)}
                      {details(head)}
                    </article>
                  ))}
                </div>
              ) : null}

              {team.rest.length > 0 ? (
                <ul
                  className="mt-4 grid gap-3"
                  /*
                   * Two lists that look alike need telling apart by ear as
                   * well as by eye: without a name each is announced only as
                   * "list, nine items".
                   */
                  aria-label={
                    teams.length > 1 && team.heads[0]
                      ? `Teachers led by ${team.heads.map((head) => head.name).join(' and ')}`
                      : undefined
                  }
                >
                  {team.rest.map((teacher, index) => {
                    const Mark = cornerMark(teacher, index)
                    return (
                      <li
                        key={teacher.id}
                        /*
                         * `relative` anchors the corner mark and `overflow-hidden`
                         * is what makes it a quarter round rather than a circle
                         * hanging off the card. The head teacher's card above is
                         * deliberately untouched: it is the one card in the
                         * column that should not look like the others.
                         *
                         * THE LEFT END IS A SEMICIRCLE, following the monogram
                         * rather than boxing it: `rounded-l-full` takes the
                         * radius from the card's own height, so the curve stays
                         * true to the disc whether the text runs to two lines or
                         * four.
                         *
                         * The right end is softened rather than matched:
                         * `rounded-r-3xl` at 24px is enough to lose the square
                         * corner, and stopping short of the left's semicircle is
                         * what keeps the card reading left-to-right instead of
                         * as a symmetrical pill. The mark sits inside that corner
                         * and `overflow-hidden` trims it to the same curve.
                         *
                         * PADDING IS NOT SYMMETRIC, and cannot be. `pl-6` clears
                         * the curve so the monogram is not pressed into it,
                         * `pr-14` keeps a long name off the mark, and `gap-5`
                         * is the air between the disc and the name — at gap-4
                         * the two read as one object.
                         *
                         * `items-center` rather than `items-start`: against a
                         * semicircular end, text aligned to the top sits visibly
                         * above the disc's centre and the card looks tipped.
                         */
                        className="relative flex items-center gap-5 overflow-hidden rounded-l-full rounded-r-3xl border border-line bg-white py-4 pr-14 pl-6 shadow-card"
                      >
                        {face(teacher, false)}
                        {details(teacher)}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute right-0 bottom-0 grid size-14 place-items-center rounded-tl-[1.75rem] bg-brand-tint/70 text-brand/40"
                        >
                          <Mark size={20} strokeWidth={1.7} className="translate-x-1 translate-y-1" />
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <li
              key={teacher.id}
              className={
                centred
                  ? 'flex flex-col items-center rounded-2xl border border-line bg-white p-6 text-center shadow-card'
                  : 'flex items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-card'
              }
            >
              {face(teacher, false, centred)}
              {details(teacher, centred)}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
