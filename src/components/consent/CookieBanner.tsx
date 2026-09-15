'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'

import {
  CATEGORY_DETAIL,
  CONSENT_CATEGORIES,
  type ConsentCategory,
} from '@/lib/cookie-consent'

/**
 * FR-PRV-01 — the cookie consent banner.
 *
 * REJECT IS NO HARDER THAN ACCEPT, which the requirement states and which is a
 * visual matter as much as a functional one. Both are buttons, adjacent, the
 * same size and the same weight. The dark pattern this exists to forbid is the
 * one where "Accept all" is a filled button and refusing means opening a
 * settings panel and unticking boxes — so "Reject all" takes exactly one click
 * and "Choose" is a third option rather than the only route to no.
 *
 * IT DOES NOT OBSTRUCT THE EMERGENCY NOTICE (FR-PRV-17). It sits at the foot of
 * the viewport rather than over the page: an unscheduled closure has to reach a
 * parent whether or not they have decided about cookies, and a modal would put
 * a cookie question in front of a safety message.
 *
 * IT IS NOT A MODAL AT ALL. Nothing is trapped, the page behind stays readable
 * and operable, and somebody who wants to read the cookie policy before
 * deciding can. That is also why it is a `region` and not a `dialog`:
 * announcing a dialog that does not behave like one is worse for a screen
 * reader than announcing what it actually is.
 */

interface CookieBannerProps {
  /** True when a valid, current consent already exists — the banner stays away. */
  answered: boolean
  acceptAll: () => Promise<void>
  rejectAll: () => Promise<void>
  save: (categories: ConsentCategory[]) => Promise<void>
}

export const CookieBanner = ({ answered, acceptAll, rejectAll, save }: CookieBannerProps) => {
  const [dismissed, setDismissed] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const headingId = useId()

  /* The optional categories, off until the visitor turns them on (FR-PRV-08). */
  const [selected, setSelected] = useState<ConsentCategory[]>([])

  if (answered || dismissed) return null

  const run = (action: () => Promise<void>) => {
    startTransition(async () => {
      await action()
      setDismissed(true)
      /*
       * The embeds are gated on the server, so the page has to be rendered
       * again for a newly-consented video to appear. `router.refresh()` is
       * enough here — unlike withdrawal, the banner hides itself with
       * `dismissed` and does not depend on the layout re-running.
       */
      router.refresh()
    })
  }

  const toggle = (category: ConsentCategory) =>
    setSelected((current) =>
      current.includes(category)
        ? current.filter((entry) => entry !== category)
        : [...current, category],
    )

  const button =
    'rounded-full px-6 py-2.5 text-sm font-bold transition disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

  return (
    <div
      role="region"
      aria-labelledby={headingId}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white shadow-[0_-8px_32px_-12px_rgba(36,39,111,0.28)]"
    >
      <div className="siws-container py-5">
        <h2 id={headingId} className="mb-1.5 text-lg font-bold text-brand">
          Cookies on this website
        </h2>

        <p className="mb-4 max-w-3xl text-sm text-ink">
          We use cookies the site needs to work. We would also like to use optional ones —
          to see which pages are read, and to let videos, social posts and maps load on the
          page. You can change your mind at any time.{' '}
          <Link href="/cookies" className="font-semibold text-brand underline underline-offset-4">
            Read our cookie policy
          </Link>
          .
        </p>

        {choosing ? (
          <fieldset className="mb-4">
            <legend className="sr-only">Choose which cookies to allow</legend>

            <ul className="grid gap-3 sm:grid-cols-3">
              {CONSENT_CATEGORIES.map((category) => {
                const detail = CATEGORY_DETAIL[category]
                return (
                  <li key={category} className="rounded-2xl bg-sea-soft p-4">
                    <label className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0"
                        checked={detail.alwaysOn || selected.includes(category)}
                        disabled={detail.alwaysOn}
                        onChange={() => toggle(category)}
                      />
                      <span>
                        <span className="block text-sm font-bold text-brand">
                          {detail.label}
                          {detail.alwaysOn ? (
                            <span className="ml-1.5 font-normal text-ink/70">(always on)</span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink/85">
                          {detail.description}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(acceptAll)}
            className={`${button} bg-brand text-white hover:bg-brand-deep`}
          >
            Accept all
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() => run(rejectAll)}
            className={`${button} bg-brand text-white hover:bg-brand-deep`}
          >
            Reject all
          </button>

          {choosing ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => save(selected))}
              className={`${button} border-2 border-brand text-brand hover:bg-sea`}
            >
              Save my choice
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setChoosing(true)}
              className={`${button} border-2 border-brand text-brand hover:bg-sea`}
            >
              Choose cookies
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
