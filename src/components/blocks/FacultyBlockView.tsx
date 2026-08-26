import config from '@payload-config'
import { getPayload } from 'payload'

import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { FacultyBlock, Unit } from '@/payload-types'

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
  const campus = block.campus && block.campus !== 'all' ? block.campus : null

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
    .catch(() => ({ docs: [] as never[] }))

  if (teachers.length === 0) return null

  /*
   * Unset means the row layout, because that is what every block saved before
   * this field existed was rendered as. A new default would silently restyle
   * the Secondary and Junior College rosters, which nobody asked for.
   */
  const centred = block.layout === 'centred'

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
            {teacher.photo ? (
              <Media
                resource={teacher.photo}
                sizes={centred ? '104px' : '88px'}
                className={`${
                  centred ? 'size-24' : 'size-20'
                } shrink-0 rounded-full object-cover`}
              />
            ) : (
              /* A neutral monogram rather than a stock silhouette — most of the
                 roster has no photograph yet, and a placeholder face would read
                 as a real person. */
              <span
                aria-hidden="true"
                className={`grid ${
                  centred ? 'size-24 text-xl' : 'size-20 text-lg'
                } shrink-0 place-items-center rounded-full bg-brand-tint font-bold text-brand`}
              >
                {initials(teacher.name)}
              </span>
            )}

            {/* `min-w-0` only in the row layout, where the text shares its line
                with the monogram and has to be allowed to shrink. Centred, the
                text owns the full card width and needs no such permission. */}
            <span className={centred ? 'mt-4' : 'min-w-0'}>
              <strong className="block text-[1.02rem] leading-snug text-brand">
                {teacher.name}
              </strong>

              {teacher.designation ? (
                <span className="mt-0.5 block text-sm font-semibold text-ink-soft">
                  {teacher.designation}
                </span>
              ) : null}

              {block.showQualifications !== false && teacher.qualifications ? (
                <span className="mt-1 block text-sm text-ink-muted">{teacher.qualifications}</span>
              ) : null}

              {teacher.message ? (
                <RichText data={teacher.message} className="mt-2 text-sm" />
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
