'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

interface GalleryPagerProps {
  /** Every photograph, already rendered. Only one page is mounted at a time. */
  items: ReactNode[]
  perPage: number
}

/**
 * Pagination for a photo grid.
 *
 * Takes ALREADY-RENDERED items rather than the raw data. Each `<Media>` is a
 * Server Component that resolves its own derivatives, so rendering happens on
 * the server and this component only chooses which of the finished elements to
 * mount. That keeps the image pipeline server-side and the pager tiny.
 *
 * Only the current page is in the DOM. A Kindergarten gallery of 200 photos
 * would otherwise emit 200 `<img>` tags — every one a layout and decode cost on
 * a phone, for pictures nobody has scrolled to.
 *
 * Changing page moves focus to the grid heading and announces the change: a
 * keyboard user who presses "Next" would otherwise be left at the bottom of the
 * document with new content silently loaded above them.
 */
export const GalleryPager = ({ items, perPage }: GalleryPagerProps) => {
  const [page, setPage] = useState(0)
  const gridId = useId()

  const pages = Math.ceil(items.length / perPage)
  const start = page * perPage
  const visible = items.slice(start, start + perPage)

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(next, pages - 1))
    setPage(clamped)
    const grid = document.getElementById(gridId)
    grid?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
    grid?.focus()
  }

  return (
    <>
      <ul
        id={gridId}
        tabIndex={-1}
        className="siws-flow siws-flow-3 scroll-mt-32 outline-none [--flow-gap:1.25rem]"
      >
        {visible}
      </ul>

      {/*
        Announced politely rather than assertively — a page change is worth
        knowing about, but not worth interrupting whatever is being read.
      */}
      <p aria-live="polite" className="mt-6 text-center text-sm text-ink-muted">
        Showing {start + 1}–{Math.min(start + perPage, items.length)} of {items.length} photographs
      </p>

      {pages > 1 ? (
        <nav
          aria-label="Gallery pages"
          className="mt-4 flex flex-wrap items-center justify-center gap-2"
        >
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={page === 0}
            className="grid size-11 place-items-center rounded-full bg-accent text-brand transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
            <span className="sr-only">Previous page</span>
          </button>

          {Array.from({ length: pages }, (_, index) => index)
            /**
             * A window around the current page. Twenty numbered buttons is not
             * navigation, it is a wall — so it shows first, last, and the pages
             * either side of where you are.
             */
            .filter((index) => index === 0 || index === pages - 1 || Math.abs(index - page) <= 1)
            .map((index, position, shown) => (
              <span key={index} className="flex items-center gap-2">
                {position > 0 && index - shown[position - 1]! > 1 ? (
                  <span aria-hidden="true" className="px-1 text-ink-muted">
                    …
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => go(index)}
                  aria-current={index === page ? 'page' : undefined}
                  className={`grid size-11 place-items-center rounded-full text-sm font-semibold transition-colors ${
                    index === page
                      ? 'bg-brand text-white'
                      : 'bg-sea text-brand hover:bg-accent hover:text-brand'
                  }`}
                >
                  {index + 1}
                  <span className="sr-only">{index === page ? ' (current page)' : ''}</span>
                </button>
              </span>
            ))}

          <button
            type="button"
            onClick={() => go(page + 1)}
            disabled={page === pages - 1}
            className="grid size-11 place-items-center rounded-full bg-accent text-brand transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
            <span className="sr-only">Next page</span>
          </button>
        </nav>
      ) : null}
    </>
  )
}
