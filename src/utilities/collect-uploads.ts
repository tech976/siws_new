import type { Field } from 'payload'

/**
 * Collects the IDs of every upload field pointing at a given collection, from a
 * document's data.
 *
 * Driven by the field config rather than by pattern-matching the data. A naive
 * "gather every number in the layout" walk would be far shorter, but it cannot
 * distinguish a media ID from any other integer a block happens to store — and
 * a false positive here would refuse to publish a perfectly legitimate page,
 * with a message about a photograph that is not on it. Reading the schema means
 * only genuine upload values are ever returned.
 */

const isNamed = (field: Field): field is Extract<Field, { name: string }> =>
  'name' in field && typeof field.name === 'string'

const pointsAt = (relationTo: unknown, target: string): boolean =>
  Array.isArray(relationTo) ? relationTo.includes(target) : relationTo === target

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

/** Normalises an upload value, which may be an ID or a populated document. */
const toId = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  const record = asRecord(value)
  if (record && (typeof record.id === 'number' || typeof record.id === 'string')) {
    return record.id
  }
  // Polymorphic relationships store `{ relationTo, value }`.
  if (record && 'value' in record) return toId(record.value)
  return null
}

export const collectUploadIds = (
  fields: Field[],
  data: unknown,
  target = 'media',
): (number | string)[] => {
  const found: (number | string)[] = []
  const record = asRecord(data)
  if (!record) return found

  for (const field of fields) {
    const name = isNamed(field) ? field.name : null

    switch (field.type) {
      case 'upload': {
        if (name && pointsAt(field.relationTo, target)) {
          /*
           * A "choose several" upload (a news item's Photos) holds an ARRAY.
           * Read as a single value it gave nothing, so the parental-permission
           * check never saw a news item's photographs (found in testing,
           * 2026-11-16).
           */
          const value = record[name]
          for (const entry of Array.isArray(value) ? value : [value]) {
            const id = toId(entry)
            if (id !== null) found.push(id)
          }
        }
        break
      }

      case 'group': {
        if (name) found.push(...collectUploadIds(field.fields, record[name], target))
        break
      }

      case 'array': {
        const rows = name ? record[name] : null
        if (Array.isArray(rows)) {
          for (const row of rows) {
            found.push(...collectUploadIds(field.fields, row, target))
          }
        }
        break
      }

      case 'blocks': {
        const rows = name ? record[name] : null
        if (Array.isArray(rows)) {
          for (const row of rows) {
            const blockType = asRecord(row)?.blockType
            const block = field.blocks.find((candidate) => candidate.slug === blockType)
            if (block) found.push(...collectUploadIds(block.fields, row, target))
          }
        }
        break
      }

      case 'row':
      case 'collapsible': {
        // Layout-only: the child fields sit on the same data object.
        found.push(...collectUploadIds(field.fields, record, target))
        break
      }

      case 'tabs': {
        for (const tab of field.tabs) {
          const tabName = 'name' in tab && typeof tab.name === 'string' ? tab.name : null
          found.push(
            ...collectUploadIds(tab.fields, tabName ? record[tabName] : record, target),
          )
        }
        break
      }

      default:
        break
    }
  }

  // De-duplicated: the same photograph may legitimately appear more than once.
  return Array.from(new Set(found))
}
