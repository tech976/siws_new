import type { Block } from 'payload'

import { BLOCK_GROUPS, blockAdmin, headingField, sectionOptions } from './shared'

/**
 * A live telecast, or the recording it becomes.
 *
 * WHY A BLOCK RATHER THAN A PAGE THAT IS REWRITTEN EACH TIME. A school streams
 * a few times a year — a prize day, a founder's day, an inauguration — and the
 * page around the player says the same thing every time. Only the address
 * changes. An editor pastes the new link and the page is ready; nobody has to
 * rebuild a layout the morning of an event.
 *
 * WHAT HAPPENS AFTER THE STREAM ENDS. Nothing, and that is deliberate. YouTube
 * leaves a finished live stream at the same address as a recording, so the page
 * keeps working for anyone who missed it. `note` is where to say which it is —
 * "Live from 10 a.m." before, "A recording of the ceremony" after.
 */
export const LiveStreamBlock: Block = {
  slug: 'liveStream',
  interfaceName: 'LiveStreamBlock',
  labels: { singular: 'Live telecast', plural: 'Live telecasts' },
  admin: blockAdmin(BLOCK_GROUPS.words),
  fields: [
    headingField,
    {
      name: 'youtubeUrl',
      type: 'text',
      required: true,
      label: 'YouTube address',
      admin: {
        description:
          'Paste the link exactly as YouTube gives it — the watch page, a youtu.be link, or a live link all work. The player is embedded on the no-cookie host, so a visitor is not given advertising cookies before they press play.',
      },
      validate: (value: unknown) => {
        if (typeof value !== 'string' || value.trim().length === 0) {
          return 'Paste the YouTube address of the stream.'
        }
        const ok = [
          /(?:youtube\.com\/watch\?v=)([\w-]{6,})/i,
          /(?:youtu\.be\/)([\w-]{6,})/i,
          /(?:youtube\.com\/(?:live|shorts|embed)\/)([\w-]{6,})/i,
        ].some((p) => p.test(value))
        // Refused at the point of entry rather than rendering an empty frame:
        // a page that looks broken on the morning of a prize day is the one
        // failure this block exists to prevent.
        return ok || 'That does not look like a YouTube address. Copy the link from the video itself.'
      },
    },
    {
      name: 'note',
      type: 'text',
      label: 'A line under the player',
      admin: {
        description:
          'Optional, and worth keeping current — "Live from 10.00 a.m. on Saturday" before the event, "A recording of the ceremony" after it.',
      },
    },
    sectionOptions(),
  ],
}
