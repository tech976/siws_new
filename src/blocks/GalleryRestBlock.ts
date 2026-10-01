import type { Block } from 'payload'

import { BLOCK_GROUPS, blockAdmin } from './shared'

/**
 * Every section of the photo library that the page does not already show.
 *
 * WHY A PAGE NEEDS THIS. A gallery block names its section and lists the
 * photographs filed under it, which works until somebody files a photograph
 * under a section no block names — a sports day, a new festival — and it
 * appears nowhere. `seed:galleries` builds a block per section, but it rebuilds
 * the page from the template and must never run on the live site, so in
 * practice a new section stayed invisible until someone edited the page by
 * hand.
 *
 * Placed once at the foot of a gallery page, this renders a group for each
 * remaining section, newest photographs first, and nothing at all when there
 * are none. An HOD who adds a photograph under any section — including one
 * they have just invented — sees it on the gallery page without anyone
 * touching the page.
 *
 * It has no fields: what it shows is decided by the photographs themselves.
 */
export const GalleryRestBlock: Block = {
  slug: 'galleryRest',
  interfaceName: 'GalleryRestBlock',
  labels: { singular: 'Every other section', plural: 'Every other section' },
  admin: blockAdmin(BLOCK_GROUPS.highlights),
  /*
   * Nothing to fill in — the name in the editor is the whole of it. Payload
   * has no description for a block itself, so what it does is written on the
   * one row an editor sees.
   */
  fields: [],
}
