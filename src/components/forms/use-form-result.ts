'use client'

import { useEffect, useId, useState } from 'react'

import type { FormState } from '@/lib/form-state'

/**
 * Two things every public form needs (both found in testing, 2026-11-16):
 *
 * 1. THE TOKEN THE FORM FIRST APPEARED WITH. Choosing an option on the cookie
 *    banner refreshes the page, which handed the form a brand-new "rendered
 *    at" token — so a parent who clicked the banner and then pressed Send was
 *    refused as "too fast" and told to reload, losing what they had typed.
 *    The first token is kept for the life of the form.
 *
 * 2. THE RESULT ON SCREEN. After Send the form is replaced by a short message,
 *    and the page stayed where the Send button had been — often showing only
 *    the footer, so parents could not tell whether it had worked. The message
 *    is now scrolled into view and focused.
 */
export const useFormResult = (formToken: string, state: FormState) => {
  const [token] = useState(formToken)
  const resultId = useId()

  useEffect(() => {
    if (state.status === 'idle') return
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(resultId)
      if (!target) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [state, resultId])

  return { token, resultId }
}
