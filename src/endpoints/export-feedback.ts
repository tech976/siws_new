import type { Endpoint, PayloadRequest } from 'payload'

import { writeAuditLog } from '@/hooks/audit'
import type { Feedback, Unit } from '@/payload-types'

/**
 * FR-PF-03 / BR-SUB-03 — "Submissions shall be viewable and exportable in the
 * admin panel by authorised staff for that unit", with every export logged.
 *
 * Mounted at `/api/feedback/export`. Built the same way as the enquiry export,
 * and for the same three reasons: it runs as the signed-in user with access
 * control on, so a Unit Head exports their own school's feedback and nobody
 * else's (BR-SUB-02); every export is audit-logged with who and how many
 * (BR-SUB-03); and the file opens with a handling notice, so the warning travels
 * with the data once it has left the panel (BR-SUB-07).
 */

const CSV_NOTICE =
  'CONFIDENTIAL — this file contains parents’ and students’ personal details and messages. Handle it in line with the SIWS privacy policy and delete it when no longer needed.'

const STATUS: Record<string, string> = {
  new: 'New',
  in_progress: 'In progress',
  closed: 'Answered',
}

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const unitName = (unit: Feedback['unit']): string =>
  unit && typeof unit === 'object' ? ((unit as Unit).name ?? '') : unit ? String(unit) : ''

const handler = async (req: PayloadRequest): Promise<Response> => {
  if (!req.user) {
    return Response.json({ error: 'You must be signed in to export feedback.' }, { status: 401 })
  }

  let docs: Feedback[]
  try {
    const result = await req.payload.find({
      collection: 'feedback',
      overrideAccess: false,
      user: req.user,
      depth: 1,
      limit: 5000,
      sort: '-createdAt',
      context: { skipAudit: true },
    })
    docs = result.docs as Feedback[]
  } catch {
    return Response.json(
      { error: 'Your role does not have permission to export feedback.' },
      { status: 403 },
    )
  }

  await writeAuditLog({
    req,
    action: 'exported_personal_data',
    targetCollection: 'feedback',
    detail: `${docs.length} feedback message${docs.length === 1 ? '' : 's'} exported as CSV`,
  })

  const header = [
    'Received',
    'School',
    'Name',
    'Relationship',
    'Email',
    'Phone',
    'About',
    'Message',
    'Status',
    'Consent given at',
    'Consent notice version',
  ]

  const rows = docs.map((item) =>
    [
      item.createdAt,
      unitName(item.unit),
      item.name,
      item.relationship,
      item.email,
      item.phone,
      item.subject,
      item.message,
      STATUS[item.status as string] ?? item.status,
      item.consentAt,
      item.consentNoticeVersion,
    ]
      .map(cell)
      .join(','),
  )

  const body = [cell(CSV_NOTICE), header.map(cell).join(','), ...rows].join('\r\n')
  const stamp = new Date().toISOString().slice(0, 10)

  return new Response(`﻿${body}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="siws-feedback-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

export const exportFeedbackEndpoint: Endpoint = { path: '/export', method: 'get', handler }
