import { cache } from 'react'

/**
 * Recent posts from the school's Instagram account.
 *
 * WHY A TOKEN IS NEEDED AT ALL. There is no public feed to read. Meta shut the
 * Instagram Basic Display API down on 4 December 2024, and the older
 * unauthenticated routes (`?__a=1`, the public oEmbed endpoint) went with it —
 * they now return errors or a login wall. Scraping the profile HTML is not an
 * alternative: it is rate-limited by IP, blocked from datacentre ranges, and
 * against Instagram's terms, so it would fail in production precisely because
 * production is a server.
 *
 * The supported replacement is the Instagram Graph API, which needs a
 * long-lived access token tied to a professional (business or creator) account.
 * @siws_wadala is already professional, so the only outstanding step is
 * generating the token — see `docs/INSTAGRAM.md`.
 *
 * THE CONTRACT WITH THE BLOCK. This module never throws and never blocks a
 * page. Any failure — no token, an expired token, a Meta outage, a slow
 * response — returns an empty array, and the block falls back to the posts
 * curated in the CMS. A social media section is the least important thing on a
 * school's front page; it must never be the reason the page is down.
 */

export interface InstagramPost {
  id: string
  /** Direct image URL, served from Meta's CDN. */
  imageUrl: string
  caption: string | null
  permalink: string
  /** Videos and reels carry a poster image; carousels use their first frame. */
  isVideo: boolean
}

/** Shape of the fields we request back from Graph. */
interface GraphMedia {
  id?: unknown
  caption?: unknown
  media_type?: unknown
  media_url?: unknown
  thumbnail_url?: unknown
  permalink?: unknown
}

const GRAPH_HOST = 'https://graph.instagram.com'

/**
 * How long a fetched feed is reused.
 *
 * Fifteen minutes. Instagram's rate limit is generous (200 calls/hour) but the
 * page is served to every visitor, so an uncached fetch would spend that limit
 * in minutes under any real traffic. A school posts a few times a week; nobody
 * is refreshing the front page waiting for a photograph to appear.
 */
const REVALIDATE_SECONDS = 900

/** Abort a slow response rather than hold the page render open. */
const TIMEOUT_MS = 4000

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

/**
 * Maps one Graph record to a post, or null if it is unusable.
 *
 * A VIDEO has no `media_url` that an `<img>` can show — it is an MP4. Its
 * poster frame comes back as `thumbnail_url` instead, so that is what a video
 * or reel renders. A record with neither is skipped rather than rendered as a
 * broken image.
 */
const toPost = (media: GraphMedia): InstagramPost | null => {
  const id = asString(media.id)
  const permalink = asString(media.permalink)
  if (!id || !permalink) return null

  const isVideo = media.media_type === 'VIDEO'
  const imageUrl = isVideo
    ? (asString(media.thumbnail_url) ?? asString(media.media_url))
    : (asString(media.media_url) ?? asString(media.thumbnail_url))

  if (!imageUrl) return null

  return { id, imageUrl, caption: asString(media.caption), permalink, isVideo }
}

/**
 * Fetches the most recent posts, newest first.
 *
 * Wrapped in React's `cache` so several blocks on one page share a single
 * request, and in Next's fetch cache so that request is reused across visitors
 * for `REVALIDATE_SECONDS`.
 */
export const getInstagramPosts = cache(async (limit: number): Promise<InstagramPost[]> => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  // The ordinary state of affairs until a token is issued. Not an error, and
  // deliberately not logged: it would print on every render forever.
  if (!token) return []

  const url = new URL(`${GRAPH_HOST}/me/media`)
  url.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,permalink')
  // Over-fetch slightly: unusable records (a video with no poster) are dropped
  // in mapping, and asking for exactly six could then render five.
  url.searchParams.set('limit', String(Math.min(limit + 6, 25)))
  url.searchParams.set('access_token', token)

  try {
    const response = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ['instagram'] },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!response.ok) {
      /*
       * Worth a log line, unlike the missing-token case. A 400 here almost
       * always means the long-lived token passed its 60-day life without being
       * refreshed, and the symptom on the page — the grid quietly reverting to
       * the CMS posts — gives nobody a reason to go looking.
       */
      console.error(
        `[instagram] ${response.status} ${response.statusText} — the feed has fallen back to CMS posts. Check INSTAGRAM_ACCESS_TOKEN has not expired.`,
      )
      return []
    }

    const payload: unknown = await response.json()
    const data = (payload as { data?: unknown })?.data
    if (!Array.isArray(data)) return []

    return data
      .map((item) => toPost(item as GraphMedia))
      .filter((post): post is InstagramPost => post !== null)
      .slice(0, limit)
  } catch (error) {
    // Includes the timeout above. The page still renders; the section falls back.
    console.error('[instagram] feed unavailable, falling back to CMS posts:', error)
    return []
  }
})
