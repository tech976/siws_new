import type { Where } from 'payload'

/**
 * SRS 5.18 — emergency notices. Definitions shared by the collection, the
 * public banner and the admin summary, so the three can never disagree about
 * what "live" means.
 */

export const NOTICE_SEVERITIES = ['information', 'warning', 'critical'] as const
export type NoticeSeverity = (typeof NOTICE_SEVERITIES)[number]

/**
 * FR-EMG-05 — each level has a label as well as a colour. Colour alone fails
 * WCAG 2.1 SC 1.4.1, and "red means worse" is not something a visitor can be
 * assumed to read the same way.
 */
export const SEVERITY_LABELS: Record<NoticeSeverity, string> = {
  information: 'Notice',
  warning: 'Warning',
  critical: 'Urgent',
}

/** Most serious first, wherever notices are listed together. */
export const SEVERITY_RANK: Record<NoticeSeverity, number> = {
  critical: 0,
  warning: 1,
  information: 2,
}

export const NOTICE_SCOPES = ['institution', 'units'] as const
export type NoticeScope = (typeof NOTICE_SCOPES)[number]

export const NOTICE_STATUSES = ['live', 'withdrawn'] as const
export type NoticeStatus = (typeof NOTICE_STATUSES)[number]

/**
 * What "live" means: not withdrawn, and not past its expiry.
 *
 * FR-EMG-06 — expiry is applied at READ time rather than by a job flipping the
 * status. A job that runs late, or not at all, would leave a "school closed
 * today" notice up the next morning; a query cannot be late. The same reasoning
 * as `publishedWhere` for scheduled pages.
 */
export const liveNoticeWhere = (now: Date = new Date()): Where => ({
  and: [
    { status: { equals: 'live' } },
    {
      or: [
        { expiresAt: { exists: false } },
        { expiresAt: { greater_than: now.toISOString() } },
      ],
    },
  ],
})

export const isExpired = (expiresAt: unknown, now: Date = new Date()): boolean => {
  if (typeof expiresAt !== 'string' || expiresAt.length === 0) return false
  const at = Date.parse(expiresAt)
  return Number.isFinite(at) && at <= now.getTime()
}

/**
 * FR-EMG-08 — information-level notices a visitor has dismissed this session.
 *
 * A session cookie (no expiry) rather than sessionStorage, so the SERVER can
 * leave a dismissed notice out of the page. Read in the browser, the notice
 * would be drawn and then removed on every navigation — a banner that flickers
 * across the top of each page is worse than one that stays.
 *
 * It holds notice ids and edit times, nothing about the visitor, which is why
 * it sits in the strictly necessary category of the cookie policy.
 */
export const DISMISSED_NOTICES_COOKIE = 'siws-dismissed-notices'

/**
 * The key a dismissal is stored under. It includes the last edit time, so a
 * notice that is changed after somebody dismissed it comes back — they
 * dismissed the old wording, not whatever it says now.
 */
export const noticeKey = (id: number | string, updatedAt: string | null | undefined): string =>
  `${id}.${updatedAt ? Date.parse(updatedAt) || 0 : 0}`

export const parseDismissed = (raw: string | undefined | null): Set<string> => {
  if (!raw) return new Set()
  try {
    return new Set(
      decodeURIComponent(raw)
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => /^[\w-]+\.\d+$/.test(entry)),
    )
  } catch {
    return new Set()
  }
}
