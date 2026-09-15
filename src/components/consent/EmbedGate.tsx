import Link from 'next/link'

import { readConsent } from '@/app/(frontend)/actions/consent'
import { hasConsent } from '@/lib/cookie-consent'

/**
 * FR-PRV-02 — "no non-essential cookie, tracker, analytics tag or third-party
 * embed shall execute before the visitor has given consent for its category".
 *
 * WHY THIS IS A SERVER COMPONENT, AND WHY THAT IS THE WHOLE POINT
 * ---------------------------------------------------------------
 * Consent is read before the page is rendered, so an un-consented YouTube
 * frame or Instagram embed is never in the HTML at all and its provider never
 * receives a request. A client-side check cannot do this: by the time the
 * browser has run the script that decides whether to load the iframe, the
 * iframe's own request has already been made and the cookie already set.
 *
 * Fails CLOSED. `hasConsent` returns false when there is no answer yet, so an
 * embed added to a page before anybody has decided stays behind its
 * placeholder rather than loading.
 *
 * WHAT THE VISITOR GETS INSTEAD
 * -----------------------------
 * A real link to the content on the provider's own site, not a dead grey box.
 * SRS 2.5 requires third-party embeds to "degrade gracefully: if the provider
 * is unavailable or consent is withheld, the page must remain usable" — a
 * parent who has declined cookies should still be able to reach the video.
 */

interface EmbedGateProps {
  /** What the embed is, for the placeholder — "video", "map", "Instagram feed". */
  label: string
  /** Where the content lives on the provider's site, so it stays reachable. */
  href?: string | null
  /** Who sets the cookies, named so the choice is an informed one. */
  provider: string
  children: React.ReactNode
}

export const EmbedGate = async ({ label, href, provider, children }: EmbedGateProps) => {
  const consent = await readConsent()

  if (hasConsent(consent, 'embeds')) return <>{children}</>

  return (
    <div className="rounded-3xl bg-sea-soft p-6 ring-1 ring-line/60">
      <p className="mb-1.5 font-bold text-brand">This {label} is not loaded</p>

      <p className="mb-4 max-w-prose text-sm text-ink/85">
        It comes from {provider}, who would set their own cookies on your device. You have
        not agreed to embedded media, so we have not loaded it.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-brand underline underline-offset-4"
          >
            Open it on {provider}
            <span className="sr-only"> (opens in a new tab)</span>
            <span aria-hidden="true"> &#8599;</span>
          </a>
        ) : null}

        <Link
          href="/cookies"
          className="text-sm font-semibold text-brand underline underline-offset-4"
        >
          Change your cookie choice
        </Link>
      </div>
    </div>
  )
}
