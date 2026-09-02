import type { InstagramFeedBlock } from '@/payload-types'

/**
 * A grid of Instagram's own post embeds.
 *
 * WHY THIS EXISTS ALONGSIDE THE API. It needs nothing — no access token, no
 * Meta developer app, and no access to the school's Instagram account. An
 * editor pastes the address of each post and Instagram serves the rest.
 *
 * That makes it the route SIWS can actually use today, which is why it takes
 * precedence over the API in the block. The trade-off is that the six posts are
 * chosen by hand rather than being "the latest six" automatically — but each
 * embedded post stays live: its picture, caption and like count come from
 * Instagram every time the page is opened, so nothing here goes stale.
 *
 * ACCESSIBILITY. Every frame carries a title naming the account, because an
 * untitled iframe is announced as just "frame" and six of them are
 * indistinguishable (WCAG 2.1 SC 2.4.1, 4.1.2).
 *
 * PRIVACY. `embed/captioned` is served by Instagram and sets Meta's cookies for
 * anyone who scrolls this far. `loading="lazy"` means the frames are not
 * requested at all until the visitor approaches them, which keeps that off the
 * page for the majority who never reach the bottom — and keeps six third-party
 * frames off the critical path on a phone.
 */

/** `/p/ABC/` → the canonical captioned-embed address Instagram serves. */
const toEmbedSrc = (url: string): string | null => {
  const match = url.match(/instagram\.com\/(p|reel|tv)\/([\w-]+)/i)
  if (!match) return null
  return `https://www.instagram.com/${match[1]}/${match[2]}/embed/captioned/`
}

export const InstagramEmbedGrid = ({
  urls,
  handle,
}: {
  urls: NonNullable<InstagramFeedBlock['postUrls']>
  handle?: string | null
}) => {
  const account = handle?.replace(/^@/, '') ?? 'siws_wadala'

  const sources = urls
    .map((row) => (typeof row.url === 'string' ? toEmbedSrc(row.url) : null))
    .filter((src): src is string => src !== null)

  if (sources.length === 0) return null

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sources.map((src, index) => (
        <li key={src} className="overflow-hidden rounded-xl bg-white shadow-card">
          {/*
            Instagram's embed is a fixed-width card that reflows to its
            container, and its height depends on the caption — so the frame is
            given a tall-ish ratio and the card is clipped, rather than trying
            to measure the frame's content, which is cross-origin and cannot be
            read from here.
          */}
          <iframe
            src={src}
            title={`Instagram post ${index + 1} from @${account}`}
            loading="lazy"
            className="block h-[min(560px,120vw)] w-full border-0 sm:h-[520px]"
            // Instagram's own embed code sets these; without them the frame
            // shows its own scrollbars over the card.
            scrolling="no"
            allowTransparency
          />
        </li>
      ))}
    </ul>
  )
}
