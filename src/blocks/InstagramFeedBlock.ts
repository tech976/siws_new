import type { Block } from 'payload'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * The school's Instagram, shown as a grid of recent posts.
 *
 * WHY THERE ARE TWO SOURCES OF POSTS. Instagram has no public feed any more:
 * Meta shut the Basic Display API down on 4 December 2024, and the endpoints
 * that used to return a public profile's posts without credentials now error.
 * Reading @siws_wadala automatically therefore needs a Meta access token
 * (see `lib/instagram.ts`), which is an account task rather than a code one.
 *
 * So the block reads live posts when a token is configured, and falls back to
 * the posts listed here when it is not. The fallback is not a placeholder to
 * be deleted later — it is what keeps the section on the page during a token
 * expiry or a Meta outage, both of which are routine.
 *
 * `profileUrl` is required either way: the grid is an invitation to follow, and
 * a grid of photographs that links nowhere is just decoration.
 */
export const InstagramFeedBlock: Block = {
  slug: 'instagramFeed',
  interfaceName: 'InstagramFeedBlock',
  labels: { singular: 'Instagram feed', plural: 'Instagram feeds' },
  admin: blockAdmin(BLOCK_GROUPS.highlights),
  fields: [
    headingField,
    {
      name: 'profileUrl',
      type: 'text',
      required: true,
      label: 'Instagram profile address',
      defaultValue: 'https://www.instagram.com/siws_wadala/',
      admin: {
        description: 'The full address of the account, e.g. https://www.instagram.com/siws_wadala/',
      },
      validate: (value: unknown) => {
        if (typeof value !== 'string' || value.length === 0) return true
        // Caught here rather than at render time: a mistyped address turns the
        // whole section into a dead end, and the editor is the only person who
        // can tell that "instagram.co" was meant to be "instagram.com".
        return /^https:\/\/(www\.)?instagram\.com\//i.test(value)
          ? true
          : 'Enter the full address, starting with https://www.instagram.com/'
      },
    },
    {
      name: 'handle',
      type: 'text',
      label: 'Account name',
      defaultValue: '@siws_wadala',
      admin: { description: 'Shown under the heading, e.g. @siws_wadala' },
    },
    {
      name: 'posts',
      type: 'array',
      maxRows: 12,
      label: 'Posts',
      labels: { singular: 'Post', plural: 'Posts' },
      admin: {
        initCollapsed: true,
        description:
          'Used when the automatic Instagram connection is not set up, or while it is unavailable. Add the six most recent posts here to keep the section looking current.',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          admin: { description: 'A square picture works best.' },
        },
        {
          name: 'caption',
          type: 'textarea',
          admin: {
            description:
              'Optional. The first line of the post, used as the picture’s description for screen readers.',
          },
        },
        {
          name: 'url',
          type: 'text',
          admin: { description: 'Optional. The address of this individual post.' },
        },
      ],
    },
    sectionOptions([
      {
        name: 'count',
        type: 'select',
        defaultValue: '6',
        label: 'How many posts to show',
        options: [
          { label: '3', value: '3' },
          { label: '6', value: '6' },
          { label: '9', value: '9' },
          { label: '12', value: '12' },
        ],
      },
    ]),
  ],
}
