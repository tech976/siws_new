import type { Media } from '@/payload-types'

/**
 * One photograph as the gallery components need it.
 *
 * Flattened out of the block's nested shape on the server, so nothing in the
 * client bundle has to know what a Payload block looks like — and so the
 * category a picture was filed under travels with it rather than being
 * reconstructed from array indices during filtering.
 */
export interface GalleryPhoto {
  /** Stable across filtering, which is what the layout animation keys on. */
  id: string
  media: Media
  caption?: string
  /** The tab this photograph appears under. */
  category: string
  /** Marquee photographs take a 2x2 tile. */
  feature: boolean
  /** Shown whole on a plain ground rather than cropped to its tile. */
  showWhole?: boolean
}
