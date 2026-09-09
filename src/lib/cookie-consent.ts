/**
 * FR-PRV-01 … FR-PRV-04 — cookie consent.
 *
 * WHAT CONSENT MEANS HERE
 * -----------------------
 * Nothing non-essential runs until the visitor has said yes to the category it
 * belongs to. That is not a banner-shaped decoration over embeds that load
 * anyway: `hasConsent` is read on the SERVER, before the page is rendered, so
 * an un-consented YouTube frame or Instagram embed is never in the HTML at all
 * and its provider never sees the request. A client-side check would have let
 * the browser fetch it first and asked afterwards.
 *
 * THE CATEGORIES
 * --------------
 * FR-PRV-03 requires consent to be granular by category rather than one
 * all-or-nothing switch, and FR-PRV-02 exempts strictly necessary cookies —
 * which must still be disclosed, but need no consent because the site cannot
 * work without them.
 *
 * REJECT IS AS EASY AS ACCEPT (FR-PRV-01). Both are buttons of equal weight in
 * the banner; there is no "manage preferences" maze standing between a visitor
 * and saying no.
 *
 * WHY A COOKIE HOLDS THE ANSWER
 * -----------------------------
 * It has to be readable on the server to gate the embeds, which rules out
 * localStorage. The value records the version of the notice agreed to and when
 * — FR-PRV-09 requires the version to be evidenced, and FR-PRV-14 requires a
 * changed policy to be re-consented rather than silently inheriting the old
 * answer.
 *
 * NOTHING IDENTIFYING IS STORED. The cookie holds categories, a version and a
 * date; no identifier, no profile, nothing that could be used to recognise the
 * visitor again. FR-PRV-11 forbids building profiles of visitors, and a consent
 * mechanism that did so would be self-defeating.
 */

export const CONSENT_COOKIE = 'siws-cookie-consent'

/** One year. Long enough not to nag, short enough to re-ask periodically. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365

/**
 * Bumped whenever the categories or the banner's wording change.
 *
 * A stored consent carrying an older version is treated as absent, so the
 * visitor is asked again rather than being held to a notice they never saw.
 */
export const CONSENT_VERSION = '2026-09-v1'

export const CONSENT_CATEGORIES = ['necessary', 'analytics', 'embeds'] as const

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number]

/** What each category covers, shown in the banner and the cookie policy. */
export const CATEGORY_DETAIL: Record<
  ConsentCategory,
  { label: string; description: string; alwaysOn: boolean }
> = {
  necessary: {
    label: 'Strictly necessary',
    description:
      'Needed for the site to work — remembering your text-size and contrast choice, keeping forms secure, and storing this consent itself. These are always on and cannot be switched off.',
    alwaysOn: true,
  },
  analytics: {
    label: 'Analytics',
    description:
      'Helps us see which pages are read so we can improve them. We do not use analytics to build a profile of you, and never for children.',
    alwaysOn: false,
  },
  embeds: {
    label: 'Embedded media',
    description:
      'Lets videos, social media posts and maps load directly on the page. These come from YouTube, Instagram and Google, who may set their own cookies. Without this you will see a link to the content instead.',
    alwaysOn: false,
  },
}

export interface ConsentState {
  version: string
  at: string
  categories: ConsentCategory[]
}

/** Everything on. */
export const acceptAll = (): ConsentState => ({
  version: CONSENT_VERSION,
  at: new Date().toISOString(),
  categories: [...CONSENT_CATEGORIES],
})

/** Only what the site cannot work without. */
export const rejectAll = (): ConsentState => ({
  version: CONSENT_VERSION,
  at: new Date().toISOString(),
  categories: ['necessary'],
})

export const withCategories = (chosen: ConsentCategory[]): ConsentState => ({
  version: CONSENT_VERSION,
  at: new Date().toISOString(),
  // `necessary` is not a choice, so it is added whatever the visitor ticked.
  categories: Array.from(new Set<ConsentCategory>(['necessary', ...chosen])),
})

export const serialiseConsent = (state: ConsentState): string =>
  encodeURIComponent(JSON.stringify(state))

/**
 * Reads a stored consent. Anything unparseable, or carrying a version older
 * than the current one, is treated as no answer at all — the visitor is asked
 * again rather than held to wording they were never shown.
 */
export const parseConsent = (raw: string | undefined | null): ConsentState | null => {
  if (!raw) return null

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentState>

    if (parsed.version !== CONSENT_VERSION) return null
    if (!Array.isArray(parsed.categories)) return null

    const categories = parsed.categories.filter((c): c is ConsentCategory =>
      (CONSENT_CATEGORIES as readonly string[]).includes(c),
    )

    return {
      version: CONSENT_VERSION,
      at: typeof parsed.at === 'string' ? parsed.at : new Date().toISOString(),
      categories: Array.from(new Set<ConsentCategory>(['necessary', ...categories])),
    }
  } catch {
    return null
  }
}

/**
 * Whether a category may run.
 *
 * Fails CLOSED: no answer means no consent, so an embed added to a page before
 * anybody has decided stays behind its placeholder rather than loading.
 */
export const hasConsent = (
  state: ConsentState | null,
  category: ConsentCategory,
): boolean => {
  if (category === 'necessary') return true
  return state?.categories.includes(category) ?? false
}
