import type { CollectionBeforeChangeHook, Field, Where } from 'payload'

/**
 * Whether a News & Events item runs in the news strip (the sliding bar at the
 * top of the site), and for how long.
 *
 * Switched on by default, so items keep appearing as they always have. With
 * "Between two dates" the item runs only from `stripFrom` to `stripUntil`;
 * "Until I switch it off" keeps it running with no end date.
 */
export const newsStripFields: Field[] = [
  {
    name: 'showInStrip',
    type: 'checkbox',
    defaultValue: true,
    label: 'Show in the news strip (the sliding bar at the top)',
    admin: {
      position: 'sidebar',
      description: 'Untick to keep this item out of the sliding bar. It still appears on your News or Events page.',
    },
  },
  {
    name: 'stripDuration',
    type: 'radio',
    defaultValue: 'lifetime',
    label: 'How long should it run in the strip?',
    options: [
      { label: 'Until I switch it off', value: 'lifetime' },
      { label: 'Between two dates and times', value: 'window' },
    ],
    admin: {
      position: 'sidebar',
      condition: (data) => data?.showInStrip !== false,
    },
  },
  {
    name: 'stripFrom',
    type: 'date',
    label: 'Start showing it from',
    admin: {
      position: 'sidebar',
      date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, h:mm a' },
      condition: (data) => data?.showInStrip !== false && data?.stripDuration === 'window',
    },
    validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
      if (siblingData?.showInStrip === false || siblingData?.stripDuration !== 'window') return true
      return value ? true : 'Choose when it should start showing.'
    },
  },
  {
    name: 'stripUntil',
    type: 'date',
    label: 'Stop showing it after',
    admin: {
      position: 'sidebar',
      date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy, h:mm a' },
      condition: (data) => data?.showInStrip !== false && data?.stripDuration === 'window',
    },
    validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
      if (siblingData?.showInStrip === false || siblingData?.stripDuration !== 'window') return true
      if (!value) return 'Choose when it should stop showing.'
      const from = siblingData?.stripFrom ? new Date(String(siblingData.stripFrom)).getTime() : null
      if (from !== null && new Date(String(value)).getTime() <= from) {
        return 'The end must be after the start.'
      }
      return true
    },
  },
]

/** Dates only matter for "Between two dates"; otherwise clear them. */
export const tidyNewsStripDates: CollectionBeforeChangeHook = ({ data }) => {
  if (!data) return data
  if (data.showInStrip === false || data.stripDuration !== 'window') {
    if ('stripDuration' in data || 'showInStrip' in data) {
      data.stripFrom = null
      data.stripUntil = null
    }
  }
  return data
}

/**
 * The items that should be in the strip right now. Items saved before this
 * existed have empty values, and count as "on, until switched off".
 */
export const inNewsStripNow = (): Where => {
  const now = new Date().toISOString()
  return {
    and: [
      { or: [{ showInStrip: { equals: true } }, { showInStrip: { exists: false } }] },
      { or: [{ stripFrom: { exists: false } }, { stripFrom: { less_than_equal: now } }] },
      { or: [{ stripUntil: { exists: false } }, { stripUntil: { greater_than: now } }] },
    ],
  }
}
