import { BookOpen, GraduationCap, NotebookPen, Palette, type LucideIcon } from 'lucide-react'
import config from '@payload-config'
import { getPayload } from 'payload'

import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
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
   * "all" (and an unset value, on blocks saved before the field existed) means
   * every campus. Anything else narrows to that campus only — a teacher with no
   * campus recorded is deliberately excluded, because listing them under Wadala
   * when nobody has said so would be a guess presented as fact.
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
  /*
   * Grouping needs everybody: it splits the roster into teams itself, so a
   * campus filter would hand it one team and nothing to compare it with.
   */
  const campus = grouped || !block.campus || block.campus === 'all' ? null : block.campus

  const { docs: teachers } = await payload
    .find({
      collection: 'faculty',
      where: campus
        ? { and: [{ unit: { equals: unit.id } }, { campus: { equals: campus } }] }
        : { unit: { equals: unit.id } },
      sort: 'order',
      limit: 100,
      depth: 1,
      overrideAccess: false,
    })
    .catch(() => ({ docs: [] as Faculty[] }))

  if (teachers.length === 0) return null

  const isHead = (person: { designation?: string | null }) =>
    /head teacher/i.test(person.designation ?? '')

  /**
   * The roster split into teams, each led by its head teacher.
   *
   * The split comes off the `campus` field, which is the only thing on a
   * faculty record that says which team somebody belongs to. That field is no
   * longer shown anywhere — Primary is published as one school — but it still
   * records the grouping correctly, and it is a truer key than guessing from
   * names or order. Groups run in alphabetical key order, so the arrangement
   * is the same on every render rather than following whatever the database
   * happened to return first.
   */
  const teams = grouped
    ? [
        ...teachers
          .reduce((map, person) => {
            const key = typeof person.campus === 'string' ? person.campus : ''
            const bucket = map.get(key)
            if (bucket) bucket.push(person)
            else map.set(key, [person])
            return map
          }, new Map<string, typeof teachers>())
          .entries(),
      ]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, members]) => ({
          key,
          head: members.find(isHead) ?? null,
          rest: members.filter((person) => !isHead(person)),
        }))
    : []

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
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
          {teams.map((team) => (
            <div key={team.key}>
              {team.head ? (
                <article className="flex items-start gap-4 rounded-2xl bg-brand-tint p-5 ring-1 ring-brand/20">
                  {face(team.head, true)}
                  {details(team.head)}
                </article>
              ) : null}

              {team.rest.length > 0 ? (
                <ul className="mt-4 grid gap-3">
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
