import path from 'path'
import { fileURLToPath } from 'url'

import type { CollectionConfig, Where } from 'payload'
import { APIError } from 'payload'

import { ROLES, hasRole, isActiveUser, isAdmin, unitIdsOf } from '@/access'
import type { AccessUser } from '@/access'
import { campusField } from '@/fields/campus'
import { auditChange, auditDelete } from '@/hooks/audit'
import { IMAGE_AND_DOCUMENT_TYPES, validateFileContent } from '@/utilities/file-signature'
import { describeMediaUsage } from '@/utilities/media-usage'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** BR-MED-04 — file-size ceilings, applied per kind rather than one blanket cap. */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024 // 12 MB
const MAX_PDF_BYTES = 25 * 1024 * 1024 // 25 MB

/**
 * BR-MED-01 — the central media library.
 *
 * Everything here is public by definition: it is served from `/media` and is
 * indexable. Files carrying personal data (job applications, enquiry
 * attachments) must never land in this collection — they go to
 * `protected-media`, which is access-restricted and non-addressable
 * (BR-MED-06, FR-CAR-07).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media item', plural: 'Media library' },

  admin: {
    group: 'Content',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'unit', 'updatedAt'],
    description:
      'Pictures and PDFs used anywhere on the website. Never upload anything containing someone’s personal details here.',
  },

  upload: {
    staticDir: path.resolve(dirname, '../../media'),
    // A declared MIME type is only the first gate; the real check is the
    // magic-byte test in the beforeOperation hook below.
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/avif',
      'application/pdf',
    ],
    adminThumbnail: 'thumbnail',
    focalPoint: true,

    /**
     * BR-MED-03 / FR-MED-04 — auto-optimise and resize for web delivery.
     * Widths track the `deviceSizes` ladder in `next.config.mjs` so the browser
     * can pick a derivative without re-encoding at request time.
     * `withoutEnlargement` stops a small original being upscaled into a large,
     * blurry file that costs bandwidth for no gain.
     */
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
        formatOptions: { format: 'webp', options: { quality: 78 } },
      },
      {
        name: 'small',
        width: 640,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'medium',
        width: 1024,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'large',
        width: 1600,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
      {
        // BR-SEO-05 — Open Graph share image at the 1.91:1 ratio the platforms
        // crop to. JPEG rather than WebP: some scrapers still refuse WebP.
        name: 'og',
        width: 1200,
        height: 630,
        position: 'centre',
        formatOptions: { format: 'jpeg', options: { quality: 82 } },
      },
    ],
  },

  access: {
    // The public site renders these files, so read is open. Nothing personal
    // is ever stored in this collection — see `protected-media`.
    read: () => true,

    create: ({ req }) => {
      const user = req.user as AccessUser | null
      return (
        isAdmin(user) ||
        hasRole(user, ROLES.unitHead, ROLES.contentManager, ROLES.editor)
      )
    },

    update: ({ req }) => {
      const user = req.user as AccessUser | null
      if (isAdmin(user)) return true
      if (!isActiveUser(user)) return false
      if (!hasRole(user, ROLES.unitHead, ROLES.contentManager, ROLES.editor)) return false

      const ids = unitIdsOf(user)
      // Staff may edit items belonging to their unit, plus shared items that
      // carry no unit, plus anything they uploaded themselves.
      const clauses: Where[] = [
        { unit: { exists: false } },
        { uploadedBy: { equals: user.id } },
      ]
      if (ids.length > 0) clauses.push({ unit: { in: ids } })

      return { or: clauses }
    },

    delete: ({ req }) => {
      const user = req.user as AccessUser | null
      if (isAdmin(user)) return true
      // Editors get "limited updates" under SRS 8.1, not deletion.
      if (!hasRole(user, ROLES.unitHead, ROLES.contentManager)) return false
      const ids = unitIdsOf(user)
      return ids.length > 0 ? { unit: { in: ids } } : false
    },
  },

  hooks: {
    beforeOperation: [
      /**
       * BR-MED-04 and BR-MED-05, enforced before the file is written to disk.
       */
      async ({ args, operation }) => {
        if (operation !== 'create' && operation !== 'update') return args

        const file = args.req?.file
        if (!file?.data) return args

        const buffer = file.data as Buffer

        const check = validateFileContent(buffer, file.mimetype, IMAGE_AND_DOCUMENT_TYPES)
        if (!check.valid) {
          throw new APIError(check.message ?? 'This file type is not accepted.', 400)
        }

        const limit = check.detected === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES
        if (buffer.length > limit) {
          const limitMb = Math.round(limit / (1024 * 1024))
          const actualMb = (buffer.length / (1024 * 1024)).toFixed(1)
          throw new APIError(
            `This file is ${actualMb} MB. The maximum is ${limitMb} MB — please compress it and try again.`,
            400,
          )
        }

        return args
      },
    ],

    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          data.uploadedBy = req.user.id
        }
        return data
      },

      /**
       * Stamps who recorded the consent and when it was withdrawn.
       *
       * Recorded automatically rather than typed, because these two facts are
       * the evidence: a self-reported "recorded by" would be worth nothing if
       * the record were ever challenged.
       */
      ({ data, originalDoc, req }) => {
        if (!data) return data
        const now = new Date().toISOString()

        const consent = data.parentalConsent as Record<string, unknown> | undefined
        const wasObtained = Boolean(
          (originalDoc?.parentalConsent as Record<string, unknown> | undefined)?.obtained,
        )

        if (consent?.obtained === true && !wasObtained) {
          consent.recordedBy = req.user?.id ?? null
          consent.recordedAt = now
        }

        // Clearing the flag clears its evidence too, so a stale attribution
        // cannot be left behind pointing at a consent that is no longer claimed.
        if (consent && consent.obtained === false && wasObtained) {
          consent.recordedBy = null
          consent.recordedAt = null
        }

        const withdrawn = data.withdrawn as Record<string, unknown> | undefined
        const wasWithdrawn = Boolean(
          (originalDoc?.withdrawn as Record<string, unknown> | undefined)?.isWithdrawn,
        )

        if (withdrawn?.isWithdrawn === true && !wasWithdrawn) {
          withdrawn.withdrawnAt = now
        }

        return data
      },
    ],

    afterChange: [auditChange('media')],
    afterDelete: [auditDelete('media')],

    beforeDelete: [
      /**
       * BR-MED-07 — "warn before deleting a media item that is in use, and
       * indicate where it is used". Deleting a referenced file would leave
       * broken images across published pages, so the delete is refused and the
       * usages are named. An administrator can still remove it after clearing
       * the references.
       */
      async ({ id, req }) => {
        if (req.context?.forceMediaDelete === true && isAdmin(req.user as AccessUser | null)) {
          return
        }

        const usage = await describeMediaUsage({
          payload: req.payload,
          collection: 'media',
          id,
        })

        if (usage.total > 0) {
          throw new APIError(
            `This file is still used in ${usage.total} place${usage.total === 1 ? '' : 's'}: ${usage.summary}. Remove those references before deleting it.`,
            409,
          )
        }
      },
    ],
  },

  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Describe this image',
      admin: {
        description:
          'What does the picture show? This is read aloud to visitors who cannot see it. If the image is just decoration, type a hyphen ( - ).',
      },
      validate: (value: unknown) => {
        if (typeof value !== 'string' || value.trim().length === 0) {
          return 'Please describe the image, or type a hyphen if it is just decoration.'
        }
        if (value.trim().length > 250) {
          return 'Please keep the description under 250 characters.'
        }
        return true
      },
    },
    {
      name: 'caption',
      type: 'text',
      admin: { description: 'Shown under the picture in galleries. Optional.' },
    },
    {
      name: 'credit',
      type: 'text',
      admin: { description: 'Photographer or source, if a credit is needed. Optional.' },
    },
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      label: 'Belongs to',
      admin: {
        position: 'sidebar',
        description: 'Leave empty to share this with all four schools.',
      },
    },
    campusField({
      position: 'sidebar',
      description:
        'Which campus this photograph was taken at. Leave blank if it is not campus-specific.',
    }),
    {
      /**
       * The group a photograph belongs to on a gallery page — "Sports",
       * "Festivals", "Annual Day".
       *
       * Free text rather than a fixed list: schools already sort their
       * photographs into folders, and those names differ per section and change
       * every year. A closed list would mean a code change each time a school
       * ran a new kind of event.
       */
      name: 'category',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Optional. Groups photos on the gallery page, e.g. “Sports” or “Festivals”.',
      },
      index: true,
    },
    {
      /**
       * Whether this picture belongs in the section's photo gallery.
       *
       * The gallery is built from every picture tagged to a section, which is
       * right for photographs of school life and wrong for the rest: an event
       * poster and a video's title frame are page furniture, and a visitor
       * browsing the gallery has not asked to see them. Untagging them instead
       * would be worse — an untagged picture counts as institution-wide and
       * turns up in every section's gallery and the portal's.
       */
      name: 'showInGallery',
      type: 'checkbox',
      defaultValue: true,
      label: 'Include in the photo gallery',
      admin: {
        position: 'sidebar',
        description:
          'Turn this off for posters, notices and video thumbnails — anything that is part of a page rather than a photograph of the school.',
      },
    },
    {
      /**
       * Gallery tiles crop. That is right for a photograph — a wall of
       * pictures all cropped to the same shapes is what makes it read as a
       * wall — and wrong for anything whose edges carry the meaning.
       *
       * The #SwachhtaMonitor certificate is the case that forced this: cropped
       * to a bento tile it lost the word CERTIFICATE off the top and the
       * signature off the foot, leaving a band of text in the middle of a
       * white rectangle. A certificate is READ, not admired, and the whole of
       * it has to be on screen or it is not the certificate any more.
       *
       * The same decision already exists on card grids, where it is called
       * "Show the whole picture".
       */
      name: 'showWhole',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show the whole picture, never cropped',
      admin: {
        position: 'sidebar',
        description:
          'Turn this on for a certificate, a notice or an invitation — anything with writing at its edges. It is shown whole on a plain ground instead of being cropped to fit its tile.',
      },
    },
    {
      name: 'depictsChildren',
      type: 'checkbox',
      defaultValue: false,
      label: 'Students are recognisable',
      admin: {
        position: 'sidebar',
        description:
          'Tick this if a student can be identified. A parental permission record is then required before this picture can go on the website.',
      },
    },

    /**
     * FR-SW-03 / FR-PRV-11 — the consent record.
     *
     * The requirement is not merely that consent exists, but that the platform
     * records "that verifiable parental consent has been obtained, by whom and
     * on what date", and refuses publication where no such record is present.
     * A school knowing it has permission is not the same as being able to
     * evidence it two years later when asked.
     *
     * `consentReference` therefore points at where the signed paperwork lives.
     * The platform does not store the permission slips themselves — those are
     * school records, and holding scans of them here would mean holding more
     * personal data than the stated purpose needs (FR-PRV-16).
     */
    {
      name: 'parentalConsent',
      type: 'group',
      label: 'Parental permission',
      admin: {
        position: 'sidebar',
        condition: (data) => Boolean(data?.depictsChildren),
        description: 'Required before a picture of an identifiable student can be published.',
      },
      fields: [
        {
          name: 'obtained',
          type: 'checkbox',
          defaultValue: false,
          label: 'Written parental permission has been obtained',
        },
        {
          name: 'method',
          type: 'select',
          label: 'How it was obtained',
          options: [
            { label: 'Clause in the admission form', value: 'admission_form' },
            { label: 'Signed permission slip', value: 'permission_slip' },
            { label: 'Written confirmation from the parent', value: 'written_confirmation' },
            { label: 'Other — describe below', value: 'other' },
          ],
          admin: { condition: (_data, siblingData) => Boolean(siblingData?.obtained) },
        },
        {
          name: 'obtainedOn',
          type: 'date',
          label: 'Date permission was given',
          admin: {
            condition: (_data, siblingData) => Boolean(siblingData?.obtained),
            date: { pickerAppearance: 'dayOnly' },
          },
        },
        {
          name: 'reference',
          type: 'text',
          label: 'Where the signed record is kept',
          admin: {
            condition: (_data, siblingData) => Boolean(siblingData?.obtained),
            description:
              'e.g. “Jr. KG permission file, school office”. So the paperwork can be found if it is ever asked for.',
          },
        },
        {
          name: 'recordedBy',
          type: 'relationship',
          relationTo: 'users',
          label: 'Recorded by',
          access: { update: () => false },
          admin: { readOnly: true, description: 'Filled in automatically.' },
        },
        {
          name: 'recordedAt',
          type: 'date',
          label: 'Recorded on',
          access: { update: () => false },
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },

    /**
     * FR-SW-05 — "Staff shall be able to withdraw an item from public display on
     * request, and the system shall record the withdrawal against the consent
     * record."
     *
     * Withdrawal is kept separate from deleting the file: a parent asking for a
     * photograph to come down needs it gone from the site immediately, while the
     * school still needs to be able to show what happened and when.
     */
    {
      name: 'withdrawn',
      type: 'group',
      label: 'Withdrawn from the website',
      admin: {
        position: 'sidebar',
        condition: (data) => Boolean(data?.depictsChildren),
      },
      fields: [
        {
          name: 'isWithdrawn',
          type: 'checkbox',
          defaultValue: false,
          label: 'Withdraw this picture from public display',
          admin: {
            description:
              'Use this when a parent asks for a photograph to be taken down. It stops the picture being published anywhere on the site.',
          },
        },
        {
          name: 'reason',
          type: 'textarea',
          label: 'Why it was withdrawn',
          admin: { condition: (_data, siblingData) => Boolean(siblingData?.isWithdrawn) },
        },
        {
          name: 'withdrawnAt',
          type: 'date',
          label: 'Withdrawn on',
          access: { update: () => false },
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Added by',
      access: { update: () => false },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Filled in automatically.',
      },
    },
  ],

  timestamps: true,
}
