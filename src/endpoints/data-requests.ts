import type { CollectionSlug, Endpoint, PayloadRequest, Where } from 'payload'

import { writeAuditLog } from '@/hooks/audit'
import { isAdminOrDpo, normaliseEmail, phoneKey } from '@/lib/data-protection'
import { redactAuditEntries } from '@/lib/retention'

/**
 * The tools on a data-subject request (SRS 6.9).
 *
 *   GET  /api/data-requests/:id/records   BR-DPA-04  find everything held
 *   GET  /api/data-requests/:id/export    access request / BR-DPA-09
 *   POST /api/data-requests/:id/erase     BR-DPA-05  erase it
 *
 * All three act on ONE request's identifiers — its email and phone number —
 * and on nothing else. There is deliberately no "search any person" tool: the
 * only reason to go looking for somebody's records is that they asked, and the
 * request is what evidences that they did.
 *
 * Administrator and DPO only (SRS 8.2). Each use is audit-logged; the erase
 * log keeps counts and record ids, not the erased content, which is the
 * "minimum evidence of the erasure itself" BR-DPA-05 asks for.
 */

interface Identifiers {
  email: string | null
  phone: string | null
}

interface Found {
  collection: CollectionSlug
  label: string
  docs: Record<string, unknown>[]
}

/** The collections that hold personal data submitted through the website. */
const SOURCES: { collection: CollectionSlug; label: string; email?: string; phone?: string }[] = [
  { collection: 'enquiries', label: 'Admission enquiries', email: 'email', phone: 'phone' },
  { collection: 'feedback', label: 'Feedback messages', email: 'email', phone: 'phone' },
  { collection: 'consent-records', label: 'Consent register', email: 'subject', phone: 'subject' },
  { collection: 'data-requests', label: 'Data requests', email: 'email', phone: 'phone' },
]

const identifiersOf = (doc: Record<string, unknown>): Identifiers => ({
  email: normaliseEmail(doc.email),
  phone: phoneKey(doc.phone),
})

/**
 * BR-DPA-04 — every record held about a person.
 *
 * The database is asked for candidates with a case-insensitive `like`, and the
 * candidates are then matched EXACTLY here: `like` on "a@b.in" would also
 * return "sa@b.in", and handing a stranger's enquiry to somebody who asked for
 * their own would be a breach in itself.
 */
export const findPersonalRecords = async (
  req: PayloadRequest,
  ids: Identifiers,
): Promise<Found[]> => {
  const results: Found[] = []

  for (const source of SOURCES) {
    const clauses: Where[] = []
    if (ids.email && source.email) clauses.push({ [source.email]: { like: ids.email } })
    if (ids.phone && source.phone) {
      // The last five digits are contiguous in every way a number is written.
      clauses.push({ [source.phone]: { like: ids.phone.slice(-5) } })
    }
    if (clauses.length === 0) continue

    const { docs } = await req.payload.find({
      collection: source.collection,
      where: { or: clauses },
      depth: 0,
      limit: 500,
      overrideAccess: true,
      req,
      // Logged below as part of the request's own entry, not once per collection.
      context: { skipAudit: true },
    })

    const matched = (docs as unknown as Record<string, unknown>[]).filter((doc) => {
      /*
       * Cookie consents are recorded under a random reference, which contains
       * digits. Without this a reference could, however unlikely, "match" a
       * phone number and be erased or exported as somebody's personal data.
       */
      if (source.collection === 'consent-records' && String(doc.subject).startsWith('ck-')) {
        return false
      }
      const emailValue = source.email ? normaliseEmail(doc[source.email]) : null
      const phoneValue = source.phone ? phoneKey(doc[source.phone]) : null
      return (
        (ids.email !== null && emailValue === ids.email) ||
        (ids.phone !== null && phoneValue === ids.phone)
      )
    })

    results.push({ collection: source.collection, label: source.label, docs: matched })
  }

  return results
}

type Loaded =
  | { ok: false; error: Response }
  | { ok: true; request: Record<string, unknown> & { id: number } }

/** The request, provided the caller may act on it. */
const loadRequest = async (req: PayloadRequest): Promise<Loaded> => {
  if (!req.user || !isAdminOrDpo(req.user)) {
    return {
      ok: false,
      error: Response.json(
        { error: 'Only an administrator or the Data Protection Officer can do this.' },
        { status: 403 },
      ),
    }
  }

  const id = req.routeParams?.id
  if (typeof id !== 'string' && typeof id !== 'number') {
    return { ok: false, error: Response.json({ error: 'No request given.' }, { status: 400 }) }
  }

  const request = await req.payload
    .findByID({
      collection: 'data-requests',
      id,
      depth: 0,
      overrideAccess: true,
      req,
      context: { skipAudit: true },
    })
    .catch(() => null)

  if (!request) {
    return { ok: false, error: Response.json({ error: 'That request does not exist.' }, { status: 404 }) }
  }

  return { ok: true, request: request as unknown as Record<string, unknown> & { id: number } }
}

/** Adds a line to the request's own history, through its own hook. */
const noteOnRequest = async (req: PayloadRequest, id: number, note: string) => {
  await req.payload.update({
    collection: 'data-requests',
    id,
    data: { addNote: note } as never,
    overrideAccess: true,
    req,
  })
}

const title = (collection: CollectionSlug, doc: Record<string, unknown>): string => {
  if (collection === 'enquiries') {
    return `Enquiry for ${doc.childName ?? 'a child'} — ${doc.gradeApplyingFor ?? ''}`.trim()
  }
  if (collection === 'feedback') return `Feedback: ${doc.subject ?? ''}`
  if (collection === 'consent-records') return `Consent for ${doc.purpose} (${doc.status})`
  return `Data request DSR-${String(doc.id).padStart(4, '0')}`
}

const recordsHandler = async (req: PayloadRequest): Promise<Response> => {
  const loaded = await loadRequest(req)
  if (!loaded.ok) return loaded.error

  const found = await findPersonalRecords(req, identifiersOf(loaded.request))
  const total = found.reduce((sum, group) => sum + group.docs.length, 0)

  await writeAuditLog({
    req,
    action: 'viewed_personal_data',
    targetCollection: 'data-requests',
    targetId: loaded.request.id,
    detail: `Searched for records held about the person in request DSR-${String(loaded.request.id).padStart(4, '0')}: ${total} found.`,
  })

  return Response.json(
    {
      total,
      groups: found.map((group) => ({
        collection: group.collection,
        label: group.label,
        records: group.docs.map((doc) => ({
          id: doc.id,
          title: title(group.collection, doc),
          createdAt: doc.createdAt,
          isThisRequest: group.collection === 'data-requests' && doc.id === loaded.request.id,
        })),
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

const EXPORT_NOTICE =
  'CONFIDENTIAL — personal data prepared in answer to a data-subject request. Send it only to the person who made the request, by a route that confirms it is them, and delete your copy once it has been sent.'

const exportHandler = async (req: PayloadRequest): Promise<Response> => {
  const loaded = await loadRequest(req)
  if (!loaded.ok) return loaded.error

  const reference = `DSR-${String(loaded.request.id).padStart(4, '0')}`
  const found = await findPersonalRecords(req, identifiersOf(loaded.request))
  const total = found.reduce((sum, group) => sum + group.docs.length, 0)

  await writeAuditLog({
    req,
    action: 'exported_personal_data',
    targetCollection: 'data-requests',
    targetId: loaded.request.id,
    detail: `${total} record${total === 1 ? '' : 's'} exported in answer to ${reference}.`,
  })
  await noteOnRequest(req, loaded.request.id, `Downloaded the ${total} records held (access request).`)

  const body = {
    notice: EXPORT_NOTICE,
    request: reference,
    preparedAt: new Date().toISOString(),
    preparedBy: req.user?.email,
    records: Object.fromEntries(found.map((group) => [group.label, group.docs])),
  }

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="siws-${reference.toLowerCase()}-records.json"`,
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * BR-DPA-05 — erasure.
 *
 * Deletes the person's enquiries, feedback and consent records. Their data
 * requests are KEPT, this one included: the request is the evidence that the
 * erasure was asked for, and deleting it would leave an erasure nobody can
 * account for.
 *
 * Audit-log entries that named one of the erased records are redacted rather
 * than deleted. The log must still show that something happened and who did
 * it (BR-LOG-02); it must not keep repeating a child's name that the family has
 * asked the school to forget. This is the one place the log is ever changed,
 * and the erasure's own entry says so.
 *
 * What this cannot reach, and says so in its reply: emails already delivered to
 * the school's inboxes, and backups, which age out on their own schedule.
 */
const eraseHandler = async (req: PayloadRequest): Promise<Response> => {
  const loaded = await loadRequest(req)
  if (!loaded.ok) return loaded.error

  if (loaded.request.requestType !== 'erasure') {
    return Response.json(
      { error: 'Records can only be erased in answer to an erasure request.' },
      { status: 400 },
    )
  }

  const body = (await req.json?.().catch(() => null)) as { confirm?: string } | null
  if (body?.confirm !== 'ERASE') {
    return Response.json({ error: 'Erasure was not confirmed.' }, { status: 400 })
  }

  const reference = `DSR-${String(loaded.request.id).padStart(4, '0')}`
  const found = await findPersonalRecords(req, identifiersOf(loaded.request))

  const erased: Record<string, (string | number)[]> = {}

  for (const group of found) {
    if (group.collection === 'data-requests') continue

    for (const doc of group.docs) {
      await req.payload.delete({
        collection: group.collection,
        id: doc.id as number,
        overrideAccess: true,
        req,
      })
      ;(erased[group.collection] ??= []).push(doc.id as number)
    }
  }

  let redacted = 0
  for (const [collection, idsErased] of Object.entries(erased)) {
    redacted += await redactAuditEntries(req.payload, collection, idsErased, `erased under ${reference}`, req)
  }

  const counts = Object.entries(erased)
    .map(([collection, list]) => `${list.length} from ${collection}`)
    .join(', ')
  const summary = counts || 'nothing — no records were held'

  await writeAuditLog({
    req,
    action: 'deleted_personal_data',
    targetCollection: 'data-requests',
    targetId: loaded.request.id,
    detail: `Erasure for ${reference}: ${summary}. Record ids: ${JSON.stringify(erased)}. ${redacted} earlier log entr${redacted === 1 ? 'y' : 'ies'} redacted.`,
  })
  await noteOnRequest(
    req,
    loaded.request.id,
    `Erased ${summary}. Emails already delivered to school inboxes and existing backups are outside the website and must be dealt with separately.`,
  )

  return Response.json({
    erased,
    redactedLogEntries: redacted,
    outside:
      'Emails already delivered to the school’s inboxes, and existing backups, are not reachable from the website. Delete the emails by hand; backups age out on their retention schedule.',
  })
}

export const dataRequestEndpoints: Endpoint[] = [
  { path: '/:id/records', method: 'get', handler: recordsHandler },
  { path: '/:id/export', method: 'get', handler: exportHandler },
  { path: '/:id/erase', method: 'post', handler: eraseHandler },
]
