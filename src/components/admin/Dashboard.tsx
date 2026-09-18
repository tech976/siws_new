import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  FileText,
  Images,
  Inbox,
  Info,
  Minus,
  PencilLine,
  School,
  Search,
  Siren,
  Users as UsersIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { Payload, TypedUser } from 'payload'

import { ROLES, canRaiseEmergency, hasRole, isAdmin, isDPO, isHod, unitIdsOf } from '@/access'
import type { AccessUser } from '@/access'
import { REVIEW_STATUS } from '@/fields/publishing'

import { HodDashboard } from './HodDashboard'

/**
 * The SIWS admin dashboard, replacing Payload's default collection grid.
 *
 * This MUST stay a Server Component. `RenderServerComponent` forwards the
 * server props — `payload`, `user`, `permissions` — only when the component is
 * not a client component; adding `'use client'` would silently reduce the props
 * to `{ locale }` and every figure below would read zero.
 *
 * Panels are chosen to be useful rather than decorative: the review queue is
 * the live BR-PUB-06 approval workload, and every count is scoped to what the
 * signed-in user is actually permitted to see.
 */

interface DashboardProps {
  payload: Payload
  user?: TypedUser | null
}

const ADMIN_BASE = '/admin/collections'
const ICON = { size: 21, strokeWidth: 2 } as const

/** Payload's count with access enforced, degrading to 0 rather than throwing. */
const safeCount = async (
  payload: Payload,
  collection: 'pages' | 'media' | 'units' | 'users' | 'enquiries',
  user: TypedUser | null | undefined,
  where?: Record<string, unknown>,
): Promise<number> => {
  try {
    const result = await payload.count({
      collection,
      // Enforcing access is what makes a Unit Head's figures cover their own
      // unit — which is the only reason showing them a number is meaningful.
      overrideAccess: false,
      user: user ?? undefined,
      ...(where ? { where: where as never } : {}),
    })
    return result.totalDocs
  } catch {
    // A permission error on one tile must not blank the whole dashboard.
    return 0
  }
}

const formatWhen = (value: unknown): string => {
  if (typeof value !== 'string') return 'recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'recently'

  const minutes = Math.round((Date.now() - date.getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const statusBadge = (page: { _status?: unknown; reviewStatus?: unknown }) => {
  if (page.reviewStatus === REVIEW_STATUS.inReview) return { label: 'In review', tone: 'review' }
  if (page.reviewStatus === REVIEW_STATUS.changesRequested) {
    return { label: 'Changes', tone: 'changes' }
  }
  if (page._status === 'published') return { label: 'Published', tone: 'published' }
  return { label: 'Draft', tone: 'draft' }
}

const initials = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0) return '—'
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

/** Human label for the roles a user holds, for the header chip. */
const describeRole = (user: AccessUser | null): string => {
  if (!user?.roles?.length) return 'Staff'
  if (user.roles.includes(ROLES.admin)) return 'Administrator'
  if (user.roles.includes(ROLES.unitHead)) return 'Unit Head'
  if (user.roles.includes(ROLES.contentManager)) return 'Content Manager'
  if (user.roles.includes(ROLES.dpo)) return 'Data Protection Officer'
  return 'Editor'
}

interface Delta {
  tone: 'pos' | 'neg' | 'warn' | 'flat'
  label: string
}

export const Dashboard = async ({ payload, user }: DashboardProps) => {
  const accessUser = (user ?? null) as AccessUser | null

  /*
   * An HOD gets a different screen entirely, not a trimmed version of this one.
   * Every panel below — the review queue, the enquiry inbox, page counts — is
   * something they cannot act on, and a dashboard of figures a person is not
   * responsible for is precisely the complexity the trustees objected to.
   */
  if (!isAdmin(accessUser) && isHod(accessUser)) {
    const unitIds = unitIdsOf(accessUser)
    let unitName: string | null = null
    if (unitIds[0]) {
      try {
        const unit = await payload.findByID({
          collection: 'units',
          id: unitIds[0],
          depth: 0,
          overrideAccess: true,
        })
        unitName = (unit as { name?: string }).name ?? null
      } catch {
        unitName = null
      }
    }
    return <HodDashboard payload={payload} user={user} unitName={unitName} />
  }

  const name = typeof (user as { name?: unknown })?.name === 'string'
    ? String((user as { name: string }).name)
    : 'Team member'

  const canApproveHere = isAdmin(accessUser) || (accessUser?.roles ?? []).includes(ROLES.unitHead)

  /** SRS 8.2 — the roles allowed to see enquiry submissions at all. */
  const canSeeEnquiries =
    isAdmin(accessUser) ||
    isDPO(accessUser) ||
    hasRole(accessUser, ROLES.unitHead, ROLES.contentManager)

  const [
    publishedPages,
    draftPages,
    mediaCount,
    unitCount,
    awaitingReview,
    changesRequested,
    newEnquiries,
    totalEnquiries,
  ] = await Promise.all([
    safeCount(payload, 'pages', user, { _status: { equals: 'published' } }),
    safeCount(payload, 'pages', user, { _status: { equals: 'draft' } }),
    safeCount(payload, 'media', user),
    safeCount(payload, 'units', user),
    safeCount(payload, 'pages', user, { reviewStatus: { equals: REVIEW_STATUS.inReview } }),
    safeCount(payload, 'pages', user, {
      reviewStatus: { equals: REVIEW_STATUS.changesRequested },
    }),
    canSeeEnquiries
      ? safeCount(payload, 'enquiries', user, { status: { equals: 'new' } })
      : Promise.resolve(0),
    canSeeEnquiries ? safeCount(payload, 'enquiries', user) : Promise.resolve(0),
  ])

  const [reviewQueue, recentlyEdited] = await Promise.all([
    payload
      .find({
        collection: 'pages',
        where: { reviewStatus: { equals: REVIEW_STATUS.inReview } },
        sort: '-submittedAt',
        limit: 6,
        depth: 1,
        overrideAccess: false,
        user: user ?? undefined,
      })
      .catch(() => ({ docs: [] as Record<string, unknown>[] })),
    payload
      .find({
        collection: 'pages',
        sort: '-updatedAt',
        limit: 6,
        depth: 1,
        overrideAccess: false,
        user: user ?? undefined,
      })
      .catch(() => ({ docs: [] as Record<string, unknown>[] })),
  ])

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  /**
   * The delta badge in the references shows month-on-month movement. There is
   * no historical snapshot to compare against yet, so each badge reports the
   * present state of that metric instead of inventing a trend — a fabricated
   * "+12%" on a school website would be actively misleading.
   */
  const stats: {
    label: string
    value: number
    icon: React.ReactNode
    chip: string
    delta: Delta
    href: string
    filled?: boolean
  }[] = [
    {
      label: 'Published pages',
      value: publishedPages,
      icon: <FileText {...ICON} />,
      chip: 'brand',
      delta: { tone: publishedPages > 0 ? 'pos' : 'flat', label: 'Live' },
      href: `${ADMIN_BASE}/pages`,
      filled: true,
    },
    {
      label: 'Drafts in progress',
      value: draftPages,
      icon: <PencilLine {...ICON} />,
      chip: 'blue',
      delta: { tone: draftPages > 0 ? 'warn' : 'flat', label: draftPages > 0 ? 'Unpublished' : 'None' },
      href: `${ADMIN_BASE}/pages`,
    },
    {
      label: 'Media items',
      value: mediaCount,
      icon: <Images {...ICON} />,
      chip: 'teal',
      delta: { tone: 'flat', label: 'Library' },
      href: `${ADMIN_BASE}/media`,
    },
    {
      label: canApproveHere ? 'Awaiting your approval' : 'Awaiting approval',
      value: awaitingReview,
      icon: <ClipboardList {...ICON} />,
      chip: 'coral',
      delta:
        awaitingReview > 0
          ? { tone: 'neg', label: 'Action needed' }
          : { tone: 'pos', label: 'All clear' },
      href: `${ADMIN_BASE}/pages`,
    },
    ...(canSeeEnquiries
      ? [
          {
            label: 'New admission enquiries',
            value: newEnquiries,
            icon: <Inbox {...ICON} />,
            chip: 'amber',
            delta:
              newEnquiries > 0
                ? ({ tone: 'warn', label: 'Not yet contacted' } as Delta)
                : ({ tone: 'pos', label: 'All contacted' } as Delta),
            href: `${ADMIN_BASE}/enquiries`,
          },
        ]
      : []),
  ]

  const deltaIcon = (tone: Delta['tone']) => {
    if (tone === 'pos') return <ArrowUpRight size={13} strokeWidth={2.5} />
    if (tone === 'neg') return <ArrowDownRight size={13} strokeWidth={2.5} />
    return <Minus size={13} strokeWidth={2.5} />
  }

  const tiles = [
    {
      label: 'Pages',
      slug: 'pages',
      icon: <FileText size={19} strokeWidth={2} />,
      count: publishedPages + draftPages,
    },
    { label: 'Media library', slug: 'media', icon: <Images size={19} strokeWidth={2} />, count: mediaCount },
    { label: 'Schools', slug: 'units', icon: <School size={19} strokeWidth={2} />, count: unitCount },
    ...(canSeeEnquiries
      ? [
          {
            label: 'Admission enquiries',
            slug: 'enquiries',
            icon: <Inbox size={19} strokeWidth={2} />,
            count: totalEnquiries,
          },
        ]
      : []),
    ...(isAdmin(accessUser)
      ? [
          {
            label: 'Staff & permissions',
            slug: 'users',
            icon: <UsersIcon size={19} strokeWidth={2} />,
            count: null as number | null,
          },
        ]
      : []),
    ...(isAdmin(accessUser) || isDPO(accessUser)
      ? [
          {
            label: 'Activity log',
            slug: 'audit-logs',
            icon: <ClipboardList size={19} strokeWidth={2} />,
            count: null as number | null,
          },
        ]
      : []),
  ]

  return (
    <div className="gutter gutter--left gutter--right siws-dash">
      {/* --- Title row ---------------------------------------------------- */}
      <div className="siws-dash__top">
        <div>
          <h1 className="siws-dash__title">Dashboard</h1>
          <p className="siws-dash__date">{today}</p>
        </div>

        <div className="siws-dash__topright">
          {/*
            FR-EMG-02 — a notice in no more than three steps. From here it is
            this button, the message, and Save. Shown only to the people who may
            raise one, so it is never an invitation somebody cannot accept.
          */}
          {canRaiseEmergency(accessUser) ? (
            <Link href={`${ADMIN_BASE}/emergency-notices/create`} className="siws-urgentbtn">
              <Siren size={17} strokeWidth={2.2} aria-hidden="true" />
              <span>Emergency notice</span>
            </Link>
          ) : null}

          <Link
            href={`${ADMIN_BASE}/pages`}
            className="siws-iconbtn"
            aria-label="Search pages"
            title="Search pages"
          >
            <Search size={19} strokeWidth={2} />
          </Link>

          <Link
            href={`${ADMIN_BASE}/pages`}
            className="siws-iconbtn"
            aria-label={
              awaitingReview > 0
                ? `${awaitingReview} item${awaitingReview === 1 ? '' : 's'} awaiting review`
                : 'Nothing awaiting review'
            }
            title="Awaiting review"
          >
            <Bell size={19} strokeWidth={2} />
          </Link>

          <div className="siws-userchip">
            <span className="siws-userchip__avatar" aria-hidden="true">
              {initials(name)}
            </span>
            <span className="siws-userchip__text">
              <span className="siws-userchip__name">{name}</span>
              <span className="siws-userchip__role">{describeRole(accessUser)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* --- Statistic cards --------------------------------------------- */}
      <ul className="siws-stats">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link
              href={stat.href}
              className={`siws-stat${stat.filled ? ' siws-stat--filled' : ''}`}
            >
              <span className="siws-stat__head">
                <span className={`siws-stat__chip siws-stat__chip--${stat.chip}`} aria-hidden="true">
                  {stat.icon}
                </span>
                <span className={`siws-delta siws-delta--${stat.delta.tone}`}>
                  <span aria-hidden="true">{deltaIcon(stat.delta.tone)}</span>
                  {stat.delta.label}
                </span>
              </span>
              <span className="siws-stat__value">{stat.value}</span>
              <span className="siws-stat__label">{stat.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* --- Panels ------------------------------------------------------ */}
      <div className="siws-cols">
        <section className="siws-panel" aria-labelledby="siws-review-heading">
          <div className="siws-panel__head">
            <div className="siws-panel__heading">
              <h2 id="siws-review-heading">
                {canApproveHere ? 'Waiting for your approval' : 'Submitted for review'}
              </h2>
              <p>
                {canApproveHere
                  ? 'Review the content, then approve it or return it with a comment.'
                  : 'Your unit head has been notified of these.'}
              </p>
            </div>
            {reviewQueue.docs.length > 0 ? (
              <span className="siws-panel__count">{reviewQueue.docs.length}</span>
            ) : null}
          </div>

          <div className="siws-panel__body">
            {reviewQueue.docs.length === 0 ? (
              <p className="siws-panel__empty">
                <span className="siws-panel__empty-mark" aria-hidden="true">
                  <CheckCircle2 size={24} strokeWidth={2} />
                </span>
                Nothing is waiting for review right now.
              </p>
            ) : (
              <ul className="siws-rows">
                {reviewQueue.docs.map((doc) => {
                  const record = doc as Record<string, unknown>
                  const unit = record.unit as { shortName?: string } | null
                  return (
                    <li key={String(record.id)}>
                      <Link href={`${ADMIN_BASE}/pages/${record.id}`} className="siws-row">
                        <span className="siws-row__mark" aria-hidden="true">
                          {initials(record.title)}
                        </span>
                        <span className="siws-row__body">
                          <span className="siws-row__title">
                            {String(record.title ?? 'Untitled')}
                          </span>
                          <span className="siws-row__meta">
                            {unit?.shortName ?? 'Institution-wide'} · submitted{' '}
                            {formatWhen(record.submittedAt)}
                          </span>
                        </span>
                        <span className="siws-badge siws-badge--review">Review</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="siws-panel" aria-labelledby="siws-recent-heading">
          <div className="siws-panel__head">
            <div className="siws-panel__heading">
              <h2 id="siws-recent-heading">Recently edited</h2>
              <p>
                {changesRequested > 0
                  ? `${changesRequested} item${changesRequested === 1 ? '' : 's'} returned for changes.`
                  : 'Your latest work across the site.'}
              </p>
            </div>
          </div>

          <div className="siws-panel__body">
            {recentlyEdited.docs.length === 0 ? (
              <p className="siws-panel__empty">
                <span className="siws-panel__empty-mark" aria-hidden="true">
                  <Inbox size={24} strokeWidth={2} />
                </span>
                No pages yet. Create the first one to get started.
              </p>
            ) : (
              <ul className="siws-rows">
                {recentlyEdited.docs.map((doc) => {
                  const record = doc as Record<string, unknown>
                  const badge = statusBadge(record)
                  return (
                    <li key={String(record.id)}>
                      <Link href={`${ADMIN_BASE}/pages/${record.id}`} className="siws-row">
                        <span className="siws-row__body">
                          <span className="siws-row__title">
                            {String(record.title ?? 'Untitled')}
                          </span>
                          <span className="siws-row__meta">{formatWhen(record.updatedAt)}</span>
                        </span>
                        <span className={`siws-badge siws-badge--${badge.tone}`}>{badge.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* --- Manage content --------------------------------------------- */}
      <section aria-labelledby="siws-manage-heading">
        <h2 id="siws-manage-heading" className="siws-section-title">
          Manage content
        </h2>

        <ul className="siws-tiles">
          {tiles.map((tile) => (
            <li key={tile.slug}>
              <Link href={`${ADMIN_BASE}/${tile.slug}`} className="siws-tile">
                <span className="siws-tile__chip" aria-hidden="true">
                  {tile.icon}
                </span>
                <span>
                  <span className="siws-tile__label">{tile.label}</span>
                  {typeof tile.count === 'number' ? (
                    <span className="siws-tile__count">
                      {tile.count} item{tile.count === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}

          <li>
            <Link href={`${ADMIN_BASE}/pages/create`} className="siws-tile">
              <span className="siws-tile__chip" aria-hidden="true">
                <FilePlus2 size={19} strokeWidth={2} />
              </span>
              <span>
                <span className="siws-tile__label">New page</span>
                <span className="siws-tile__count">Start writing</span>
              </span>
            </Link>
          </li>
        </ul>
      </section>

      {/* Unit staff work inside one site; stating the scope removes any doubt
          about which unit an edit will affect. */}
      {!isAdmin(accessUser) && unitIdsOf(accessUser).length > 0 ? (
        <p className="siws-scopenote">
          <Info size={16} strokeWidth={2.5} aria-hidden="true" />
          You are working in your own school. The numbers above count your school only.
        </p>
      ) : null}
    </div>
  )
}

export default Dashboard
