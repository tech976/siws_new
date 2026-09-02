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
 * The supported replacement is the Instagram Graph API, and there are two ways
 * in. Which one applies depends on whether SIWS can sign in to @siws_wadala.
 *
 *   OWN ACCOUNT (`/me/media`) — the account authorises this site directly.
 *   Needs the Instagram login for @siws_wadala.
 *
 *   BUSINESS DISCOVERY (`business_discovery`) — reads any PUBLIC PROFESSIONAL
 *   account's recent posts using SOMEONE ELSE'S token. No authorisation from
 *   @siws_wadala at all, because the data being read is already public.
 *   It needs a Facebook Page and a professional Instagram account belonging to
 *   whoever sets it up, which may be far easier to arrange than the school's
 *   own login.
 *
 * Both are configured in `.env`; see `docs/INSTAGRAM.md`. Business Discovery is
 * used when a target username is set, because it is only ever set deliberately.
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
  /**
   * The MP4 itself, for a reel that is to be played rather than linked to.
   *
   * Only Graph returns this: on a VIDEO, `media_url` IS the file, which is why
   * the poster above has to come from `thumbnail_url` instead. The public
   * reader has no equivalent — it can see that a post is a video and show its
   * poster frame, and cannot reach the video — so this is null whenever the
   * section is running without a token.
   */
  videoUrl: string | null
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

  return {
    id,
    imageUrl,
    caption: asString(media.caption),
    permalink,
    isVideo,
    // On a VIDEO this is the MP4. It was being read only as a fallback poster
    // and then thrown away, which is why nothing could play a reel.
    videoUrl: isVideo ? asString(media.media_url) : null,
  }
}

/**
 * Fetches the most recent posts, newest first.
 *
 * Wrapped in React's `cache` so several blocks on one page share a single
 * request, and in Next's fetch cache so that request is reused across visitors
 * for `REVALIDATE_SECONDS`.
 */
/**
 * Builds the request for whichever route is configured.
 *
 * Business Discovery nests the media inside a `business_discovery` modifier on
 * OUR OWN user id, rather than reading a `/media` edge directly — the target
 * account is named in the query, not in the path. The nested field list is the
 * same either way, which is what lets one mapper serve both.
 */
const buildRequest = (
  token: string,
  limit: number,
): { url: URL; extract: (payload: unknown) => unknown } => {
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink'
  // Over-fetch slightly: unusable records (a video with no poster) are dropped
  // in mapping, and asking for exactly six could then render five.
  const count = String(Math.min(limit + 6, 25))

  const targetUsername = process.env.INSTAGRAM_TARGET_USERNAME?.trim().replace(/^@/, '')
  const selfUserId = process.env.INSTAGRAM_USER_ID?.trim()

  if (targetUsername && selfUserId) {
    const url = new URL(`${GRAPH_HOST}/${selfUserId}`)
    url.searchParams.set(
      'fields',
      `business_discovery.username(${targetUsername}){media.limit(${count}){${fields}}}`,
    )
    url.searchParams.set('access_token', token)
    return {
      url,
      extract: (payload) =>
        (payload as { business_discovery?: { media?: { data?: unknown } } })?.business_discovery
          ?.media?.data,
    }
  }

  const url = new URL(`${GRAPH_HOST}/me/media`)
  url.searchParams.set('fields', fields)
  url.searchParams.set('limit', count)
  url.searchParams.set('access_token', token)
  return { url, extract: (payload) => (payload as { data?: unknown })?.data }
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

  const { url, extract } = buildRequest(token, limit)

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
       *
       * On the Business Discovery route it can also mean the target account
       * stopped being public or professional, which is outside our control and
       * equally invisible without this line.
       */
      console.error(
        `[instagram] ${response.status} ${response.statusText} — the feed has fallen back to CMS posts. Check INSTAGRAM_ACCESS_TOKEN has not expired, and that the target account is still public and professional.`,
      )
      return []
    }

    const payload: unknown = await response.json()
    const data = extract(payload)
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
