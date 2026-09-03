import type { LiveStreamBlock } from '@/payload-types'
import { youtubeEmbed } from '@/lib/youtube'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * The player, at the width of the page rather than the width of the prose.
 *
 * A telecast is the reason somebody opened this page, so it takes the full
 * measure instead of the 8-column column body copy sits in — capped, because a
 * 16:9 frame across a very wide screen puts the picture taller than the
 * viewport and pushes everything else off it.
 */
export const LiveStreamBlockView = ({ block }: { block: LiveStreamBlock }) => {
  const embed = block.youtubeUrl ? youtubeEmbed(block.youtubeUrl) : null

  /*
   * A block with an unusable address renders nothing rather than an empty
   * frame. The field validates on save, so this only happens to a link that
   * was valid when it was entered and has since been edited by hand.
   */
  if (!embed) return null

  return (
    <Section background={block.background as BlockBackground}>
      {block.heading ? (
        <div className="siws-centre mx-auto max-w-2xl text-center">
          <SectionHeading
            heading={block.heading}
            accentWord={block.accentWord}
            level={block.headingLevel}
            className="mb-8"
          />
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-brand-deep ring-1 ring-line/60">
        <iframe
          src={embed}
          title={block.heading ? `${block.heading} — live telecast` : 'Live telecast'}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          /*
           * Lazy, because this is often the heaviest thing on the page and a
           * visitor who arrived for the address below should not wait on a
           * player to find it.
           */
          loading="lazy"
          className="aspect-video w-full border-0"
        />
      </div>

      {block.note ? (
        <p className="mx-auto mt-4 max-w-4xl text-center t-small text-ink-muted">{block.note}</p>
      ) : null}
    </Section>
  )
}
