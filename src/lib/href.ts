import type { Media, Page, Unit } from '@/payload-types'

/**
 * URL construction for CMS content.
 *
 * Every public URL in the platform is built here, so the routing contract lives
 * in one place: `/{unit}/{page}` for unit content and `/{page}` for
 * institution-wide content on the main portal.
 */

type MaybePopulated<T> = T | number | string | null | undefined

const isPopulated = <T extends object>(value: MaybePopulated<T>): value is T =>
  typeof value === 'object' && value !== null

export const unitHref = (unit: MaybePopulated<Unit>): string | null => {
  if (!isPopulated(unit)) return null
  return typeof unit.slug === 'string' && unit.slug.length > 0 ? `/${unit.slug}` : null
}

/**
 * Resolves a page to its public path.
 *
 * Returns null when the target cannot be resolved — which happens by design
 * rather than by accident. Payload populates relationships through the same
 * access rules as the request, so a page that has been unpublished or deleted
 * comes back as a bare ID (or null) for an anonymous visitor rather than a
 * readable document. FR-QL-06 requires exactly that case to render as
 * non-broken, so callers treat null as "do not render a link".
 */
export const pageHref = (page: MaybePopulated<Page>): string | null => {
  if (!isPopulated(page)) return null
  if (typeof page.slug !== 'string' || page.slug.length === 0) return null

  /*
   * A home page lives at its site's root, not under "/home": a link to the
   * Secondary School's home page went to /secondary/home and got a 404
   * (found on /junior-college/admissions in testing, 2026-11-16).
   */
  const isHome = page.slug === 'home'

  const unit = page.unit
  if (isPopulated(unit) && typeof unit.slug === 'string' && unit.slug.length > 0) {
    return isHome ? `/${unit.slug}` : `/${unit.slug}/${page.slug}`
  }

  // A page whose `unit` is an unpopulated ID cannot be addressed correctly —
  // guessing the institution-wide path would produce a 404. The caller falls
  // back to plain text instead.
  if (unit === null || unit === undefined) return isHome ? '/' : `/${page.slug}`

  return null
}

/**
 * Resolves an uploaded file to its public URL — a notice pointing at a PDF
 * merit list, a downloadable form.
 *
 * Same null contract as `pageHref`: a file the visitor may not read comes back
 * unpopulated, and the caller renders inert text rather than a broken link.
 * A withdrawn image is also treated as unresolvable, so a document pulled for
 * consent reasons stops being downloadable the moment it is withdrawn rather
 * than only disappearing from the pages that embed it.
 */
export const mediaHref = (media: MaybePopulated<Media>): string | null => {
  if (!isPopulated(media)) return null
  if (media.withdrawn?.isWithdrawn) return null
  return typeof media.url === 'string' && media.url.length > 0 ? media.url : null
}

/** True when a URL points somewhere other than this site (FR-QL-03). */
export const isExternalHref = (href: string): boolean => {
  if (href.startsWith('/') || href.startsWith('#')) return false
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return true

  try {
    const target = new URL(href)
    const site = new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000')
    return target.host !== site.host
  } catch {
    return false
  }
}
