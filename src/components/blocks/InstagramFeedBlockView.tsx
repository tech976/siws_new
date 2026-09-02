import Image from 'next/image'

import { Media } from '@/components/Media'
import { InstagramReels, type Reel } from './InstagramReels'
import { getInstagramPosts, type InstagramPost } from '@/lib/instagram'
import { getPublicInstagramPosts } from '@/lib/instagram-public'

import { InstagramEmbedGrid } from './InstagramEmbedGrid'
import { InstagramProfileEmbed } from './InstagramProfileEmbed'
import type { InstagramFeedBlock, Media as MediaDoc } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * The Instagram grid.
 *
 * Live posts when a token is configured, the CMS-curated posts otherwise —
 * the reasoning for that arrangement is in `blocks/InstagramFeedBlock.ts`.
 *
 * The whole section is omitted when there is nothing to show, rather than
 * rendering an empty frame. A heading over six grey boxes reads as a broken
 * page; a section that is simply not there reads as a page that never had one.
 */

/**
 * The Instagram mark, inline.
 *
 * lucide-react dropped every brand logo at v1, so there is no icon to import.
 * This is the same path the footer's social buttons use — the two marks must
 * not drift apart, since both stand for the same account.
 */
const InstagramGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true">
    <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.26.07 1.64.07 4.83s-.01 3.57-.07 4.83c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.26.06-1.64.07-4.85.07s-3.59-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.57 2.2 15.19 2.2 12s.01-3.57.07-4.83c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.44 2.21 8.82 2.2 12 2.2Zm0 1.8c-3.14 0-3.5.01-4.74.07-.9.04-1.39.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.32-.28.81-.32 1.71C3.42 8.9 3.4 9.26 3.4 12s.02 3.1.08 4.35c.04.9.19 1.39.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.13.81.28 1.71.32 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c.9-.04 1.39-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.32.28-.81.32-1.71.06-1.25.08-1.61.08-4.35s-.02-3.1-.08-4.35c-.04-.9-.19-1.39-.32-1.71a2.9 2.9 0 0 0-.69-1.06 2.9 2.9 0 0 0-1.06-.69c-.32-.13-.81-.28-1.71-.32C15.5 4.01 15.14 4 12 4Zm0 3.03A4.97 4.97 0 1 1 12 17a4.97 4.97 0 0 1 0-9.97Zm0 1.8a3.17 3.17 0 1 0 0 6.34 3.17 3.17 0 0 0 0-6.34Zm5.15-.65a1.16 1.16 0 1 1 0-2.32 1.16 1.16 0 0 1 0 2.32Z" />
  </svg>
)

/**
 * The reel marker, inline — same reason as the mark above.
 */
const ReelGlyph = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true" className="text-white">
    <path d="M10 8.64v6.72a.5.5 0 0 0 .77.42l5.28-3.36a.5.5 0 0 0 0-.84L10.77 8.22a.5.5 0 0 0-.77.42Z" />
  </svg>
)

/** Either source, reduced to what the tile actually needs to render. */
interface Tile {
  key: string
  caption: string | null
  href: string | null
  /** Exactly one of these is set. */
  remoteUrl?: string
  mediaDoc?: MediaDoc | number | string
  isVideo: boolean
  /** The MP4, when there is one to play. Null on every non-Graph source. */
  videoUrl?: string | null
}

/**
 * The first line of a caption, for alt text and the hover overlay.
 *
 * Instagram captions run to paragraphs and a wall of hashtags. Read aloud in
 * full, one photograph would take a screen reader a minute to get through, so
 * the alt text is the first sentence's worth and the rest is left to the post
 * itself.
 */
const firstLine = (caption: string | null): string | null => {
  if (!caption) return null
  const line = caption.split('\n')[0]?.trim()
  if (!line) return null
  return line.length > 120 ? `${line.slice(0, 119).trimEnd()}…` : line
}

/**
 * What a screen reader announces for a tile.
 *
 * Never "Instagram post" alone for every tile — six identically-named links are
 * indistinguishable in a links list, which is exactly how a screen reader user
 * navigates (WCAG 2.1 SC 2.4.4). The caption is what makes each one distinct,
 * so it is used whenever there is one.
 */
const tileLabel = (caption: string | null, index: number, isVideo: boolean): string => {
  const line = firstLine(caption)
  const kind = isVideo ? 'Instagram video' : 'Instagram post'
  return line ? `${kind}: ${line}` : `${kind} ${index + 1}`
}

const fromApi = (post: InstagramPost): Tile => ({
  key: post.id,
  caption: post.caption,
  href: post.permalink,
  remoteUrl: post.imageUrl,
  isVideo: post.isVideo,
  videoUrl: post.videoUrl,
})

export const InstagramFeedBlockView = async ({ block }: { block: InstagramFeedBlock }) => {
  const limit = Number(block.count ?? '6')
  const mode = block.mode ?? 'profile'

  /*
   * Two automatic sources, tried in order.
   *
   * The public reader gives us the posts as DATA, which is what allows the
   * SIWS-styled 4:5 grid below. When it comes back empty — Meta changed the
   * page, or the account went private — the section falls back to Instagram's
   * own profile embed, which is a supported feature and keeps working.
   */
  const live = await getInstagramPosts(limit)
  const publicPosts =
    mode === 'profile' && live.length === 0
      ? await getPublicInstagramPosts(block.handle ?? '', limit)
      : []

  const curated: Tile[] = (block.posts ?? [])
    .filter((row) => Boolean(row.image))
    .slice(0, limit)
    .map((row, index) => ({
      key: row.id ?? `post-${index}`,
      caption: row.caption ?? null,
      // Falls back to the profile: a tile that goes nowhere looks broken when
      // its neighbours are all clickable.
      href: row.url || block.profileUrl,
      mediaDoc: row.image as MediaDoc | number | string,
      isVideo: false,
    }))

  /*
   * PRECEDENCE: pasted post links first, then the API, then uploaded pictures.
   *
   * The links come first because they are the only route that needs no Meta
   * setup at all, so if an editor has taken the trouble to paste them they are
   * certainly the intended content. The API only wins where no links exist,
   * which is the case once a token has been configured and the section is
   * meant to run unattended.
   */
  const embedUrls = (block.postUrls ?? []).slice(0, limit)
  const tiles =
    live.length > 0
      ? live.map(fromApi)
      : publicPosts.length > 0
        ? publicPosts.map(fromApi)
        : curated

  /*
   * `profile` is the default and needs no content at all, so it is the only
   * mode that cannot be empty. The others still render nothing when they have
   * nothing to show, rather than leaving a heading over a blank band.
   */
  const isProfile = mode === 'profile'
  const isLinks = mode === 'links' && embedUrls.length > 0

  /*
   * The films, for the rail. A tile qualifies only if it actually has an MP4:
   * `isVideo` is true for a reel read off the public page too, and that one
   * has a cover and nothing to play.
   */
  const wantsReels = block.display === 'reels'
  const reels: Reel[] = wantsReels
    ? tiles
        .filter((tile): tile is Tile & { videoUrl: string } => Boolean(tile.videoUrl))
        .map((tile) => ({
          key: tile.key,
          videoUrl: tile.videoUrl,
          posterUrl: tile.remoteUrl ?? null,
          caption: firstLine(tile.caption),
          href: tile.href,
        }))
    : []

  if (!isProfile && !isLinks && tiles.length === 0) return null

  /*
   * A reels section with no film to play does not appear at all.
   *
   * The alternative was to fall back to the profile embed, which is what the
   * grid does — but the grid is already on this page doing exactly that, and a
   * second heading over a second copy of the same embed is worse than nothing.
   * The films come only from Graph, so this band is empty until
   * INSTAGRAM_ACCESS_TOKEN is set, and appears on its own once it is.
   */
  if (wantsReels && reels.length === 0) return null

  return (
    /*
     * Tighter than the shared default (`py-14 sm:py-20`).
     *
     * This section is a glance at a social feed sitting between two heavier
     * ones — a photo gallery above, the map below. At full section padding it
     * took as much vertical space as the gallery it follows, which gave it more
     * weight on the page than it earns.
     */
    <Section
      background={block.background as BlockBackground}
      className="!py-10 sm:!py-12"
    >
      {/*
        THE HEADER IS A PROFILE ROW, not a section title with a subtitle.
        The gradient ring, the handle and the follow action are the three
        things Instagram itself puts at the top of a profile, and borrowing
        that arrangement is what tells a visitor at a glance that these
        photographs come from somewhere live — rather than being one more
        gallery on a page that already has one directly above it.
      */}
      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* The ring is Instagram's own gradient, drawn as a border so the
              glyph inside keeps the section's ink colour. */}
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full p-[2px] [background:conic-gradient(from_215deg,#f9ce34,#ee2a7b,#6228d7,#f9ce34)]"
          >
            <span className="grid size-full place-items-center rounded-full bg-white text-brand">
              <InstagramGlyph />
            </span>
          </span>

          <div className="text-center sm:text-left">
            <SectionHeading
              heading={block.heading}
              accentWord={block.accentWord}
              level={block.headingLevel}
              className="mb-0 !text-left max-sm:!text-center"
            />
            {block.handle ? (
              <p className="mt-1 text-ink-muted">{block.handle}</p>
            ) : null}
          </div>
        </div>

        {/*
          The follow action sits in the header, where a profile puts it, and
          repeats under the grid for anyone who has scrolled the photographs.
        */}
        <a
          href={block.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary shrink-0 max-sm:hidden"
        >
          Follow us on Instagram
        </a>
      </div>

      {wantsReels ? (
        <InstagramReels reels={reels} />
      ) : isProfile && publicPosts.length === 0 ? (
        <InstagramProfileEmbed handle={block.handle} />
      ) : isLinks ? (
        <InstagramEmbedGrid urls={embedUrls} handle={block.handle} />
      ) : (
        <ul
          /*
           * THREE ACROSS, AT EVERY WIDTH.
           *
           * It ran three on a phone and six from `lg`, so the tiles halved in
           * width exactly where there was most room for them — a strip of
           * thumbnails across a desktop page, small enough that a face in a
           * photograph was unreadable.
           *
           * Three columns is also the shape anyone recognises: it is how the
           * grid on Instagram itself is laid out, so nine posts read as a
           * profile rather than as a row of decoration.
           */
          className="grid grid-cols-3 gap-2.5 sm:gap-4"
        >
          {tiles.map((tile, index) => {
            const label = tileLabel(tile.caption, index, tile.isVideo)
            const line = firstLine(tile.caption)

            return (
              <li key={tile.key}>
                <a
                  href={tile.href ?? block.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  /*
                   * 4:5 PORTRAIT, uniformly.
                   *
                   * It is the ratio Instagram itself shoots and stores at —
                   * this account's own posts are 1080×1350 — so a portrait tile
                   * shows the whole frame each picture was composed in, where a
                   * square one crops the top and bottom off every post.
                   *
                   * Uniform matters as much as the ratio: a feed reads as a
                   * feed because the tiles agree. Letting each take its own
                   * picture's proportions is the one thing that would make this
                   * look like an ordinary photo gallery again.
                   */
                  className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-brand-tint ring-1 ring-line/60 transition-shadow duration-300 hover:shadow-[0_10px_30px_-12px_rgba(36,39,111,0.45)] focus-visible:outline-3 focus-visible:outline-offset-2"
                >
                  {tile.remoteUrl ? (
                    /*
                     * `unoptimized` is deliberate. These URLs are signed and
                     * expiring — Meta's CDN rotates them — so a copy cached in
                     * Next's image optimiser outlives the URL it was built from
                     * and starts serving 403s. Passing them through means the
                     * browser always asks Instagram for a URL that is still valid.
                     */
                    <Image
                      src={tile.remoteUrl}
                      alt={line ?? ''}
                      fill
                      unoptimized
                      sizes="(min-width: 640px) 33vw, 32vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <Media
                      resource={tile.mediaDoc}
                      fill
                      alt={line ?? ''}
                      sizes="(min-width: 640px) 33vw, 32vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  )}

                  {/* A reel is a different kind of thing to a photograph, and the
                      corner glyph is how Instagram says so. */}
                  {tile.isVideo ? (
                    <span
                      aria-hidden="true"
                      className="absolute right-3 top-3 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
                    >
                      <ReelGlyph />
                    </span>
                  ) : null}

                  {/*
                    The caption on hover. `aria-hidden` because the link's own
                    accessible name already carries it — without that a screen
                    reader reads every caption twice.
                  */}
                  {line ? (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-4 text-sm leading-snug font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                    >
                      <span className="line-clamp-3">{line}</span>
                    </span>
                  ) : null}
                </a>
              </li>
            )
          })}
        </ul>
      )}

      {/* Repeated for the phone, where the header action is hidden, and for
          anyone who has just finished looking through the photographs. */}
      <p className="mt-6 text-center sm:hidden">
        <a href={block.profileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
          Follow us on Instagram
        </a>
      </p>
    </Section>
  )
}
