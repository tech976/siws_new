'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { QuickLinks, type QuickLink } from './QuickLinks'
import { useEffect, useRef, useState } from 'react'

export interface NavItem {
  label: string
  href: string
  /** Drop-down entries. One level only — see `navParent` on the Pages collection. */
  children?: { label: string; href: string }[]
}

/**
 * Drop-downs that do NOT get an "… overview" row linking their own page.
 *
 * About on the four unit sites, at SIWS's request (2026-08-29): under a menu
 * already headed "About", a first row reading "About overview" is the same
 * word twice, and it is the row a reader has to skip past to reach the pages
 * they came for.
 *
 * Dropping it does not strand the page, which is the only reason the row
 * exists. `/<unit>/about` is linked from the footer's "This school" column on
 * every page of the site, and the mobile drawer renders the parent as a link
 * beside its expander rather than as a button — so the desktop drop-down was
 * the only place that needed the extra row, and now only for the menus that
 * still carry it.
 *
 * Matched on the href rather than the label, so renaming the menu entry cannot
 * quietly switch it back on. The one-segment portal About (`/about`) does not
 * match, and keeps its row.
 */
const UNIT_ABOUT = /^\/[^/]+\/about$/

const showsOverviewRow = (href: string) => !UNIT_ABOUT.test(href)

interface PrimaryNavProps {
  items: NavItem[]
  /** Most-requested destinations, shown at the right of the header. */
  quickLinks?: QuickLink[]
  cta?: { label: string; href: string } | null
}

/**
 * The primary menu and the header's right-hand cluster.
 *
 * The menu, the call-to-action and the mobile toggle live in one component
 * because they share a single row of flex ordering — splitting them left the
 * CTA and the hamburger each claiming the free space, which pushed them apart
 * at tablet widths.
 *
 * This is the only client component in the header; the rest of the shell
 * renders on the server.
 */
export const PrimaryNav = ({ items, quickLinks = [], cta }: PrimaryNavProps) => {
  const [open, setOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const pathname = usePathname()
  const panelRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // A route change must close the panel, or it stays open over the new page.
  useEffect(() => {
    setOpen(false)
    setOpenMenu(null)
    setExpanded(null)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      // Focus returns to the control that opened the panel; without this the
      // keyboard user is silently dropped at the top of the document.
      toggleRef.current?.focus()
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  useEffect(() => {
    if (!openMenu) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenMenu(null)
      navRef.current
        ?.querySelector<HTMLButtonElement>(`[data-menu="${CSS.escape(openMenu)}"]`)
        ?.focus()
    }
    // Clicking or tabbing outside the menu closes it.
    const onAway = (event: Event) => {
      if (navRef.current?.contains(event.target as Node)) return
      setOpenMenu(null)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onAway)
    document.addEventListener('focusin', onAway)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onAway)
      document.removeEventListener('focusin', onAway)
    }
  }, [openMenu])

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const linkClass = (extra: string) =>
    `font-medium text-brand transition-colors hover:text-brand-deep aria-[current=page]:underline aria-[current=page]:decoration-accent-deep aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8 ${extra}`

  /*
   * ONE breakpoint for the whole menu/hamburger switch, and 1200px is it.
   *
   * The menu used to appear at `lg` (1024px) while the hamburger only hid at
   * 1400px, so for 376px of viewport BOTH were on screen: the full horizontal
   * menu and a toggle for the menu it duplicated. That is 56px of redundant
   * control, and it is what pushed the enquiry button onto a second line on
   * every laptop.
   *
   * 1200 rather than 1024 because that is the width the row actually needs.
   * `.siws-container` caps at 1160px, and a seven-item menu plus the two
   * buttons measures 1142 — so the menu fits from 1200px up and genuinely
   * does not below it, where the hamburger takes over.
   */
  return (
    <>
      {items.length > 0 ? (
        <nav ref={navRef} aria-label="Main" className="hidden items-center gap-0.5 min-[1200px]:flex">
          {items.map((item) => {
            const hasChildren = (item.children?.length ?? 0) > 0

            if (!hasChildren) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                  className={linkClass('rounded px-2 py-2 whitespace-nowrap')}
                >
                  {item.label}
                </Link>
              )
            }

            const isOpen = openMenu === item.href
            const branchCurrent =
              isCurrent(item.href) || (item.children ?? []).some((c) => isCurrent(c.href))

            return (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => {
                  if (closeTimer.current) clearTimeout(closeTimer.current)
                  setOpenMenu(item.href)
                }}
                /* A short grace period: the pointer has to cross a few pixels
                   of gap to reach the panel, and closing on mouseleave alone
                   makes the menu impossible to enter. */
                onMouseLeave={() => {
                  if (closeTimer.current) clearTimeout(closeTimer.current)
                  closeTimer.current = setTimeout(() => setOpenMenu(null), 180)
                }}
              >
                {/*
                  A button, not a link. A control that both navigates and
                  expands has no unambiguous keyboard behaviour — Enter cannot
                  mean "follow" and "open" at once — so the parent owns the
                  expansion and its own page is the first entry in the panel.
                */}
                <button
                  type="button"
                  data-menu={item.href}
                  aria-expanded={isOpen}
                  aria-controls={`menu-${item.href}`}
                  onClick={() => setOpenMenu(isOpen ? null : item.href)}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowDown') return
                    event.preventDefault()
                    setOpenMenu(item.href)
                    requestAnimationFrame(() => {
                      document
                        .querySelector<HTMLAnchorElement>(`#${CSS.escape(`menu-${item.href}`)} a`)
                        ?.focus()
                    })
                  }}
                  className={`flex items-center gap-1 rounded px-2 py-2 font-medium whitespace-nowrap text-brand transition-colors hover:text-brand-deep ${
                    branchCurrent
                      ? 'underline decoration-accent-deep decoration-2 underline-offset-8'
                      : ''
                  }`}
                >
                  {item.label}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className={`size-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 7.5 10 12.5 15 7.5" />
                  </svg>
                </button>

                {isOpen ? (
                  <div
                    id={`menu-${item.href}`}
                    className="absolute left-0 top-full z-50 min-w-68 rounded-b-xl border-t-4 border-accent bg-white py-2 shadow-raised"
                  >
                    <ul>
                      {/*
                        The first row links the parent page itself, because the
                        trigger above it is a button and the page would
                        otherwise have no way in from this menu at all.
                      */}
                      {showsOverviewRow(item.href) ? (
                        <li>
                          <Link
                            href={item.href}
                            aria-current={isCurrent(item.href) ? 'page' : undefined}
                            className="block border-b border-line px-4 py-2.5 font-semibold text-brand transition-colors hover:bg-brand-tint"
                          >
                            {item.label} overview
                          </Link>
                        </li>
                      ) : null}
                      {item.children?.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            aria-current={isCurrent(child.href) ? 'page' : undefined}
                            className="block px-4 py-2.5 text-ink-soft transition-colors hover:bg-brand-tint hover:text-brand aria-[current=page]:font-semibold aria-[current=page]:text-brand"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>
      ) : null}

      {/*
        `shrink-0` on this cluster is what pushed the header past the viewport
        below 1400px: the enquiry button alone is 233px and could not give any
        of it back, so the row simply grew and the whole page scrolled
        sideways. It may shrink now, and the CTA truncates rather than forcing
        the overflow.
      */}
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <QuickLinks links={quickLinks} />

        {cta ? (
          <Link href={cta.href} // No max-width or truncation: the row above wraps instead, so the label
          // never has to be cut. `whitespace-nowrap` keeps it on one line.
          className="btn-primary hidden whitespace-nowrap text-sm sm:inline-flex">
            {cta.label}
          </Link>
        ) : null}

        {items.length > 0 ? (
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="grid size-11 place-items-center rounded-lg border border-brand min-[1200px]:hidden"
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <span aria-hidden="true" className="relative block h-4 w-5">
              <span
                className={`absolute left-0 block h-0.5 w-5 bg-brand transition-transform duration-200 ${
                  open ? 'top-1/2 rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 bg-brand transition-opacity duration-200 ${
                  open ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute left-0 block h-0.5 w-5 bg-brand transition-transform duration-200 ${
                  open ? 'top-1/2 -rotate-45' : 'bottom-0'
                }`}
              />
            </span>
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id="mobile-menu"
          ref={panelRef}
          className="absolute inset-x-0 top-full z-50 max-h-[75vh] overflow-y-auto border-t border-line bg-white shadow-raised min-[1200px]:hidden"
        >
          <nav aria-label="Main" className="siws-container flex flex-col py-2">
            {items.map((item) => {
              const hasChildren = (item.children?.length ?? 0) > 0

              if (!hasChildren) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isCurrent(item.href) ? 'page' : undefined}
                    className={linkClass('block border-b border-line py-3.5 last:border-b-0')}
                  >
                    {item.label}
                  </Link>
                )
              }

              const isExpanded = expanded === item.href

              /*
               * On a phone the parent link and its expander are separate
               * targets. There is no hover to tell them apart, and burying the
               * parent page one tap down would cost a click the two-click rule
               * does not have to spare.
               */
              return (
                <div key={item.href} className="border-b border-line last:border-b-0">
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      aria-current={isCurrent(item.href) ? 'page' : undefined}
                      className={linkClass('flex-1 py-3.5')}
                    >
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : item.href)}
                      aria-expanded={isExpanded}
                      aria-controls={`m-${item.href}`}
                      className="grid size-11 shrink-0 place-items-center rounded text-brand"
                    >
                      <span className="sr-only">
                        {isExpanded ? `Hide pages in ${item.label}` : `Show pages in ${item.label}`}
                      </span>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        className={`size-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 7.5 10 12.5 15 7.5" />
                      </svg>
                    </button>
                  </div>

                  {isExpanded ? (
                    <ul id={`m-${item.href}`} className="pb-2 pl-4">
                      {item.children?.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            aria-current={isCurrent(child.href) ? 'page' : undefined}
                            className="block py-2.5 text-ink-soft transition-colors hover:text-brand aria-[current=page]:font-semibold aria-[current=page]:text-brand"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )
            })}

            {/* The CTA is hidden on the narrowest screens, so it is repeated
                here rather than being unreachable on a phone. */}
            {cta ? (
              <Link href={cta.href} className="btn-primary my-4 sm:hidden">
                {cta.label}
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </>
  )
}
