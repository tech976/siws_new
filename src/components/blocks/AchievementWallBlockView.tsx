import type { Achievement } from '@/components/achievements/AchievementWall'
import { AchievementWall } from '@/components/achievements/AchievementWall'
import { RichText } from '@/components/RichText'
import type { AchievementWallBlock, Media as MediaDoc } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * Flattens the block's rows into the shape the wall needs, on the server.
 *
 * The mapping is worth reading once, because two of the names are borrowed:
 * an achievement's PRIZE travels in `category`, and its OCCASION travels in
 * `caption`. Those are the two slots the shared lightbox already renders — the
 * badge and the title — so borrowing them means the achievement wall and the
 * photo gallery open the same component instead of a second one written to say
 * the same things in a different order.
 *
 * A row with no photograph is dropped rather than rendered as an empty tile.
 * `photo` is required in the schema, so this only happens if the picture is
 * later deleted from the library — and a hole in the wall would be a worse
 * answer to that than one fewer tile.
 */
export const AchievementWallBlockView = ({ block }: { block: AchievementWallBlock }) => {
  const items: Achievement[] = (block.items ?? [])
    .filter((row) => row.photo && typeof row.photo === 'object')
    .map((row, index) => ({
      id: String(row.id ?? index),
      media: row.photo as MediaDoc,
      /* The occasion — the tile's title, and the lightbox's. */
      caption: row.title,
      /* The prize — the badge on the tile, and the badge in the lightbox. */
      category: row.award ?? '',
      when: row.when ?? undefined,
      detail: row.detail ?? undefined,
      feature: row.feature === true,
    }))

  if (items.length === 0) return null

  return (
    <Section background={block.background as BlockBackground}>
      <AchievementWall items={items}>
        <SectionHeading
          heading={block.heading}
          accentWord={block.accentWord}
          level={block.headingLevel}
          className="mb-4"
        />
        {block.intro ? (
          <RichText data={block.intro} className="siws-centre mx-auto max-w-3xl" />
        ) : null}
      </AchievementWall>
    </Section>
  )
}
