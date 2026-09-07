import type { SelectField } from 'payload'

/**
 * Campus — retained for historical data only.
 *
 * SIWS ran the Primary and K.G. Sections at two locations, Wadala and Matunga,
 * and this field recorded which one a teacher, a photograph or an enquiry
 * belonged to. The school is now published as a single entity: Wadala and
 * Matunga are no longer presented as separate campuses anywhere, in the admin
 * panel or on the public site.
 *
 * WHY THE FIELD STILL EXISTS
 * --------------------------
 * Sixty-seven faculty records carry a campus value, and dropping the column
 * would destroy that history irreversibly for no gain. `campusField` therefore
 * still defines the column — it is simply hidden from every form, so nobody can
 * set or change it and no reader is shown a distinction the school no longer
 * makes.
 *
 * To bring the distinction back, remove `hidden: true` below and restore the
 * campus grouping in FacultyBlockView.
 */

export const CAMPUS_VALUES = ['wadala', 'matunga'] as const

export type Campus = (typeof CAMPUS_VALUES)[number]

export const CAMPUS_LABELS: Record<Campus, string> = {
  wadala: 'Wadala',
  matunga: 'Matunga',
}

export const CAMPUS_OPTIONS = CAMPUS_VALUES.map((value) => ({
  label: CAMPUS_LABELS[value],
  value,
}))

interface CampusFieldOptions {
  label?: string
  description?: string
  position?: 'sidebar'
  admin?: SelectField['admin']
}

export const campusField = ({
  label = 'Campus',
  description = 'Leave blank if your school is at one location only.',
  position,
  admin,
}: CampusFieldOptions = {}): SelectField => ({
  name: 'campus',
  type: 'select',
  label,
  options: CAMPUS_OPTIONS,
  index: true,
  admin: {
    ...(position ? { position } : {}),
    description,
    ...admin,
    /*
     * The school is one entity now. Hidden rather than removed so the stored
     * values survive; see the note at the top of this file.
     */
    hidden: true,
  },
})
