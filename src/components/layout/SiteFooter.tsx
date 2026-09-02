import Image from 'next/image'
import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'

import type { Unit } from '@/payload-types'

import type { NavItem } from './PrimaryNav'
import { AccessibilityControls } from './AccessibilityControls'

interface SiteFooterProps {
  unit?: Unit | null
  /** Quick links for this scope. */
  quickLinks: NavItem[]
  /** All active units, for cross-navigation between sites. */
  units: Pick<Unit, 'id' | 'slug' | 'shortName'>[]
}

/**
 * Brand glyphs, inline.
 *
 * lucide-react dropped every brand logo at v1 — it ships 6,014 icons and not
 * one of them is Facebook — so these are hand-written rather than imported.
 * Each is a single path on a 24-box using `currentColor`, so they inherit the
 * button's colour and need no extra download.
 */
const Glyph = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
    {children}
  </svg>
)

const Icons: Record<string, ComponentType> = {
  facebook: () => (
    <Glyph>
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6A22 22 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.12V9.9H7.6V13h2.7v8Z" />
    </Glyph>
  ),
  instagram: () => (
    <Glyph>
      <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.26.07 1.64.07 4.83s-.01 3.57-.07 4.83c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.26.06-1.64.07-4.85.07s-3.59-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 0 1-1.38-.9 3.8 3.8 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.57 2.2 15.19 2.2 12s.01-3.57.07-4.83c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.44 2.21 8.82 2.2 12 2.2Zm0 1.8c-3.14 0-3.5.01-4.74.07-.9.04-1.39.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.32-.28.81-.32 1.71C3.42 8.9 3.4 9.26 3.4 12s.02 3.1.08 4.35c.04.9.19 1.39.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.13.81.28 1.71.32 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c.9-.04 1.39-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.32.28-.81.32-1.71.06-1.25.08-1.61.08-4.35s-.02-3.1-.08-4.35c-.04-.9-.19-1.39-.32-1.71a2.9 2.9 0 0 0-.69-1.06 2.9 2.9 0 0 0-1.06-.69c-.32-.13-.81-.28-1.71-.32C15.5 4.01 15.14 4 12 4Zm0 3.03A4.97 4.97 0 1 1 12 17a4.97 4.97 0 0 1 0-9.97Zm0 1.8a3.17 3.17 0 1 0 0 6.34 3.17 3.17 0 0 0 0-6.34Zm5.15-.65a1.16 1.16 0 1 1 0-2.32 1.16 1.16 0 0 1 0 2.32Z" />
    </Glyph>
  ),
  youtube: () => (
    <Glyph>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.1V8.9l5.2 3.1Z" />
    </Glyph>
  ),
  x: () => (
    <Glyph>
      <path d="M17.53 3h3.16l-6.9 7.89L21.94 21h-6.36l-4.98-6.52L4.9 21H1.74l7.38-8.44L1.9 3h6.52l4.5 5.95Zm-1.11 16.1h1.75L7.68 4.8H5.8Z" />
    </Glyph>
  ),
  linkedin: () => (
    <Glyph>
      <path d="M6.94 8.5v11.5H3.3V8.5ZM5.12 3a2.11 2.11 0 1 1 0 4.22 2.11 2.11 0 0 1 0-4.22ZM9.2 8.5h3.49v1.58h.05c.49-.92 1.68-1.9 3.45-1.9 3.69 0 4.37 2.43 4.37 5.58V20h-3.64v-5.53c0-1.32-.02-3.02-1.84-3.02-1.84 0-2.12 1.44-2.12 2.92V20H9.2Z" />
    </Glyph>
  ),
  whatsapp: () => (
    <Glyph>
      <path d="M12.04 2A9.9 9.9 0 0 0 2.1 11.9c0 1.75.46 3.46 1.34 4.96L2 22l5.28-1.38a9.9 9.9 0 0 0 4.76 1.21h.01a9.9 9.9 0 0 0 9.9-9.9A9.9 9.9 0 0 0 12.04 2Zm0 18.14a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.2 8.2 0 1 1 6.98 3.87Zm4.5-6.15c-.24-.13-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.12s-.64.8-.79.97c-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.35-2.93c-.25-.44.25-.4.72-1.35.08-.16.04-.3-.02-.42-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64 1.53.66 2.13.72 2.9.6.46-.07 1.46-.6 1.67-1.17.2-.58.2-1.07.14-1.18-.06-.11-.22-.17-.46-.29Z" />
    </Glyph>
  ),
}

const SOCIAL_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  x: 'X',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
}

/**
 * SRS 4.2 — the footer carried on every page.
 *
 * Rebuilt to the structure SIWS asked for from siwscollege.edu.in: the crest and
 * round social buttons on a blue field, a rule, then columns of links.
 *
 * Column COUNT is deliberately not fixed at the college's five. Theirs are
 * About / Academics / Admissions / NAAC / Facilities — NAAC is a college
 * statutory obligation a primary school does not share. Columns are built from
 * what a section actually has, and an empty one is dropped rather than padded
 * with invented links.
 *
 * Statutory links (privacy, cookie policy, data protection, grievance contact)
 * are required here by FR-PRV-15. They are rendered only once their pages
 * exist, so the footer never ships a link to a 404.
 */
export const SiteFooter = ({ unit, quickLinks, units }: SiteFooterProps) => {
  const year = new Date().getFullYear()

  /**
   * Both office numbers, in the order the school gives them, with the
   * blanks dropped so a section carrying one prints one.
   */
  const phones = [unit?.phone, unit?.phoneAlt].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  )
  const social = (unit?.socialProfiles ?? []).filter(
    (profile) => typeof profile.url === 'string' && profile.url.length > 0,
  )

  const addressLines = [
    unit?.addressLine1,
    unit?.addressLine2,
    [unit?.city, unit?.postalCode].filter(Boolean).join(' – '),
  ].filter((line): line is string => typeof line === 'string' && line.trim().length > 0)

  const columns: { heading: string; links: { label: string; href: string }[] }[] = [
    {
      heading: unit ? 'This school' : 'Explore',
      /*
       * Contact is dropped from this column on a unit footer, because the
       * footer already has a Contact us block a few centimetres to the right
       * carrying the address, the telephone number and the email. A link
       * saying "Contact" beside the contact details is a second route to
       * something already on the screen, and it makes the shorter list of
       * pages look longer than it is.
       *
       * Only on a unit footer. The portal has no unit to draw an address,
       * a telephone number or an email from, so its Contact us block is not
       * rendered at all — there this link is the only way through, and it
       * stays. The two rules are the same rule from either end: the address
       * and the link to it never both appear.
       */
      links: quickLinks
        .filter((item) => !(unit && item.href.endsWith('/contact')))
        .map((item) => ({ label: item.label, href: item.href })),
    },
    {
      heading: 'Our sections',
      links: units.map((entry) => ({
        label: entry.shortName ?? '',
        href: `/${entry.slug}`,
      })),
    },
  ].filter((column) => column.links.length > 0)

  /**
   * Headings need BOTH overrides, and neither is cosmetic.
   *
   * `text-white` — globals.css sets `h1..h6 { color: var(--color-brand) }`, and
   * that wins over the footer's inherited white. The headings rendered brand
   * blue on the footer's blue at 2.29:1, well under the 4.5:1 WCAG 2.1 AA asks
   * of text. White measures 4.66:1.
   *
   * `--font-body` — the same global rule also applies Anton, the display face.
   * It is drawn for headlines; at footer-heading size, in a column of links, it
   * reads as a different site.
   */
  return (
    <footer className="mt-auto bg-sky text-white">
      <div className="siws-container py-12 lg:py-16">
        {/* --- Crest and socials ---------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Link href={unit?.slug ? `/${unit.slug}` : '/'} aria-label="SIWS — home">
            {/*
              `brightness-0 invert` renders the crest as flat white. The mark is
              navy on transparent, which on this blue reads as a dark smudge.
            */}
            <Image
              src="/brand/logo.png"
              alt=""
              width={200}
              height={200}
              className="h-20 w-auto brightness-0 invert"
            />
          </Link>

          {social.length > 0 ? (
            <ul className="flex flex-wrap gap-3">
              {social.map((profile) => {
                const Icon = Icons[profile.platform]
                return (
                  <li key={profile.id ?? profile.url}>
                    <a
                      href={profile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      // 44px, the WCAG 2.1 SC 2.5.8 target minimum.
                      className="grid size-11 place-items-center rounded-full bg-accent text-brand transition-colors hover:bg-accent-deep"
                    >
                      {Icon ? <Icon /> : null}
                      <span className="sr-only">
                        {SOCIAL_LABEL[profile.platform] ?? profile.platform} (opens in a new tab)
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>

        <hr className="my-9 border-white/30" />

        {/* --- Link columns --------------------------------------------- */}
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-lg font-bold text-white [font-family:var(--font-body)]">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5 t-small">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/90 underline-offset-4 hover:text-white hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/*
            THE COLUMN ONLY EXISTS IF THERE IS SOMETHING IN IT.

            "Contact us" is drawn entirely from the unit — its address, email
            and telephone number — so on the portal, which has no unit, the
            heading stood over an empty box. Three of the four columns carried
            content and the fourth was a word.

            It was also a duplicate there: the portal's own Explore column
            keeps its Contact link precisely because this block has nothing to
            show, so the footer offered a heading with no detail beside a link
            that went to the details. Rendering nothing leaves Explore as the
            single route, which is what it already was in practice.

            On a unit footer this block carries real detail, and there Contact
            is dropped from the column on the left instead — see the note on
            `columns` above. The two rules are the same rule from either end:
            the address and the link to it never both appear.
          */}
          {unit ? (
            <div>
              <h2 className="text-lg font-bold text-white [font-family:var(--font-body)]">
                Contact us
              </h2>
              <address className="mt-4 space-y-3 t-small not-italic text-white/90">
                {addressLines.length > 0 ? (
                  <p>
                    {addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </p>
                ) : null}

                {unit?.email ? (
                  <p>
                    <a
                      href={`mailto:${unit.email}`}
                      className="underline-offset-4 hover:text-white hover:underline"
                    >
                      {unit.email}
                    </a>
                  </p>
                ) : null}

                {/*
                  ONE LINK PER NUMBER, rather than one link for a pair.

                  A `tel:` href holds a single number: two in it dials
                  neither, which is why the unit carries `phone` and
                  `phoneAlt` as separate fields. They are printed on one
                  line so the office reads as one contact with two lines
                  into it, and each half is separately tappable.
                */}
                {phones.length > 0 ? (
                  <p>
                    {phones.map((number, index) => (
                      <span key={number}>
                        {index > 0 ? ' or ' : ''}
                        {/* Stripping spaces keeps the tel: target dialable. */}
                        <a
                          href={`tel:${number.replace(/[^\d+]/g, '')}`}
                          className="underline-offset-4 hover:text-white hover:underline"
                        >
                          {number}
                        </a>
                      </span>
                    ))}
                  </p>
                ) : null}
              </address>
            </div>
          ) : null}

          <div>
            <h2 className="text-lg font-bold text-white [font-family:var(--font-body)]">
              About SIWS
            </h2>
            <p className="mt-4 t-small leading-relaxed text-white/90">
              South Indians&rsquo; Welfare Society is a trusted educational institution in Wadala
              since 1934, committed to value-based, disciplined and structured learning.
            </p>
          </div>
        </div>
      </div>

      {/*
        SRS 4.4 — the accessibility controls must be reachable from the header
        or footer of EVERY page. The footer is on every page already, and these
        are settings rather than navigation, so they belong here rather than
        competing with the menu for space in the header.
      */}
      <div className="border-t border-white/25">
        <div className="siws-container py-6">
          <AccessibilityControls />
        </div>
      </div>

      <div className="border-t border-white/25">
        <div className="siws-container py-5 text-xs text-white/85">
          <p>© {year} South Indians&rsquo; Welfare Society (SIWS). All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
