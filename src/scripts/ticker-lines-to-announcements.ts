import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Carries the lines the schools typed into "Ticker announcements" across to
 * News & Events, as Announcements.
 *
 * WHY. SIWS asked for the Ticker section to go (2026-10-12: "remove ticker
 * section, it's not needed… add another option for the announcement"). The
 * news strip is now made from News & Events alone, so a line that exists only
 * in the old collection stops running the moment that release is live — and
 * one of the two on the live site that day was Primary's notice that the
 * first-term examinations begin on 26 October. A school must not lose a notice
 * to parents because the place it was typed has been tidied away.
 *
 * WHAT IT DOES. Every PUBLISHED line becomes a published News & Events item of
 * the kind its colour meant — an achievement stays an achievement, an event an
 * event, and News and Important become an Announcement — for the same school,
 * with the line as its title and its own date. A line ticked for the main
 * homepage stays ticked.
 *
 * WHAT IT LEAVES ALONE:
 *   - a line whose words are already the title of an item in that school's
 *     News & Events. The Kindergarten's fancy-dress prize was typed in both
 *     places; a second copy would run in the strip twice;
 *   - a line that only pointed at one of the school's write-ups. The write-up
 *     is the item, and it is in the strip already;
 *   - drafts, which were never on the site;
 *   - the old lines themselves. Nothing is deleted: the collection is hidden
 *     from the panel, not emptied.
 *
 * Safe to repeat: the second time, every line's words are already a title.
 *
 * Usage:  npx tsx src/scripts/ticker-lines-to-announcements.ts [--apply]
 * Without --apply it prints what it would do and writes nothing.
 */

const APPLY = process.argv.includes('--apply')

/** The longest title News & Events accepts. */
const TITLE_MAX = 140

const KIND: Record<string, 'achievement' | 'event' | 'announcement'> = {
  achievement: 'achievement',
  event: 'event',
  news: 'announcement',
  urgent: 'announcement',
}

const idOf = (value: unknown): number | string | null =>
  value && typeof value === 'object' && 'id' in value
    ? ((value as { id: number | string }).id ?? null)
    : typeof value === 'number' || typeof value === 'string'
      ? value
      : null

/** Compared without case, spacing or a full stop, which is how people retype a line. */
const plain = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[\s.]+/g, ' ')
    .trim()

interface Line {
  id: number | string
  message: string
  tone?: string | null
  unit?: unknown
  link?: unknown
  publishAt?: string | null
  createdAt: string
  showOnHome?: boolean | null
}

const main = async () => {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'announcements',
    where: { _status: { equals: 'published' } },
    sort: 'createdAt',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  const lines = docs as unknown as Line[]
  if (lines.length === 0) {
    console.log('  Nothing to do: there are no published ticker lines.')
    process.exit(0)
  }

  let carried = 0

  for (const line of lines) {
    const unit = idOf(line.unit)
    const label = `“${line.message.slice(0, 70)}${line.message.length > 70 ? '…' : ''}”`

    if (line.link) {
      console.log(`  left     ${label} — it points at a write-up, which is the item`)
      continue
    }

    const { docs: existing } = await payload.find({
      collection: 'posts',
      where: unit === null ? { unit: { exists: false } } : { unit: { equals: unit } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    const wanted = plain(line.message)
    const already = existing.some((post) => {
      const title = plain((post as { title?: unknown }).title)
      return title === wanted || (title.length > 20 && wanted.startsWith(title.slice(0, TITLE_MAX)))
    })
    if (already) {
      console.log(`  left     ${label} — already in News & Events`)
      continue
    }

    const kind = KIND[line.tone ?? 'news'] ?? 'announcement'
    // A line can run to 160 characters and a title to 140. The whole line is
    // kept in the summary whenever the title cannot hold it.
    const fits = line.message.length <= TITLE_MAX
    const title = fits
      ? line.message
      : `${line.message.slice(0, TITLE_MAX - 1).replace(/\s+\S*$/, '')}…`

    if (!APPLY) {
      console.log(`  would carry ${label} — as an ${kind}`)
      carried += 1
      continue
    }

    await payload.create({
      collection: 'posts',
      data: {
        kind,
        template: 'notice',
        title,
        date: line.publishAt ?? line.createdAt,
        ...(fits ? {} : { summary: line.message }),
        ...(unit === null ? {} : { unit }),
        showOnHome: line.showOnHome === true,
        _status: 'published',
      } as never,
      overrideAccess: true,
    })
    console.log(`  carried  ${label} — as an ${kind}`)
    carried += 1
  }

  if (carried === 0) console.log('  Nothing to do: every line is already in News & Events.')
  else if (!APPLY) console.log('\n  Nothing was written. Re-run with --apply to do it.')
  process.exit(0)
}

main().catch((error: unknown) => {
  const nested = (error as { data?: { errors?: unknown[] } })?.data?.errors
  if (Array.isArray(nested)) for (const item of nested) console.error('  •', JSON.stringify(item))
  console.error(error)
  process.exit(1)
})
