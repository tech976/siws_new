import type { Access, CollectionBeforeChangeHook, CollectionConfig, Where } from 'payload'
import { APIError } from 'payload'

import {
  SECTIONS,
  canTouchSection,
  createScoped,
  isActiveUser,
  isAdmin,
  isMainSiteOnlyEditor,
  mainSiteRootsOf,
  mainSiteSectionsOf,
  readPublishedOrScoped,
  toId,
  unitIdsOf,
  updateScoped,
} from '@/access'
import type { AccessUser } from '@/access'
import { contentBlocks } from '@/blocks'
import { hideFromHod } from '@/fields/hod-simple'
import { schedulingFields, workflowFields } from '@/fields/publishing'
import { slugField } from '@/fields/slug'
import { auditChange, auditDelete } from '@/hooks/audit'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { blockUnconsentedChildImages } from '@/hooks/child-consent'
import type { Page } from '@/payload-types'
import { ensureUniqueSlugPerUnit } from '@/hooks/unique-slug'
import { recordRedirectOnMove } from '@/lib/redirects'
import {
  constrainUnitToScope,
  enforcePublishPermissionFor,
  notifyWorkflowParticipants,
  pinToOwnUnit,
  stampWorkflowTransitions,
} from '@/hooks/workflow'

/*
 * ---------------------------------------------------------------------------
 * Main SIWS website sections (Sports, Fine Arts) — SIWS, 2026-11-03.
 *
 * A sports or fine arts teacher's account is an Editor given "Main SIWS
 * website: Sports pages" (or Fine Arts). It runs the section's own pages
 * (/sports and /fencing, or /fine-arts) and any main-site page filed under
 * them in the menu, which is how the teacher adds new ones. It has no school,
 * so nothing on the four school websites is within reach, and no other
 * main-site page either.
 * ---------------------------------------------------------------------------
 */

/** The main-site pages a set of section roots covers. */
const mainSectionWhere = (roots: string[]): Where => ({
  and: [
    { unit: { exists: false } },
    { or: [{ slug: { in: roots } }, { 'navParent.slug': { in: roots } }] },
  ],
})

/** One rule OR another; `false` and `true` simplified away. */
const either = (a: boolean | Where, b: Where | null): boolean | Where => {
  if (!b) return a
  if (a === true) return true
  if (a === false) return b
  return { or: [a, b] }
}

const sectionRulesFor = (req: { user?: unknown }) => {
  const roots = mainSiteRootsOf(req.user as AccessUser | null)
  return roots.length > 0 ? mainSectionWhere(roots) : null
}

const readPages: Access = (args) =>
  either(readPublishedOrScoped(args) as boolean | Where, sectionRulesFor(args.req))

const createPages: Access = (args) =>
  createScoped(SECTIONS.pages)(args) === true || sectionRulesFor(args.req) !== null

const updatePages: Access = (args) =>
  either(updateScoped(SECTIONS.pages)(args) as boolean | Where, sectionRulesFor(args.req))

/**
 * Deleting a page: administrators anywhere; anyone who holds the Pages section
 * (an HOD, an Editor given Pages, a Content Manager) for their own school's
 * pages only; a main-site section's teachers for the pages they added under
 * it, but never the section's own page (/sports, /fine-arts…).
 */
const deletePages: Access = ({ req }) => {
  const user = req.user as AccessUser | null
  if (!isActiveUser(user)) return false
  if (isAdmin(user)) return true

  const ids = unitIdsOf(user)
  const school: boolean | Where =
    canTouchSection(user, SECTIONS.pages) && ids.length > 0 ? { unit: { in: ids } } : false

  const roots = mainSiteRootsOf(user)
  const added: Where | null =
    roots.length > 0 ? { and: [mainSectionWhere(roots), { slug: { not_in: roots } }] } : null

  return either(school, added)
}

/**
 * Keeps a main-site section teacher's work inside their section.
 *
 * Access decides which existing pages they can open; this decides what a save
 * may turn a page into. A page they save must stay on the main site (no
 * school), be one of the section's own pages or be filed under one, and a
 * section's own page keeps its address, which the menu and the design use.
 * A new page with no menu placement is filed under the section's main page.
 */
const keepInMainSection: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const user = req.user as AccessUser | null
  if (!data || !user || isAdmin(user)) return data
  const sections = mainSiteSectionsOf(user)
  if (sections.length === 0) return data

  const merged = { ...(originalDoc ?? {}), ...data } as {
    unit?: unknown
    slug?: unknown
    navParent?: unknown
  }
  const unitId = toId(merged.unit as never)
  // A page of their own school (an Editor who also has a school) is judged by
  // the school rules, not these.
  if (unitId !== null && unitIdsOf(user).includes(unitId)) return data
  if (unitId !== null) {
    throw new APIError('You can only work on the main SIWS website’s Sports or Fine Arts pages.', 403)
  }

  const roots = sections.flatMap((section) => section.roots)
  const originalSlug = (originalDoc as { slug?: unknown } | undefined)?.slug
  if (operation === 'update' && typeof originalSlug === 'string' && roots.includes(originalSlug)) {
    if (merged.slug !== originalSlug) {
      throw new APIError(`The address of the /${originalSlug} page cannot be changed.`, 403)
    }
    return data
  }

  const { docs: rootPages } = await req.payload.find({
    collection: 'pages',
    where: { and: [{ slug: { in: roots } }, { unit: { exists: false } }] },
    depth: 0,
    limit: 20,
    overrideAccess: true,
    req,
  })
  const rootIds = rootPages.map((page) => String(page.id))

  if (operation === 'create' && toId(merged.navParent as never) === null) {
    const home = rootPages.find((page) => page.slug === sections[0]!.home) ?? rootPages[0]
    if (home) {
      data.navParent = home.id
      merged.navParent = home.id
    }
  }

  const parentId = toId(merged.navParent as never)
  if (parentId === null || !rootIds.includes(parentId)) {
    const names = sections.map((section) => section.label).join(' or ')
    throw new APIError(`File this page under ${names} in the menu settings.`, 403)
  }
  return data
}

/** The school whose menu a page sits in: the one chosen, else the editor's own. */
const menuUnitOf = (data: unknown, user: unknown): unknown => {
  const chosen = (data as { unit?: unknown } | undefined)?.unit
  if (chosen) return typeof chosen === 'object' && 'id' in chosen ? (chosen as { id: unknown }).id : chosen
  const account = user as AccessUser | null
  if (isAdmin(account)) return null
  const own = unitIdsOf(account)
  return own.length === 1 ? own[0] : null
}

/**
 * SRS 5.1 — the general-purpose page type behind FR-CMS-01 through FR-CMS-07.
 *
 * Pages are deliberately *flat* rather than hierarchical. SRS 4.4 requires any
 * primary page to be reachable "in two clicks or fewer from the home page", and
 * a nesting tree works directly against that: it invites `/about/campus/
 * facilities/library` structures which are three clicks deep before a visitor
 * has found anything. Routing is therefore `/{unit}/{slug}`, or `/{slug}` for
 * institution-wide pages on the main portal.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },

  admin: {
    /*
     * A school's staff see only their own school's pages in the list. The main
     * SIWS site's pages are readable by them (they are public) but belong to
     * the administrators, so listing them would only offer rows they cannot
     * change. `access` below is the permission; this is the list.
     */
    baseFilter: ({ req }) => {
      const user = req.user as AccessUser | null
      if (!isActiveUser(user) || isAdmin(user)) return null
      const ids = unitIdsOf(user)
      const school: Where | null = ids.length === 0 ? null : { unit: { in: ids } }
      // A sports / fine arts teacher's list is their section's pages.
      const section = sectionRulesFor(req)
      if (school && section) return { or: [school, section] }
      return school ?? section
    },
    useAsTitle: 'title',
    defaultColumns: ['title', 'unit', '_status', 'reviewStatus', 'updatedAt'],
    group: 'Content',
    description:
      'The ordinary pages of the website. Each school keeps its own set, so all four can have their own "Admissions" page.',
    /**
     * BR-EDIT-04 — preview changes before publishing.
     *
     * Both the "preview" button and the live-preview pane point at
     * `/next/preview`, which authenticates the user and turns on Next's draft
     * mode before redirecting. Linking straight to the page instead is what
     * produced a 404 in the pane: without draft mode the front end queries
     * published content only, so an unpublished page genuinely is not there.
     */
    preview: (doc) => buildPreviewURL(doc as Partial<Page>),
    livePreview: {
      url: ({ data }) => buildPreviewURL(data as Partial<Page>),

      /**
       * Device sizes offered in the preview toolbar.
       *
       * Widths are chosen to sit either side of the layout's own breakpoints
       * rather than to match specific handsets — 390px exercises the
       * single-column stack, 834px the two-column tablet layout, 1440px the full
       * desktop grid. Checking the design at the boundaries is what actually
       * catches a broken layout; picking "iPhone 15" would not.
       *
       * A "Responsive" option is always present, so dragging to an arbitrary
       * width still works.
       */
      breakpoints: [
        { name: 'mobile', label: 'Mobile', width: 390, height: 844 },
        { name: 'tablet', label: 'Tablet', width: 834, height: 1112 },
        /**
         * 1280 rather than 1440: the site's own container maxes out at 1200px,
         * so 1280 already shows the complete design with its margins — a wider
         * frame adds only empty space, and would overflow the preview pane and
         * force horizontal scrolling for nothing.
         */
        { name: 'desktop', label: 'Desktop', width: 1280, height: 800 },
      ],
    },
  },

  /**
   * FR-CMS-04 (draft/preview/published) and FR-CMS-07 (version history with
   * revert). Payload keeps a row per save in `_pages_v`; 40 is a deep enough
   * trail for an academic year of edits without the table growing unbounded.
   */
  versions: {
    drafts: { autosave: false },
    maxPerDoc: 40,
  },

  access: {
    read: readPages,
    create: createPages,
    update: updatePages,
    delete: deletePages,
  },

  hooks: {
    // pinToOwnUnit first, so the address check looks in the right school.
    beforeValidate: [pinToOwnUnit, ensureUniqueSlugPerUnit('pages')],
    beforeChange: [
      constrainUnitToScope,
      // A main-site section teacher stays inside Sports / Fine Arts.
      keepInMainSection,
      // A school's section holders publish their own school's pages directly,
      // and so do the main-site section teachers, inside their section.
      enforcePublishPermissionFor(SECTIONS.pages, (user) => mainSiteRootsOf(user).length > 0),
      // Runs after the permission check, so an unauthorised publish attempt is
      // refused on the clearer of the two grounds.
      blockUnconsentedChildImages,
      stampWorkflowTransitions,
    ],
    afterChange: [recordRedirectOnMove, notifyWorkflowParticipants, auditChange('pages'), revalidateAfterChange],
    afterDelete: [auditDelete('pages'), revalidateAfterDelete],
  },

  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'The big heading at the top of the page, and the name shown on the browser tab.' },
    },

    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'intro',
              type: 'textarea',
              maxLength: 400,
              admin: {
                description:
                  'A short introduction shown under the heading. Optional.',
              },
            },
            {
              name: 'layout',
              type: 'blocks',
              label: 'Page sections',
              minRows: 1,
              blocks: contentBlocks,
              admin: {
                initCollapsed: true,
                description:
                  'Build your page by adding sections. Drag them by the handle to change the order.',
              },
            },
          ],
        },

        {
          label: 'Search engines',
          description:
            'This controls how the page looks in Google. You can leave it all blank — we will use the page title and introduction instead.',
          fields: [
            {
              name: 'metaTitle',
              type: 'text',
              maxLength: 70,
              admin: {
                description:
                  'A different title just for Google. Keep it under 60 characters or Google will cut it short.',
              },
            },
            {
              name: 'metaDescription',
              type: 'textarea',
              maxLength: 200,
              admin: {
                description:
                  'The grey summary Google shows under the title. About 150 characters works best.',
              },
            },
            {
              name: 'ogImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Share image',
              admin: {
                description:
                  'The picture people see when this page is shared on WhatsApp or Facebook.',
              },
            },
            {
              name: 'noIndex',
              type: 'checkbox',
              defaultValue: false,
              label: 'Hide this page from search engines',
              admin: {
                description:
                  'The page still works for anyone with the link, but will not show up in Google.',
              },
            },
          ],
        },
      ],
    },

    // -----------------------------------------------------------------------
    // Sidebar — scope, addressing, workflow and scheduling.
    // -----------------------------------------------------------------------
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Which school this page belongs to. Only an administrator can leave this empty to put a page on the main SIWS site.',
        // An HOD's pages always belong to their own school; it is filled in
        // for them on save. A sports / fine arts teacher's pages belong to
        // the main site, so there is nothing for either to choose.
        condition: (data, siblingData, ctx) =>
          hideFromHod(data, siblingData, ctx) && !isMainSiteOnlyEditor(ctx.user as AccessUser | null),
      },
      // Only an administrator may create or move institution-wide content
      // (SRS 3.4). Unit staff have their choice constrained by
      // `constrainUnitToScope` regardless of what they submit.
      access: {
        update: ({ req }) => {
          const user = req.user as AccessUser | null
          return isAdmin(user) || Boolean(user)
        },
      },
    },
    slugField({ sourceField: 'title', unique: false, guardReserved: true }),

    /**
     * BR-NAV-01/02 — menu placement.
     *
     * Held on the page itself for now, which keeps every page one field away
     * from being reachable and makes it impossible to publish a page that no
     * menu links to without noticing. A dedicated Menus configuration can later
     * override this ordering without changing these fields.
     */
    {
      name: 'showInNav',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show in the main menu',
      admin: {
        position: 'sidebar',
        description:
          'Adds this page to the menu at the top of the site. Keep the menu short — about seven items reads best.',
      },
    },
    {
      name: 'navLabel',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'A shorter name to use in the menu. Leave blank to use the page title.',
        condition: (data) => Boolean(data?.showInNav),
      },
    },
    {
      name: 'navOrder',
      type: 'number',
      defaultValue: 100,
      admin: {
        position: 'sidebar',
        step: 1,
        description: 'Lower numbers appear first in the menu.',
        condition: (data) => Boolean(data?.showInNav),
      },
    },
    {
      /*
       * BR-NAV-01 — sub-menus. A page nominates the top-level item it sits
       * under, so the menu is assembled from the pages themselves rather than
       * from a separate tree that could drift out of step with them.
       *
       * Deliberately one level deep: BR-NAV-02 caps navigation at two clicks
       * from the home page, and a third tier cannot be reached inside that
       * budget. The limit is enforced by the shape of the data rather than
       * left to editorial discipline.
       */
      /**
       * A SECOND place in the menu for a page that genuinely belongs in two.
       *
       * `navParent` is one relationship, so a page sits in one drop-down. That
       * is right almost always — the same destination in two menus usually
       * means the menu has not been thought about. The Kindergarten's Campus
       * Gallery is the exception it was added for: it is a record of the place,
       * which is About, and it is what school life looks like, which is Student
       * Life, and a parent looking for it will look in whichever of those they
       * happen to think of first.
       *
       * The page still has ONE home — `navParent` — and this only adds a
       * second way in. Nothing else about the page changes.
       */
      name: 'navMirrorParent',
      type: 'relationship',
      relationTo: 'pages',
      label: 'Also show under',
      admin: {
        position: 'sidebar',
        description:
          'Optional, and rarely wanted. Repeats this page in a second drop-down as well as its own. Use only where a page truly belongs in both.',
        condition: (data) => Boolean(data?.showInNav),
      },
      // Top-level items from the same school's menu only.
      filterOptions: ({ id, data, user }) => {
        const unit = menuUnitOf(data, user)
        const and: Where[] = [
          { id: { not_equals: id } },
          { navParent: { exists: false } },
          unit ? { unit: { equals: unit } } : { unit: { exists: false } },
        ]
        const roots = mainSiteRootsOf(user as AccessUser | null)
        if (!unit && roots.length > 0) and.push({ slug: { in: roots } })
        return { and }
      },
    },
    {
      name: 'navParent',
      type: 'relationship',
      relationTo: 'pages',
      admin: {
        position: 'sidebar',
        description:
          'Optional. Puts this page in the drop-down beneath another menu item. Leave blank to make it a top-level item.',
        condition: (data) => Boolean(data?.showInNav),
      },
      filterOptions: ({ id, data, user }) => {
        const unit = menuUnitOf(data, user)
        const and: Where[] = [
          // A page cannot be its own parent.
          { id: { not_equals: id } },
          // Only top-level items may be parents, which keeps the menu to two
          // levels however the fields are filled in.
          { navParent: { exists: false } },
          // Parents must come from the same site, or a unit's menu could point
          // at another unit's page under its own branding.
          // An HOD never sees the school box, so their own school stands in.
          unit ? { unit: { equals: unit } } : { unit: { exists: false } },
        ]
        // A sports / fine arts teacher files pages under their section only.
        const roots = mainSiteRootsOf(user as AccessUser | null)
        if (!unit && roots.length > 0) and.push({ slug: { in: roots } })
        return { and }
      },
    },

    {
      /*
       * FR-PRV-14 — "the privacy policy, cookie policy and consent notices shall
       * be versioned, with the effective date displayed and previous versions
       * retained". Previous versions are the page's own version history; this
       * is the date shown on the page, set deliberately rather than taken from
       * the last save, because correcting a typo does not change when a policy
       * took effect.
       */
      name: 'effectiveDate',
      type: 'date',
      label: 'Policy takes effect from',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
        description: 'Shown at the top of the page. Change it when the policy itself changes.',
        condition: (data) =>
          !data?.unit && ['privacy', 'cookies', 'accessibility'].includes(data?.slug),
      },
    },
    ...workflowFields,
    ...schedulingFields,
  ],

  timestamps: true,
}

/**
 * Builds the URL of the preview *handler* for a page.
 *
 * Only the document's ID is passed. The handler then loads the page itself and
 * works out the public path, which matters because the live-preview pane calls
 * this with the current *form state* — where `unit` is normally a bare ID rather
 * than the populated unit document, and Payload's URL builders are synchronous
 * so no lookup is possible here. An earlier version tried to derive the path at
 * this point, failed to resolve the unit, fell back to `/`, and produced the
 * 404 in the preview pane.
 *
 * Deriving the destination server-side also means the redirect target is never
 * taken from the query string, so this cannot become an open redirect.
 */
const buildPreviewURL = (doc: Partial<Page>): string => {
  if (doc?.id === undefined || doc?.id === null) return '/'

  const params = new URLSearchParams({
    collection: 'pages',
    id: String(doc.id),
    previewSecret: process.env.PREVIEW_SECRET ?? '',
  })

  return `/next/preview?${params.toString()}`
}
