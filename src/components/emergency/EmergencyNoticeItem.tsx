'use client'

import { Info, OctagonAlert, TriangleAlert, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import {
  DISMISSED_NOTICES_COOKIE,
  SEVERITY_LABELS,
  parseDismissed,
  type NoticeSeverity,
} from '@/lib/emergency'

/**
 * One line of the emergency banner.
 *
 * FR-EMG-05 — three levels, each with its own colour AND its own label and
 * icon, so the level is never carried by colour alone (WCAG 2.1 SC 1.4.1).
 * All three pairs clear WCAG AA contrast with room to spare: white on the brand
 * blue is 10.7:1, near-black on the amber 10.1:1, white on the red 6.8:1.
 *
 * FR-EMG-09 — `role="alert"`, so a screen reader announces it, and the dismiss
 * control is a real button, reachable and operable from the keyboard.
 *
 * FR-EMG-08 — only an information notice can be dismissed, and only for this
 * browser session. A warning or an urgent notice has no close button at all: a
 * closure notice that a parent can wave away is one they can wave away without
 * reading.
 */

const STYLE: Record<NoticeSeverity, { band: string; chip: string; Icon: typeof Info }> = {
  information: {
    band: 'bg-brand text-white',
    chip: 'bg-white/15 text-white ring-1 ring-white/40',
    Icon: Info,
  },
  warning: {
    band: 'bg-accent text-[#1f1300]',
    chip: 'bg-[#1f1300] text-accent',
    Icon: TriangleAlert,
  },
  critical: {
    band: 'bg-[#b3172b] text-white',
    chip: 'bg-white text-[#b3172b]',
    Icon: OctagonAlert,
  },
}

/** Most recent twenty, so the cookie cannot grow without limit. */
const MAX_DISMISSED = 20

const rememberDismissal = (key: string) => {
  const current = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${DISMISSED_NOTICES_COOKIE}=([^;]*)`),
  )?.[1]
  const keys = [...parseDismissed(current), key].slice(-MAX_DISMISSED)
  /*
   * No `expires`, so the browser drops it when the session ends — FR-EMG-08
   * says dismissed "for the current session", not for good.
   */
  document.cookie = `${DISMISSED_NOTICES_COOKIE}=${encodeURIComponent(keys.join(','))}; path=/; SameSite=Lax`
}

export const EmergencyNoticeItem = ({
  noticeKey,
  message,
  severity,
  href,
  linkLabel,
}: {
  noticeKey: string
  message: string
  severity: NoticeSeverity
  href: string | null
  linkLabel: string
}) => {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const style = STYLE[severity] ?? STYLE.warning
  const { Icon } = style
  const dismissible = severity === 'information'

  return (
    <div role="alert" className={`${style.band} border-b border-black/10`}>
      <div className="siws-container flex items-start gap-3 py-3 sm:items-center">
        <Icon size={20} aria-hidden="true" className="mt-0.5 shrink-0 sm:mt-0" />

        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug sm:text-base">
          <span
            className={`mr-2 inline-block rounded-full px-2.5 py-0.5 align-middle text-[0.7rem] font-bold uppercase tracking-wider ${style.chip}`}
          >
            {SEVERITY_LABELS[severity]}
          </span>
          {message}
          {href ? (
            <>
              {' '}
              <Link
                href={href}
                className="whitespace-nowrap underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                {linkLabel}
              </Link>
            </>
          ) : null}
        </p>

        {dismissible ? (
          <button
            type="button"
            onClick={() => {
              rememberDismissal(noticeKey)
              setDismissed(true)
            }}
            /* 44px target — SC 2.5.8. */
            className="-my-1.5 grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            <X size={18} aria-hidden="true" />
            <span className="sr-only">Close this notice</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
