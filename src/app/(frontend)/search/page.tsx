import type { Metadata } from 'next'
import Link from 'next/link'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { getNavItems, getQuickLinks, getUnits } from '@/lib/site'
import { normaliseQuery, runSearch } from '@/lib/search'

/**
 * FR-SR-01 — site-wide search, across the portal and all four unit sites.
 *
 * WHY IT IS A PAGE AND NOT A DROP-DOWN. Results have to be linkable, shareable
 * and reachable with the keyboard alone, and a panel that closes when focus
 * moves is none of those. A search that returns a page also works with
 * JavaScript disabled, which a live-filtering box does not — this is a school
 * site read on whatever device a family owns.
 *
 * The form is a plain GET. `?q=` in the address means a result set can be
 * bookmarked or sent to somebody, and the browser's own history works.
 */

export const metadata: Metadata = {
  title: 'Search',
  description: "Search the South Indians' Welfare Society website.",
  /* A results page is not content; it should not be indexed as if it were. */
  robots: { index: false, follow: true },
}

/* Results depend entirely on the query string, so nothing here is cacheable. */
export const dynamic = 'force-dynamic'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const { q } = await searchParams
  const query = normaliseQuery(q)

  const [units, navItems, quickLinks] = await Promise.all([
    getUnits(),
    getNavItems(null, null),
    getQuickLinks(null, null),
  ])

  const results = query.length >= 2 ? await runSearch(query) : []
  const searched = query.length >= 2

  return (
    <>
      <SiteHeader units={units} navItems={navItems} quickLinks={quickLinks} />

      <main id="main-content">
        <section className="siws-container py-12 sm:py-16">
          <h1 className="t-h1 mb-6 text-brand">Search</h1>

          <form action="/search" method="get" role="search" className="mb-10 max-w-2xl">
            <label htmlFor="q" className="mb-2 block font-semibold text-brand">
              What are you looking for?
            </label>

            <div className="flex flex-wrap gap-3">
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={query}
                autoComplete="off"
                placeholder="Admissions, transport, annual day…"
                className="min-w-0 flex-1 rounded-full border border-line bg-white px-5 py-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              />
              <button
                type="submit"
                className="rounded-full bg-brand px-7 py-3 font-bold text-white transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Search
              </button>
            </div>
          </form>

          {/*
            Announced politely so a screen-reader user hears how many results
            arrived without the message interrupting them mid-sentence.
          */}
          <div aria-live="polite">
            {searched ? (
              <p className="t-small mb-6 text-ink/80">
                {results.length === 0
                  ? `Nothing found for “${query}”.`
                  : `${results.length} ${results.length === 1 ? 'result' : 'results'} for “${query}”.`}
              </p>
            ) : null}
          </div>

          {searched && results.length === 0 ? (
            <div className="max-w-2xl rounded-3xl bg-sea-soft p-6">
              <p className="mb-2 font-semibold text-brand">Try another word</p>
              <p className="t-small text-ink/85">
                Search looks at page titles and their introductions. A shorter, more
                ordinary word usually finds more — “fees” rather than “fee structure
                2026”. If you cannot find what you need,{' '}
                <Link href="/contact" className="font-semibold text-brand underline underline-offset-4">
                  ask the Society office
                </Link>
                .
              </p>
            </div>
          ) : null}

          {results.length > 0 ? (
            <ul className="grid max-w-3xl gap-4">
              {results.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={hit.href}
                    className="block rounded-3xl bg-white p-5 ring-1 ring-line/60 transition hover:ring-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <p className="t-label mb-1 font-bold uppercase tracking-wider text-brand/70">
                      {hit.context}
                    </p>
                    <p className="t-h4 mb-1 font-bold text-brand">{hit.title}</p>
                    {hit.description ? (
                      <p className="t-small line-clamp-2 text-ink/85">{hit.description}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </main>

      <SiteFooter
        units={units.map(({ id, slug, shortName }) => ({ id, slug, shortName }))}
        quickLinks={quickLinks}
      />
    </>
  )
}

export default SearchPage
