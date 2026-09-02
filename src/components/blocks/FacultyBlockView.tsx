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
   * Grouping needs everybody: it splits the roster into teams itself, so a
   * campus filter would hand it one team and nothing to compare it with.
   */
  const campus =
    grouped || !block.campus || block.campus === 'all' ? null : block.campus

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

  /** The monogram or photograph. Bigger for a head teacher. */
  const face = (teacher: (typeof teachers)[number], lead: boolean) =>
    teacher.photo ? (
      <Media
        resource={teacher.photo}
        sizes="96px"
        className={(lead ? "size-20" : "size-16") + " shrink-0 rounded-full object-cover"}
      />
    ) : (
      /* A neutral monogram rather than a stock silhouette — most of the
         roster has no photograph yet, and a placeholder face would read
         as a real person. */
      <span
        aria-hidden="true"
        className={
          (lead ? "size-20 bg-white text-lg" : "size-16 bg-brand-tint text-base") +
          " grid shrink-0 place-items-center rounded-full font-bold text-brand"
        }
      >
        {initials(teacher.name)}
      </span>
    )

  /** Name, role and qualifications. */
  const details = (teacher: (typeof teachers)[number]) => (
    <span className="min-w-0">
      <strong className="block t-body leading-snug text-brand">{teacher.name}</strong>

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

      {block.intro ? <RichText data={block.intro} className="mb-9 siws-centre mx-auto max-w-3xl" /> : null}

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
                  {team.rest.map((teacher) => (
                    <li
                      key={teacher.id}
                      className="flex items-start gap-4 rounded-2xl border border-line bg-white p-4 shadow-card"
                    >
                      {face(teacher, false)}
                      {details(teacher)}
                    </li>
                  ))}
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
              className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-card"
            >
              {face(teacher, false)}
              {details(teacher)}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
