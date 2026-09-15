'use client'

import { useTransition } from 'react'

/**
 * FR-PRV-03 — "the visitor shall be able to review and withdraw consent at any
 * time, as easily as it was given, from a persistently reachable control".
 *
 * In the footer, which is on every page. A control that only appears in the
 * banner is reachable exactly once, before the visitor has decided anything —
 * which is the opposite of what the requirement asks for.
 *
 * WITHDRAWAL CLEARS THE RECORD rather than storing a refusal, so the banner
 * comes back and a fresh choice can be made. Storing "no" would make
 * withdrawal and rejection indistinguishable, and somebody who withdrew could
 * never be asked again — they would be locked out of embedded media with no
 * way back.
 */

export const CookieSettings = ({ withdraw }: { withdraw: () => Promise<void> }) => {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await withdraw()
          /*
           * A FULL RELOAD, not `router.refresh()`.
           *
           * The banner's `answered` prop is read in the ROOT LAYOUT, and a
           * refresh re-renders the page segment without re-running the layout —
           * so the cookie was cleared and the banner did not come back, leaving
           * a visitor who withdrew with no way to choose again. A reload is
           * also what makes the embeds stop being served in the same step.
           */
          window.location.reload()
        })
      }
      className="underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
    >
      Cookie settings
    </button>
  )
}
