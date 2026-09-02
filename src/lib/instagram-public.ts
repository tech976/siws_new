import { cache } from 'react'

import type { InstagramPost } from './instagram'

/**
 * The latest posts from a public account, read from its own embed page.
 *
 * WHY THIS EXISTS. The `/<username>/embed/` page renders Instagram's own
 * six-post grid, and the data behind that grid is embedded in the page as JSON.
 * Reading it gives us the pictures, captions and links as *data* rather than as
 * an opaque cross-origin frame — which is the only way to lay them out in the
 * site's own design (4:5 tiles, SIWS type) instead of Instagram's square grid.
 *
 * It needs no token, no developer app and no access to the account.
 *
 * WHAT THIS COSTS, STATED PLAINLY. The JSON is an internal detail of that page,
 * not a documented API. Meta can rename a key or restructure it at any time
 * without notice, and the day they do, this returns nothing. That is why:
 *
 *   - every failure returns an empty array rather than throwing, and
 *   - the block falls back to the plain profile embed, which is a supported,
 *     stable feature and will keep working.
 *
 * So the worst realistic outcome is that the section reverts to square tiles.
 * It cannot take the page down, and it cannot show a broken grid.
 *
 * NOTE ON IMAGE URLS. Instagram's CDN links are signed and expire after a few
 * days. They are therefore never passed through Next's image optimiser, which
 * would cache a copy that outlives the URL and start serving errors; the
 * renderer sets `unoptimized` for exactly this reason.
 */

interface GraphqlNode {
  shortcode?: unknown
  display_url?: unknown
  is_video?: unknown
  dimensions?: { width?: unknown; height?: unknown }
  edge_media_to_caption?: { edges?: Array<{ node?: { text?: unknown } }> }
}

/** Reused from the API path so both sources produce identical tiles. */
export type PublicPost = InstagramPost & {
  /** Intrinsic size, used to letterbox a portrait reel rather than crop it. */
  width: number | null
  height: number | null
}

const REVALIDATE_SECONDS = 900
const TIMEOUT_MS = 5000

const asString = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null

/**
 * Pulls the one JSON blob the embed page carries its media in.
 *
 * The value is a JSON *string* inside the page's own JSON, so it arrives
 * double-encoded and with HTML entities applied. `raw_decode`'s equivalent —
 * decoding only the first complete value and ignoring the trailing content —
 * is what `JSON.parse` cannot do, so the object is located by scanning for its
 * matching brace instead.
 */
const extractContext = (html: string): unknown => {
  const marker = '"contextJSON":"'
  const start = html.indexOf(marker)
  if (start === -1) return null

  // Walk to the closing quote, respecting backslash escapes.
  let i = start + marker.length
  let out = ''
  while (i < html.length) {
    const ch = html[i]
    if (ch === '\\') {
      out += ch + html[i + 1]
      i += 2
      continue
    }
    if (ch === '"') break
    out += ch
    i += 1
  }

  try {
    // The captured text is the *contents* of a JSON string literal, so wrapping
    // it in quotes and parsing yields the inner JSON document.
    const inner = JSON.parse(`"${out}"`) as string
    return JSON.parse(inner)
  } catch {
    return null
  }
}

const toPost = (node: GraphqlNode): PublicPost | null => {
  const shortcode = asString(node.shortcode)
  const imageUrl = asString(node.display_url)
  if (!shortcode || !imageUrl) return null

  const caption = asString(node.edge_media_to_caption?.edges?.[0]?.node?.text)
  const width = typeof node.dimensions?.width === 'number' ? node.dimensions.width : null
  const height = typeof node.dimensions?.height === 'number' ? node.dimensions.height : null

  return {
    id: shortcode,
    imageUrl,
    caption,
    permalink: `https://www.instagram.com/p/${shortcode}/`,
    isVideo: node.is_video === true,
    /*
     * Null, always. The public page hands over a poster frame and the fact
     * that a post is a video; the MP4 itself is only on Graph, behind a token.
     * So a reel read this way can be shown and linked to, and cannot be
     * played in place.
     */
    videoUrl: null,
    width,
    height,
  }
}

/**
 * Fetches the account's most recent posts. Empty array on any failure.
 */
export const getPublicInstagramPosts = cache(
  async (username: string, limit: number): Promise<PublicPost[]> => {
    const account = username.replace(/^@/, '').trim()
    if (!account) return []

    try {
      const response = await fetch(`https://www.instagram.com/${account}/embed/`, {
        /*
         * A PLAIN, NON-BROWSER USER AGENT IS DELIBERATE — and it is the
         * opposite of what one would guess.
         *
         * Sent a Chrome user-agent, Instagram serves the heavy client-rendered
         * page (~626KB) whose grid is built in the browser, and which contains
         * no media data at all. Sent a simple one, it serves the lightweight
         * server-rendered page (~335KB) with the posts embedded as JSON, which
         * is the one we can actually read.
         *
         * Identifying the site honestly is also the right thing to do: this is
         * a public page being read by a server, and a contact URL in the agent
         * string is what lets Meta see who is asking.
         */
        headers: {
          'user-agent': 'SIWS-School-Website/1.0 (+https://siwsschool.edu.in)',
        },
        next: { revalidate: REVALIDATE_SECONDS, tags: ['instagram'] },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      if (!response.ok) return []

      const context = extractContext(await response.text())
      const media = (context as { context?: { graphql_media?: unknown } })?.context?.graphql_media
      if (!Array.isArray(media)) return []

      return media
        .map((entry) => toPost((entry as { shortcode_media?: GraphqlNode })?.shortcode_media ?? {}))
        .filter((post): post is PublicPost => post !== null)
        .slice(0, limit)
    } catch {
      // Deliberately silent: falling back to the profile embed is a normal,
      // fully-working outcome, not an error worth a line in the log on every
      // render.
      return []
    }
  },
)
