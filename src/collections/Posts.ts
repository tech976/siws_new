import type { CollectionConfig } from 'payload'

import type { Post } from '@/payload-types'

import {
  createScoped,
  deleteScoped,
  readPublishedOrScoped,
  updateScoped,
} from '@/access'
import { SECTIONS } from '@/access/roles'
import { isAdmin, type AccessUser } from '@/access/user'
import { slugField } from '@/fields/slug'
import { scheduledUnless } from '@/fields/publishing'
import { constrainUnitToScope } from '@/hooks/workflow'
import { ensureUniqueSlugPerUnit } from '@/hooks/unique-slug'
import { richTextField } from '@/fields/richText'
import { hideFromHod } from '@/fields/hod-simple'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

/**
 * A department update — "Independence Day Celebrations 2026" — written by the
 * head of department and laid out by a template.
 *
 * WHY THIS IS NOT A PAGE. The trustees' feedback on the block-based editor was
 * that it "is presently built for web designers" and "too complex for our
 * HODs", and that they "should manage content only and should not have to
 * design or create web pages". Pages give an editor a blank canvas and thirty
 * section types; that flexibility is exactly the problem. This collection asks
 * for the six things they listed — template, title, date, text, photographs,
 * video — and the layout is decided by the template, not the author.
 *
 * The address comes out as `/{unit}/{slug}`, e.g. `/primary/independence-day-2026`,
 * built from the title and the year so nobody has to think about URLs either.
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'News & Event', plural: 'News & Events' },

  access: {
    read: readPublishedOrScoped,
    create: createScoped(SECTIONS.events),
    update: updateScoped(SECTIONS.events),
    delete: deleteScoped(SECTIONS.events),
  },

  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'unit', '_status'],
    /*
     * The two preview controls Payload puts in the header are icons with no
     * visible label — an eye and an arrow. They are perfectly discoverable to
     * someone who has used the panel before and invisible to a teacher opening
     * it for the first time, so the description names them.
     */
    description:
      'Fill in the steps below, then use the eye icon at the top to see the page beside your writing, or the arrow to open it in a new tab. Nothing is public until you press Publish.',
    group: 'Content',

    /*
     * BR-EDIT-04, and the trustees' own words: the HOD "should be able to
     * preview the page, make any necessary changes, and then click the Publish
     * button". Both the Preview button and the side-by-side pane go through
     * `/next/preview`, which signs the user in to Next's draft mode first —
     * linking straight at the address would 404, because an unpublished page
     * genuinely is not on the public site yet.
     */
    preview: (doc) => buildPreviewURL(doc as Partial<Post>),
    livePreview: {
      url: ({ data }) => buildPreviewURL(data as Partial<Post>),
      breakpoints: [
        { name: 'mobile', label: 'Mobile', width: 390, height: 844 },
        { name: 'tablet', label: 'Tablet', width: 834, height: 1112 },
        { name: 'desktop', label: 'Desktop', width: 1280, height: 800 },
      ],
    },
  },

  versions: {
    /*
     * Drafts, but NOT autosave.
     *
     * BR-EDIT-04 — "preview changes before publishing" — is what drafts give
     * us, and it is the preview-then-publish loop the trustees asked for by
     * name. Autosave was the obvious extra kindness for a non-technical author
     * and turned out to be the opposite: Payload writes the document the moment
     * the form opens, so every abandoned "new write-up" left an untitled draft
     * behind. Two screenshots produced two of them, and an HOD's list would
     * have filled with numbered blanks nobody could identify.
     *
     * Saving is now deliberate: Save draft, then Publish.
     */
    drafts: true,
    maxPerDoc: 20,
  },

  hooks: {
    beforeValidate: [ensureUniqueSlugPerUnit('posts')],
    beforeChange: [constrainUnitToScope],
    /*
     * News appears in the ticker, on section home pages and on the news
     * listing, none of which is the post's own address — so a teacher who
     * published an item saw nothing change and published it again. Dropping
     * the whole tree is what every other rendered collection does, for the
     * same reason.
     */
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },

  fields: [
    {
      name: 'template',
      type: 'select',
      required: true,
      defaultValue: 'story',
      options: [
        { label: 'Story — text first, then the photographs', value: 'story' },
        { label: 'Photo album — the photographs first, text underneath', value: 'album' },
        { label: 'Notice — text only, for a short announcement', value: 'notice' },
      ],
      label: 'Step 1 — How should the page look?',
      admin: {
        description: 'You can change this later and look again.',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 140,
      label: 'Step 2 — What is it called?',
      admin: { description: 'For example: Independence Day Celebrations 2026' },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      label: 'Step 3 — When was it?',
      admin: {
        description: 'The day it happened, or the day it is happening.',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' },
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      maxLength: 300,
      label: 'Step 4 — In one or two sentences, what happened?',
      admin: {
        description:
          'This is what people read first, and what shows up on Google. Plain sentences are best.',
      },
    },
    richTextField({
      name: 'body',
      simple: true,
      label: 'Step 5 — The full write-up (optional)',
      admin: {
        description:
          'Only if you want to say more. A photo album often needs nothing here at all.',
      },
    }),
    {
      name: 'photos',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      label: 'Step 6 — Photographs',
      admin: {
        description:
          'Drag them in, as many as you like. Each one needs a line saying what is in it — that line is what a blind visitor hears instead of the picture.',
      },
    },
    {
      name: 'video',
      type: 'group',
      label: 'Step 7 — Video (optional)',
      admin: { description: 'Paste a YouTube link, or upload a file. Leave it empty if none.' },
      fields: [
        {
          name: 'youtubeUrl',
          type: 'text',
          label: 'YouTube link',
          admin: { description: 'Paste the address from the browser bar. Leave blank if none.' },
          validate: (value: unknown) => {
            if (!value || typeof value !== 'string' || value.trim() === '') return true
            /*
             * Only accept the addresses a person actually copies. Storing the
             * raw link and parsing it at render time means a mistyped one shows
             * up here, at the point of entry, rather than as an empty box on a
             * published page.
             */
            const ok = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|live\/|shorts\/)|youtu\.be\/)[\w-]{6,}/i
            return ok.test(value.trim())
              ? true
              : 'That does not look like a YouTube address. It should start with https://www.youtube.com/watch?v=… or https://youtu.be/…'
          },
        },
        {
          name: 'file',
          type: 'upload',
          relationTo: 'media',
          label: 'Or upload a video file',
        },
      ],
    },
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Which school this belongs to. Yours is filled in for you.',
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
     * Built from the title, and shown read-only. The trustees were explicit
     * that an HOD should not be handling addresses; leaving the field visible
     * but locked means they can still see where the page will live, which is
     * what they asked to be able to check before publishing.
     */
    {
      ...slugField({ sourceField: 'title', unique: false, guardReserved: true }),
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'The web address, made from the title. Filled in automatically.',
        condition: hideFromHod,
      },
    },
    /*
     * Scheduling is hidden from an HOD, not removed. "Publish on 14 August at
     * 09:00" is a genuinely useful thing for the office to be able to do, and a
     * genuinely confusing pair of fields to meet when all you wanted was to put
     * up yesterday's sports day. They press Publish; the office schedules.
     */
    ...scheduledUnless(hideFromHod),
  ],
}

/**
 * The URL of the preview *handler* for a write-up.
 *
 * Only the id travels. The handler loads the document itself and works out the
 * public path, which matters because the live-preview pane calls this with the
 * current form state — where `unit` is a bare id rather than the populated unit
 * — and Payload's URL builders are synchronous, so no lookup is possible here.
 *
 * Deriving the destination server-side also means the redirect target never
 * comes from the query string, so this cannot become an open redirect.
 */
const buildPreviewURL = (doc: Partial<Post>): string => {
  if (doc?.id === undefined || doc?.id === null) return '/'

  const params = new URLSearchParams({
    collection: 'posts',
    id: String(doc.id),
    previewSecret: process.env.PREVIEW_SECRET ?? '',
  })

  return `/next/preview?${params.toString()}`
}
