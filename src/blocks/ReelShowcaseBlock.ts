import type { Block } from 'payload'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * A row of short films that play themselves, silently, until somebody asks for
 * sound.
 *
 * WHY THE FILES ARE PATHS RATHER THAN UPLOADS. These are tens of megabytes
 * each. The media library is for photographs — it generates a ladder of
 * resized copies for every upload, which means nothing for a video and would
 * write several more copies of the same file. So a film lives in
 * `public/reels/` and is named here, exactly as the portal banner's own film
 * is named in `portal-hero-marquee.ts`.
 *
 * WHY EACH ONE NEEDS A POSTER. A video shows nothing until it has decoded a
 * frame, so a rail without posters is a row of grey boxes on a slow line. The
 * poster is what holds the space, and it is also what a reader sees if their
 * browser refuses to autoplay at all.
 */
export const ReelShowcaseBlock: Block = {
  slug: 'reelShowcase',
  interfaceName: 'ReelShowcaseBlock',
  labels: { singular: 'Reel showcase', plural: 'Reel showcases' },
  admin: blockAdmin(BLOCK_GROUPS.words),
  fields: [
    headingField,
    {
      name: 'reels',
      type: 'array',
      minRows: 1,
      maxRows: 6,
      label: 'Films',
      labels: { singular: 'Film', plural: 'Films' },
      admin: {
        description:
          'Each film plays on its own, without sound, when it scrolls into view. A button on it turns the sound on, and turning one on turns the others off.',
      },
      fields: [
        {
          name: 'src',
          type: 'text',
          required: true,
          label: 'Film',
          admin: {
            description:
              'The path to an MP4 under public/, beginning with a slash — for example /reels/commerce-day.mp4. Compress it for the web first; these play on phones.',
          },
          validate: (value: unknown) => {
            if (typeof value !== 'string' || !value.startsWith('/')) {
              return 'Give a path beginning with a slash, such as /reels/commerce-day.mp4.'
            }
            if (!value.toLowerCase().endsWith('.mp4')) {
              // Every browser plays H.264 in an MP4. The others are a coin toss.
              return 'The file needs to be an .mp4.'
            }
            return true
          },
        },
        {
          name: 'poster',
          type: 'text',
          label: 'Still frame',
          admin: {
            description:
              'The picture shown before the film starts, as a path under public/ — for example /reels/commerce-day.jpg. Without one the tile is blank until the film has loaded.',
          },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          label: 'What it shows',
          admin: {
            description:
              'A short line, read out to anyone who cannot see the film and printed under it. "Commerce Day", "The Mathematics activity".',
          },
        },
      ],
    },
    sectionOptions(),
  ],
}
