'use client'

import { useField, useFormInitializing } from '@payloadcms/ui'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Chooses "Event" on a new item when the form was opened from the dashboard's
 * "Add an event".
 *
 * The dashboard offers News and Events separately, as the website's menu does,
 * but both are the same form — so without this, "Add an event" opened a form
 * that said News and the item landed on the wrong page. The choice is still
 * the first question on the form and can be changed.
 *
 * Renders nothing. It runs once, and only on a form that has not been filled
 * in, so it can never overwrite what someone has chosen themselves.
 */
export const PrefillKind = () => {
  const { value, setValue } = useField<string>({ path: 'kind' })
  const params = useSearchParams()
  const done = useRef(false)

  const initialising = useFormInitializing()

  useEffect(() => {
    // Not before the form has its own state, or Payload overwrites this with
    // the default ("News") it loads a moment later.
    if (done.current || initialising) return
    if (params.get('kind') !== 'event') return
    done.current = true
    if (value !== 'event') setValue('event')
  }, [params, value, setValue, initialising])

  return null
}

export default PrefillKind
