import type { MetadataRoute } from 'next'

/**
 * BR-SEO-04 / BR-SEO-08 — a managed robots.txt.
 *
 * Indexing is opt-in. `NEXT_PUBLIC_ENABLE_INDEXING` must be the exact string
 * `true`; anything else — unset, empty, "TRUE", "1" — keeps the site out of the
 * index, so a staging deployment that forgets the flag stays private rather
 * than leaking into search results.
 *
 * The admin panel, the API and the preview route are disallowed even in
 * production. None of them is content, all of them are addressable, and a
 * crawler working through `/api` is both a privacy question and a load one.
 * `protected-media` is disallowed as well: it holds job applications and form
 * attachments, is already access-restricted (BR-MED-06), and belongs nowhere
 * near a search index.
 */

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001'
const indexingEnabled = process.env.NEXT_PUBLIC_ENABLE_INDEXING === 'true'

const robots = (): MetadataRoute.Robots => {
  if (!indexingEnabled) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/next/', '/protected-media/'],
      },
    ],
    sitemap: `${serverURL}/sitemap.xml`,
    host: serverURL,
  }
}

export default robots
