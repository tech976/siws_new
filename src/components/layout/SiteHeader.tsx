import Image from 'next/image'
import Link from 'next/link'

import type { Unit } from '@/payload-types'

import { PrimaryNav, type NavItem } from './PrimaryNav'
import type { QuickLink } from './QuickLinks'
import { SectionSwitcher } from './SectionSwitcher'

interface SiteHeaderProps {
  /** The unit whose site is being viewed, or null on the main portal. */
  unit?: Unit | null
  /** Every section, for the switcher along the top. */
  units?: Unit[]
  navItems: NavItem[]
  /** SRS 5.24 — most-requested destinations, right of the header. */
  quickLinks?: QuickLink[]
  /** The sea strip beneath the bar. */
  infoText?: string | null
  cta?: { label: string; href: string } | null
}

/**
 * The site header, in three bands — the structure SIWS asked for after seeing
 * siwscollege.edu.in:
 *
 *   1. SECTIONS      every SIWS section, on the blue bar. Always the same.
 *   2. IDENTITY      crest, wordmark, and the name of the section you are in.
 *   3. NAVIGATION    that section's own menu — About, Academics, Admissions…
 *
 * The split is what makes the group legible. Band 1 answers "which school is
 * this, and what else is there?"; band 3 answers "what is on this school's
 * site?". Collapsing them into one menu, as the previous header did, made a
 * five-school institution look like one site with a long menu.
 *
 * Only band 3 is interactive on the client; 1 and 2 render on the server.
 */
export const SiteHeader = ({ unit, units = [], navItems, quickLinks = [], infoText, cta }: SiteHeaderProps) => {
  const home = unit?.slug ? `/${unit.slug}` : '/'
  const title = unit?.name ?? "South Indians' Welfare Society"

  /**
   * The line under the name. `tagline` is the section's own — "Maharashtra
   * State Board | Grades 1 to 4" — and the portal falls back to the institution
   * line. Nothing is invented: the college's "NAAC Re-Accredited A Grade with
   * 3.15 CGPA" belongs to the college and is not repeated over a school.
   */
  const tagline = unit?.tagline ?? 'From KG to PG — Inspiring Excellence Since 1934'

  const place = [unit?.addressLine2, unit?.city, unit?.postalCode].filter(Boolean).join(', ')

  return (
    <>
      {/*
       * The section bar is pinned, and sits OUTSIDE <header> to make that work.
       *
       * `position: sticky` holds an element only while its containing block is
       * on screen. Nested inside <header>, the bar would unstick the moment the
       * identity band scrolled past — about 200px in. As a direct child of the
       * page its containing block is <body>, so it stays for the whole scroll.
       *
       * It keeps its own `<nav aria-label="SIWS sections">`, which is a landmark
       * in its own right, so nothing is lost by taking it out of the banner.
       */}
      <div className="sticky top-0 z-50">
        <SectionSwitcher units={units} currentSlug={unit?.slug ?? null} />
      </div>

    <header className="relative z-40 bg-white">

      {/* --- Band 2: identity ------------------------------------------- */}
      <div className="siws-container flex items-center gap-5 py-5 sm:gap-7">
        <Link href={home} className="shrink-0" aria-label={`${title} — home`}>
          <Image
            src="/brand/logo.png"
            alt=""
            width={220}
            height={220}
            priority
            className="h-16 w-auto sm:h-20 lg:h-24"
          />
        </Link>

        <div className="min-w-0">
          <Link href={home} className="block">
            <span
              className="block text-2xl leading-none tracking-wide text-brand sm:text-3xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              SIWS
            </span>
            <span className="mt-1.5 block text-sm leading-snug font-bold text-brand uppercase sm:text-base">
              {title}
            </span>
          </Link>

          <p className="mt-1 truncate text-sm text-ink-soft">{tagline}</p>

          {place ? (
            <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
              {place}
              {unit?.phone ? ` | ${unit.phone}` : ''}
            </p>
          ) : null}
        </div>
      </div>

      {/* --- Band 3: this section's own navigation ---------------------- */}
      {navItems.length > 0 || cta ? (
        <div className="relative border-y border-line">
          {/*
            WRAPS RATHER THAN SQUASHES. A unit with nine top-level items
            (Primary) left the enquiry button 83px wide, truncated mid-word,
            while a unit with seven (Kindergarten) gave it 224px. The row now
            drops the controls to a second line when the menu is long, so the
            call to action is readable on every section instead of only the
            short ones.
          */}
          <div className="siws-container flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
            <PrimaryNav items={navItems} quickLinks={quickLinks} cta={cta} />
          </div>
        </div>
      ) : null}

      {infoText ? <p className="info-strip">{infoText}</p> : null}
    </header>
    </>
  )
}
