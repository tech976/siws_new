import type { Block } from 'payload'

import { AccordionBlock } from './AccordionBlock'
import { AnnouncementsBlock } from './AnnouncementsBlock'
import { CallToActionBlock } from './CallToActionBlock'
import { BentoBlock } from './BentoBlock'
import { CardGridBlock } from './CardGridBlock'
import { DividerBlock } from './DividerBlock'
import { FacultyBlock } from './FacultyBlock'
import { FeatureListBlock } from './FeatureListBlock'
import { GalleryBlock } from './GalleryBlock'
import { PhotoLibraryBlock } from './PhotoLibraryBlock'
import { VideoGalleryBlock } from './VideoGalleryBlock'
import { HeroBlock } from './HeroBlock'
import { HeroCarouselBlock } from './HeroCarouselBlock'
import { HeroEnquiryBlock } from './HeroEnquiryBlock'
import { LogoStripBlock } from './LogoStripBlock'
import { MapBlock } from './MapBlock'
import { MediaTextBlock } from './MediaTextBlock'
import { ProgramCardsBlock } from './ProgramCardsBlock'
import { QuickNavBlock } from './QuickNavBlock'
import { RichTextBlock } from './RichTextBlock'
import { StatisticsBlock } from './StatisticsBlock'
import { UnitLinksBlock } from './UnitLinksBlock'
import { TestimonialsBlock } from './TestimonialsBlock'

/**
 * FR-CMS-01 — the content blocks from which pages are assembled without code.
 *
 * Adding a block here plus a matching renderer in `components/blocks` extends
 * every page type at once, which is the mechanism behind "new units, sites or
 * pages can be added without redevelopment" (SRS 7, Maintainability).
 *
 * Ordered roughly by how often a content manager reaches for each one, since
 * this is the order they appear in the "add section" menu.
 */
export const contentBlocks: Block[] = [
  HeroBlock,
  HeroCarouselBlock,
  RichTextBlock,
  MediaTextBlock,
  CardGridBlock,
  BentoBlock,
  ProgramCardsBlock,
  FeatureListBlock,
  FacultyBlock,
  GalleryBlock,
  VideoGalleryBlock,
  PhotoLibraryBlock,
  DividerBlock,
  MapBlock,
  AccordionBlock,
  AnnouncementsBlock,
  QuickNavBlock,
  LogoStripBlock,
  TestimonialsBlock,
  StatisticsBlock,
  UnitLinksBlock,
  CallToActionBlock,
  HeroEnquiryBlock,
]

export {
  AccordionBlock,
  AnnouncementsBlock,
  QuickNavBlock,
  LogoStripBlock,
  FacultyBlock,
  CallToActionBlock,
  CardGridBlock,
  BentoBlock,
  DividerBlock,
  ProgramCardsBlock,
  FeatureListBlock,
  GalleryBlock,
  VideoGalleryBlock,
  PhotoLibraryBlock,
  HeroBlock,
  HeroEnquiryBlock,
  MapBlock,
  MediaTextBlock,
  RichTextBlock,
  StatisticsBlock,
  TestimonialsBlock,
  UnitLinksBlock,
}
