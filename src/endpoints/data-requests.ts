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


/**
 * FR-PRV-13 — "withdrawal of consent shall cease the associated processing,
 * and the system shall stop using the data for that purpose without requiring
 * the individual to contact the school again".
 *
 * On a withdraw-consent request: every standing consent held for this person
 * is marked withdrawn in the register, the request history records it, and the
 * reply lists the records that were collected under those consents so the DPO
 * can see what processing has to stop. Nothing is deleted — withdrawing
 * consent is not erasure, and a family that wants both asks for both.
 */
const withdrawHandler = async (req: PayloadRequest): Promise<Response> => {
  const loaded = await loadRequest(req)
  if (!loaded.ok) return loaded.error

  if (loaded.request.requestType !== 'withdraw_consent') {
    return Response.json(
      { error: 'Consent can only be withdrawn in answer to a withdraw-consent request.' },
      { status: 400 },
    )
  }

  const reference = `DSR-${String(loaded.request.id).padStart(4, '0')}`
  const found = await findPersonalRecords(req, identifiersOf(loaded.request))
  const consents = found.find((group) => group.collection === 'consent-records')?.docs ?? []
  const standing = consents.filter((doc) => doc.status === 'given')

  const now = new Date().toISOString()
  for (const doc of standing) {
    await req.payload.update({
      collection: 'consent-records',
      id: doc.id as number,
      data: { status: 'withdrawn', withdrawnAt: now } as never,
      overrideAccess: true,
      req,
    })
  }

  const affected = standing
    .map((doc) => `${doc.purpose}${doc.relatedCollection ? ` (${doc.relatedCollection} #${doc.relatedId})` : ''}`)
    .join('; ')

  await writeAuditLog({
    req,
    action: 'updated',
    targetCollection: 'consent-records',
    targetId: loaded.request.id,
    targetTitle: `Consent withdrawn under ${reference}`,
    detail: `${standing.length} consent${standing.length === 1 ? '' : 's'} withdrawn: ${affected || 'none were standing'}.`,
  })
  await noteOnRequest(
    req,
    loaded.request.id,
    standing.length > 0
      ? `Withdrew ${standing.length} consent${standing.length === 1 ? '' : 's'}: ${affected}. Stop contacting them for those purposes.`
      : 'No standing consents were found for this person.',
  )

  return Response.json({ withdrawn: standing.length, affected })
}

/**
 * BR-DPA-09 — "identification and export of the personal data affected by a
 * suspected breach, to assist SIWS in meeting its notification obligations".
 *
 * A breach is not about one person, so this is the one tool here that is not
 * tied to a request: given a window (when the exposure may have happened) it
 * returns every personal-data record created or changed in it, and — what the
 * notification actually needs — the distinct people those records belong to.
 *
 * GET /api/data-requests/breach-report?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
const breachHandler = async (req: PayloadRequest): Promise<Response> => {
  if (!req.user || !isAdminOrDpo(req.user)) {
    return Response.json(
      { error: 'Only an administrator or the Data Protection Officer can do this.' },
      { status: 403 },
    )
  }

  const url = new URL(req.url ?? 'http://local/')
  const from = new Date(url.searchParams.get('from') ?? '')
  const toParam = url.searchParams.get('to')
  const to = toParam ? new Date(`${toParam}T23:59:59.999Z`) : new Date()
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return Response.json({ error: 'Give a valid “from” and “to” date.' }, { status: 400 })
  }

  const window: Where = {
    or: [
      { createdAt: { greater_than_equal: from.toISOString(), less_than_equal: to.toISOString() } },
      { updatedAt: { greater_than_equal: from.toISOString(), less_than_equal: to.toISOString() } },
    ],
  }

  const records: Record<string, Record<string, unknown>[]> = {}
  const people = new Map<string, { email: string | null; phone: string | null; name: string | null }>()

  for (const source of SOURCES) {
    const { docs } = await req.payload.find({
      collection: source.collection,
      where: window,
      depth: 0,
      limit: 10000,
      overrideAccess: true,
      req,
      context: { skipAudit: true },
    })
    const rows = docs as unknown as Record<string, unknown>[]
    records[source.label] = rows

    for (const row of rows) {
      const email = normaliseEmail(source.email ? row[source.email] : null)
      const phone = source.collection === 'consent-records' ? null : phoneKey(row.phone)
      if (!email && !phone) continue
      const key = email ?? `phone:${phone}`
      const name =
        (row.name as string) ??
        (row.subjectName as string) ??
        ([row.parentFirstName, row.parentLastName].filter(Boolean).join(' ') || null)
      if (!people.has(key)) people.set(key, { email, phone, name })
    }
  }

  const counts = Object.fromEntries(Object.entries(records).map(([label, rows]) => [label, rows.length]))
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)

  await writeAuditLog({
    req,
    action: 'exported_personal_data',
    targetCollection: 'data-requests',
    targetTitle: 'Breach report',
    detail: `Breach report for ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}: ${total} records, ${people.size} people.`,
  })

  const body = {
    notice:
      'CONFIDENTIAL — prepared to assess a suspected personal-data breach. Share only with those handling the breach and delete when the matter is closed.',
    window: { from: from.toISOString(), to: to.toISOString() },
    preparedAt: new Date().toISOString(),
    preparedBy: req.user.email,
    summary: { records: counts, peopleAffected: people.size },
    people: [...people.values()],
    records,
  }

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="siws-breach-report-${from.toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}

export const dataRequestEndpoints: Endpoint[] = [
  { path: '/:id/records', method: 'get', handler: recordsHandler },
  { path: '/:id/export', method: 'get', handler: exportHandler },
  { path: '/:id/erase', method: 'post', handler: eraseHandler },
  { path: '/:id/withdraw-consent', method: 'post', handler: withdrawHandler },
  { path: '/breach-report', method: 'get', handler: breachHandler },
]
