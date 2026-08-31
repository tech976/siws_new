import { PhotoLibrary } from '@/components/gallery/PhotoLibrary'
import type { GalleryPhoto } from '@/components/gallery/types'
import { RichText } from '@/components/RichText'
import type { Media as MediaDoc, PhotoLibraryBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * Flattens the block's nested groups into one list the client can filter.
 *
 * The category a photograph was filed under is copied onto the photograph
 * itself here. Filtering then reads one field instead of walking the groups on
 * every keystroke, and the lightbox can say what it is showing without being
 * handed the whole structure.
 */
export const PhotoLibraryBlockView = ({ block }: { block: PhotoLibraryBlock }) => {
  const groups = (block.groups ?? []).filter(
    (group) => group.label && (group.images ?? []).length > 0,
  )

  const photos: GalleryPhoto[] = groups.flatMap((group, groupIndex) =>
    (group.images ?? [])
      .filter((entry) => entry.image && typeof entry.image === 'object')
      .map((entry, index) => {
        const media = entry.image as MediaDoc
        return {
          id: String(entry.id ?? `${groupIndex}-${index}`),
          media,
          caption: entry.caption || media.caption || undefined,
          category: group.label!,
          feature: entry.feature === true,
          showWhole: media.showWhole === true,
        }
      }),
  )

  if (photos.length === 0) return null

  return (
    <Section background={block.background as BlockBackground}>
      <PhotoLibrary
        photos={photos}
        categories={groups.map((group) => group.label!)}
        allLabel={block.allLabel || 'Everything'}
      >
        <SectionHeading
          heading={block.heading}
          accentWord={block.accentWord}
          level={block.headingLevel}
          className="mb-4"
        />
        {block.intro ? (
          <RichText data={block.intro} className="siws-centre mx-auto max-w-3xl" />
        ) : null}
      </PhotoLibrary>
    </Section>
  )
}
