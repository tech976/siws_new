/**
 * The icons a quick link can carry (FR-QL-02). Shared by the collection, which
 * offers them as a list, and the header panel, which draws them — so a value
 * can never be chosen that the panel does not know how to show.
 */
export const QUICK_LINK_ICONS = [
  { value: 'arrow', label: 'Arrow (general)' },
  { value: 'admissions', label: 'Admissions' },
  { value: 'fees', label: 'Fees' },
  { value: 'scholarship', label: 'Scholarships' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'download', label: 'Download / document' },
  { value: 'news', label: 'News' },
  { value: 'bus', label: 'Transport' },
  { value: 'contact', label: 'Contact' },
  { value: 'map', label: 'Location' },
  { value: 'info', label: 'Information' },
] as const

export type QuickLinkIcon = (typeof QUICK_LINK_ICONS)[number]['value']
