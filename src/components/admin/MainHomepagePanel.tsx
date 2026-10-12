import { Megaphone } from 'lucide-react'
import Link from 'next/link'
import type { Payload, TypedUser, Where } from 'payload'

import { MainHomepageToggle } from './MainHomepageToggle'

/**
 * The administrator's own section for the main SIWS homepage: what is running
 * in its news strip now, and where to choose more.
 *
 * SIWS asked for "a tick and cross option" and "proper sections for that"
 * (2026-10-12). The choosing is done on the "Main homepage" screen
 * (`MainHomepageView`), which lists everything that is live, or from the
 * column in News & Events and Ticker announcements. This is the
 * glance from the dashboard — the answer to "what have I put on the front
 * page?" — with the button to take something off again, and the way in.
 *
 * A Server Component, like the dashboard it sits in. Published items only:
 * this is the list of what is on the main homepage, and something that is not
 * published is not on it, ticked or not.
 */
interface PanelProps {
  payload: Payload
  user?: TypedUser | null
}

interface Row {
  key: string
  collection: 'posts' | 'announcements'
  id: number | string
  title: string
  meta: string
}

const ADMIN_BASE = '/admin/collections'

const KIND: Record<string, string> = {
  news: 'News',
  event: 'Event',
  achievement: 'Achievement',
  urgent: 'Important',
}

const schoolOf = (unit: unknown): string =>
  unit && typeof unit === 'object' && 'shortName' in unit
    ? String((unit as { shortName?: unknown }).shortName ?? 'A school')
    : 'Institution-wide'

export const MainHomepagePanel = async ({ payload, user }: PanelProps) => {
  const ticked: Where = {
    and: [{ showOnHome: { equals: true } }, { _status: { equals: 'published' } }],
  }
  const find = (collection: 'posts' | 'announcements', sort: string) =>
    payload
      .find({
        collection,
        where: ticked,
        sort,
        limit: 12,
        depth: 1,
        overrideAccess: false,
        user: user ?? undefined,
      })
      .then((result) => result.docs as unknown as Record<string, unknown>[])
      // One list failing must not blank the dashboard.
      .catch(() => [] as Record<string, unknown>[])

  const [posts, lines] = await Promise.all([find('posts', '-date'), find('announcements', '-updatedAt')])

  const rows: Row[] = [
    ...lines.map((doc) => ({
      key: `line-${doc.id}`,
      collection: 'announcements' as const,
      id: doc.id as number,
      title: String(doc.message ?? 'Untitled'),
      meta: `${schoolOf(doc.unit)} · Ticker line`,
    })),
    ...posts.map((doc) => ({
      key: `post-${doc.id}`,
      collection: 'posts' as const,
      id: doc.id as number,
      title: String(doc.title ?? 'Untitled'),
      meta: `${schoolOf(doc.unit)} · ${KIND[String(doc.kind)] ?? 'News'}`,
    })),
  ]

  return (
    <section className="siws-panel" aria-labelledby="siws-mainhome-heading">
      <div className="siws-panel__head">
        <div className="siws-panel__heading">
          <h2 id="siws-mainhome-heading">Main homepage news strip</h2>
          <p>
            Only what you tick runs on the main SIWS site. Everything else stays on its own
            school&rsquo;s pages.
          </p>
        </div>
      </div>

      <div className="siws-panel__body">
        {rows.length === 0 ? (
          <p className="siws-panel__empty">
            <span className="siws-panel__empty-mark" aria-hidden="true">
              <Megaphone size={24} strokeWidth={2} />
            </span>
            Nothing from the schools is on the main homepage yet. Open the list of everything
            that is live and press the cross beside an item to put it there.
          </p>
        ) : (
          <ul className="siws-rows">
            {rows.map((row) => (
              <li key={row.key}>
                <div className="siws-row">
                  <span className="siws-row__body">
                    <Link
                      href={`${ADMIN_BASE}/${row.collection}/${row.id}`}
                      className="siws-row__title"
                    >
                      {row.title}
                    </Link>
                    <span className="siws-row__meta">{row.meta}</span>
                  </span>
                  <MainHomepageToggle collection={row.collection} id={row.id} shown />
                </div>
              </li>
            ))}
          </ul>
        )}

        <p style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '0.4rem 0.7rem 0.9rem' }}>
          <Link href="/admin/main-homepage">Choose from everything that is live</Link>
        </p>
      </div>
    </section>
  )
}
