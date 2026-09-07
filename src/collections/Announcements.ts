import type { CollectionConfig } from 'payload'

import {
  createScoped,
  deleteScoped,
  readPublishedOrScoped,
  updateScoped,
} from '@/access'
import { SECTIONS } from '@/access/roles'
import { isAdmin, type AccessUser } from '@/access/user'
import { scheduledUnless } from '@/fields/publishing'
import { hideFromHod } from '@/fields/hod-simple'
import { constrainUnitToScope } from '@/hooks/workflow'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

/**
 * One line for the news ticker across the top of the site.
 *
 * The trustees asked for "a high visibility, colorful news ticker on our
 * homepage to publish news, events, specific information and achievements",
 * with "a dedicated CMS dashboard so that HODs can directly publish and update
 * their respective department announcements".
 *
 * So: one short sentence, a tone, an optional link, and the dates it should run
 * between. Nothing else — an announcement that takes five minutes to write is
 * an announcement nobody writes.
 */
export const Announcements: CollectionConfig = {
  slug: 'announcements',
  labels: { singular: 'Ticker announcement', plural: 'Ticker announcements' },

  access: {
    read: readPublishedOrScoped,
    create: createScoped(SECTIONS.news),
    update: updateScoped(SECTIONS.news),
    delete: deleteScoped(SECTIONS.news),
  },

  admin: {
    useAsTitle: 'message',
    defaultColumns: ['message', 'tone', 'unit', 'unpublishAt', '_status'],
    description:
      'Short lines that scroll across the top of the site. Keep each one to a single sentence.',
    group: 'Content',
  },

  versions: { drafts: true, maxPerDoc: 10 },

  hooks: {
    beforeChange: [constrainUnitToScope],
    /*
     * The ticker is in the layout of every page, so an announcement is never
     * at an address of its own. Without this, raising one changed the database
     * and nothing on screen — the worst case being an urgent notice that does
     * not appear.
     */
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },

  fields: [
    {
      name: 'message',
      type: 'text',
      required: true,
      maxLength: 160,
      label: 'Step 1 — What is the news, in one sentence?',
      admin: {
        description:
          'For example: SIWS School celebrates India’s 80th Independence Day with grandeur and pride.',
      },
    },
    {
      name: 'tone',
      type: 'select',
      required: true,
      defaultValue: 'news',
      options: [
        { label: 'News — blue', value: 'news' },
        { label: 'Achievement — gold', value: 'achievement' },
        { label: 'Event — green', value: 'event' },
        { label: 'Important — red', value: 'urgent' },
      ],
      label: 'Step 2 — What kind of news is it?',
      admin: { description: 'This decides the colour of the label in front of your sentence.' },
    },
    {
      name: 'link',
      type: 'relationship',
      relationTo: ['posts', 'pages'],
      label: 'Step 3 — Should it link somewhere? (optional)',
      admin: {
        description:
          'Choose one of your write-ups and the sentence becomes clickable. Leave it empty otherwise.',
      },
    },
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Which school this is from. Yours is filled in for you. Announcements from every school appear on the main SIWS ticker.',
        condition: hideFromHod,
      },
      access: {
        update: ({ req }) => {
          const user = req.user as AccessUser | null
          return isAdmin(user) || Boolean(user)
        },
      },
    },
    /*
     * `unpublishAt` matters more here than anywhere else on the site: a ticker
     * still announcing last term's sports day is worse than an empty one, and
     * the scheduling fields already remove it at the second rather than waiting
     * for someone to remember.
     */
    ...scheduledUnless(hideFromHod),
  ],
}
