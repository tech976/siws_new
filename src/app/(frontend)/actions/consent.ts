'use server'

import { cookies } from 'next/headers'

import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  type ConsentCategory,
  type ConsentState,
  acceptAll,
  parseConsent,
  rejectAll,
  serialiseConsent,
  withCategories,
} from '@/lib/cookie-consent'

/**
 * Records the visitor's cookie choice.
 *
 * A server action rather than a client-side `document.cookie` write, because
 * the embeds are gated on the SERVER: the cookie has to exist before the next
 * render, and the page has to be re-rendered once it does. Writing it in the
 * browser would leave the visitor looking at placeholders they had just
 * consented to until they navigated.
 *
 * `httpOnly` is deliberately FALSE. The banner needs to know on the client
 * whether it has already been answered, and this value is not a credential —
 * it holds three category names and a date. Nothing is protected by keeping it
 * out of JavaScript, and a great deal of flicker is avoided by not.
 */
const write = async (state: ConsentState) => {
  const store = await cookies()

  store.set(CONSENT_COOKIE, serialiseConsent(state), {
    maxAge: CONSENT_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    // SRS 2.5 — every deployed environment is HTTPS; only local dev is not.
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  })
}

export const acceptAllCookies = async () => {
  await write(acceptAll())
}

export const rejectAllCookies = async () => {
  await write(rejectAll())
}

export const saveCookiePreferences = async (categories: ConsentCategory[]) => {
  await write(withCategories(categories))
}

/**
 * FR-PRV-03 — "the visitor shall be able to review and withdraw consent at any
 * time, as easily as it was given, from a persistently reachable control".
 *
 * Withdrawal clears the record rather than storing a refusal, so the banner
 * appears again and the visitor can make a fresh choice. Storing "no" would
 * mean withdrawal and rejection were indistinguishable, and a visitor who
 * withdrew could never be asked again.
 */
export const withdrawCookieConsent = async () => {
  const store = await cookies()
  store.delete(CONSENT_COOKIE)
}

/** The current choice, for a server component deciding whether to render an embed. */
export const readConsent = async (): Promise<ConsentState | null> => {
  const store = await cookies()
  return parseConsent(store.get(CONSENT_COOKIE)?.value)
}
