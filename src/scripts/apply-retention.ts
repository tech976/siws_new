import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const {
  RETENTION_CATEGORIES,
  monthsFor,
  overdueWhere,
  readRetentionSettings,
  redactAuditEntries,
} = await import('@/lib/retention')

/**
 * BR-DPA-02 — applies the retention schedule set under
 * Data protection → Data retention.
 *
 * Nightly, from cron (see docs/DEPLOYMENT.md). What it does depends on the mode
 * SIWS chose there:
 *
 *   flag   — counts what is overdue and records the counts; deletes nothing.
 *   delete — deletes what is overdue, redacts the audit-log lines that named
 *            those records, and writes one audit entry per category.
 *
 * Without `--apply` it only reports, whatever the mode, so it is safe to run by
 * hand to see what tonight would do.
 *
 * RUN WITH NODE_ENV=production. Outside production Payload reconciles the
 * database schema on start-up and will stop to ask about anything that would
 * drop a column — an unattended job must never be the thing that answers.
 *
 * Usage:  NODE_ENV=production npx tsx src/scripts/apply-retention.ts [--apply]
 */

const APPLY = process.argv.includes('--apply')
const BATCH = 200

const main = async () => {
  const payload = await getPayload({ config })
  const settings = await readRetentionSettings(payload)
  const deleting = settings.mode === 'delete'
  const lines: string[] = []

  for (const category of RETENTION_CATEGORIES) {
    const months = monthsFor(settings, category)
    if (!months) {
      lines.push(`${category.label}: kept indefinitely.`)
      continue
    }

    const where = overdueWhere(category, months)
    const { totalDocs } = await payload.count({
      collection: category.collection,
      where,
      overrideAccess: true,
    })

    if (totalDocs === 0) {
      lines.push(`${category.label}: none older than ${months} months.`)
      continue
    }

    if (!deleting || !APPLY) {
      lines.push(
        `${category.label}: ${totalDocs} older than ${months} months${deleting ? ' (would be deleted)' : ' — flagged, not deleted'}.`,
      )
      continue
    }

    const deletedIds: (string | number)[] = []

    /*
     * In batches, re-querying each time rather than paging, because each pass
     * deletes what the previous page would have been counted against.
     */
    for (;;) {
      const { docs } = await payload.find({
        collection: category.collection,
        where,
        limit: BATCH,
        depth: 0,
        overrideAccess: true,
      })
      if (docs.length === 0) break

      for (const doc of docs) {
        await payload.delete({ collection: category.collection, id: doc.id, overrideAccess: true })
        deletedIds.push(doc.id)
      }
      if (docs.length < BATCH) break
    }

    // The log itself is not redacted by its own retention run.
    const redacted =
      category.collection === 'audit-logs'
        ? 0
        : await redactAuditEntries(payload, category.collection, deletedIds, 'retention period ended')

    /*
     * Written directly: `writeAuditLog` records only actions with a signed-in
     * user, and this one has none. The entry names the schedule as the actor
     * and keeps ids and counts — the minimum evidence BR-DPA-05 asks for.
     */
    if (category.collection !== 'audit-logs') {
      await payload.create({
        collection: 'audit-logs',
        overrideAccess: true,
        data: {
          summary: `Retention schedule deleted ${deletedIds.length} ${category.label.toLowerCase()}`,
          action: 'deleted_personal_data',
          targetCollection: category.collection,
          actorEmail: 'retention schedule (automatic)',
          detail: `Older than ${months} months. Record ids: ${JSON.stringify(deletedIds)}. ${redacted} earlier log entries redacted.`,
        } as never,
      })
    }

    lines.push(`${category.label}: deleted ${deletedIds.length} older than ${months} months.`)
  }

  const summary = [`Mode: ${deleting ? 'delete' : 'flag'}${APPLY ? '' : ' (report only)'}`, ...lines].join('\n')
  console.log(summary)

  if (APPLY) {
    await payload.updateGlobal({
      slug: 'data-protection',
      data: { lastRunAt: new Date().toISOString(), lastRunSummary: summary } as never,
      overrideAccess: true,
    })
  }

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
