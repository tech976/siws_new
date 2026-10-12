import { Images, Medal, Megaphone, Newspaper, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Payload, TypedUser, Where } from 'payload'

import { unitIdsOf } from '@/access'
import type { AccessUser } from '@/access'

/**
 * What a Head of Department or a teacher sees when they sign in.
 *
 * THE SAME FOUR WORDS AS THE WEBSITE'S MENU — Updates, Sports, Achievements,
 * Campus Gallery — because that is the structure they already know (SIWS,
 * 2026-10-01: "the header would be same as it is displayed in the website, so
 * it would be easy for them to connect"). Updates opens onto News and Events,
 * exactly as the menu does.
 *
 * The trustees' complaint was never that the panel lacked anything — it was
 * "this will be too complex for our HODs". Payload's own dashboard shows every
 * collection as an equal card; the general one adds page counts, a review queue
 * and an enquiry inbox, none of which a teacher can act on.
 *
 * Each box is a place on the website, not a database table: "Sports" is the
 * photographs filed under Sports, which is what appears in that group on the
 * gallery page. The "Add" link beside it opens the upload form with the
 * section already chosen.
 *
 * THAT LAST SENTENCE WAS NOT TRUE UNTIL 2026-10-12. The whole box was one link
 * to the list of photographs, with "+ Add photographs" written inside it, so
 * pressing Add opened the list; the upload form reached from there knew
 * nothing about Sports, and the photograph was filed under no section. It then
 * appeared in neither the box it was added from nor the page of that name —
 * the Junior College's "sports images are not visible". Add is its own link
 * now, and carries the section.
 *
 * A NUMBER HERE IS THE LENGTH OF THE LIST IT OPENS. The library lets anybody
 * read any photograph — the public site has to — so a plain count of "Sports"
 * was every school's: the College was told it had twenty-two and shown none.
 * Photographs are counted by the rule the library lists them by.
 *
 * ACHIEVEMENTS ARE WRITTEN AS WELL AS PHOTOGRAPHED. "Achievement" has been a
 * third kind of item since 2026-10-06, and nothing on this screen said so: it
 * could only be reached by pressing "Add news" and changing the first answer,
 * and once published it was counted under News and shown under nothing. Its
 * box lists them and adds one.
 *
 * STYLES ARE INLINE, NOT TAILWIND. The admin panel is Payload's own SCSS build
 * and does not load the site's stylesheet — the first version used Tailwind
 * classes and rendered as a column of bare underlined links. The `--theme-*`
 * custom properties below are Payload's, so this follows the panel into dark
 * mode without a second palette.
 *
 * A Server Component, like the dashboard it replaces: the server props carrying
 * `payload` and `user` are not forwarded to client components.
 */

interface HodDashboardProps {
  payload: Payload
  user?: TypedUser | null
  /** Their department, already resolved by the caller. */
  unitName: string | null
}

const card: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '1rem',
  padding: '1.5rem',
  borderRadius: '0.75rem',
  border: '1px solid var(--theme-elevation-150)',
  background: 'var(--theme-elevation-0)',
  textDecoration: 'none',
  color: 'inherit',
  height: '100%',
}

const cardTitle: CSSProperties = {
  display: 'block',
  fontSize: '1.15rem',
  fontWeight: 600,
  marginBottom: '0.35rem',
  color: 'var(--theme-text)',
}

const cardBody: CSSProperties = {
  display: 'block',
  color: 'var(--theme-elevation-600)',
  lineHeight: 1.5,
}

const sectionLabel: CSSProperties = {
  marginTop: '2.5rem',
  marginBottom: '1rem',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--theme-elevation-600)',
}

const quickLink: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: 'var(--theme-text)',
}

/** The "Add" link under a box, which is the thing they came to do. */
const addLink: CSSProperties = {
  display: 'inline-block',
  marginTop: '0.75rem',
  fontWeight: 600,
  color: 'var(--theme-success-600, #1f7a4d)',
  textDecoration: 'none',
}

const grid: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(17rem, 1fr))',
}

const countLine = (n: number, one: string, many: string) =>
  n === 1 ? `1 ${one}` : `${n} ${many}`

export const HodDashboard = async ({ payload, user, unitName }: HodDashboardProps) => {
  /** Counts scoped by the user's own access, so they only ever see their own. */
  const count = async (collection: 'posts' | 'announcements' | 'media', where?: Where) => {
    try {
      const result = await payload.count({
        collection,
        ...(where ? { where } : {}),
        overrideAccess: false,
        user: user ?? undefined,
      })
      return result.totalDocs
    } catch {
      return 0
    }
  }

  /*
   * The photographs the library lists for this person — `baseFilter` on the
   * Media collection, restated, because a count does not pass through it.
   */
  const ownUnits = unitIdsOf(user as AccessUser | null | undefined)
  const inMyLibrary = (where: Where): Where =>
    ownUnits.length === 0 || !user
      ? where
      : {
          and: [
            where,
            {
              or: [
                { unit: { in: ownUnits } },
                { unit: { exists: false } },
                { uploadedBy: { equals: user.id } },
              ],
            },
          ],
        }

  const [news, events, written, sports, achievements, photos, announcements] = await Promise.all([
    count('posts', { kind: { equals: 'news' } }),
    count('posts', { kind: { equals: 'event' } }),
    count('posts', { kind: { equals: 'achievement' } }),
    count('media', inMyLibrary({ category: { equals: 'Sports' } })),
    count('media', inMyLibrary({ category: { equals: 'Achievements' } })),
    count('media', inMyLibrary({ showInGallery: { equals: true } })),
    count('announcements'),
  ])

  /*
   * The department leads, not the person. A seeded account is called "SIWS
   * Primary School — Head of Department", and greeting its first word produced
   * "Hello, SIWS". Naming the department is both more useful and impossible to
   * get wrong, however the account was named.
   */
  const heading = unitName ?? 'Your department'

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '62rem' }}>
      <h1 style={{ margin: 0 }}>{heading}</h1>
      <p style={{ marginTop: '0.5rem', color: 'var(--theme-elevation-600)', fontSize: '1.05rem' }}>
        The four parts of your school&rsquo;s website you can add to. Anything you publish here
        appears on those pages.
      </p>

      <h2 style={sectionLabel}>Your sections</h2>

      <div style={grid}>
        {/*
          UPDATES holds News and Events, as the website's menu does. Both are
          written the same way and land in the same list in the panel; the
          first question on the form is which of the two it is.
        */}
        <div style={card}>
          <Newspaper size={28} strokeWidth={1.7} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>
            <span style={cardTitle}>Updates</span>
            <span style={cardBody}>Write up what has happened, or what is coming.</span>
            <span style={{ display: 'block', marginTop: '0.75rem' }}>
              <Link href="/admin/collections/posts?where[kind][equals]=news" style={quickLink}>
                News — {countLine(news, 'item', 'items')}
              </Link>
              <br />
              <Link href="/admin/collections/posts?where[kind][equals]=event" style={quickLink}>
                Events — {countLine(events, 'item', 'items')}
              </Link>
            </span>
            <Link href="/admin/collections/posts/create" style={addLink}>
              + Add news
            </Link>
            <br />
            <Link href="/admin/collections/posts/create?kind=event" style={addLink}>
              + Add an event
            </Link>
          </span>
        </div>

        <div style={card}>
          <Trophy size={28} strokeWidth={1.7} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>
            <span style={cardTitle}>Sports</span>
            <span style={cardBody}>Photographs for your Sports page.</span>
            <span style={{ display: 'block', marginTop: '0.75rem' }}>
              <Link href="/admin/collections/media?where[category][equals]=Sports" style={quickLink}>
                Filed under Sports — {countLine(sports, 'photograph', 'photographs')}
              </Link>
            </span>
            <Link href="/admin/collections/media/create?section=Sports" style={addLink}>
              + Add a Sports photograph
            </Link>
          </span>
        </div>

        <div style={card}>
          <Medal size={28} strokeWidth={1.7} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>
            <span style={cardTitle}>Achievements</span>
            <span style={cardBody}>Prizes, trophies and certificates.</span>
            <span style={{ display: 'block', marginTop: '0.75rem' }}>
              <Link
                href="/admin/collections/posts?where[kind][equals]=achievement"
                style={quickLink}
              >
                Written up — {countLine(written, 'item', 'items')}
              </Link>
              <br />
              <Link
                href="/admin/collections/media?where[category][equals]=Achievements"
                style={quickLink}
              >
                Filed under Achievements — {countLine(achievements, 'photograph', 'photographs')}
              </Link>
            </span>
            <Link href="/admin/collections/posts/create?kind=achievement" style={addLink}>
              + Add an achievement
            </Link>
            <br />
            <Link href="/admin/collections/media/create?section=Achievements" style={addLink}>
              + Add an Achievements photograph
            </Link>
          </span>
        </div>

        <div style={card}>
          <Images size={28} strokeWidth={1.7} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>
            <span style={cardTitle}>Campus Gallery</span>
            <span style={cardBody}>
              Every photograph on your gallery page, whichever section it is filed under.
            </span>
            <span style={{ display: 'block', marginTop: '0.75rem' }}>
              <Link href="/admin/collections/media?where[showInGallery][equals]=true" style={quickLink}>
                In the gallery — {countLine(photos, 'photograph', 'photographs')}
              </Link>
            </span>
            <Link href="/admin/collections/media/create" style={addLink}>
              + Add photographs
            </Link>
          </span>
        </div>
      </div>

      <h2 style={sectionLabel}>Also</h2>

      <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
        <Link href="/admin/collections/announcements" style={quickLink}>
          <Megaphone size={17} aria-hidden="true" />
          Ticker — {countLine(announcements, 'line', 'lines')}
        </Link>
        <Link href="/admin/collections/announcements/create" style={quickLink}>
          <Megaphone size={17} aria-hidden="true" />
          Put one line on the ticker
        </Link>
      </div>

      <p
        style={{
          marginTop: '2.5rem',
          padding: '1.1rem 1.35rem',
          borderRadius: '0.75rem',
          background: 'var(--theme-elevation-50)',
          color: 'var(--theme-elevation-600)',
          lineHeight: 1.6,
        }}
      >
        Nothing goes on the website until you press <strong>Publish</strong>. Until then only you
        and the office can see it, so it is safe to save half-finished work and come back to it.
      </p>
    </div>
  )
}
