import type { FieldHook, TextField } from 'payload'

/**
 * URL-safe slug generation (BR-SEO-02, "friendly URLs").
 *
 * NFKD decomposition splits accented characters into base + combining mark, and
 * the diacritic class then strips the marks — so "Café" yields "cafe" rather
 * than "caf". Apostrophes common in SIWS content ("South Indians' Welfare")
 * collapse into a single separator instead of an empty segment.
 */
export const slugify = (input: string): string =>
  input
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 96)
    .replace(/-+$/, '')

/**
 * Top-level path segments the router owns. A unit or page may not claim one of
 * these, or it would shadow a real route — checked at validation time so the
 * clash surfaces in the admin panel rather than as a mysterious 404 later.
 *
 * ONLY SEGMENTS SOMETHING ACTUALLY SERVES BELONG HERE. `privacy`, `cookies`
 * and `accessibility` were reserved in anticipation of routes that were never
 * written, so all three answered 404 while the CMS refused to let anybody
 * create a page that would have answered them — the reservation was the only
 * thing standing between the site and the pages FR-PRV-15 requires on every
 * footer. They are ordinary content pages now: SIWS owns and must be able to
 * edit that text (SRS 2.6), which means it belongs in the CMS.
 */
export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'search',
  'sitemap.xml',
  'robots.txt',
  'alumni',
  'careers',
  'mandatory-documents',
  'newsletter',
  'unsubscribe',
  'next',
  '_next',
  'media',
  'protected-media',
])

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

interface SlugFieldOptions {
  /** Field to derive the slug from when one is not supplied. */
  sourceField?: string
  /** Enforce uniqueness across the collection. */
  unique?: boolean
  /** Reject slugs that collide with a router-owned path segment. */
  guardReserved?: boolean
  /** Show the field in the sidebar rather than the main column. */
  position?: 'sidebar' | undefined
}

/**
 * Auto-fills from the source field only when the editor has left it blank, so a
 * deliberately-chosen slug is never silently rewritten when the title changes.
 * Keeping a published URL stable is a hard SEO requirement (BR-SEO-07).
 */
const formatSlugHook =
  (sourceField: string): FieldHook =>
  ({ data, operation, value }) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      return slugify(value)
    }

    if (operation === 'create' || operation === 'update') {
      const source = data?.[sourceField]
      if (typeof source === 'string' && source.trim().length > 0) {
        return slugify(source)
      }
    }

    return value
  }

/**
 * Returns the concrete `TextField` variant rather than the broad `Field` union,
 * so callers can spread the result and override individual keys without
 * collapsing the discriminated union.
 */
export const slugField = ({
  sourceField = 'title',
  unique = true,
  guardReserved = false,
  position = 'sidebar',
}: SlugFieldOptions = {}): TextField => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique,
  index: true,
  admin: {
    position,
    description: 'The last part of the web address. Leave blank and we will create it from the title.',
  },
  hooks: {
    beforeValidate: [formatSlugHook(sourceField)],
  },
  validate: (value: unknown) => {
    if (typeof value !== 'string' || value.length === 0) {
      return 'Please enter a web address for this page.'
    }
    if (!SLUG_PATTERN.test(value)) {
      return 'Use small letters, numbers and hyphens only — for example annual-day-2026.'
    }
    if (guardReserved && RESERVED_SLUGS.has(value)) {
      return `"${value}" is used by the system, so it cannot be a web address. Please choose another.`
    }
    return true
  },
})
