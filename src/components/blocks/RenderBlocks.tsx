import type { Page, Unit } from '@/payload-types'

import { AccordionBlockView } from './AccordionBlockView'
import { AchievementWallBlockView } from './AchievementWallBlockView'
import { AnnouncementsBlockView } from './AnnouncementsBlockView'
import { NewsGridBlockView } from './NewsGridBlockView'
import { CallToActionBlockView } from './CallToActionBlockView'
import { BentoBlockView } from './BentoBlockView'
import { CardGridBlockView } from './CardGridBlockView'
import { DividerBlockView } from './DividerBlockView'
import { FacultyBlockView } from './FacultyBlockView'
import { FeatureListBlockView } from './FeatureListBlockView'
import { FeedbackBlockView } from './FeedbackBlockView'
import { GalleryBlockView } from './GalleryBlockView'
import { PhotoLibraryBlockView } from './PhotoLibraryBlockView'
import { VideoGalleryBlockView } from './VideoGalleryBlockView'
import { HeroBlockView } from './HeroBlockView'
import { HeroCarouselBlockView } from './HeroCarouselBlockView'
import { HeroMarqueeBlockView } from './HeroMarqueeBlockView'
import { HeroEnquiryBlockView } from './HeroEnquiryBlockView'
import { InstagramFeedBlockView } from './InstagramFeedBlockView'
import { ReelShowcaseBlockView } from './ReelShowcaseBlockView'
import { LogoStripBlockView } from './LogoStripBlockView'
import { MapBlockView } from './MapBlockView'
import { MediaTextBlockView } from './MediaTextBlockView'
import { ProgramCardsBlockView } from './ProgramCardsBlockView'
import { QuickNavBlockView } from './QuickNavBlockView'
import { RichTextBlockView } from './RichTextBlockView'
import { StatisticsBlockView } from './StatisticsBlockView'
import { TestimonialsBlockView } from './TestimonialsBlockView'
import { UnitLinksBlockView } from './UnitLinksBlockView'

type LayoutBlock = NonNullable<Page['layout']>[number]

interface RenderBlocksProps {
  blocks?: LayoutBlock[] | null
  /**
   * All active units, for the "Our schools" block. Passed down rather than
   * fetched per block so the page costs one query for them however many times
   * the block is used.
   */
  units?: Unit[]
  /**
   * The unit whose site is being rendered. Threaded through because some blocks
   * are unit-aware — the enquiry form has to know which admissions inbox to
   * route to, and there is no request-scoped context available in RSC that
   * would carry it implicitly.
   */
  unit?: Unit | null
}

/**
 * Maps each stored block to its renderer.
 *
 * An unrecognised `blockType` renders nothing rather than throwing. That matters
 * during a deploy: if a content manager publishes a page using a block whose
 * renderer has not shipped yet, the rest of the page must still serve instead of
 * the whole route erroring.
 */
export const RenderBlocks = ({ blocks, unit = null, units = [] }: RenderBlocksProps) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return null

  /*
   * Whether this page carries a feedback form, decided here rather than on the
   * enquiry block.
   *
   * The "Give feedback" button under the enquiry card is a jump to `#feedback`
   * further down the same page, and a fragment matching no id fails silently —
   * the page does not move, which reads as a broken button. The block itself
   * cannot know: it sees its own fields and not the rest of the layout. A
   * checkbox on the block would have worked until somebody removed the
   * feedback section and left the tick behind.
   *
   * The layout is already in hand, so the honest answer is one pass over it.
   */
  const hasFeedback = blocks.some((entry) => entry.blockType === 'feedback')

  return (
    <>
      {blocks.map((block, index) => {
        // `id` is assigned by Payload per row; the index is only a fallback for
        // content saved before that was the case.
        const key = block.id ?? `${block.blockType}-${index}`

        switch (block.blockType) {
          case 'hero':
            return <HeroBlockView key={key} block={block} />
          case 'heroCarousel':
            return <HeroCarouselBlockView key={key} block={block} />
          case 'heroMarquee':
            return <HeroMarqueeBlockView key={key} block={block} />
          case 'unitLinks':
            return <UnitLinksBlockView key={key} block={block} units={units} />
          case 'richText':
            return <RichTextBlockView key={key} block={block} />
          case 'mediaText':
            return <MediaTextBlockView key={key} block={block} />
          case 'bento':
            return <BentoBlockView key={key} block={block} />
          case 'divider':
            return <DividerBlockView key={key} block={block} />
          case 'map':
            return <MapBlockView key={key} block={block} />
          case 'cardGrid':
            return <CardGridBlockView key={key} block={block} />
          case 'programCards':
            return <ProgramCardsBlockView key={key} block={block} />
          case 'quickNav':
            return <QuickNavBlockView key={key} block={block} />
          case 'announcements':
            return <AnnouncementsBlockView key={key} block={block} />
          case 'newsGrid':
            return <NewsGridBlockView key={key} block={block} />
          case 'logoStrip':
            return <LogoStripBlockView key={key} block={block} />
          case 'featureList':
            return <FeatureListBlockView key={key} block={block} />
          case 'faculty':
            return <FacultyBlockView key={key} block={block} unit={unit} />
          case 'gallery':
            return <GalleryBlockView key={key} block={block} />

          case 'videoGallery':
            return <VideoGalleryBlockView key={key} block={block} />

          case 'photoLibrary':
            return <PhotoLibraryBlockView key={key} block={block} />
          case 'achievementWall':
            return <AchievementWallBlockView key={key} block={block} />
          case 'accordion':
            return <AccordionBlockView key={key} block={block} index={index} />
          case 'testimonials':
            return <TestimonialsBlockView key={key} block={block} />
          case 'instagramFeed':
            return <InstagramFeedBlockView key={key} block={block} />
          case 'reelShowcase':
            return <ReelShowcaseBlockView key={key} block={block} />
          case 'statistics':
            return <StatisticsBlockView key={key} block={block} />
          case 'callToAction':
            return <CallToActionBlockView key={key} block={block} />
          case 'heroEnquiry':
            return (
              <HeroEnquiryBlockView
                key={key}
                block={block}
                unit={unit}
                hasFeedback={hasFeedback}
              />
            )
          case 'feedback':
            return <FeedbackBlockView key={key} block={block} unit={unit} />
          default:
            return null
        }
      })}
    </>
  )
}
