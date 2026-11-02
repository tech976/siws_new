'use client'

import { SelectField, useAuth, useFormFields } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'
import { useEffect, useMemo, useState } from 'react'

/**
 * The popup's "Show on" box, worded with the website it will appear on.
 *
 * "Home page only" read to a head of department as the main SIWS home page,
 * when it means their own school's. So the two choices name the school:
 * a Primary HOD sees "Only the Primary School home page (/primary)" and
 * "Every Primary School page". The stored values stay `home` and `all`.
 *
 * The school is the one picked in "Which website?" or, for an HOD who never
 * sees that box, their own. No school means the main SIWS website.
 */

type Site = { name: string; slug: string } | null

const idOf = (value: unknown): unknown =>
  value && typeof value === 'object' && 'id' in value ? (value as { id: unknown }).id : value

export const PopupShowOnField: SelectFieldClientComponent = (props) => {
  const chosen = useFormFields(([fields]) => fields?.unit?.value)
  const { user } = useAuth()
  const ownUnits = ((user as { units?: unknown[] } | null)?.units ?? []).map(idOf)
  const unitId = idOf(chosen) || (ownUnits.length === 1 ? ownUnits[0] : null)

  const [site, setSite] = useState<Site>(null)

  useEffect(() => {
    if (!unitId) {
      setSite(null)
      return
    }
    const controller = new AbortController()
    fetch(`/api/units/${String(unitId)}?depth=0`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((unit: { name?: string; shortName?: string; slug?: string } | null) => {
        if (!unit) return
        setSite({ name: unit.shortName || unit.name || 'school', slug: unit.slug || '' })
      })
      .catch(() => {
        // Keeps the plain wording if the school cannot be looked up.
      })
    return () => controller.abort()
  }, [unitId])

  const field = useMemo(() => {
    const options = unitId
      ? site
        ? [
            {
              label: `Only the ${site.name} home page${site.slug ? ` (/${site.slug})` : ''}`,
              value: 'home',
            },
            { label: `Every ${site.name} page`, value: 'all' },
          ]
        : [
            { label: 'Only this school’s home page', value: 'home' },
            { label: 'Every page of this school’s website', value: 'all' },
          ]
      : [
          { label: 'Only the main SIWS home page', value: 'home' },
          { label: 'Every page of the main SIWS website', value: 'all' },
        ]

    const description = unitId
      ? `This popup appears only on the ${site?.name ?? 'school'} website.`
      : 'With no school chosen in “Which website?”, this popup goes on the main SIWS website.'

    return {
      ...props.field,
      options,
      admin: { ...props.field.admin, description },
    } as typeof props.field
  }, [props.field, unitId, site])

  return <SelectField {...props} field={field} />
}

export default PopupShowOnField
