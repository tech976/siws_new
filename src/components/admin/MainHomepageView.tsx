import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { publishedWhere } from '@/access'
import { isAdmin, type AccessUser } from '@/access/user'

import { MainHomepageToggle } from './MainHomepageToggle'

/**
 * The administrator's screen for the main SIWS homepage: everything that is
 * LIVE across the four schools, each with its tick-and-cross.
 *
 * WHY A SCREEN OF ITS OWN. The button was first a column in News & Events,
 * and that list is every item in every state — SIWS, 2026-10-12: "the admin
 * can see all the news, events and achievements, whether they are in draft or
 * live. It should directly show which are published and currently live."
 * Marking the drafts "Not published" answered the letter of that and not the
 * point: the person choosing what runs on the front page wants a list of what
 * COULD run there, and a draft cannot.
 *
 * So this lists only what a visitor can see right now — published, and inside
 * its scheduled dates, by the same rule the public site reads by
 * (`publishedWhere`). It reads the live item rather than its latest version,
 * so a story that is on the site with an unpublished edit waiting is here,
 * and a draft never is.
 *
 * SECTIONS, as asked: what is on the main homepage now, then what is live on
 * the schools' own pages, by kind — achievements, news, events, announcements.
 * Pressing a button moves the item from one to the other.
 *
 * News & Events only. "Ticker announcements" had a section here until SIWS
 * asked for that collection to go; a notice is an Announcement now, and is
 * listed with the rest.
 *
 * Custom admin views are not protected by Payload, so the check is here: an
 * administrator, or nothing.
 */

interface Row {
  key: string
  id: number | string
  title: string
  school: string
  when: string | null
  shown: boolean
}

const ADMIN_BASE = '/admin/collections'

/** As many as one screen can usefully hold; the newest come first. */
const LIMIT = 200

const schoolOf = (unit: unknown): string | null =>
  unit && typeof unit === 'object' && 'shortName' in unit
    ? String((unit as { shortName?: unknown }).shortName ?? '')
    : null

const day = (value: unknown): string | null => {
  if (typeof value !== 'string' && !(value instanceof Date)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

const List = ({ rows, empty }: { rows: Row[]; empty: string }) =>
  rows.length === 0 ? (
    <p className="siws-panel__empty">{empty}</p>
  ) : (
    <ul className="siws-rows">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="siws-row">
            <span className="siws-row__body">
              <Link href={`${ADMIN_BASE}/posts/${row.id}`} className="siws-row__title">
                {row.title}
              </Link>
              <span className="siws-row__meta">
                {row.school}
                {row.when ? ` · ${row.when}` : ''}
              </span>
            </span>
            <MainHomepageToggle collection="posts" id={row.id} shown={row.shown} />
          </div>
        </li>
      ))}
    </ul>
  )

const Panel = ({
  id,
  title,
  note,
  children,
}: {
  id: string
  title: string
  note?: string
  children: React.ReactNode
}) => (
  <section className="siws-panel" aria-labelledby={id} style={{ marginBottom: '1.15rem' }}>
    <div className="siws-panel__head">
      <div className="siws-panel__heading">
        <h2 id={id}>{title}</h2>
        {note ? <p>{note}</p> : null}
      </div>
    </div>
    <div className="siws-panel__body">{children}</div>
  </section>
)

export const MainHomepageView = async ({ initPageResult, params, searchParams }: AdminViewServerProps) => {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const { payload, user, i18n } = req

  if (!user) redirect('/admin/login')

  const allowed = isAdmin(user as AccessUser)

  const live = async () =>
    payload
      .find({
        collection: 'posts',
        where: publishedWhere(),
        sort: '-date',
        limit: LIMIT,
        depth: 1,
        // The rule is in the query. Access is not what decides this list.
        overrideAccess: true,
      })
      .then((result) => result.docs as unknown as Record<string, unknown>[])
      .catch(() => [] as Record<string, unknown>[])

  const posts = allowed ? await live() : []

  const postRows = (kind: string): Row[] =>
    posts
      // An item from before the choice existed has no kind, and was news.
      .filter((doc) => (doc.kind ?? 'news') === kind)
      .map((doc) => ({
        key: `post-${doc.id}`,
        id: doc.id as number,
        title: String(doc.title ?? 'Untitled'),
        school: schoolOf(doc.unit) ?? 'Institution-wide',
        when: day(doc.date),
        shown: doc.showOnHome === true,
      }))

  const groups: { id: string; title: string; rows: Row[] }[] = [
    { id: 'achievements', title: 'Achievements', rows: postRows('achievement') },
    { id: 'news', title: 'News', rows: postRows('news') },
    { id: 'events', title: 'Events', rows: postRows('event') },
    { id: 'announcements', title: 'Announcements', rows: postRows('announcement') },
  ]

  const showing = groups.flatMap((group) => group.rows.filter((row) => row.shown))
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0)

  return (
    <DefaultTemplate
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <div style={{ maxWidth: '62rem', paddingBlock: '2rem 3rem' }}>
          <h1 style={{ margin: 0 }}>Main homepage</h1>

          {!allowed ? (
            <p style={{ marginTop: '0.75rem' }}>
              Only an administrator chooses what appears on the main SIWS homepage.
            </p>
          ) : (
            <>
              <p
                style={{
                  marginTop: '0.5rem',
                  marginBottom: '1.75rem',
                  color: 'var(--theme-elevation-600)',
                  fontSize: '1.05rem',
                  maxWidth: '46rem',
                }}
              >
                Everything that is live on the schools&rsquo; pages right now. Press{' '}
                <strong>Not showing</strong> to put an item in the news strip on the main SIWS
                homepage, and <strong>Showing</strong> to take it off again. Drafts are not listed:
                an item appears here once it is published.
              </p>

              <Panel
                id="siws-mh-showing"
                title={`On the main homepage now (${showing.length})`}
                note="These run in the news strip across the main SIWS site."
              >
                <List
                  rows={showing}
                  empty="Nothing is on the main homepage yet. Choose from the lists below."
                />
              </Panel>

              {groups.map((group) => {
                const rest = group.rows.filter((row) => !row.shown)
                return (
                  <Panel
                    key={group.id}
                    id={`siws-mh-${group.id}`}
                    title={`${group.title} — live, not on the main homepage (${rest.length})`}
                  >
                    <List
                      rows={rest}
                      empty={
                        group.rows.length === 0
                          ? 'None are published at the moment.'
                          : 'Every one that is live is already on the main homepage.'
                      }
                    />
                  </Panel>
                )
              })}

              {total >= LIMIT ? (
                <p style={{ color: 'var(--theme-elevation-600)' }}>
                  Only the newest {LIMIT} are listed here.
                </p>
              ) : null}
            </>
          )}
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}

export default MainHomepageView
