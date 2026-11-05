import type { Field, Payload, PayloadRequest } from 'payload'

/**
 * Where a picture appears on the website, and the words shown with it there.
 *
 * WHY THIS EXISTS. Text printed over a photograph usually belongs to the PAGE,
 * not to the picture: a row in a page's "Achievement wall" holds the photo plus
 * its own title ("Andhra Education Society") and prize ("One prize"). Someone
 * who opened the picture in the Media library to change that title found
 * nothing to change. This lists every page (and news item, popup, school) that
 * uses the picture, the exact words shown with it, and a link to edit them.
 */

export interface MediaPlacement {
  collection: string
  collectionLabel: string
  docId: number | string
  docTitle: string
  /** e.g. "Kindergarten" — empty for the main SIWS website. */
  school: string
  /** The admin screen where the words can be changed. */
  editUrl: string
  /** e.g. "Achievement wall", or empty when the picture is not in a section. */
  section: string
  sectionNumber: number | null
  /** e.g. 4 — the row within the section; null when it is not in a list. */
  rowNumber: number | null
  /** The words shown with the picture there, label → value. */
  texts: { label: string; value: string }[]
}

const CONTENT_COLLECTIONS = new Set(['pages', 'posts', 'popups', 'units', 'faculty', 'announcements', 'emergency-notices'])

/** Field name → label, for the text fields we report. */
const TEXT_LABELS: Record<string, string> = {
  title: 'Title',
  award: 'What was won',
  caption: 'Caption',
  heading: 'Heading',
  label: 'Label',
  name: 'Name',
  when: 'When',
  subtitle: 'Subtitle',
  description: 'Description',
  detail: 'A little more',
  attribution: 'Name',
  role: 'Role',
}

const isNamed = (field: Field): field is Extract<Field, { name: string }> =>
  'name' in field && typeof field.name === 'string'

const pointsAt = (relationTo: unknown, target: string): boolean =>
  Array.isArray(relationTo) ? relationTo.includes(target) : relationTo === target

/** Query paths and field names of every field that can hold a picture. */
const collectUploadFields = (
  fields: Field[],
  target: string,
  prefix: string,
  out: { paths: Set<string>; names: Set<string> },
) => {
  for (const field of fields) {
    const name = isNamed(field) ? field.name : null
    const here = name ? (prefix ? `${prefix}.${name}` : name) : prefix
    switch (field.type) {
      case 'upload':
      case 'relationship':
        if (name && pointsAt(field.relationTo, target)) {
          out.paths.add(here)
          out.names.add(name)
        }
        break
      case 'group':
      case 'array':
        collectUploadFields(field.fields, target, here, out)
        break
      case 'row':
      case 'collapsible':
        collectUploadFields(field.fields, target, prefix, out)
        break
      case 'tabs':
        for (const tab of field.tabs) {
          const tabPrefix =
            'name' in tab && typeof tab.name === 'string'
              ? prefix
                ? `${prefix}.${tab.name}`
                : tab.name
              : prefix
          collectUploadFields(tab.fields, target, tabPrefix, out)
        }
        break
      case 'blocks':
        for (const block of field.blocks) collectUploadFields(block.fields, target, here, out)
        break
      default:
        break
    }
  }
}

const sameId = (value: unknown, id: number | string): boolean => {
  if (value === null || value === undefined) return false
  if (typeof value === 'object' && 'id' in (value as object)) {
    return String((value as { id: unknown }).id) === String(id)
  }
  return String(value) === String(id)
}

interface Hit {
  holder: Record<string, unknown>
  block: Record<string, unknown> | null
  sectionNumber: number | null
  rowNumber: number | null
}

/** Finds every object in `node` that holds the picture in one of `names`. */
const walk = (
  node: unknown,
  id: number | string,
  names: Set<string>,
  hits: Hit[],
  block: Record<string, unknown> | null = null,
  sectionNumber: number | null = null,
  rowNumber: number | null = null,
) => {
  if (Array.isArray(node)) {
    node.forEach((child, index) => {
      const isBlock = child && typeof child === 'object' && 'blockType' in child
      walk(
        child,
        id,
        names,
        hits,
        isBlock ? (child as Record<string, unknown>) : block,
        isBlock ? index + 1 : sectionNumber,
        isBlock ? null : block ? index + 1 : rowNumber,
      )
    })
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  for (const [key, value] of Object.entries(record)) {
    if (names.has(key)) {
      const matches = Array.isArray(value) ? value.some((v) => sameId(v, id)) : sameId(value, id)
      if (matches) hits.push({ holder: record, block, sectionNumber, rowNumber })
    }
    if (value && typeof value === 'object') {
      walk(value, id, names, hits, block, sectionNumber, rowNumber)
    }
  }
}

const textOf = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export const findMediaPlacements = async ({
  payload,
  req,
  id,
}: {
  payload: Payload
  req: PayloadRequest
  id: number | string
}): Promise<MediaPlacement[]> => {
  const placements: MediaPlacement[] = []
  const adminRoute = payload.config.routes?.admin ?? '/admin'

  // School names, for "Kindergarten › Achievements".
  const units = await payload.find({ collection: 'units', limit: 50, depth: 0, overrideAccess: true })
  const unitName = new Map(units.docs.map((u) => [String(u.id), String((u as { name?: string }).name ?? '')]))

  for (const collection of payload.config.collections) {
    // Website content only: never enquiries, feedback, users or other private records.
    if (!CONTENT_COLLECTIONS.has(collection.slug)) continue
    const found = { paths: new Set<string>(), names: new Set<string>() }
    collectUploadFields(collection.fields as Field[], 'media', '', found)
    if (found.paths.size === 0) continue

    /*
     * Every document is read and searched here rather than filtered by a
     * database query: queries through page sections ("layout.items.photo")
     * miss rows in some sections, and there are only a few hundred documents.
     */
    let docs: Record<string, unknown>[] = []
    try {
      const result = await payload.find({
        collection: collection.slug,
        depth: 0,
        pagination: false,
        draft: Boolean(collection.versions && typeof collection.versions === 'object' && collection.versions.drafts),
        overrideAccess: true,
        req,
      })
      docs = result.docs as unknown as Record<string, unknown>[]
    } catch {
      continue
    }

    const blockLabels = new Map<string, string>()
    const collectBlocks = (fields: Field[]) => {
      for (const field of fields) {
        if (field.type === 'blocks') {
          for (const b of field.blocks) {
            const label = b.labels?.singular
            blockLabels.set(b.slug, typeof label === 'string' ? label : b.slug)
            collectBlocks(b.fields)
          }
        } else if ('fields' in field && Array.isArray(field.fields)) {
          collectBlocks(field.fields as Field[])
        } else if (field.type === 'tabs') {
          for (const tab of field.tabs) collectBlocks(tab.fields)
        }
      }
    }
    collectBlocks(collection.fields as Field[])

    for (const doc of docs) {
      const hits: Hit[] = []
      walk(doc, id, found.names, hits)
      if (hits.length === 0) continue
      const titleField = collection.admin?.useAsTitle ?? 'title'
      const docTitle = textOf(doc[titleField]) || textOf(doc.title) || `#${String(doc.id)}`
      const unitRef = doc.unit
      const school =
        unitRef === null || unitRef === undefined
          ? collection.slug === 'units'
            ? docTitle
            : ''
          : (unitName.get(String(typeof unitRef === 'object' ? (unitRef as { id: unknown }).id : unitRef)) ?? '')

      for (const hit of hits) {
        const texts = Object.entries(TEXT_LABELS)
          .map(([key, label]) => ({ label, value: textOf(hit.holder[key]) }))
          .filter((t) => t.value)
        const blockType = hit.block ? String(hit.block.blockType ?? '') : ''
        const sectionHeading = hit.block ? textOf(hit.block.heading) : ''
        placements.push({
          collection: collection.slug,
          collectionLabel: String(
            typeof collection.labels?.singular === 'string' ? collection.labels.singular : collection.slug,
          ),
          docId: doc.id as number | string,
          docTitle,
          school,
          editUrl: `${adminRoute}/collections/${collection.slug}/${String(doc.id)}`,
          section: blockType
            ? `${blockLabels.get(blockType) ?? blockType}${sectionHeading ? ` — “${sectionHeading}”` : ''}`
            : '',
          sectionNumber: hit.sectionNumber,
          rowNumber: hit.rowNumber,
          texts,
        })
      }
    }
  }

  return placements
}
