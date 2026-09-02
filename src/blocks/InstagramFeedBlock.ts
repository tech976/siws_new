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
      name: 'mode',
      type: 'select',
      defaultValue: 'profile',
      label: 'Where the posts come from',
      options: [
        { label: 'Automatic — Instagram’s own profile feed', value: 'profile' },
        { label: 'Chosen posts — paste a link per post', value: 'links' },
        { label: 'Pictures uploaded here', value: 'manual' },
      ],
      admin: {
        description:
          '“Automatic” shows the account’s latest posts and updates itself — nothing to maintain. Choose one of the others only if you want to control exactly which posts appear.',
      },
    },
    {
      name: 'postUrls',
      type: 'array',
      maxRows: 12,
      label: 'Instagram post links',
      labels: { singular: 'Post link', plural: 'Post links' },
      admin: {
        initCollapsed: false,
        condition: (_data, siblingData) => siblingData?.mode === 'links',
        description:
          'Paste the address of each post — open it on Instagram and copy the address bar. Instagram supplies the picture, caption and likes, and keeps them current.',
      },
      fields: [
        {
          name: 'url',
          type: 'text',
          required: true,
          admin: {
            description: 'e.g. https://www.instagram.com/p/ABC123/ or .../reel/ABC123/',
          },
          validate: (value: unknown) => {
            if (typeof value !== 'string' || value.length === 0) return true
            // Only /p/, /reel/ and /tv/ can be embedded — a profile or story
            // address renders an empty box, and the editor has no way to know
            // that without being told here.
            return /^https:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+/i.test(value)
              ? true
              : 'That is not a link to a single post. Open the post itself and copy the address — it should contain /p/ or /reel/.'
          },
        },
      ],
    },
    {
      name: 'posts',
      type: 'array',
      maxRows: 12,
      label: 'Posts',
      labels: { singular: 'Post', plural: 'Posts' },
      admin: {
        initCollapsed: true,
        condition: (_data, siblingData) => siblingData?.mode === 'manual',
        description:
          'Pictures uploaded here are shown as a plain grid that links to Instagram.',
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
        name: 'display',
        type: 'select',
        defaultValue: 'grid',
        label: 'How to show them',
        options: [
          { label: 'Grid — photographs, three across', value: 'grid' },
          { label: 'Reels — the films, playing silently', value: 'reels' },
        ],
        admin: {
          description:
            'Reels plays the videos in place, muted, with a button on each to turn the sound on. It needs INSTAGRAM_ACCESS_TOKEN set: the film itself is only available through Instagram’s Graph API, and without a token the section can show a reel’s cover picture but cannot play it. See docs/INSTAGRAM.md.',
        },
      },
      {
        name: 'count',
        type: 'select',
        /*
         * Nine, because the grid is three across and nine fills it exactly.
         * Six leaves a half-empty third row, which reads as posts that failed
         * to load rather than as a deliberate stop.
         */
        defaultValue: '9',
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
