import type { Access, CollectionConfig, Where } from 'payload'

import { ROLES, hasRole, isAdmin, isActiveUser, unitIdsOf } from '@/access'
import type { AccessUser } from '@/access'
import { hiddenFromHod } from '@/access/admin-nav'
import { auditChange, auditDelete } from '@/hooks/audit'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { constrainUnitToScope } from '@/hooks/workflow'
import { QUICK_LINK_ICONS } from '@/lib/quick-link-icons'

/**
 * SRS 5.24 / BR-NAV-03 — the quick links, managed in the admin panel.
 *
 * They were a list of six page addresses in the code, resolved against
 * whichever of those pages happened to exist. That met FR-QL-01 (a panel on
 * every page) but none of the rest: nobody could change a label, add the fee
 * structure PDF, point one at an outside site, or put the most-asked-for link
 * first without a developer.
 *
 * Each link belongs to one scope — the main SIWS portal (no school), or one
 * school — and is ordered by dragging in the list (FR-QL-04). A link can go to
 * a page, a news item, a document in the media library, or an outside address
 * (FR-QL-03).
 *
 * FR-QL-06 — a link whose page has been unpublished or deleted is flagged in
 * the list ("Right now") and simply left out of the panel, so a visitor never
 * meets a dead shortcut and the person who owns it can see why it vanished.
 *
 * WHO: the permissions matrix gives quick links to Administrators (all) and to
 * Unit Heads and Content Managers for their own school. HODs and Editors do not
 * see this collection at all.
 */

const canManage = (user: AccessUser | null) =>
  isAdmin(user) || hasRole(user, ROLES.unitHead, ROLES.contentManager)

const ownScope = (user: AccessUser | null): boolean | Where => {
  if (!isActiveUser(user)) return false
  if (isAdmin(user)) return true
  if (!hasRole(user, ROLES.unitHead, ROLES.contentManager)) return false
  const ids = unitIdsOf(user)
  return ids.length > 0 ? { unit: { in: ids } } : false
}

const scopedWrite: Access = ({ req }) => ownScope(req.user as AccessUser | null)

type LinkDoc = {
  linkType?: string
  page?: unknown
  post?: unknown
  document?: unknown
  url?: string | null
}

const idOf = (value: unknown): number | string | null =>
  value && typeof value === 'object' && 'id' in value
    ? ((value as { id: number | string }).id ?? null)
    : typeof value === 'number' || typeof value === 'string'
      ? value
      : null

export const QuickLinks: CollectionConfig = {
  slug: 'quick-links',
  labels: { singular: 'Quick link', plural: 'Quick links' },
  // FR-QL-04 — drag to reorder in the list view.
  orderable: true,

  admin: {
    group: 'Configuration',
    useAsTitle: 'label',
    defaultColumns: ['label', 'unit', 'linkType', 'state'],
    description:
      'The shortcuts under “Quick links” at the top right of every page. Drag the rows to change the order. Links with no school are for the main SIWS website.',
    hidden: ({ user }) => hiddenFromHod({ user }) || !canManage(user as unknown as AccessUser),
  },

  access: {
    // Every visitor's header reads them.
    read: () => true,
    create: ({ req }) => {
      const user = req.user as AccessUser | null
      return isAdmin(user) || (canManage(user) && unitIdsOf(user).length > 0)
    },
    update: scopedWrite,
    delete: scopedWrite,
  },

  hooks: {
    // A Unit Head's link is pinned to their own school, and they cannot make a
    // portal link (no school) — that is the institution's, and an admin's.
    beforeChange: [constrainUnitToScope],
    afterChange: [auditChange('quick-links'), revalidateAfterChange],
    afterDelete: [auditDelete('quick-links'), revalidateAfterDelete],
  },

  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      maxLength: 40,
      admin: { description: 'Short — it sits in a menu. For example “Fee structure”.' },
    },
    {
      name: 'linkType',
      type: 'radio',
      required: true,
      defaultValue: 'page',
      label: 'Goes to',
      options: [
        { label: 'A page on this website', value: 'page' },
        { label: 'A news item', value: 'post' },
        { label: 'A document (PDF)', value: 'document' },
        { label: 'Another website', value: 'external' },
      ],
      admin: { layout: 'horizontal' },
    },
    {
      name: 'page',
      type: 'relationship',
      relationTo: 'pages',
      admin: { condition: (_data, sibling) => sibling?.linkType === 'page' },
      validate: (value: unknown, { siblingData }: { siblingData?: LinkDoc }) =>
        siblingData?.linkType !== 'page' || value ? true : 'Choose the page.',
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      label: 'News item',
      admin: { condition: (_data, sibling) => sibling?.linkType === 'post' },
      validate: (value: unknown, { siblingData }: { siblingData?: LinkDoc }) =>
        siblingData?.linkType !== 'post' || value ? true : 'Choose the news item.',
    },
    {
      name: 'document',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (_data, sibling) => sibling?.linkType === 'document',
        description: 'Upload the PDF to the media library first, or drop it here.',
      },
      validate: (value: unknown, { siblingData }: { siblingData?: LinkDoc }) =>
        siblingData?.linkType !== 'document' || value ? true : 'Choose the document.',
    },
    {
      name: 'url',
      type: 'text',
      label: 'Web address',
      admin: {
        condition: (_data, sibling) => sibling?.linkType === 'external',
        description: 'The full address, starting https://',
      },
      validate: (value: unknown, { siblingData }: { siblingData?: LinkDoc }) => {
        if (siblingData?.linkType !== 'external') return true
        if (typeof value !== 'string' || !/^https?:\/\/[^\s]+\.[^\s]+/.test(value.trim())) {
          return 'Enter a full web address, starting https://'
        }
        return true
      },
    },
    {
      name: 'icon',
      type: 'select',
      defaultValue: 'arrow',
      options: QUICK_LINK_ICONS.map(({ label, value }) => ({ label, value })),
      admin: { position: 'sidebar', description: 'Shown beside the label.' },
    },
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      label: 'School',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Leave empty for the main SIWS website (administrators only).',
      },
    },
    {
      /*
       * FR-QL-06 — whether the destination still exists and is public. Computed
       * on read, because a page can be unpublished by somebody who has no idea
       * a quick link points at it.
       */
      name: 'state',
      type: 'text',
      virtual: true,
      label: 'Right now',
      admin: { position: 'sidebar', readOnly: true },
      hooks: {
        afterRead: [
          async ({ siblingData, req }) => {
            const link = siblingData as LinkDoc
            try {
              if (link.linkType === 'external') return 'Outside link'
              if (link.linkType === 'document') {
                const id = idOf(link.document)
                if (!id) return '⚠ No document chosen'
                const found = await req.payload.count({
                  collection: 'media',
                  where: { id: { equals: id } },
                  overrideAccess: true,
                })
                return found.totalDocs > 0 ? 'Working' : '⚠ Document deleted — hidden'
              }
              const collection = link.linkType === 'post' ? 'posts' : 'pages'
              const id = idOf(link.linkType === 'post' ? link.post : link.page)
              if (!id) return '⚠ Nothing chosen — hidden'
              const { docs } = await req.payload.find({
                collection,
                where: { id: { equals: id } },
                depth: 0,
                limit: 1,
                overrideAccess: true,
                select: { _status: true } as never,
              })
              if (docs.length === 0) return '⚠ Page deleted — hidden'
              return (docs[0] as { _status?: string })._status === 'published'
                ? 'Working'
                : '⚠ Page not published — hidden'
            } catch {
              return ''
            }
          },
        ],
      },
    },
  ],

  timestamps: true,
}
