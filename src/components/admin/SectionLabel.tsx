'use client'

import { useRowLabel } from '@payloadcms/ui'

/**
 * The label shown on each collapsed row of "Page sections".
 *
 * Payload's default shows the block's type and an empty "Untitled" name field —
 * so a page built from eleven sections reads as eleven rows of "Untitled", and
 * finding the one you want means opening each in turn. This shows the section's
 * own heading instead, which is the thing an editor is actually looking for.
 *
 * `blockName` is switched off alongside this (`disableBlockName`), because once
 * the heading is on show, asking a teacher to type a second, private name for
 * the same section is pure friction.
 */

interface SectionData {
  blockType?: string
  /** Most sections. */
  heading?: string
  /** Banners and the enquiry hero use `title`. */
  title?: string
  /** Falls back to the first question when a list has no heading. */
  items?: { question?: string; title?: string }[]
  cards?: { title?: string }[]
  quotes?: { attribution?: string }[]
}

/** Human names, matching the labels in the "add section" menu. */
const BLOCK_LABELS: Record<string, string> = {
  hero: 'Page banner',
  heroEnquiry: 'Banner with enquiry form',
  feedback: 'Feedback form',
  richText: 'Text section',
  mediaText: 'Image with text',
  cardGrid: 'Card grid',
  featureList: 'Points list',
  gallery: 'Photo gallery',
  accordion: 'Expandable list',
  testimonials: 'Testimonials',
  statistics: 'Key figures',
  unitLinks: 'Our schools',
  callToAction: 'Call to action',
}

/** Trims to a length that still fits the row on a laptop. */
const shorten = (value: string, max = 60): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value

export const SectionLabel = () => {
  const { data, rowNumber } = useRowLabel<SectionData>()

  const type = data?.blockType ?? ''
  const typeLabel = BLOCK_LABELS[type] ?? 'Section'

  /**
   * Falls back through the fields most likely to identify the section, so even
   * a section with no heading shows something meaningful rather than nothing.
   */
  const summary =
    data?.heading?.trim() ||
    data?.title?.trim() ||
    data?.items?.[0]?.question?.trim() ||
    data?.items?.[0]?.title?.trim() ||
    data?.cards?.[0]?.title?.trim() ||
    data?.quotes?.[0]?.attribution?.trim() ||
    ''

  return (
    <span className="siws-blocklabel">
      <span className="siws-blocklabel__num">
        {typeof rowNumber === 'number' ? String(rowNumber + 1).padStart(2, '0') : '--'}
      </span>
      <span className="siws-blocklabel__type">{typeLabel}</span>
      {summary ? (
        <span className="siws-blocklabel__summary">{shorten(summary)}</span>
      ) : (
        <span className="siws-blocklabel__empty">No heading yet</span>
      )}
    </span>
  )
}

export default SectionLabel
