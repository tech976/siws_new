import config from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import {
  DISMISSED_NOTICES_COOKIE,
  SEVERITY_RANK,
  liveNoticeWhere,
  noticeKey,
  parseDismissed,
  type NoticeSeverity,
} from '@/lib/emergency'
import { UNIT_HOME_SLUG } from '@/lib/site'
import type { Unit } from '@/payload-types'

import { EmergencyNoticeItem } from './EmergencyNoticeItem'

/**
 * FR-EMG-01 — the emergency notice banner, above all other content.
 *
 * Rendered by each page component, before the site header, rather than by the
 * root layout: which notices apply depends on which school the page belongs to,
 * and only the page knows that. The portal and the search page belong to no
 * school, so they show institution-wide notices only; a school's pages show
 * those plus the school's own (FR-EMG-03).
 *
 * FR-EMG-12 — not defeated by caching. These pages already render on every
 * request (the layout reads cookies), so a notice raised or withdrawn is on the
 * next page load. Expiry is part of the query, so it needs no write at all.
 *
 * FAILS OPEN FOR THE PAGE, not for the notice: if the lookup throws, the page
 * still renders without a banner rather than not at all, and the failure is
 * logged. A site that is down cannot show a closure notice either.
 */

interface NoticeDoc {
  id: number
  message: string
  severity: NoticeSeverity
  updatedAt: string
  linkLabel?: string | null
  link?: {
    relationTo: 'posts' | 'pages'
    value: { slug?: string | null; unit?: number | { id: number } | null } | number | null
  } | null
}

const hrefFor = (link: NoticeDoc['link'], units: Unit[]): string | null => {
  if (!link || !link.value || typeof link.value !== 'object') return null
  const { slug, unit } = link.value
  if (!slug) return null

  const unitId = typeof unit === 'object' && unit !== null ? unit.id : unit
  const unitSlug = unitId ? units.find((entry) => entry.id === unitId)?.slug : null

  if (link.relationTo === 'pages' && slug === UNIT_HOME_SLUG) {
    return unitSlug ? `/${unitSlug}` : '/'
  }
  return unitSlug ? `/${unitSlug}/${slug}` : `/${slug}`
}

export const EmergencyNoticeBanner = async ({
  unitId,
  units,
}: {
  unitId: number | null
  units: Unit[]
}) => {
  let notices: NoticeDoc[] = []

  try {
    const payload = await getPayload({ config })

    const scope: Where =
      unitId === null
        ? { scope: { equals: 'institution' } }
        : { or: [{ scope: { equals: 'institution' } }, { units: { in: [unitId] } }] }

    const { docs } = await payload.find({
      collection: 'emergency-notices',
      where: { and: [liveNoticeWhere(), scope] },
      depth: 1,
      limit: 5,
      sort: '-updatedAt',
      // As a visitor: the collection's own read rule is what defines "live".
      overrideAccess: false,
    })

    notices = (docs as unknown as NoticeDoc[]).sort(
      (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9),
    )
  } catch (error) {
    console.error('Emergency notices could not be loaded:', error)
    return null
  }

  if (notices.length === 0) return null

  const dismissed = parseDismissed((await cookies()).get(DISMISSED_NOTICES_COOKIE)?.value)

  const visible = notices.filter(
    // FR-EMG-08 — only an information notice can be dismissed.
    (notice) =>
      notice.severity !== 'information' || !dismissed.has(noticeKey(notice.id, notice.updatedAt)),
  )

  if (visible.length === 0) return null

  return (
    <div className="siws-emergency">
      {visible.map((notice) => (
        <EmergencyNoticeItem
          key={notice.id}
          noticeKey={noticeKey(notice.id, notice.updatedAt)}
          message={notice.message}
          severity={notice.severity}
          href={hrefFor(notice.link, units)}
          linkLabel={notice.linkLabel?.trim() || 'Read more'}
        />
      ))}
    </div>
  )
}
