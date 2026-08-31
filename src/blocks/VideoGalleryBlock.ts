import type { Block } from 'payload'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * A row of videos, each shown as a still with a play button over it.
 *
 * WHAT IS STORED, AND WHY IT IS ONLY AN ID
 * ----------------------------------------
 * The field holds a Google Drive FILE ID and nothing else. The embed URL is
 * built from it at render time, exactly as `MapBlock` builds its map URL from
 * an address: storing a pasted `<iframe>` would put third-party HTML in the
 * database and render it into the page, which is a script-injection route
 * straight through the CMS. An id that turns out to be wrong fails to find a
 * video; it can never become markup.
 *
 * Editors paste the whole sharing link — nobody should have to know what part
 * of a URL is the id — and the id is pulled out of it on save.
 *
 * WHY A STILL RATHER THAN THE PLAYER
 * ----------------------------------
 * Three embedded players would load three of Google's iframes on a page a
 * visitor may only be scrolling past, and each one carries its own scripts and
 * cookies. The still is served from the school's own media library, so the
 * page is complete and fast on its own, and Drive is only contacted for
 * somebody who actually presses play.
 */
export const VideoGalleryBlock: Block = {
  slug: 'videoGallery',
  interfaceName: 'VideoGalleryBlock',
  labels: { singular: 'Videos', plural: 'Video sections' },
  admin: blockAdmin(BLOCK_GROUPS.words),
  fields: [
    headingField,
    {
      name: 'videos',
      type: 'array',
      minRows: 1,
      maxRows: 12,
      labels: { singular: 'Video', plural: 'Videos' },
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'driveUrl',
          type: 'text',
          required: true,
          label: 'Google Drive link',
          admin: {
            description:
              'Paste the sharing link, e.g. https://drive.google.com/file/d/FILE_ID/view. The file must be shared so that anyone with the link can view it, or visitors will see a sign-in page.',
          },
          hooks: {
            /*
             * Reduced to the id on the way in, so the database never holds a
             * URL that later gets concatenated into an attribute. Anything
             * that is not a Drive link is left alone and fails validation
             * below, rather than being silently accepted and rendered.
             */
            beforeValidate: [
              ({ value }) => {
                if (typeof value !== 'string') return value
                const match = value.match(/[-\w]{25,}/)
                return match ? match[0] : value.trim()
              },
            ],
          },
          validate: (value: unknown) =>
            typeof value === 'string' && /^[-\w]{25,}$/.test(value.trim())
              ? true
              : 'That does not look like a Google Drive link. Copy it from Drive’s Share button.',
        },
        {
          name: 'poster',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'Still image',
          admin: {
            description:
              'The picture shown before anyone presses play. A frame from the video itself works best.',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          admin: { description: 'Optional. One or two lines under the title.' },
        },
      ],
    },
    sectionOptions(),
  ],
}
