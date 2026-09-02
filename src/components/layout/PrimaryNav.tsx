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
 * EVERY drop-down gets an "… overview" row linking its own page.
 *
 * The four unit About menus used to be excluded, at SIWS's request
 * (2026-08-29): under a menu already headed "About", a first row reading
 * "About overview" is the same word twice, and it was the row a reader had to
 * skip past to reach the pages they came for.
 *
 * Reversed on 2026-09-01. The objection was sound about the wording and wrong
 * about the consequence: the trigger above the menu is a BUTTON, not a link,
 * so with the row gone `/<unit>/about` had no way in from the header at all.
 * The footer's "This school" column and the mobile drawer still reached it,
 * but a reader on a desktop who clicks the word "About" expecting the About
 * page got a menu offering Gallery and nothing else.
 *
 * If the duplicated word becomes the complaint again, the fix is to make the
 * trigger itself a link rather than to delete the only row that points at the
 * page.
 */

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
  /*
    Which side the open drop-down hangs from. Empty means the default,
    left-aligned under its trigger.

    Needed only because the menu wraps now. On one line every trigger sat well
    left of the container's right edge and a `left-0` panel always fitted; on
    a second row an item can sit hard against that edge, and its 17rem panel
    then ran off the viewport and took the horizontal scrollbar with it.
  */
  const [flipped, setFlipped] = useState(false)
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

  /*
    Decide which edge the panel hangs from, once, as it opens.

    Measured rather than guessed from the item's index: the menu wraps, so
    which trigger ends a row depends on the viewport width and on how long
    that section's labels happen to be. `min-w-68` is 17rem, and if the
    trigger's left edge leaves less than that before the viewport's right
    edge, the panel is anchored right instead.
  */
  useEffect(() => {
    if (!openMenu) return
    const trigger = navRef.current?.querySelector<HTMLElement>(
      `[data-menu="${CSS.escape(openMenu)}"]`,
    )
    if (trigger) {
      const PANEL_WIDTH = 17 * 16
      setFlipped(trigger.getBoundingClientRect().left + PANEL_WIDTH > window.innerWidth - 16)
    }
  }, [openMenu])

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
      {/*
        WRAPS ONTO A SECOND ROW RATHER THAN OVERFLOWING.

        This was `flex` with no wrap, which is fine for the seven-item menus
        and wrong for the long ones. Kindergarten publishes thirteen top-level
        pages — Admissions FAQ, Facilities & Campus, Campus Gallery, Academics,
        Teachers, About, Admissions, Updates, Contact, News & Events,
        Achievements, Student Life, Parent Feedback — and on one line they
        measure well past the 1160px container, so the row grew until the
        header was taller than the content beneath it and the page scrolled
        sideways.

        The menu FLOWS AROUND the enquiry cluster rather than sitting in a
        narrow column beside it. `float` on a sibling spacer is what does it.

        Three approaches, in the order they were tried:

        `basis-full` put the menu on its own full-width line — but that pushed
        Quick links and the enquiry button onto a row of their own well beneath
        the links, and the call to action read as an afterthought. That is the
        arrangement SIWS objected to on 2026-09-02.

        `flex-1` fixed the alignment and cost width: confined to the ~55% left
        of the cluster, thirteen items needed THREE rows and stranded "Parent
        Feedback" alone on the last, with the space under the buttons unusable.

        So the nav spans the full width as a block, and a floated spacer of the
        cluster's exact size reserves its corner. Inline-block items wrap
        around that float: row one stops short at the buttons, row two onward
        runs the full container. Thirteen items fit in two rows again AND the
        cluster stays level with the first line of links.

        The spacer floats rather than the cluster itself because the cluster
        has to stay after the nav in source order — the mobile drawer is its
        sibling and depends on that.
      */}
      {items.length > 0 ? (
        <nav
          ref={navRef}
          aria-label="Main"
          className="hidden gap-x-0.5 gap-y-1 min-[1200px]:block min-[1200px]:basis-full [&>*]:align-middle min-[1200px]:[&>*]:inline-block"
        >
          {/*
            Reserves the top-right corner for Quick links + the enquiry
            button. Width is generous enough for the longest CTA label
            ("Enquire about admission") plus Quick links and their gap;
            height matches the 48px control row so only the first line of
            links is shortened.
          */}
          <div
            aria-hidden="true"
            className="float-right h-12 w-[19.5rem] min-[1200px]:block"
          />
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
                    className={`absolute top-full z-50 min-w-68 rounded-b-xl border-t-4 border-accent bg-white py-2 shadow-raised ${
                      flipped ? 'right-0' : 'left-0'
                    }`}
                  >
                    <ul>
                      {/*
                        The first row links the parent page itself, because the
                        trigger above it is a button and the page would
                        otherwise have no way in from this menu at all.
                      */}
                      <li>
                        <Link
                          href={item.href}
                          aria-current={isCurrent(item.href) ? 'page' : undefined}
                          className="block border-b border-line px-4 py-2.5 font-semibold text-brand transition-colors hover:bg-brand-tint"
                        >
                          {item.label} overview
                        </Link>
                      </li>
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
        THE CLUSTER HOLDS THE FIRST LINE, at its natural width.

        `self-start` is what puts it level with row one of the menu. Without
        it a two-row menu stretches this band and `items-center` floats the
        cluster against the middle of both rows, which is what made the
        enquiry button look like it was sitting too far down.

        `shrink-0` is back, and it is safe now in a way it was not before.
        The note that used to be here was right that an unshrinkable 233px
        button pushed the header past the viewport below 1400px — but that was
        when the menu could not wrap and the two fought over one line. The nav
        beside it is now `flex-1 min-w-0`, so it yields the width instead and
        wraps its own items. That makes the cluster the fixed element and the
        menu the flexible one, which is the right way round: the CTA keeps its
        full label rather than truncating mid-word, and the links reflow.
      */}
      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 self-start sm:gap-3 min-[1200px]:absolute min-[1200px]:top-2.5 min-[1200px]:right-5">
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
