import Link from 'next/link'

import { LanguageSelector } from '@/components/translate/LanguageSelector'
import type { Unit } from '@/payload-types'

interface SectionSwitcherProps {
  units: Unit[]
  /** Slug of the section being viewed; null on the main portal. */
  currentSlug?: string | null
}

/**
 * The top bar — every SIWS section, always reachable.
 *
 * Matches the band that runs across the top of siwscollege.edu.in, but carries
 * sections rather than the college's statutory links. It is the one piece of
 * chrome identical on every page of every site: a parent who lands on the
 * Primary site looking for the Secondary one should not have to go back to the
 * portal and start again.
 *
 * A server component. The current section is known from the route, so nothing
 * here needs `usePathname`, and the bar costs no client JavaScript.
 *
 * ORDERING is `unit.order`, the same field the portal's own list uses, so the
 * sequence a visitor learns in one place holds everywhere.
 */
export const SectionSwitcher = ({ units, currentSlug }: SectionSwitcherProps) => {
  const links = [
    { label: 'SIWS', href: '/', slug: null as string | null },
    ...units.map((unit) => ({
      // `shortName` ("Primary School") over `name` ("SIWS Primary School") —
      // the bar is a list of sections within SIWS, so repeating "SIWS" five
      // times adds width without adding meaning.
      label: unit.shortName || unit.name,
      href: `/${unit.slug}`,
      slug: unit.slug as string | null,
    })),
  ]

  return (
    <div className="bg-sky text-white">
      {/*
        Scrolls sideways rather than wrapping on a phone. Five sections will not
        fit on a narrow screen, and a bar that wraps to three lines pushes the
        school's own name below the fold on the page a visitor arrived at.
      */}
      <div className="siws-container flex items-center justify-end gap-1">
        <nav aria-label="SIWS sections" className="flex min-w-0 overflow-x-auto">
          {links.map((link) => {
            const current = link.slug === (currentSlug ?? null)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current ? 'page' : undefined}
                className={[
                  'px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors',
                  'hover:bg-white/15 focus-visible:bg-white/15',
                  // The current section is marked by a filled block, not colour
                  // alone — WCAG 2.1 SC 1.4.1.
                  current ? 'bg-brand text-white' : 'text-white',
                  /*
                    The section names are proper nouns. Google transliterates
                    them into the target script, so "Primary School" became
                    "प्राथमिक स्कूल" and the bar a parent had learnt to
                    navigate changed with the language.
                  */
                  'notranslate',
                ].join(' ')}
                translate="no"
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/*
          The language selector, at SIWS's request. Machine translation rather
          than the Phase 2 multi-language support SRS 1.2 scopes — see
          `LanguageSelector` for what that difference means.

          In this bar rather than the white one below because it belongs with
          the other site-wide chrome: it applies to every page of every section,
          which is exactly what this band is for.
        */}
        <LanguageSelector />
      </div>
    </div>
  )
}
