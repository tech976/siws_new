'use client'

import { FieldLabel, useField, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useEffect, useId, useMemo, useState } from 'react'

/**
 * The "Section" box on a photograph — the heading it appears under on the
 * gallery page.
 *
 * WHY THIS IS NOT A PLAIN SELECT
 * ------------------------------
 * The sections are not fixed. A school that runs a new kind of event needs a
 * heading for it the same afternoon, and a closed list would mean a code change
 * and a deploy first. So the stored value is still free text, and this is a
 * text input with a `datalist`: the school's existing sections are offered as
 * you type, and typing something new is still allowed.
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
  const listId = useId()

  /*
   * The unit chosen in "Belongs to". Read from the form rather than passed in,
   * so changing the school re-filters the list immediately instead of on save.
   */
  const unit = useFormFields(([fields]) => fields?.unit?.value)

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

  return (
    <div className="field-type text">
      <FieldLabel htmlFor={`field-${path}`} label={field?.label} />

      <input
        id={`field-${path}`}
        name={path}
        type="text"
        className="field-type__input"
        list={listId}
        autoComplete="off"
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(event) => setValue(event.target.value)}
      />

      <datalist id={listId}>
        {sections.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {field?.admin?.description ? (
        <div className="field-description">{String(field.admin.description)}</div>
      ) : null}
    </div>
  )
}

export default GallerySectionField
