import type { CollectionConfig } from 'payload'

import {
  SECTIONS,
  createScoped,
  deleteScoped,
  isAdmin,
  readPublishedOrScoped,
  updateScoped,
} from '@/access'
import type { AccessUser } from '@/access'
import { campusField } from '@/fields/campus'
import { schedulingFields, workflowFields } from '@/fields/publishing'
import { richTextField } from '@/fields/richText'
import { auditChange, auditDelete } from '@/hooks/audit'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { hiddenFromHod } from '@/access/admin-nav'
import {
  constrainUnitToScope,
  enforcePublishPermission,
  notifyWorkflowParticipants,
  stampWorkflowTransitions,
} from '@/hooks/workflow'

/**
 * FR-FAC-01 / FR-FAC-02 — teacher profiles.
 *
 *   "Each unit shall present teacher profiles with photo, name, designation,
 *    qualifications and an optional message."
 *   "Staff shall add, edit, reorder and remove faculty profiles."
 *
 * A collection rather than a repeating field inside a page, because the same
 * roster is wanted in more than one place (the academics page, an "our team"
 * page, and eventually search) and duplicating it per page guarantees the
 * copies drift apart.
 *
 * Ordering is an explicit number rather than drag-and-drop position, so the
 * head teacher stays first regardless of who was added last.
 *
 * NOTE ON PHOTOGRAPHS: these are adults, so the child-consent controls in
 * `Media` do not apply — but a member of staff's photograph is still their
 * personal data, and SIWS should have their agreement before it is published.
 * The field is optional for exactly that reason.
 */
export const Faculty: CollectionConfig = {
  slug: 'faculty',
  labels: { singular: 'Teacher', plural: 'Teachers' },

  admin: {
    hidden: hiddenFromHod,
    useAsTitle: 'name',
    defaultColumns: ['name', 'designation', 'unit', 'campus', 'order', '_status'],
    group: 'Content',
    description:
      'Teacher profiles shown on your school’s website. Lower “Order” numbers appear first.',
  },

  // Faculty is content, so it follows the same Draft → Review → Published route
  // as everything else (BR-PUB-01).
  versions: {
    drafts: { autosave: false },
    maxPerDoc: 20,
  },

  defaultSort: 'order',

  access: {
    read: readPublishedOrScoped,
    create: createScoped(SECTIONS.faculty),
    update: updateScoped(SECTIONS.faculty),
    delete: deleteScoped(SECTIONS.faculty),
  },

  hooks: {
    beforeChange: [constrainUnitToScope, enforcePublishPermission, stampWorkflowTransitions],
    afterChange: [notifyWorkflowParticipants, auditChange('faculty'), revalidateAfterChange],
    afterDelete: [auditDelete('faculty'), revalidateAfterDelete],
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'e.g. “Mrs. Geeta Raja”.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'designation',
          type: 'text',
          admin: {
            width: '50%',
            description: 'e.g. “Head Teacher” or “Teacher”.',
          },
        },
        {
          name: 'qualifications',
          type: 'text',
          admin: {
            width: '50%',
            description: 'e.g. “B.A., D.Ed.”.',
          },
        },
      ],
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Optional. Please make sure the teacher is happy for their photograph to appear on the website.',
      },
    },
    richTextField({
      name: 'message',
      label: 'A message from this teacher',
      simple: true,
      admin: { description: 'Optional. A few sentences in their own words.' },
    }),

    // -----------------------------------------------------------------------
    // Sidebar
    // -----------------------------------------------------------------------
    {
      /*
       * A TEACHER BELONGS TO A SCHOOL — except those of the Arts, Fine Arts &
       * Philosophy Centre, which belongs to the Society and not to any one of
       * its four schools. SIWS sent the Centre's staff list on 2026-10-13 to go
       * on the site, and the nine of them had nowhere to be put: this was
       * `required`, and the Centre is not a school.
       *
       * So the field may be empty, and a teacher with no school is listed on
       * the main site (`FacultyBlockView`), which today means the Fine Arts
       * page. Only an administrator may leave it empty. A school's own staff
       * get their school filled in for them on a new teacher
       * (`constrainUnitToScope`), and the check below stops them clearing it
       * on an existing one — which would take her off her school's page and
       * put her on the Centre's.
       */
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      index: true,
      label: 'School',
      validate: (value: unknown, { req }: { req?: { user?: unknown } }) => {
        if (value) return true
        // The seed and the scripts carry no user, and are trusted as an
        // administrator is.
        const user = (req?.user ?? null) as AccessUser | null
        return !user || isAdmin(user) ? true : 'Choose the school this teacher belongs to.'
      },
      admin: {
        position: 'sidebar',
        description:
          'Which school this teacher belongs to. Leave it empty only for a teacher of the Arts, Fine Arts & Philosophy Centre, who is listed on the main site’s Fine Arts page.',
      },
    },
    campusField({
      position: 'sidebar',
      description:
        'Which campus this teacher works at. Leave blank if your school is at one location only.',
    }),
    {
      name: 'order',
      type: 'number',
      defaultValue: 100,
      required: true,
      admin: {
        position: 'sidebar',
        step: 1,
        description:
          'Lower numbers appear first. Put the head teacher at 1. Where a school has two head teachers, each one leads the teachers numbered after her, up to the next head teacher — so a teacher’s number also decides whose list she is in.',
      },
    },
    ...workflowFields,
    /**
     * REQUIRED, not optional.
     *
     * `readPublishedOrScoped` filters on `publishAt` / `unpublishAt` to enforce
     * FR-CMS-06, so any collection using it must declare those fields. Without
     * them the query references columns that do not exist and the whole request
     * fails — which surfaced here as a teachers page that rendered with no
     * teachers and no error, because the caller's `.catch` turned the failure
     * into an empty list.
     *
     * They also earn their place: a new teacher's profile can be set to appear
     * on the day they actually join.
     */
    ...schedulingFields,
  ],

  timestamps: true,
}
