'use client'

import { useState } from 'react'

/**
 * BR-DPA-09 — on Data protection → Data retention: download every personal
 * record created or changed in a window, with the people it belongs to.
 *
 * Here rather than on a data request because a breach is not about one person.
 * Downloaded through `fetch`, so a refusal shows as a message where the DPO is
 * looking rather than as a page of JSON.
 */
export const BreachReport = () => {
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState(today)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(
        `/api/data-requests/breach-report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { credentials: 'include' },
      )
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'The report could not be prepared.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `siws-breach-report-${from}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setMessage('Downloaded. The download has been recorded in the audit log.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The report could not be prepared.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="siws-dsr">
      <p className="siws-dsr__title">Suspected breach — find the personal data affected</p>
      <p className="siws-dsr__muted">
        Every enquiry, feedback message, consent record and data request created or changed
        between these dates, and the list of people they belong to — what you need to decide who
        must be told. Share the file only with those handling the breach.
      </p>
      <div className="siws-dsr__actions">
        <label className="siws-dsr__confirm">
          From
          <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="siws-dsr__confirm">
          To
          <input type="date" value={to} max={today} onChange={(event) => setTo(event.target.value)} />
        </label>
        <button
          type="button"
          className="btn btn--style-secondary btn--size-small"
          disabled={busy || !from}
          onClick={run}
        >
          {busy ? 'Preparing…' : 'Download breach report'}
        </button>
      </div>
      {message ? (
        <p role="status" className="siws-dsr__message">
          {message}
        </p>
      ) : null}
    </div>
  )
}

export default BreachReport
