'use client'

import { Pause, Play } from 'lucide-react'
import { useId, useState } from 'react'

/**
 * Already-resolved data, not documents.
 *
 * The first version took the raw announcements plus a `hrefFor` callback, which
 * crashed the moment it rendered: a server component cannot hand a function to
 * a client one. Working the address out on the server is the better shape
 * anyway — this component has no business querying units to build a URL.
 */
export interface TickerItem {
  id: string
  message: string
  tone: string
  href: string | null
}

/**
 * The news ticker across the top of the site.
 *
 * ACCESSIBILITY IS THE WHOLE DESIGN PROBLEM HERE. The trustees asked for a
 * "high visibility, colorful news ticker", and a ticker is moving text that
 * starts by itself and never stops — precisely what WCAG 2.1 SC 2.2.2 (Pause,
 * Stop, Hide) forbids for anything that moves for more than five seconds.
 *
 * THE ANSWER IS TO NOT MOVE unless there is genuinely too much to fit. A
 * handful of announcements sit still on one line, and text that does not move
 * needs no pause control at all — SC 2.2.2 simply does not apply to it. The
 * marquee, and the button that stops it, appear only once there are enough
 * items that scrolling is the only way to show them.
 *
 * When it does scroll, three things keep it conformant:
 *  - a real pause button, always visible, not a hover-only trick that a
 *    keyboard or touch user can never reach;
 *  - `prefers-reduced-motion`, which stops it before the first frame for anyone
 *    who has asked their system for less movement — vestibular disorders are
 *    the reason that setting exists;
 *  - hovering or focusing anything inside also pauses it, so a reader can
 *    finish a line they are halfway through, and so a keyboard user tabbing to
 *    a link is not carrying it off the screen.
 *
 * The marquee is CSS rather than JavaScript. A `requestAnimationFrame` loop
 * that moves text costs main-thread time on every frame for the entire visit;
 * a transform animation runs on the compositor and stops costing anything the
 * moment it is paused.
 */

/*
 * Chip colours are chosen against the BRAND BLUE the strip now sits on, not
 * against a pale row. "News" was `bg-brand`, which on a brand-blue band is a
 * label the same colour as the thing behind it — legible only by its text.
 */
const TONE: Record<string, { label: string; chip: string }> = {
  news: { label: 'News', chip: 'bg-white text-brand' },
  achievement: { label: 'Achievement', chip: 'bg-accent text-brand' },
  event: { label: 'Event', chip: 'bg-[#3ddc84] text-[#0c3b22]' },
  urgent: { label: 'Important', chip: 'bg-[#ff6b7d] text-[#4a0510]' },
}

interface NewsTickerProps {
  items: TickerItem[]
}

/**
 * Above this many announcements the line is assumed not to fit, and the
 * marquee — with its pause button — comes back. Below it the items sit still.
 *
 * Four is a guess at a width, which is the honest way to describe it: the
 * server cannot measure the viewport. It is deliberately generous, because the
 * failure it guards against is asymmetric. Scrolling when it was not needed is
 * merely irritating; not scrolling when the line overflows would push
 * announcements off the edge of the screen where nobody can reach them.
 */
const SCROLL_ABOVE = 4

export const NewsTicker = ({ items }: NewsTickerProps) => {
  const [paused, setPaused] = useState(false)
  const regionId = useId()

  if (items.length === 0) return null

  /*
   * Only long lists move. See SCROLL_ABOVE — a static line needs no pause
   * control, which is why the button is rendered inside this condition rather
   * than always.
   */
  const scrolls = items.length > SCROLL_ABOVE

  const line = (keyPrefix: string, ariaHidden: boolean) =>
    items.map((item, index) => {
      const tone = TONE[item.tone] ?? TONE.news!
      const href = item.href
      const body = (
        <>
          <span
            className={`rounded-full px-2.5 py-0.5 t-label font-bold uppercase tracking-wider ${tone.chip}`}
          >
            {tone.label}
          </span>
          <span className="t-small text-white">{item.message}</span>
        </>
      )

      return (
        <li key={`${keyPrefix}-${item.id}-${index}`} className="flex items-center gap-2.5">
          {href ? (
            <a
              href={href}
              className="flex items-center gap-2.5 rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              // The duplicate copy exists only to make the scroll seamless, so
              // its links are removed from the tab order and the accessibility
              // tree — otherwise every headline is announced and tabbed twice.
              tabIndex={ariaHidden ? -1 : undefined}
            >
              {body}
            </a>
          ) : (
            <span className="flex items-center gap-2.5">{body}</span>
          )}
          <span aria-hidden="true" className="px-3 text-white/45">
            •
          </span>
        </li>
      )
    })

  return (
    <aside
      aria-label="School news"
      /*
       * The brand blue, so the strip reads as the announcements band rather
       * than as another pale row under the menu. It carried `bg-sea-soft`,
       * which is close enough to the header's white that the ticker looked
       * like part of the navigation.
       */
      className="border-b border-brand-deep bg-brand text-white"
      onMouseEnter={() => (scrolls ? setPaused(true) : undefined)}
      onMouseLeave={() => (scrolls ? setPaused(false) : undefined)}
      onFocusCapture={() => (scrolls ? setPaused(true) : undefined)}
      onBlurCapture={() => (scrolls ? setPaused(false) : undefined)}
    >
      <div className="siws-container flex items-center gap-3 py-2">
        {scrolls ? (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
            aria-controls={regionId}
            /* 44px target — SC 2.5.8. */
            className="grid size-11 shrink-0 place-items-center rounded-full text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {paused ? (
              <Play size={17} fill="currentColor" />
            ) : (
              <Pause size={17} fill="currentColor" />
            )}
            <span className="sr-only">
              {paused ? 'Resume the news ticker' : 'Pause the news ticker'}
            </span>
          </button>
        ) : null}

        <div
          id={regionId}
          className={scrolls ? 'siws-ticker min-w-0 flex-1 overflow-hidden' : 'min-w-0 flex-1'}
        >
          <div
            className={scrolls ? 'siws-ticker-track' : 'flex flex-wrap items-center'}
            data-paused={scrolls && paused ? 'true' : undefined}
          >
            <ul
              className={
                scrolls
                  ? 'flex shrink-0 items-center whitespace-nowrap'
                  : 'flex flex-wrap items-center'
              }
            >
              {line('a', false)}
            </ul>

            {/*
              The second copy exists ONLY to make the scroll seamless — it is
              what makes one announcement look like two when the line is not
              moving, which is exactly the duplicate a teacher reports after
              publishing a single item. A static line does not need it.
            */}
            {scrolls ? (
              <ul aria-hidden="true" className="flex shrink-0 items-center whitespace-nowrap">
                {line('b', true)}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  )
}
