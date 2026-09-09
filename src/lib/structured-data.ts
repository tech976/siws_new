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
 * EducationalOrganization, NewsArticle and BreadcrumbList are emitted, because
 * the content behind them exists. FAQPage, Event and JobPosting are not: the
 * FAQ pages are ordinary content rather than a question/answer collection, and
 * the careers and calendar modules are not built. Emitting a `JobPosting` with
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
    '@type': 'EducationalOrganization',
    name,
    url: unit ? abs(`/${unit.slug}`) : serverURL,
  }

  if (unit?.tagline) base.description = unit.tagline

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

/** A news item or event write-up. */
export const newsArticleSchema = (post: Post, unit?: Unit | null) => {
  const image = Array.isArray(post.photos)
    ? post.photos.find((p) => p && typeof p === 'object')
    : null

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    datePublished: post.date ?? post.createdAt,
    dateModified: post.updatedAt ?? post.date ?? post.createdAt,
    publisher: organisationSchema(unit),
  }

  if (post.summary) schema.description = post.summary
  if (image && typeof image === 'object' && 'url' in image && typeof image.url === 'string') {
    schema.image = image.url.startsWith('http') ? image.url : abs(image.url)
  }

  return schema
}

/**
 * The trail a visitor followed to reach this page.
 *
 * Built from the route rather than from the menu: the menu is a navigation
 * choice and can put a page anywhere, while the address is what the visitor
 * actually walked and what a search engine shows under the result.
 */
export const breadcrumbSchema = (
  segments: string[],
  unit?: Unit | null,
  page?: Page | Post | null,
) => {
  const items: { name: string; url: string }[] = [{ name: 'Home', url: serverURL }]

  if (unit) items.push({ name: unit.shortName ?? unit.name, url: abs(`/${unit.slug}`) })

  const title = page && 'title' in page ? page.title : null
  if (title && segments.length > (unit ? 1 : 0)) {
    items.push({ name: title, url: abs(`/${segments.join('/')}`) })
  }

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
