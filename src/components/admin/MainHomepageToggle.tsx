'use client'

import { toast, useAuth } from '@payloadcms/ui'
import { Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

/**
 * The tick-and-cross: whether one item runs on the main SIWS homepage.
 *
 * A TICK means it is on the main homepage, a CROSS that it is not, and
 * pressing it changes it to the other. SIWS asked for exactly those two
 * marks, so the button shows the state it is IN — the label beside the mark
 * says which, because a lone tick could as easily be read as "press to add".
 *
 * Only an administrator gets a button. Everyone else gets the same answer as
 * plain text: a head of department can see their item was picked, and cannot
 * pick it.
 *
 * INLINE STYLES, as on the dashboard: the panel is Payload's own stylesheet
 * and does not load the site's. The `--theme-*` properties are Payload's, so
 * this follows the panel into dark mode.
 */
interface ToggleProps {
  collection: string
  id: number | string
  shown: boolean
}

const base: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.3rem 0.7rem',
  borderRadius: '999px',
  border: '1px solid',
  fontSize: '0.85rem',
  fontWeight: 600,
  lineHeight: 1.2,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const on: CSSProperties = {
  ...base,
  color: 'var(--theme-success-750, #14532d)',
  background: 'var(--theme-success-100, #dcfce7)',
  borderColor: 'var(--theme-success-300, #86efac)',
}

const off: CSSProperties = {
  ...base,
  color: 'var(--theme-elevation-650)',
  background: 'var(--theme-elevation-50)',
  borderColor: 'var(--theme-elevation-200)',
}

export const MainHomepageToggle = ({ collection, id, shown: initial }: ToggleProps) => {
  const { user } = useAuth()
  const router = useRouter()
  const [shown, setShown] = useState(initial)
  const [busy, setBusy] = useState(false)

  // The list re-reads itself after a change, and may hand back a newer answer.
  useEffect(() => setShown(initial), [initial])

  const roles = (user as { roles?: unknown } | null)?.roles
  const isAdministrator = Array.isArray(roles) && roles.includes('admin')

  if (!isAdministrator) return <span>{shown ? 'Yes' : '—'}</span>

  const change = async () => {
    const next = !shown
    setBusy(true)
    try {
      const response = await fetch(`/api/${collection}/${id}/main-homepage`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show: next }),
      })
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(problem?.error ?? 'It could not be changed. Please try again.')
      }
      setShown(next)
      toast.success(
        next ? 'Now on the main SIWS homepage.' : 'Taken off the main SIWS homepage.',
      )
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'It could not be changed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        // The row is a link to the item in some lists; this is not a visit.
        event.preventDefault()
        event.stopPropagation()
        void change()
      }}
      disabled={busy}
      aria-pressed={shown}
      title={
        shown
          ? 'On the main SIWS homepage. Press to take it off.'
          : 'Not on the main SIWS homepage. Press to put it there.'
      }
      style={{ ...(shown ? on : off), opacity: busy ? 0.6 : 1 }}
    >
      {shown ? (
        <Check size={15} strokeWidth={3} aria-hidden="true" />
      ) : (
        <X size={15} strokeWidth={3} aria-hidden="true" />
      )}
      {shown ? 'Showing' : 'Not showing'}
    </button>
  )
}

export default MainHomepageToggle
