import { ExternalLink, FileText, Palette, Trophy } from 'lucide-react'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { Payload, TypedUser } from 'payload'

import { mainSiteSectionsOf } from '@/access'
import type { AccessUser } from '@/access'

/**
 * What a sports or fine arts teacher sees when they sign in (SIWS, 2026-11-03).
 *
 * Their account runs the main SIWS website's Sports or Fine Arts pages and
 * nothing else, so the screen is those pages: one box per section, each page
 * listed with a link to edit it, and "Add a page", which is filed under the
 * section for them.
 *
 * A Server Component with inline styles in Payload's theme variables, like
 * `HodDashboard`, for the same reasons given there.
 */

const card: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '1rem',
  padding: '1.5rem',
  borderRadius: '0.75rem',
  border: '1px solid var(--theme-elevation-150)',
  background: 'var(--theme-elevation-0)',
}
const title: CSSProperties = { display: 'block', fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.35rem' }
const muted: CSSProperties = { color: 'var(--theme-elevation-600)', lineHeight: 1.5 }
const list: CSSProperties = { margin: '0.75rem 0 0', paddingLeft: '1.1rem', display: 'grid', gap: '0.35rem' }
const addLink: CSSProperties = {
  display: 'inline-block',
  marginTop: '1rem',
  fontWeight: 600,
  color: 'var(--theme-success-600, #1f7a4d)',
  textDecoration: 'none',
}

export const MainSectionDashboard = async ({
  payload,
  user,
}: {
  payload: Payload
  user?: TypedUser | null
}) => {
  const sections = mainSiteSectionsOf(user as AccessUser | null)

  const boxes = await Promise.all(
    sections.map(async (section) => {
      try {
        const { docs } = await payload.find({
          collection: 'pages',
          where: {
            and: [
              { unit: { exists: false } },
              { or: [{ slug: { in: section.roots } }, { 'navParent.slug': { in: section.roots } }] },
            ],
          },
          draft: true,
          depth: 0,
          limit: 100,
          sort: 'title',
          overrideAccess: false,
          user: user ?? undefined,
        })
        return { section, pages: docs as { id: number; title?: string; slug?: string; _status?: string }[] }
      } catch {
        return { section, pages: [] }
      }
    }),
  )

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '62rem' }}>
      <h1 style={{ margin: 0 }}>{sections.map((s) => s.label).join(' & ')} on the SIWS website</h1>
      <p style={{ ...muted, marginTop: '0.5rem', fontSize: '1.05rem' }}>
        The pages you look after on the main SIWS website. Open one to change its words and pictures,
        then press Publish. Pages you add appear under {sections.map((s) => s.label).join(' or ')}.
      </p>

      <div style={{ display: 'grid', gap: '1rem', marginTop: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))' }}>
        {boxes.map(({ section, pages }) => {
          const Icon = section.home === 'sports' ? Trophy : Palette
          return (
            <div key={section.home} style={card}>
              <Icon size={28} strokeWidth={1.7} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span style={{ minWidth: 0 }}>
                <span style={title}>{section.label}</span>
                <a href={`/${section.home}`} target="_blank" rel="noreferrer" style={{ ...muted, display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
                  See it on the website <ExternalLink size={14} aria-hidden="true" />
                </a>
                {pages.length > 0 ? (
                  <ul style={list}>
                    {pages.map((page) => (
                      <li key={page.id}>
                        <Link href={`/admin/collections/pages/${page.id}`} style={{ color: 'var(--theme-text)' }}>
                          <FileText size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '0.35rem' }} />
                          {page.title || `/${page.slug}`}
                        </Link>
                        {page._status === 'draft' ? <span style={muted}> (draft)</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ ...muted, margin: '0.75rem 0 0' }}>No pages yet.</p>
                )}
                <Link href="/admin/collections/pages/create" style={addLink}>
                  + Add a {section.label} page
                </Link>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
