import Link from 'next/link'
import type { ReactNode } from 'react'

import { isExternalHref, mediaHref, pageHref } from '@/lib/href'
import type { Media, Page } from '@/payload-types'

/**
 * A relationship declared with `relationTo: ['pages']` is polymorphic, so
 * Payload stores `{ relationTo, value }` rather than the bare document. Both
 * shapes are accepted here: the wrapper is what the current config produces,
 * and the bare form is what it would produce if the link were ever narrowed to
 * a single collection.
 */
export type CMSLinkReference =
  | Page
  | number
  | string
  | { relationTo: 'pages'; value: number | Page }
  /** A link field may target an uploaded file — a notice pointing at a PDF. */
  | { relationTo: 'media'; value: number | Media }
  | null

/**
 * Renders a link authored in the CMS.
 *
 * Shape matches the `linkField` group in `src/fields/link.ts`.
 */
export interface CMSLinkValue {
  label?: string | null
  type?: ('internal' | 'external') | null
  reference?: CMSLinkReference
  url?: string | null
  anchor?: string | null
  newTab?: boolean | null
  appearance?: ('primary' | 'secondary' | 'plain') | null
}

/**
 * Slugified the same way `GalleryBlockView` builds its section `id`, so an
 * editor can type the heading as they see it — "Onam Event" — and still hit
 * `#onam-event`. A value that is already a slug passes through unchanged.
 */
const toAnchor = (value: string): string =>
  value
    .trim()
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

const unwrapReference = (
  reference: CMSLinkReference | undefined,
): { kind: 'page' | 'media'; value: Page | Media | number | null } => {
  if (reference === null || reference === undefined) return { kind: 'page', value: null }

  if (
    typeof reference === 'object' &&
    'relationTo' in reference &&
    'value' in reference
  ) {
    return {
      kind: reference.relationTo === 'media' ? 'media' : 'page',
      value: reference.value,
    }
  }

  // A string ID cannot be resolved to a URL without another lookup, and the
  // Postgres adapter uses numeric IDs, so this is treated as unresolvable.
  return { kind: 'page', value: typeof reference === 'string' ? null : reference }
}

interface CMSLinkProps {
  link: CMSLinkValue | null | undefined
  className?: string
  children?: ReactNode
  /** Ignore the authored appearance and use this class instead. */
  overrideClassName?: boolean
}

const APPEARANCE_CLASS: Record<string, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  plain: 'underline underline-offset-4 font-semibold text-brand hover:text-brand-deep',
}

export const resolveCMSHref = (link: CMSLinkValue | null | undefined): string | null => {
  if (!link) return null

  if (link.type === 'external') {
    return typeof link.url === 'string' && link.url.length > 0 ? link.url : null
  }

  const { kind, value } = unwrapReference(link.reference)
  const href =
    kind === 'media'
      ? mediaHref(value as Media | number | null)
      : pageHref(value as Page | number | null)

  // The fragment is appended only to a href that actually resolved, so an
  // unpublished target still returns null and renders inert (FR-QL-06) rather
  // than becoming a bare "#onam-event" that scrolls the current page.
  if (!href || kind === 'media' || !link.anchor) return href

  const fragment = toAnchor(link.anchor)
  return fragment ? `${href}#${fragment}` : href
}

export const CMSLink = ({
  link,
  className,
  children,
  overrideClassName = false,
}: CMSLinkProps) => {
  const href = resolveCMSHref(link)
  const label = children ?? link?.label

  if (!label) return null

  /**
   * FR-QL-06 — "A quick link whose target is unpublished or deleted ... shall
   * not render as a broken link on the public site." The label is still shown
   * so the layout does not shift, but it is inert.
   */
  if (!href) {
    return <span className={className}>{label}</span>
  }

  const external = isExternalHref(href)
  const opensNewTab = Boolean(link?.newTab) || external

  const appearanceClass = overrideClassName
    ? ''
    : (APPEARANCE_CLASS[link?.appearance ?? 'plain'] ?? '')

  const classes = [appearanceClass, className].filter(Boolean).join(' ') || undefined

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        // `noopener` closes the reverse-tabnabbing hole; `noreferrer` keeps the
        // school's internal URLs out of third-party referrer logs.
        {...(opensNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : { rel: 'noopener' })}
      >
        {label}
        {/* FR-QL-03 — say so, rather than relying on an icon alone. */}
        <span className="sr-only"> (opens an external site{opensNewTab ? ' in a new tab' : ''})</span>
        <span aria-hidden="true"> ↗</span>
      </a>
    )
  }

  return (
    <Link
      href={href}
      className={classes}
      {...(opensNewTab ? { target: '_blank', rel: 'noopener' } : {})}
    >
      {label}
      {opensNewTab ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </Link>
  )
}
