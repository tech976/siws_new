import type { BeforeListServerProps } from 'payload'

import { liveNoticeWhere, SEVERITY_LABELS, type NoticeSeverity } from '@/lib/emergency'

/**
 * FR-EMG-11 — "a clear indication in the admin panel of what is currently live".
 *
 * Above the list, because the list itself is sorted by date and mixes withdrawn
 * and expired notices in with the live ones. Somebody about to raise a closure
 * notice needs to know, before they start typing, whether one is already up.
 *
 * A Server Component: it reads with the signed-in user's own access, so a Unit
 * Head sees what is live on their school's pages, which is the question they
 * are actually asking.
 */
export const LiveNoticesSummary = async ({ payload, user }: BeforeListServerProps) => {
  let notices: {
    id: number | string
    message: string
    severity: NoticeSeverity
    scope: string
    units?: { shortName?: string; name?: string }[] | null
  }[] = []

  try {
    const result = await payload.find({
      collection: 'emergency-notices',
      where: liveNoticeWhere(),
      depth: 1,
      limit: 20,
      sort: '-updatedAt',
      overrideAccess: false,
      user,
    })
    notices = result.docs as unknown as typeof notices
  } catch {
    return null
  }

  return (
    <div className="siws-live-notices" role="status">
      {notices.length === 0 ? (
        <p className="siws-live-notices__none">
          <strong>Nothing is showing on the website right now.</strong> Create a notice below and
          it appears as soon as you save.
        </p>
      ) : (
        <>
          <p className="siws-live-notices__title">
            Showing on the website now ({notices.length})
          </p>
          <ul>
            {notices.map((notice) => {
              const where =
                notice.scope === 'institution'
                  ? 'Every page'
                  : (notice.units ?? [])
                      .map((unit) => (typeof unit === 'object' ? unit.shortName || unit.name : ''))
                      .filter(Boolean)
                      .join(', ') || 'Selected schools'

              return (
                <li key={notice.id}>
                  <span className={`siws-live-notices__chip siws-live-notices__chip--${notice.severity}`}>
                    {SEVERITY_LABELS[notice.severity] ?? notice.severity}
                  </span>
                  <a href={`/admin/collections/emergency-notices/${notice.id}`}>{notice.message}</a>
                  <span className="siws-live-notices__where">{where}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

export default LiveNoticesSummary
