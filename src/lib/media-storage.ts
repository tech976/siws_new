import type { Payload } from 'payload'

/**
 * Photo storage per school, for information only.
 *
 * Each school (unit) has a notional allowance of 2 GB. The figure is the total
 * size of the files uploaded to that school SINCE `STORAGE_COUNT_FROM`: the
 * school asked for the count to start fresh on 2026-11-17, so earlier uploads
 * are not included.
 *
 * NOTHING IS EVER BLOCKED. Crossing the allowance only shows a note; uploading
 * carries on exactly as before. Nothing here runs during an upload, so it
 * cannot slow or break one.
 *
 * Pictures moved to the Trash still take up space until they are deleted
 * permanently, so they still count; a permanently deleted picture stops
 * counting.
 */

export const STORAGE_LIMIT_BYTES = 2 * 1024 ** 3

/** When counting started. Uploads before this moment are not counted. */
export const STORAGE_COUNT_FROM = '2026-11-17T11:00:00.000Z'

export interface UnitStorage {
  id: number | string
  name: string
  used: number
  files: number
}

const idOf = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/**
 * The storage used by each school. Pass `unitIds` to limit it to some schools;
 * leave it out for all of them. Never throws: on a failure it returns an empty
 * list and the panel simply does not appear.
 */
export const storageByUnit = async (
  payload: Payload,
  unitIds?: (number | string)[],
): Promise<UnitStorage[]> => {
  try {
    if (unitIds && unitIds.length === 0) return []

    const [{ docs: units }, { docs: files }] = await Promise.all([
      payload.find({
        collection: 'units',
        ...(unitIds ? { where: { id: { in: unitIds } } } : {}),
        depth: 0,
        limit: 50,
        pagination: false,
        overrideAccess: true,
        sort: 'id',
      }),
      payload.find({
        collection: 'media',
        where: {
          and: [
            { createdAt: { greater_than_equal: STORAGE_COUNT_FROM } },
            { unit: unitIds ? { in: unitIds } : { exists: true } },
          ],
        },
        depth: 0,
        limit: 0,
        pagination: false,
        overrideAccess: true,
        trash: true,
        select: { filesize: true, unit: true },
      }),
    ])

    const totals = new Map<string, { used: number; files: number }>()
    for (const file of files as { filesize?: number | null; unit?: unknown }[]) {
      const unit = idOf(file.unit)
      if (unit === null) continue
      const entry = totals.get(String(unit)) ?? { used: 0, files: 0 }
      entry.used += typeof file.filesize === 'number' ? file.filesize : 0
      entry.files += 1
      totals.set(String(unit), entry)
    }

    return (units as { id: number | string; name?: string | null }[]).map((unit) => ({
      id: unit.id,
      name: unit.name || `School ${unit.id}`,
      used: totals.get(String(unit.id))?.used ?? 0,
      files: totals.get(String(unit.id))?.files ?? 0,
    }))
  } catch (error) {
    payload.logger.error({ err: error }, 'Could not work out photo storage per school')
    return []
  }
}

/** 0 B, 840 KB, 12.4 MB, 1.36 GB. */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}
