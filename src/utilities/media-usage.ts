import { sql } from '@payloadcms/db-postgres'
import type { Field, Payload, PayloadRequest } from 'payload'

/**
 * BR-MED-07 — "The system shall warn before deleting a media item that is in
 * use, and shall indicate where it is used."
 *
 * Payload keeps no reverse index of uploads, so usage is discovered by walking
 * the config for every field that can point at the media collection and
 * counting matches. Driving this off the config rather than a hand-maintained
 * list means a new collection with an image field is covered the moment it is
 * added, with no chance of the check silently going stale.
 *
 * TWO KINDS OF USE
 * ----------------
 * A picture can be THE picture of something — a banner, a card, a school's
 * logo — or one photograph in a list of them. The first is a hole in a page if
 * it goes, so it blocks a delete. The second is what deleting a photograph
 * means: it comes off the gallery, and the gallery is one shorter.
 *
 * Treating both as the first kind left the library unable to delete anything.
 * Gallery pages list their photographs one by one, so 193 of 203 pictures were
 * "in use" and refused — and the people the refusal told to "remove those
 * references" were HODs, who cannot edit a page.
 */

/**
 * Marks an array field as a list of photographs: `custom: PICTURE_LIST`.
 *
 * Only for an array inside a block whose rows are nothing but the picture and
 * its caption, so that losing the picture leaves no reason to keep the row.
 * Two blocks whose lists share a query path (`images.image`) must both carry
 * it — a path that is a list in one block and not in another counts as in use.
 */
export const PICTURE_LIST = { pictureList: true } as const

const isPictureList = (field: Field): boolean =>
  field.type === 'array' && field.custom?.pictureList === true

interface FieldPath {
  path: string
  label: string
  /** Deleting the picture only shortens a list; nothing is left without one. */
  list: boolean
}

const isNamed = (field: Field): field is Extract<Field, { name: string }> =>
  'name' in field && typeof field.name === 'string'

const pointsAt = (relationTo: unknown, target: string): boolean =>
  Array.isArray(relationTo) ? relationTo.includes(target) : relationTo === target

/**
 * Collects the query paths of every upload/relationship field that can
 * reference `target`.
 *
 * Path construction follows Payload's own query syntax: named containers
 * (group, named tab) and arrays/blocks contribute a segment, whereas purely
 * presentational containers (row, collapsible, unnamed tab) do not.
 */
const collectPaths = (
  fields: Field[],
  target: string,
  prefix = '',
  inList = false,
): FieldPath[] => {
  const found: FieldPath[] = []

  for (const field of fields) {
    const name = isNamed(field) ? field.name : null
    const here = name ? (prefix ? `${prefix}.${name}` : name) : prefix

    switch (field.type) {
      case 'upload':
      case 'relationship': {
        if (name && pointsAt(field.relationTo, target)) {
          found.push({
            path: here,
            label: field.label ? String(field.label) : name,
            // A "choose several" field is a list by nature, and the database
            // drops the deleted picture from it without being asked.
            list: inList || field.hasMany === true,
          })
        }
        break
      }

      case 'group':
        found.push(...collectPaths(field.fields, target, here, inList))
        break

      case 'array':
        found.push(...collectPaths(field.fields, target, here, isPictureList(field)))
        break

      case 'row':
      case 'collapsible':
        // Layout-only: contributes no path segment.
        found.push(...collectPaths(field.fields, target, prefix, inList))
        break

      case 'tabs': {
        for (const tab of field.tabs) {
          const tabPrefix =
            'name' in tab && typeof tab.name === 'string'
              ? prefix
                ? `${prefix}.${tab.name}`
                : tab.name
              : prefix
          found.push(...collectPaths(tab.fields, target, tabPrefix, inList))
        }
        break
      }

      case 'blocks': {
        for (const block of field.blocks) {
          // Blocks share their parent field's query path.
          found.push(...collectPaths(block.fields, target, here))
        }
        break
      }

      default:
        break
    }
  }

  return found
}

/**
 * The paths that block a delete, each once.
 *
 * Blocks share their parent's path, so two blocks with an `images.image` each
 * arrive here as the same path twice — which used to count one page as two
 * places. A path is only let through as a list if every block agrees it is.
 */
const blockingPaths = (fields: Field[], target: string): string[] => {
  const isList = new Map<string, boolean>()
  for (const { path, list } of collectPaths(fields, target)) {
    isList.set(path, (isList.get(path) ?? true) && list)
  }
  return Array.from(isList.entries())
    .filter(([, list]) => !list)
    .map(([path]) => path)
}

export interface MediaUsage {
  /** Places where the item is the picture of something. Lists are not counted. */
  total: number
  /** Human-readable list of where the item is referenced. */
  summary: string
  locations: { collection: string; label: string; count: number }[]
}

interface DescribeArgs {
  payload: Payload
  /** The uploads collection being deleted from, e.g. `media`. */
  collection: string
  id: number | string
}

export const describeMediaUsage = async ({
  payload,
  collection,
  id,
}: DescribeArgs): Promise<MediaUsage> => {
  const locations: MediaUsage['locations'] = []

  const checks: Promise<void>[] = []

  for (const candidate of payload.config.collections) {
    // A media collection never references itself.
    if (candidate.slug === collection) continue

    const paths = blockingPaths(candidate.fields as Field[], collection)
    if (paths.length === 0) continue

    for (const path of paths) {
      checks.push(
        payload
          .count({
            collection: candidate.slug,
            where: { [path]: { equals: id } },
            overrideAccess: true,
          })
          .then((result) => {
            if (result.totalDocs > 0) {
              locations.push({
                collection: candidate.slug,
                label: String(candidate.labels?.plural ?? candidate.slug),
                count: result.totalDocs,
              })
            }
          })
          .catch(() => {
            // A single unqueryable path must not block the delete check as a
            // whole; the remaining paths still report accurately.
          }),
      )
    }
  }

  await Promise.all(checks)

  // Several fields on one collection are reported once, summed.
  const merged = new Map<string, { label: string; count: number }>()
  for (const location of locations) {
    const existing = merged.get(location.collection)
    if (existing) {
      existing.count += location.count
    } else {
      merged.set(location.collection, { label: location.label, count: location.count })
    }
  }

  const mergedLocations = Array.from(merged.entries()).map(([slug, value]) => ({
    collection: slug,
    label: value.label,
    count: value.count,
  }))

  const total = mergedLocations.reduce((sum, location) => sum + location.count, 0)

  return {
    total,
    locations: mergedLocations,
    summary: mergedLocations
      .map((location) => `${location.count} in ${location.label}`)
      .join(', '),
  }
}

// ---------------------------------------------------------------------------
// Taking a deleted photograph off the lists it was in
// ---------------------------------------------------------------------------

/** Payload's own table naming: `photoLibrary` is stored as `photo_library`. */
const snake = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()

/**
 * How the table of every marked list ends, e.g. `_blocks_gallery_images`.
 *
 * The ending rather than the whole name, because the same block is stored once
 * per collection that uses it and again for that collection's saved versions
 * (`pages_blocks_gallery_images`, `_pages_v_blocks_gallery_images`).
 */
const listTableEndings = (fields: Field[], ending: string | null = null): string[] => {
  const found: string[] = []

  for (const field of fields) {
    switch (field.type) {
      case 'blocks':
        for (const block of field.blocks) {
          found.push(...listTableEndings(block.fields, `_blocks_${snake(block.slug)}`))
        }
        break

      case 'array': {
        // An array outside a block has no ending that is safely its own.
        if (ending === null) break
        const here = `${ending}_${snake(field.name)}`
        if (isPictureList(field)) found.push(here)
        found.push(...listTableEndings(field.fields, here))
        break
      }

      case 'group':
        found.push(
          ...listTableEndings(
            field.fields,
            ending === null || !isNamed(field) ? ending : `${ending}_${snake(field.name)}`,
          ),
        )
        break

      case 'row':
      case 'collapsible':
        found.push(...listTableEndings(field.fields, ending))
        break

      case 'tabs':
        for (const tab of field.tabs) {
          const named = 'name' in tab && typeof tab.name === 'string' ? tab.name : null
          found.push(
            ...listTableEndings(
              tab.fields,
              ending === null || named === null ? ending : `${ending}_${snake(named)}`,
            ),
          )
        }
        break

      default:
        break
    }
  }

  return found
}

/** The slice of the Postgres adapter this file reads. */
interface SqlRunner {
  execute: (query: ReturnType<typeof sql>) => Promise<{ rowCount?: number | null }>
}

interface SqlAdapter {
  drizzle: SqlRunner
  sessions?: Record<string, { db: SqlRunner } | undefined>
  rawTables?: Record<
    string,
    { name: string; columns: Record<string, { name: string; reference?: { table: string } }> }
  >
  tableNameMap?: Map<string, string>
}

interface RemoveArgs {
  req: PayloadRequest
  /** The uploads collection being deleted from, e.g. `media`. */
  collection: string
  id: number | string
}

/**
 * Removes the rows that listed a photograph, ahead of the photograph itself.
 *
 * Left alone, the database blanks the picture and keeps the row: a gallery
 * entry with a caption and no photograph. The site skips those, but the page
 * editor does not — the picture is required, so the page cannot be saved again
 * until somebody finds the empty row and removes it by hand.
 *
 * Done in the database rather than by saving each page, because a save writes
 * a new version of the page over whatever draft was in progress. Saved
 * versions are cleared along with the live page for the same reason: the
 * editor opens the latest version, not the live one.
 *
 * Runs inside the delete's own transaction, so a delete that fails afterwards
 * puts every row back.
 */
export const removeFromPictureLists = async ({
  req,
  collection,
  id,
}: RemoveArgs): Promise<number> => {
  const adapter = req.payload.db as unknown as SqlAdapter
  const tables = Object.values(adapter.rawTables ?? {})
  if (tables.length === 0) return 0

  const endings = new Set(
    req.payload.config.collections.flatMap((candidate) =>
      listTableEndings(candidate.fields as Field[]),
    ),
  )
  if (endings.size === 0) return 0

  const target = adapter.tableNameMap?.get(snake(collection)) ?? snake(collection)
  const transactionID = await req.transactionID
  const db =
    (transactionID !== undefined && adapter.sessions?.[String(transactionID)]?.db) ||
    adapter.drizzle

  let removed = 0

  for (const table of tables) {
    if (!Array.from(endings).some((ending) => table.name.endsWith(ending))) continue

    for (const column of Object.values(table.columns)) {
      if (column.reference?.table !== target) continue
      const result = await db.execute(
        sql`delete from ${sql.identifier(table.name)} where ${sql.identifier(column.name)} = ${id}`,
      )
      removed += result.rowCount ?? 0
    }
  }

  return removed
}
