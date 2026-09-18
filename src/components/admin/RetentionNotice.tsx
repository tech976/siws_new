import type { BeforeListServerProps } from 'payload'

import { isAdminOrDpo } from '@/lib/data-protection'
import {
  RETENTION_CATEGORIES,
  countOverdue,
  monthsFor,
  readRetentionSettings,
} from '@/lib/retention'

/**
 * BR-DPA-02 — the "flag" half of "flag or purge".
 *
 * Above each list that holds personal data, a line saying how many records have
 * passed the period SIWS set, and what will happen to them. Silent when there
 * are none: a permanent green "all fine" banner is one people learn to stop
 * reading, and then they stop reading it on the day it changes.
 */
export const RetentionNotice = async ({ payload, user, collectionConfig }: BeforeListServerProps) => {
  const category = RETENTION_CATEGORIES.find(
    (entry) => entry.collection === collectionConfig?.slug,
  )
  if (!category) return null

  try {
    const settings = await readRetentionSettings(payload)
    const months = monthsFor(settings, category)
    if (!months) return null

    const overdue = await countOverdue(payload, category, months)
    if (overdue === 0) return null

    const deleting = settings.mode === 'delete'
    const canConfigure = isAdminOrDpo(user)

    return (
      <div className="siws-retention" role="status">
        <p>
          <strong>
            {overdue} {overdue === 1 ? 'record is' : 'records are'} older than the {months}-month
            retention period.
          </strong>{' '}
          {deleting
            ? 'They will be deleted in tonight’s run.'
            : 'Deletion is switched off, so they are kept until someone reviews them.'}
        </p>
        {canConfigure ? (
          <p>
            <a href="/admin/globals/data-protection">Data retention settings</a>
          </p>
        ) : null}
      </div>
    )
  } catch {
    return null
  }
}

export default RetentionNotice
