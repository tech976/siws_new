import {
  APIError,
  type Access,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
} from 'payload'

import {
  createScoped,
  deleteScoped,
  isActiveUser,
  isAdmin,
  isMainSiteOnlyEditor,
  publishedWhere,
  unitIdsOf,
  updateScoped,
  type AccessUser,
} from '@/access'
import { SECTIONS } from '@/access/roles'
import { hideFromHod } from '@/fields/hod-simple'
import { richTextField } from '@/fields/richText'
import { schedulingFields } from '@/fields/publishing'
import { constrainUnitToScope, pinToOwnUnit } from '@/hooks/workflow'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { richTextHasText } from '@/lib/rich-text-has-text'

/**
 * A published popup must have something to show: an image or message text.
 * Drafts may be saved half-finished.
 */
const requireImageOrMessage: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const merged = { ...(originalDoc ?? {}), ...(data ?? {}) } as Record<string, unknown>
  if (merged._status !== 'published') return data
  if (merged.image || richTextHasText(merged.content)) return data
  throw new APIError('Add an image or a message before publishing this popup.', 400)
}

/**
 * Who can see which popups.
 *
 * Visitors (no login) see published popups; the website itself loads them this
 * way. Administrators see all of them. Everyone else, a head of department for
 * example, sees only their own school's popups: not the main SIWS website's,
 * and not another school's. This is stricter than other content, where staff
 * can also read the main site's items, because the main site's popup belongs
 * to the administrators.
 */
const readPopups: Access = ({ req }) => {
  const user = req.user as AccessUser | null
  if (!isActiveUser(user)) return publishedWhere()
  if (isAdmin(user)) return true
  const ids = unitIdsOf(user)
  if (ids.length === 0) return publishedWhere()
  return { unit: { in: ids } }
}

/** The button needs both its text and its link, or neither. */
const buttonPairValidate =
  (other: 'label' | 'url', message: string) =>
  (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
    const mine = typeof value === 'string' && value.trim().length > 0
    const theirs =
      typeof siblingData?.[other] === 'string' && String(siblingData[other]).trim().length > 0
    return mine || !theirs ? true : message
  }

/**
 * The pop-up window that opens over a website when a visitor arrives.
 *
 * One per website: the main SIWS site (no school chosen) and each of the four
 * schools. If more than one is live for the same website, the most recently
 * saved one is shown. It opens `delaySeconds` after the page loads and stays
 * open until the visitor closes it.
 */
export const Popups: CollectionConfig = {
  slug: 'popups',
  labels: { singular: 'Popup', plural: 'Popups' },

  access: {
    read: readPopups,
    create: createScoped(SECTIONS.popups),
    update: updateScoped(SECTIONS.popups),
    delete: deleteScoped(SECTIONS.popups),
  },

  admin: {
    /*
     * A school's staff see only their own school's popups in the list.
     * `readPopups` above enforces it; this keeps the list query matching.
     */
    baseFilter: ({ req }) => {
      const user = req.user as AccessUser | null
      if (!isActiveUser(user) || isAdmin(user)) return null
      const ids = unitIdsOf(user)
      return ids.length === 0 ? null : { unit: { in: ids } }
    },
    // Not in a sports / fine arts teacher's menu: popups belong to the schools
    // and the administrators.
    hidden: ({ user }) => isMainSiteOnlyEditor(user as unknown as AccessUser | null),
    useAsTitle: 'title',
    defaultColumns: ['title', 'unit', 'showOn', 'delaySeconds', '_status', 'updatedAt'],
    description:
      'A window that opens over a website when someone visits. Add a picture and text, then Publish. A school’s popup appears only on that school’s website.',
    group: 'Content',
  },

  versions: { drafts: true, maxPerDoc: 10 },

  hooks: {
    // A school's popup stays on that school's website, even if the school is
    // cleared on save.
    beforeValidate: [pinToOwnUnit],
    beforeChange: [constrainUnitToScope, requireImageOrMessage],
    // The popup is rendered on cached pages, so clear them when it changes.
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },

  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 120,
      label: 'Popup name',
      admin: {
        description:
          'For your own reference in this list — for example “Admissions 2027 – Kindergarten”. Visitors do not see it.',
      },
    },
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      index: true,
      label: 'Which website?',
      admin: {
        position: 'sidebar',
        description:
          'Leave empty for the main SIWS website. Choose a school for that school’s website.',
        // A head of department's popup always goes on their own school's
        // website; the save hook fills it in, so there is nothing to choose.
        condition: hideFromHod,
      },
    },
    {
      name: 'showOn',
      type: 'select',
      required: true,
      defaultValue: 'home',
      label: 'Show on',
      options: [
        // Short, for the list. The edit screen names the school instead:
        // see PopupShowOnField.
        { label: 'Home page only', value: 'home' },
        { label: 'Every page', value: 'all' },
      ],
      admin: {
        position: 'sidebar',
        // Names the school in the two choices, e.g. "Every Primary School page".
        components: { Field: '@/components/admin/PopupShowOnField#PopupShowOnField' },
      },
    },
    {
      name: 'delaySeconds',
      type: 'number',
      required: true,
      defaultValue: 3,
      min: 0,
      max: 30,
      label: 'Open after (seconds)',
      admin: {
        position: 'sidebar',
        step: 1,
        description:
          'How long after the page loads the popup appears. It stays open until the visitor closes it.',
      },
    },
    {
      name: 'frequency',
      type: 'select',
      required: true,
      defaultValue: 'always',
      label: 'How often',
      options: [
        { label: 'Every time the page opens', value: 'always' },
        { label: 'Once per visit', value: 'session' },
      ],
      admin: {
        position: 'sidebar',
        description:
          '“Once per visit” shows it again only after the visitor closes the browser and comes back.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Image',
      admin: {
        description:
          'About 1200 × 900 works best. The edges may be trimmed to fit, so keep the important part in the middle. A popup needs an image, a message, or both.',
      },
    },
    {
      name: 'heading',
      type: 'text',
      maxLength: 120,
      label: 'Heading',
      admin: { description: 'Optional. Shown in large text above your message.' },
    },
    richTextField({
      name: 'content',
      label: 'Message',
      simple: true,
    }),
    {
      name: 'button',
      type: 'group',
      label: 'Button (optional)',
      admin: {
        description: 'Add both to show a button, for example “Enquire now” → /kindergarten/contact',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              maxLength: 40,
              label: 'Button text',
              admin: { width: '40%' },
              validate: buttonPairValidate('url', 'Add the button text, or clear the link.'),
            },
            {
              name: 'url',
              type: 'text',
              label: 'Link',
              admin: { width: '60%' },
              validate: (value: unknown, args: { siblingData?: Record<string, unknown> }) => {
                const paired = buttonPairValidate('label', 'Add the link, or clear the button text.')(
                  value,
                  args,
                )
                if (paired !== true) return paired
                if (!value) return true
                const text = String(value).trim()
                return /^(\/|https?:\/\/|mailto:|tel:)/i.test(text)
                  ? true
                  : 'Start the link with / (a page on this site) or https://'
              },
            },
          ],
        },
      ],
    },
    ...schedulingFields,
  ],
}
