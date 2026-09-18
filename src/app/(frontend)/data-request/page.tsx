import type { Metadata } from 'next'
import Link from 'next/link'

import { EmergencyNoticeBanner } from '@/components/emergency/EmergencyNoticeBanner'
import { DataRequestForm } from '@/components/forms/DataRequestForm'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { getConsentNotice } from '@/lib/consent-notices-server'
import { createFormToken } from '@/lib/form-guard'
import { getNavItems, getQuickLinks, getUnits } from '@/lib/site'

/**
 * FR-PRV-12 — where a family asks to see, correct or delete what the school
 * holds about them, or withdraws a consent.
 *
 * A route of its own rather than a section on the privacy page. The privacy
 * page's text is the school's to write and rewrite (SRS 2.6); the route by
 * which a person exercises their rights is a function of the platform, and it
 * must not disappear because somebody reorganised that page. It is linked from
 * the footer of every page.
 */

export const metadata: Metadata = {
  title: 'Your data rights',
  description:
    'Ask South Indians’ Welfare Society to show you, correct or delete the personal information it holds about you or your child, or withdraw a consent you gave.',
}

// The form token is signed per render.
export const dynamic = 'force-dynamic'

const DataRequestPage = async () => {
  const [units, navItems, quickLinks] = await Promise.all([
    getUnits(),
    getNavItems(null, null),
    getQuickLinks(null, null),
  ])

  return (
    <>
      <EmergencyNoticeBanner unitId={null} units={units} />

      <SiteHeader units={units} navItems={navItems} quickLinks={quickLinks} />

      <main id="main-content">
        <section className="siws-container grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <h1 className="t-h1 mb-6 text-brand">Your data rights</h1>

            <div className="grid gap-4 text-ink-soft">
              <p>
                Under the Digital Personal Data Protection Act, 2023, you can ask us what personal
                information we hold about you or your child, ask us to correct it, ask us to delete
                it, or withdraw a consent you gave — for example to being contacted about an
                admission enquiry.
              </p>
              <p>
                Your request goes to our Data Protection Officer. Before we show or delete anything,
                we will write to you to confirm the request really comes from you. We record every
                request and every step we take on it.
              </p>
              <p>
                To change your cookie choices you do not need this form: use{' '}
                <strong>Cookie settings</strong> at the foot of any page.
              </p>
              <p>
                <Link href="/privacy" className="font-semibold text-brand underline underline-offset-4">
                  Read our privacy policy
                </Link>
              </p>
            </div>
          </div>

          <div className="siws-card rounded-3xl p-6 sm:p-8">
            <DataRequestForm formToken={createFormToken()} notice={await getConsentNotice('data_request')} />
          </div>
        </section>
      </main>

      <SiteFooter
        units={units.map(({ id, slug, shortName }) => ({ id, slug, shortName }))}
        quickLinks={quickLinks}
      />
    </>
  )
}

export default DataRequestPage
