import type { Endpoint, PayloadRequest } from 'payload'

import { CAMPUS_LABELS } from '@/fields/campus'
import { writeAuditLog } from '@/hooks/audit'
import type { Enquiry, Unit } from '@/payload-types'

/**
 * FR-ADM-04 — "Enquiry submissions shall be viewable and exportable within the
 * admin panel."
 *
 * Mounted at `/api/enquiries/export`. Three of the SRS's data-handling rules
 * are enforced here rather than left to good intentions:
 *
 *  - **BR-SUB-02 scoping.** The query runs as the signed-in user with access
 *    control on, so a Unit Head exports their own school's enquiries and an
 *    Administrator or the DPO exports all — the same rule as the list view,
 *    applied by the same code path.
 *
 *  - **BR-SUB-03 logging.** Every export writes an audit entry with who, when
 *    and how many records. There is no path to the file that skips the log.
 *
 *  - **BR-SUB-07 handling notice.** The file itself opens with a notice line,
 *    so the warning travels with the data after it leaves the admin panel —
 *    which is precisely when it matters.
 */

const CSV_NOTICE =
  'CONFIDENTIAL — this file contains families’ personal details. Handle it in line with the SIWS privacy policy and delete it when no longer needed.'

/** RFC 4180 quoting. Excel additionally needs the BOM added at the top level. */
const cell = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  /*
   * A cell a parent typed starting with = + - @ (or a tab / carriage return)
   * is run as a FORMULA by Excel when the office opens the export, e.g.
   * =HYPERLINK(...) (found in testing, 2026-11-16). A leading apostrophe
   * makes the spreadsheet show it as plain text.
   */
  const raw = String(value)
  const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const unitName = (unit: Enquiry['unit']): string => {
  if (unit && typeof unit === 'object') return (unit as Unit).name ?? ''
  return unit !== null && unit !== undefined ? String(unit) : ''
}

const handler = async (req: PayloadRequest): Promise<Response> => {
  if (!req.user) {
    return Response.json({ error: 'You must be signed in to export enquiries.' }, { status: 401 })
  }

  let docs: Enquiry[]
  try {
    const result = await req.payload.find({
      collection: 'enquiries',
      overrideAccess: false,
      user: req.user,
      depth: 1,
      limit: 2000,
      sort: '-createdAt',
      // The read itself is logged below as an export, not as a view.
      context: { skipAudit: true },
    })
    docs = result.docs
  } catch {
    // `readPersonalData` refuses roles without access outright; surface that as
    // a permission failure rather than an empty file that looks like success.
    return Response.json(
      { error: 'Your role does not have permission to export enquiries.' },
      { status: 403 },
    )
  }

  // BR-SUB-03 — the export event, before the bytes leave.
  await writeAuditLog({
    req,
    action: 'exported_personal_data',
    targetCollection: 'enquiries',
    detail: `${docs.length} enquiry record${docs.length === 1 ? '' : 's'} exported as CSV`,
  })

  const header = [
    'Received',
    'School',
    'Campus',
    'Parent first name',
    'Parent last name',
    'Child name',
    'Child age',
    'Phone',
    'Email',
    'Class',
    'Message',
    'Follow-up status',
    'Consent given at',
    'Consent notice version',
  ]

  const rows = docs.map((enquiry) =>
    [
      enquiry.createdAt,
      unitName(enquiry.unit),
      enquiry.campus ? CAMPUS_LABELS[enquiry.campus] : '',
      enquiry.parentFirstName,
      enquiry.parentLastName,
      enquiry.childName,
      enquiry.childAge,
      enquiry.phone,
      enquiry.email,
      enquiry.gradeApplyingFor,
      enquiry.message,
      enquiry.status,
      enquiry.consentAt,
      enquiry.consentNoticeVersion,
    ]
      .map(cell)
      .join(','),
  )

  const body = [cell(CSV_NOTICE), header.map(cell).join(','), ...rows].join('\r\n')
  const stamp = new Date().toISOString().slice(0, 10)

  return new Response(`﻿${body}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="siws-admission-enquiries-${stamp}.csv"`,
      // Personal data must never be cached by anything between us and the file.
      'Cache-Control': 'no-store',
    },
  })
}

export const exportEnquiriesEndpoint: Endpoint = {
  path: '/export',
  method: 'get',
  handler,
}
