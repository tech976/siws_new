'use client'

import { useRowLabel } from '@payloadcms/ui'

/**
 * The label on each row of a list inside a page section — the photos of an
 * achievement wall, the cards of a card grid, the questions of a FAQ.
 *
 * Payload's default is "Item 01", "Item 02"…, so finding the photo titled
 * "Andhra Education Society" meant opening rows one by one. This shows the
 * row's own words instead.
 */
const KEYS = ['title', 'caption', 'heading', 'question', 'label', 'name', 'attribution', 'value'] as const
const EXTRA = ['award', 'when'] as const

const shorten = (value: string, max = 70): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value

export const ItemRowLabel = () => {
  const { data, rowNumber } = useRowLabel<Record<string, unknown>>()
  const pick = (keys: readonly string[]) =>
    keys
      .map((key) => data?.[key])
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
  const main = pick(KEYS)
  const extra = pick(EXTRA)
  const num = typeof rowNumber === 'number' ? String(rowNumber + 1).padStart(2, '0') : '--'

  return (
    <span>
      <span style={{ opacity: 0.6, marginRight: '0.5rem' }}>{num}</span>
      {main ? shorten(main.trim()) : <span style={{ opacity: 0.6 }}>Not named yet</span>}
      {extra ? <span style={{ opacity: 0.65 }}> — {shorten(extra.trim(), 30)}</span> : null}
    </span>
  )
}

export default ItemRowLabel
