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
 * IT ROTATES, because SIWS asked for it to (2026-10-06) — a strip that sits
 * still was read as broken. An earlier version moved only when the line
 * overflowed, which with two or three announcements meant it never moved at
 * all.
 *
 * Three things keep a moving strip conformant:
 *  - a real pause button, always visible, not a hover-only trick that a
 *    keyboard or touch user can never reach. Hovering pauses as well, which is
 *    what SIWS asked for, but hover alone would leave a phone with no way to
 *    stop it;
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

export const NewsTicker = ({ items }: NewsTickerProps) => {
  const [paused, setPaused] = useState(false)
  const regionId = useId()

  if (items.length === 0) return null

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
      // Stops under the cursor so a reader can finish the line they are on,
      // and starts again when it leaves. Focus does the same for a keyboard.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="siws-container flex items-center gap-3 py-1.5">
        <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
            aria-controls={regionId}
            /*
              36px: comfortably past the 24px minimum of SC 2.5.8 and small
              enough that the strip stays a strip. It was 44px, which set the
              height of the whole band.
            */
            className="grid size-9 shrink-0 place-items-center rounded-full text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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

        <div
          id={regionId}
          className="siws-ticker min-w-0 flex-1 overflow-hidden"
        >
          <div
            className="siws-ticker-track"
            data-paused={paused ? 'true' : undefined}
          >
            <ul className="flex shrink-0 items-center whitespace-nowrap">{line('a', false)}</ul>

            {/*
              The second copy exists ONLY to make the loop seamless: the track
              scrolls exactly half its width, by which point this copy sits
              where the first began. It is hidden from screen readers, or every
              headline would be announced twice.
            */}
            <ul aria-hidden="true" className="flex shrink-0 items-center whitespace-nowrap">
              {line('b', true)}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  )
}
