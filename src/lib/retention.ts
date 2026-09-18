import type { CollectionSlug, Payload, PayloadRequest, Where } from 'payload'

/**
 * BR-DPA-02 — retention periods per data category.
 *
 * The categories the SRS names that exist on this site today. Subscriptions,
 * alumni registrations and job applications are named too; they get a row here
 * when those modules are built, and until then there is nothing to retain.
 *
 * `field` is the settings field holding the period in months. `dateField` is
 * what the age is measured from:
 *
 *  - an enquiry from its arrival — the notice promises "the current admission
 *    year and one year afterwards";
 *  - feedback and data requests from their last change, because both notices
 *    count from when the matter was DEALT WITH, not from when it arrived;
 *  - a data request only once it is closed. An open request is never
 *    "overdue", however old: deleting one mid-flight would destroy the
 *    evidence that it was being answered.
 */
export interface RetentionCategory {
  key: string
  label: string
  collection: CollectionSlug
  field: string
  dateField: string
  extra?: Where
}

export const RETENTION_CATEGORIES: RetentionCategory[] = [
  {
    key: 'enquiries',
    label: 'Admission enquiries',
    collection: 'enquiries',
    field: 'enquiriesMonths',
    dateField: 'createdAt',
  },
  {
    key: 'feedback',
    label: 'Feedback messages',
    collection: 'feedback',
    field: 'feedbackMonths',
    dateField: 'updatedAt',
  },
  {
    key: 'dataRequests',
    label: 'Closed data requests',
    collection: 'data-requests',
    field: 'dataRequestsMonths',
    dateField: 'updatedAt',
    extra: { status: { in: ['completed', 'refused'] } },
  },
  {
    key: 'consentRecords',
    label: 'Consent records',
    collection: 'consent-records',
    field: 'consentRecordsMonths',
    dateField: 'givenAt',
  },
  {
    key: 'auditLogs',
    label: 'Audit log entries',
    collection: 'audit-logs',
    field: 'auditLogsMonths',
    dateField: 'createdAt',
  },
]

export type RetentionSettings = Record<string, unknown> & {
  mode?: 'flag' | 'delete'
}

export const readRetentionSettings = async (payload: Payload): Promise<RetentionSettings> => {
  try {
    return (await payload.findGlobal({
      slug: 'data-protection',
      depth: 0,
      overrideAccess: true,
    })) as unknown as RetentionSettings
  } catch {
    return {}
  }
}

export const monthsFor = (settings: RetentionSettings, category: RetentionCategory): number | null => {
  const value = Number(settings[category.field])
  return Number.isFinite(value) && value > 0 ? value : null
}

export const overdueWhere = (category: RetentionCategory, months: number, now = new Date()): Where => {
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - months)
  return {
    and: [
      { [category.dateField]: { less_than: cutoff.toISOString() } },
      ...(category.extra ? [category.extra] : []),
    ],
  }
}

export const countOverdue = async (
  payload: Payload,
  category: RetentionCategory,
  months: number,
): Promise<number> => {
  const { totalDocs } = await payload.count({
    collection: category.collection,
    where: overdueWhere(category, months),
    overrideAccess: true,
  })
  return totalDocs
}

/**
 * Removes a deleted record's name from the audit log entries that mention it.
 *
 * Used by erasure and by retention. The entries themselves stay — the log must
 * still show that something happened and who did it — but a child's name the
 * school has deleted from the enquiry should not live on in the log line about
 * it.
 */
export const redactAuditEntries = async (
  payload: Payload,
  collection: string,
  ids: (string | number)[],
  reason: string,
  req?: PayloadRequest,
): Promise<number> => {
  if (ids.length === 0) return 0

  const { docs } = await payload.find({
    collection: 'audit-logs',
    where: {
      and: [
        { targetCollection: { equals: collection } },
        { targetId: { in: ids.map(String) } },
      ],
    },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })

  for (const log of docs as unknown as { id: number; action?: string; targetId?: string }[]) {
    await payload.update({
      collection: 'audit-logs',
      id: log.id,
      data: {
        targetTitle: '[erased]',
        summary: `[details erased — ${reason}] ${log.action ?? ''} on ${collection} #${log.targetId ?? ''}`,
      } as never,
      overrideAccess: true,
      ...(req ? { req } : {}),
    })
  }

  return docs.length
}
