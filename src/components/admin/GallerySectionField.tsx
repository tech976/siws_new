'use client'

import { FieldLabel, ReactSelect, useAuth, useField, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useEffect, useMemo, useState } from 'react'

/**
 * The "Section" box on a photograph — the heading it appears under on the
 * gallery page.
 *
 * WHY THIS IS NOT A PLAIN SELECT
 * ------------------------------
 * The sections are not fixed. A school that runs a new kind of event needs a
 * heading for it the same afternoon, and a closed list would mean a code change
 * and a deploy first. So the stored value is still free text, and this is the
 * admin panel's own dropdown: the school's existing sections are listed to
 * pick from, and typing a name that is not there offers to create it.
 *
 * It was a text input with a `datalist`, which every browser draws its own way
 * — in Chrome a black box in bold white type that looked like nothing else in
 * the panel. The admin's dropdown matches "Belongs to" and every other select
 * beside it.
 *
 * That matters because free text on its own is what produced the mess this
 * fixes — "Occasions", "Events and occasions" and "Events and outings" as three
 * separate headings, and "Onam" beside "Onam Event". Each spelling becomes its
 * own section on the gallery page, so a typo silently splits a gallery in two.
 * Offering what already exists makes the consistent choice the easy one without
 * making the new one impossible.
 *
 * SCOPED TO THE SCHOOL CHOSEN ABOVE
 * ---------------------------------
 * The list follows the "Belongs to" field: pick the Junior College and you are
 * offered its sections, not the Kindergarten's. The sections genuinely differ —
 * the College files photographs under "Laboratories and library", the
 * Kindergarten under "Play and activity" — and offering all of them everywhere
 * would put a laboratory heading on a Kindergarten gallery. Sections on
 * photographs shared by all four schools are always offered.
 */
export const GallerySectionField: TextFieldClientComponent = ({ field, path }) => {
  const { value, setValue } = useField<string>({ path })

  /*
   * The unit chosen in "Belongs to". Read from the form rather than passed in,
   * so changing the school re-filters the list immediately instead of on save.
   *
   * An HOD never sees "Belongs to" — their upload is filed under their own
   * school when it is saved — so on a new upload the form has no unit yet.
   * Their own school stands in, or they would be offered only the shared
   * sections and none of the ones their school actually uses.
   */
  const chosen = useFormFields(([fields]) => fields?.unit?.value)
  const { user } = useAuth()
  const ownUnits = ((user as { units?: unknown[] } | null)?.units ?? []).map((entry) =>
    entry && typeof entry === 'object' && 'id' in entry ? (entry as { id: unknown }).id : entry,
  )
  const unit = chosen || (ownUnits.length === 1 ? ownUnits[0] : null)

  const [sections, setSections] = useState<string[]>([])

  useEffect(() => {
    /*
     * Abandoned on unmount and whenever the unit changes, so a slow response
     * for the previous school cannot land after a faster one and repopulate the
     * list with the wrong sections.
     */
    const controller = new AbortController()

    const load = async () => {
      const params = new URLSearchParams({
        limit: '300',
        depth: '0',
        'where[category][exists]': 'true',
      })

      /*
       * A photograph belonging to no school is shared by all four, so its
       * section is offered whichever school is chosen.
       */
      if (unit) {
        params.set('where[or][0][unit][equals]', String(unit))
        params.set('where[or][1][unit][exists]', 'false')
      } else {
        params.set('where[unit][exists]', 'false')
      }

      try {
        const response = await fetch(`/api/media?${params.toString()}`, {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!response.ok) return

        const body = (await response.json()) as { docs?: { category?: string | null }[] }

        const found = new Set<string>()
        for (const doc of body.docs ?? []) {
          const name = typeof doc.category === 'string' ? doc.category.trim() : ''
          if (name) found.add(name)
        }

        setSections([...found].sort((a, b) => a.localeCompare(b)))
      } catch {
        /*
         * A failed lookup leaves the input working as plain text. Nobody is
         * blocked from filing a photograph because the suggestions did not
         * load.
         */
      }
    }

    void load()
    return () => controller.abort()
  }, [unit])

  const placeholder = useMemo(
    () => (sections.length > 0 ? `e.g. ${sections[0]}` : 'e.g. In the classroom'),
    [sections],
  )

  /*
   * The current value is always one of the options, even when it is a new
   * section nobody else has used yet — otherwise the box would show empty
   * for a photograph that is filed perfectly well.
   *
   * A NEW SECTION is offered as its own option, 'Create "…"', built here from
   * what is typed. Payload's own "creatable" mode is not used: it is written
   * for multi-selects and, once a section is already chosen, pressing Enter
   * on a new name tries to add it to a list and does nothing.
   */
  const [typed, setTyped] = useState('')
  const current = (value ?? '').trim()

  const options = useMemo(() => {
    const names = new Set(sections)
    if (current) names.add(current)
    const list = [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ label: name, value: name }))
    const wanted = typed.trim()
    const exists = [...names].some((name) => name.toLowerCase() === wanted.toLowerCase())
    return wanted && !exists ? [...list, { label: `Create “${wanted}”`, value: wanted }] : list
  }, [sections, current, typed])

  return (
    <div className="field-type select">
      <FieldLabel htmlFor={`field-${path}`} label={field?.label} />

      <ReactSelect
        inputId={`field-${path}`}
        isClearable
        options={options}
        value={current ? { label: current, value: current } : undefined}
        placeholder={placeholder}
        noOptionsMessage={() => 'Type a name to start a new section'}
        onInputChange={(text) => setTyped(text)}
        onChange={(picked) => {
          const option = Array.isArray(picked) ? picked[0] : picked
          setValue(typeof option?.value === 'string' ? option.value.trim() : '')
          setTyped('')
        }}
      />

      {field?.admin?.description ? (
        <div className="field-description">{String(field.admin.description)}</div>
      ) : null}
    </div>
  )
}

export default GallerySectionField
