import type { Block } from 'payload'

import { youtubeEmbed } from '@/lib/youtube'

/**
 * BR-EDIT-02 — "embeds" in the text editor: a video placed in the middle of a
 * write-up rather than in a separate section.
 *
 * A structured block rather than pasted embed code, which is what keeps
 * BR-EDIT-05 true: an editor pastes a YouTube link, never an <iframe>, so no
 * content entry can put markup — let alone script — onto a public page. The
 * frame is built from the link at render time and waits for cookie consent
 * like every other embed on the site (FR-PRV-02).
 */
export const VideoEmbedBlock: Block = {
  slug: 'videoEmbed',
  interfaceName: 'VideoEmbedBlock',
  labels: { singular: 'YouTube video', plural: 'YouTube videos' },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: 'YouTube link',
      admin: { description: 'Paste the address from the browser bar, e.g. https://www.youtube.com/watch?v=…' },
      validate: (value: unknown) =>
        typeof value === 'string' && youtubeEmbed(value) ? true : 'Paste a YouTube video link.',
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'What the video is',
      admin: {
        description: 'Read out to visitors using a screen reader, e.g. “Annual Day 2026 — the Primary dance”.',
      },
    },
    { name: 'caption', type: 'text', admin: { description: 'Optional line under the video.' } },
  ],
}
