import type { Page, Post, Unit } from '@/payload-types'

/**
 * BR-SEO-03 — schema.org structured data.
 *
 * "at minimum Organization / EducationalOrganization for the institution and
 * units, NewsArticle for news, Event for events and calendar entries, FAQPage
 * for FAQ, JobPosting for vacancies and BreadcrumbList for navigation."
 *
 * WHAT IS HERE AND WHAT IS NOT
 * ----------------------------
 * EducationalOrganization (and School), WebSite, NewsArticle, BreadcrumbList,
 * FAQPage and Event (for posts filed as events, which carry their date) are
 * emitted, because the content behind them exists. JobPosting is not: the
 * careers module is not built. Emitting a `JobPosting` with
 * no vacancy, or an `FAQPage` whose questions are guessed out of headings,
 * publishes a claim about the page that is not true — and Google penalises
 * structured data that does not match visible content. They belong with the
 * modules, not ahead of them.
 *
 * Everything is emitted as JSON-LD in a script tag. Microdata woven through
 * the markup is the alternative and it ties the schema to the layout: a
 * designer moving a heading then silently breaks the data.
 */

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'

/** A value safe to place inside a <script> tag. */
export const serialise = (data: unknown): string =>
  /*
   * `<` is escaped because a string ending "</script>" inside JSON would close
   * the tag early and put the remainder into the document as markup. Content
   * here comes from a CMS, so this is reachable by anyone who can write a page.
   */
  JSON.stringify(data).replace(/</g, '\\u003c')

const abs = (path: string): string => `${serverURL}${path.startsWith('/') ? path : `/${path}`}`

/** The absolute URL of an uploaded file, when the relationship is populated. */
const mediaURL = (media: unknown): string | null => {
  if (!media || typeof media !== 'object' || !('url' in media)) return null
  const url = (media as { url?: unknown }).url
  if (typeof url !== 'string' || url.length === 0) return null
  return url.startsWith('http') ? url : abs(url)
}

/**
 * The website itself, with its search box. Lets Google show a search field for
 * the site under its result. The search page reads `?q=`.
 */
export const websiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: "South Indians' Welfare Society (SIWS)",
  url: serverURL,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${serverURL}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
})

/**
 * The institution itself, or one of its four schools.
 *
 * `EducationalOrganization` rather than the broader `Organization`: a school is
 * one, and search engines treat the specific type as the stronger signal.
 */
export const organisationSchema = (unit?: Unit | null) => {
  const name = unit
    ? (unit.name ?? "South Indians' Welfare Society")
    : "South Indians' Welfare Society (SIWS)"

  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    // Each school is also a `School`, the more specific type search engines
    // use for local school results. The society itself stays an organisation.
    '@type': unit ? ['EducationalOrganization', 'School'] : 'EducationalOrganization',
    name,
    url: unit ? abs(`/${unit.slug}`) : serverURL,
  }

  if (unit?.tagline) base.description = unit.tagline

  const logo = mediaURL(unit?.logo)
  if (logo) base.logo = logo

  // Official social profiles (Instagram, YouTube, Facebook…) tell a search
  // engine these accounts are the school's own.
  const profiles = (unit?.socialProfiles ?? [])
    .map((profile) => (profile && typeof profile.url === 'string' ? profile.url.trim() : ''))
    .filter((url) => /^https?:\/\//i.test(url))
  if (profiles.length > 0) base.sameAs = profiles

  const street = [unit?.addressLine1, unit?.addressLine2].filter(Boolean).join(', ')
  if (street || unit?.city || unit?.postalCode) {
    base.address = {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
      ...(street ? { streetAddress: street } : {}),
      ...(unit?.city ? { addressLocality: unit.city } : {}),
      ...(unit?.postalCode ? { postalCode: unit.postalCode } : {}),
    }
  }

  if (unit?.phone) base.telephone = unit.phone
  if (unit?.email) base.email = unit.email

  /*
   * A unit is a department of the society rather than a separate institution,
   * so it is linked to its parent. Without this each school reads to a search
   * engine as an unrelated organisation that happens to share an address.
   */
  if (unit) {
    base.parentOrganization = {
      '@type': 'EducationalOrganization',
      name: "South Indians' Welfare Society (SIWS)",
      url: serverURL,
    }
  }

  return base
}

/** The organisation as it appears inside another item (no `@context` of its own). */
const organisationRef = (unit?: Unit | null) => {
  const { '@context': _context, ...rest } = organisationSchema(unit)
  return rest
}

/** A news item or event write-up. */
export const newsArticleSchema = (post: Post, unit?: Unit | null) => {
  const image = Array.isArray(post.photos)
    ? post.photos.find((p) => p && typeof p === 'object')
    : null
  const url = unit ? abs(`/${unit.slug}/${post.slug}`) : null

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    datePublished: post.date ?? post.createdAt,
    dateModified: post.updatedAt ?? post.date ?? post.createdAt,
    author: organisationRef(unit),
    publisher: organisationRef(unit),
  }

  if (url) {
    schema.url = url
    schema.mainEntityOfPage = { '@type': 'WebPage', '@id': url }
  }
  if (post.summary) schema.description = post.summary
  const imageURL = mediaURL(image)
  if (imageURL) schema.image = imageURL

  return schema
}

/**
 * An event write-up, as an `Event` as well as a news article.
 *
 * Only for posts filed as events, which carry the day it happened. It is held
 * at the school, so the school's address is the location. Nothing here is
 * invented: name, date, place and photo are all on the page.
 */
export const eventSchema = (post: Post, unit?: Unit | null) => {
  if (post.kind !== 'event' || !post.date || !unit) return null
  const organisation = organisationRef(unit)
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: post.title,
    startDate: post.date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: abs(`/${unit.slug}/${post.slug}`),
    organizer: organisation,
  }
  if (organisation.address) {
    schema.location = { '@type': 'Place', name: unit.name, address: organisation.address }
  }
  if (post.summary) schema.description = post.summary
  const image = Array.isArray(post.photos) ? post.photos.find((p) => p && typeof p === 'object') : null
  const imageURL = mediaURL(image)
  if (imageURL) schema.image = imageURL
  // Google requires a location for Event results; without an address, skip it.
  return schema.location ? schema : null
}

/**
 * The trail a visitor followed to reach this page.
 *
 * Built from the route rather than from the menu: the menu is a navigation
 * choice and can put a page anywhere, while the address is what the visitor
 * actually walked and what a search engine shows under the result.
 */
export type Crumb = { name: string; path: string }

/**
 * The trail itself, as site paths. Shared by the visible breadcrumb and the
 * BreadcrumbList, so what a visitor sees and what Google reads always match.
 */
export const breadcrumbItems = (
  segments: string[],
  unit?: Unit | null,
  page?: Page | Post | null,
): Crumb[] => {
  const items: Crumb[] = [{ name: 'Home', path: '/' }]

  if (unit) items.push({ name: unit.shortName ?? unit.name, path: `/${unit.slug}` })

  const title = page && 'title' in page ? page.title : null
  if (title && segments.length > (unit ? 1 : 0)) {
    items.push({ name: title, path: `/${segments.join('/')}` })
  }

  return items
}

export const breadcrumbSchema = (
  segments: string[],
  unit?: Unit | null,
  page?: Page | Post | null,
) => {
  const items = breadcrumbItems(segments, unit, page).map((item) => ({
    name: item.name,
    url: item.path === '/' ? serverURL : abs(item.path),
  }))

  if (items.length < 2) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/** Plain text out of a Lexical document, for structured data. */
const lexicalText = (node: unknown): string => {
  if (!node || typeof node !== 'object') return ''
  const current = node as { text?: unknown; children?: unknown[]; root?: unknown; type?: string }
  if (current.root) return lexicalText(current.root)
  if (typeof current.text === 'string') return current.text
  if (!Array.isArray(current.children)) return ''
  const joiner = current.type === 'root' ? '\n' : ''
  return current.children.map(lexicalText).join(joiner).replace(/\s+\n/g, '\n').trim()
}

/**
 * FR-FAQ-05 / BR-SEO-03 — FAQPage, from the question-and-answer sections
 * actually on the page.
 *
 * Built from the page's own accordion sections rather than from a separate FAQ
 * store, which is what makes it safe: Google requires FAQ markup to match
 * questions a visitor can read on the page, and these ARE those questions. A
 * page with no accordion emits nothing.
 */
export const faqSchema = (page?: Page | null) => {
  const layout = (page?.layout ?? []) as { blockType?: string; items?: { question?: string; answer?: unknown }[] }[]

  const entries = layout
    .filter((block) => block.blockType === 'accordion')
    .flatMap((block) => block.items ?? [])
    .map((item) => ({ question: item.question?.trim() ?? '', answer: lexicalText(item.answer) }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0)

  if (entries.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}
