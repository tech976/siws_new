import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import Link from 'next/link'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { getInstitutionPage, getNavItems, getQuickLinks, getUnits } from '@/lib/site'
import { organisationSchema, serialise } from '@/lib/structured-data'

/**
 * Regenerate at most once a minute.
 *
 * Without this the portal is prerendered at build time and its content is
 * frozen until the next deploy — a content manager's change would never appear.
 * Sixty seconds also matches the ceiling FR-EMG-12 sets for a notice to reach
 * cached pages.
 */
export const revalidate = 60

const TAGLINE = 'From KG to PG — Inspiring Excellence Since 1934'

/**
 * SRS 4.1 — the main SIWS portal.
 *
 * The page body comes from an ordinary institution-wide CMS page (slug `home`,
 * no unit), so SIWS staff edit the front page exactly as they edit any other.
 * It was previously hard-coded in this file, which meant the one page most
 * likely to need updating was the only one nobody could change.
 *
 * The fallback below renders only when that page has not been published yet.
 */
const PortalHome = async () => {
  const { isEnabled: draft } = await draftMode()

  const [units, navItems, quickLinks, page] = await Promise.all([
    getUnits(),
    getNavItems(null, null),
    getQuickLinks(null, null),
    getInstitutionPage('home', draft),
  ])

  const footerUnits = units.map(({ id, slug, shortName }) => ({ id, slug, shortName }))

  return (
    <>
      {/* BR-SEO-03 — the institution itself, for the portal's own page. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialise(organisationSchema(null)) }}
      />

      <SiteHeader units={units} navItems={navItems} quickLinks={quickLinks} infoText={TAGLINE} />

      <main id="main-content">
        {page ? (
          <RenderBlocks blocks={page.layout} units={units} />
        ) : (
          <FallbackIntro unitCount={units.length} />
        )}
      </main>

      <SiteFooter quickLinks={navItems} units={footerUnits} />
    </>
  )
}

/**
 * Shown only before the portal's own page exists — on a fresh install, or if it
 * were ever unpublished. Deliberately minimal: anything richer here would be a
 * second copy of the front page that nobody maintains.
 */
const FallbackIntro = ({ unitCount }: { unitCount: number }) => (
  <section className="siws-container py-20">
    <h1>
      South Indians&rsquo; Welfare Society <span className="heading-accent">(SIWS)</span>
    </h1>
    <p className="mt-5 max-w-2xl text-lg text-ink-muted">{TAGLINE}</p>

    {unitCount === 0 ? (
      <p className="mt-8 text-ink-muted">
        No schools have been published yet. Add them under{' '}
        <strong>Configuration → Schools</strong> in the admin panel.
      </p>
    ) : (
      <p className="mt-8">
        <Link href="/kindergarten" className="btn-primary">
          Visit SIWS Kindergarten
        </Link>
      </p>
    )}
  </section>
)

export const generateMetadata = async (): Promise<Metadata> => {
  const page = await getInstitutionPage('home')

  return {
    title: page?.metaTitle || "South Indians' Welfare Society (SIWS)",
    description:
      page?.metaDescription ||
      page?.intro ||
      'SIWS has served Mumbai since 1934, offering a complete educational journey from Kindergarten to Postgraduate studies.',
    alternates: { canonical: '/' },
  }
}

export default PortalHome
