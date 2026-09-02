import type { UnitAccent } from '@/theme/tokens'
import { loadEnv } from '@/utilities/load-env'

// Must run before the Payload config is evaluated, since the config reads
// process.env at module scope.
loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Seeds the four unit websites defined in SRS 4.1.
 *
 * Idempotent: each unit is matched by slug and updated rather than duplicated,
 * so the script is safe to re-run after a schema change or on a fresh clone.
 * It deliberately does NOT create a user — the first administrator is created
 * through the admin panel's own screen so that the password is chosen by SIWS
 * and never written into the repository.
 *
 * Run with:  npm run seed
 */

interface UnitSeed {
  slug: string
  name: string
  shortName: string
  /**
   * The line printed under the school name in the header of every page of
   * that section's site. `null` where a section prints no line at all — see
   * Junior College below; the header hides the paragraph rather than falling
   * back to the institution motto.
   */
  tagline: string | null
  description: string
  accent: UnitAccent
  order: number
}

const UNITS: UnitSeed[] = [
  {
    slug: 'kindergarten',
    name: 'SIWS Kindergarten',
    shortName: 'Kindergarten',
    /*
     * The section’s own range, not a board it does not sit. The S.S.C. is
     * the Standard X examination, eleven years away from a Kindergarten
     * child, and this line is printed under the school name in the header of
     * every page of the site.
     */
    tagline: 'Jr. KG and Sr. KG | Safe | Value-Based Education',
    description:
      'A safe, nurturing and child-friendly start to school life, with a structured early-learning approach for Jr. KG and Sr. KG.',
    accent: 'accent',
    order: 1,
  },
  {
    slug: 'primary',
    name: 'SIWS Primary School',
    shortName: 'Primary School',
    tagline: 'Building strong academic foundations',
    description:
      'Where early curiosity is shaped into steady study habits, through a structured SSC Board curriculum.',
    accent: 'sky',
    order: 2,
  },
  {
    slug: 'secondary',
    name: 'SIWS Secondary School',
    shortName: 'Secondary School',
    /*
     * NO LINE UNDER THE NAME, as for Junior College below — SIWS asked on
     * 2026-09-02 to have it taken off. `secondary.ts` runs AFTER this file and
     * overwrites the whole unit record, so it has to be null there too; null
     * here stops a run of `npm run seed` on its own putting a line back.
     */
    tagline: null,
    description:
      'Academic rigour, board preparation and all-round development in the years leading up to the SSC examination.',
    accent: 'accentDeep',
    order: 3,
  },
  {
    slug: 'junior-college',
    name: 'SIWS Junior College',
    shortName: 'Junior College',
    /*
     * NO LINE UNDER THE NAME. This used to read "Choosing your stream with
     * confidence", which SIWS asked to have taken off on 2026-09-02.
     *
     * `null`, not omitted: `payload.update` leaves a field it is not given
     * alone, so dropping the key would keep the old line in a database that
     * has already been seeded. The same portal card still carries "Choosing
     * the right path with confidence" from institution.ts, so the sentiment
     * survives where it belongs — on the page that compares the sections.
     */
    tagline: null,
    description:
      'Standards XI and XII, with guidance on streams and courses for students moving up from Secondary School.',
    accent: 'brandInk',
    order: 4,
  },
]

const seed = async (): Promise<void> => {
  const payload = await getPayload({ config })

  let created = 0
  let updated = 0

  for (const unit of UNITS) {
    const existing = await payload.find({
      collection: 'units',
      where: { slug: { equals: unit.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const first = existing.docs[0]

    if (first) {
      await payload.update({
        collection: 'units',
        id: first.id,
        data: unit,
        overrideAccess: true,
      })
      updated += 1
      payload.logger.info(`Updated unit: ${unit.name}`)
    } else {
      await payload.create({
        collection: 'units',
        data: { ...unit, isActive: true },
        overrideAccess: true,
      })
      created += 1
      payload.logger.info(`Created unit: ${unit.name}`)
    }
  }

  payload.logger.info(`Seed complete — ${created} created, ${updated} updated.`)
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
