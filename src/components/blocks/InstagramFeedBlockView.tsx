import Image from 'next/image'

import { Media } from '@/components/Media'
import { getInstagramPosts, type InstagramPost } from '@/lib/instagram'
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
  <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" aria-hidden="true">
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
})

export const InstagramFeedBlockView = async ({ block }: { block: InstagramFeedBlock }) => {
  const limit = Number(block.count ?? '6')

  const live = await getInstagramPosts(limit)

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

  const tiles = live.length > 0 ? live.map(fromApi) : curated
  if (tiles.length === 0) return null

  return (
    <Section background={block.background as BlockBackground}>
      {/*
        THE HEADER IS A PROFILE ROW, not a section title with a subtitle.
        The gradient ring, the handle and the follow action are the three
        things Instagram itself puts at the top of a profile, and borrowing
        that arrangement is what tells a visitor at a glance that these
        photographs come from somewhere live — rather than being one more
        gallery on a page that already has one directly above it.
      */}
      <div className="mb-10 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* The ring is Instagram's own gradient, drawn as a border so the
              glyph inside keeps the section's ink colour. */}
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-full p-[2.5px] [background:conic-gradient(from_215deg,#f9ce34,#ee2a7b,#6228d7,#f9ce34)]"
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

      {/*
        Three across on a desktop, two on a phone. Not one on a phone: these are
        square thumbnails, and a single column turns six posts into a great deal
        of scrolling for a section that is meant to be glanced at.
      */}
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
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
                 * `aspect-square` with `overflow-hidden` is what makes these
                 * read as Instagram rather than as a photo gallery: the feed
                 * is a uniform grid, and tiles that each take their picture's
                 * own proportions are the single thing that gives that away.
                 */
                className="group relative block aspect-square overflow-hidden rounded-lg bg-brand-tint focus-visible:outline-3 focus-visible:outline-offset-2"
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
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                ) : (
                  <Media
                    resource={tile.mediaDoc}
                    fill
                    alt={line ?? ''}
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                )}

                {/* A reel is a different kind of thing to a photograph, and the
                    corner glyph is how Instagram says so. */}
                {tile.isVideo ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-2 top-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
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
                    className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/25 to-transparent p-3 text-xs leading-snug text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                  >
                    <span className="line-clamp-3">{line}</span>
                  </span>
                ) : null}
              </a>
            </li>
          )
        })}
      </ul>

      {/* Repeated for the phone, where the header action is hidden, and for
          anyone who has just finished looking through the photographs. */}
      <p className="mt-8 text-center sm:hidden">
        <a href={block.profileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
          Follow us on Instagram
        </a>
      </p>
    </Section>
  )
}
