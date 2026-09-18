'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

/**
 * BR-DPA-04 / BR-DPA-05 — on a data request: every record held about the
 * person, and the two things the DPO can do with them.
 *
 * NOT loaded automatically. Opening a request to change its status should not
 * run a search across every form's submissions and log a personal-data access
 * each time; the DPO asks for the search when they mean to look.
 *
 * ERASE is offered only on an erasure request, asks the DPO to type a word
 * rather than click through a dialog, and says plainly what it cannot reach.
 * It is the one irreversible button in the panel.
 */

interface RecordRow {
  id: number | string
  title: string
  createdAt?: string
  isThisRequest?: boolean
}

interface Group {
  collection: string
  label: string
  records: RecordRow[]
}

const adminHref = (collection: string, id: number | string) =>
  `/admin/collections/${collection}/${id}`

export const DataRequestRecords = () => {
  const { id } = useDocumentInfo()
  const requestType = useFormFields(([fields]) => fields?.requestType?.value as string | undefined)

  const [groups, setGroups] = useState<Group[] | null>(null)
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/data-requests/${id}/records`, { credentials: 'include' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'The search failed.')
      setGroups(body.groups)
      setTotal(body.total)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The search failed.')
    } finally {
      setBusy(false)
    }
  }, [id])

  useEffect(() => {
    setGroups(null)
  }, [id])

  if (!id) {
    return (
      <div className="siws-dsr">
        <p className="siws-dsr__muted">The records tools appear once the request is saved.</p>
      </div>
    )
  }

  const erasable = groups
    ? groups
        .filter((group) => group.collection !== 'data-requests')
        .reduce((sum, group) => sum + group.records.length, 0)
    : 0

  const erase = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/data-requests/${id}/erase`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'ERASE' }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Erasure failed.')
      setConfirmText('')
      setMessage(
        `Done. ${body.outside} Reload the page to see the new entry in the history below.`,
      )
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erasure failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="siws-dsr">
      <p className="siws-dsr__title">Records held about this person</p>
      <p className="siws-dsr__muted">
        Matched on the email address and phone number above, across admission enquiries,
        feedback, the consent register and earlier data requests. Every search is logged.
      </p>

      {groups === null ? (
        <button type="button" className="btn btn--style-secondary btn--size-small" disabled={busy} onClick={load}>
          {busy ? 'Searching…' : 'Find their records'}
        </button>
      ) : (
        <>
          <p>
            <strong>{total}</strong> record{total === 1 ? '' : 's'} found.
          </p>

          {groups.map((group) =>
            group.records.length === 0 ? null : (
              <div key={group.collection} className="siws-dsr__group">
                <p className="siws-dsr__label">
                  {group.label} ({group.records.length})
                </p>
                <ul>
                  {group.records.map((record) => (
                    <li key={`${group.collection}-${record.id}`}>
                      <a href={adminHref(group.collection, record.id)}>{record.title}</a>
                      {record.createdAt ? (
                        <span className="siws-dsr__muted">
                          {' '}
                          — {new Date(record.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      ) : null}
                      {record.isThisRequest ? <span className="siws-dsr__muted"> (this request)</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}

          <div className="siws-dsr__actions">
            {/*
              A plain link: the browser sends the session cookie and saves the
              file. The endpoint logs the export and notes it in the history.
            */}
            <a
              className="btn btn--style-secondary btn--size-small"
              href={`/api/data-requests/${id}/export`}
            >
              Download everything held (JSON)
            </a>
          </div>

          {requestType === 'erasure' ? (
            <div className="siws-dsr__danger">
              <p className="siws-dsr__label">Erase {erasable} record{erasable === 1 ? '' : 's'}</p>
              <p className="siws-dsr__muted">
                Deletes their enquiries, feedback and consent records for good, and removes their
                details from earlier audit-log entries. This request is kept, as the record that
                the erasure was asked for. Emails already in school inboxes and existing backups
                cannot be reached from here — deal with those separately.
              </p>
              <label className="siws-dsr__confirm">
                Type <strong>ERASE</strong> to confirm
                <input
                  type="text"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  autoComplete="off"
                />
              </label>
              <button
                type="button"
                className="btn btn--style-primary btn--size-small siws-dsr__erase"
                disabled={busy || confirmText !== 'ERASE' || erasable === 0}
                onClick={erase}
              >
                {busy ? 'Erasing…' : 'Erase these records'}
              </button>
            </div>
          ) : null}
        </>
      )}

      {message ? (
        <p role="status" className="siws-dsr__message">
          {message}
        </p>
      ) : null}
    </div>
  )
}

export default DataRequestRecords
