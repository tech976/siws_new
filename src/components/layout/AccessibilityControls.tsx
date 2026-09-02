'use client'

import { useEffect, useState } from 'react'

/**
 * Visitor accessibility controls (SRS 4.4 — "reachable from the header or
 * footer of every page"; NFR Accessibility).
 *
 * The stylesheet has always supported these: `html[data-text-size='large']`
 * and `html[data-contrast='high']` scale the whole system and flip to a
 * high-contrast palette. What was missing was any way for a visitor to set
 * them — the feature was half-built, styled but unreachable.
 *
 * Text size scales the ROOT font size rather than body copy alone, so every
 * rem-based measurement grows together and the layout reflows instead of
 * overlapping — which is what happens when only the paragraphs are enlarged.
 *
 * The choice is written to the document element so it applies immediately, and
 * to a COOKIE so the next page arrives already correct. The layout reads that
 * cookie on the server and renders the attributes into the HTML, so a visitor
 * who has asked for large text never sees a frame of the default first.
 *
 * It used to be localStorage, re-applied by an inline script in the layout.
 * That could only run after the document existed, and React 19 will not
 * execute a script it renders on the client at all — see the note in
 * `app/(frontend)/layout.tsx`. A cookie is the only one of the two the server
 * can read, and the server is the only place the attribute can be set with no
 * flash possible.
 */

type TextSize = 'normal' | 'large' | 'x-large'

/** Read on the server in `app/(frontend)/layout.tsx`. Keep the names in step. */
const TEXT_SIZE_COOKIE = 'siws_text_size'
const CONTRAST_COOKIE = 'siws_contrast'

/** The old localStorage keys, read once to carry an existing choice across. */
const LEGACY_TEXT = 'siws:text-size'
const LEGACY_CONTRAST = 'siws:contrast'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * A year, path-wide, and `SameSite=Lax` — it is a display preference, not a
 * credential, and it has to survive arriving from an external link.
 *
 * `Secure` only over HTTPS: a Secure cookie is silently discarded on plain
 * HTTP, which would leave the setting working in production and mysteriously
 * not working on a developer's machine.
 */
const writeCookie = (name: string, value: string | null) => {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie =
    value === null
      ? `${name}=; Max-Age=0; Path=/; SameSite=Lax${secure}`
      : `${name}=${value}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`
}

export const AccessibilityControls = () => {
  const [textSize, setTextSize] = useState<TextSize>('normal')
  const [highContrast, setHighContrast] = useState(false)

  /*
   * Adopt whatever the SERVER already rendered, so the buttons show the state
   * the visitor is actually looking at rather than the default.
   *
   * The second half runs once, for visitors who set a preference before it
   * moved to a cookie: their choice is still in localStorage and the server
   * had no way to see it, so the page they are reading right now came back
   * with no attribute set. Applying it here costs them one frame on one visit,
   * after which the cookie handles it. The legacy keys are cleared so this
   * cannot fight a later change made on another device.
   */
  useEffect(() => {
    const root = document.documentElement
    const size = root.getAttribute('data-text-size')
    const contrast = root.getAttribute('data-contrast') === 'high'

    if (size === 'large' || size === 'x-large' || contrast) {
      setTextSize(size === 'large' || size === 'x-large' ? size : 'normal')
      setHighContrast(contrast)
      return
    }

    try {
      const legacySize = window.localStorage.getItem(LEGACY_TEXT)
      const legacyContrast = window.localStorage.getItem(LEGACY_CONTRAST)
      if (!legacySize && !legacyContrast) return

      if (legacySize === 'large' || legacySize === 'x-large') {
        root.setAttribute('data-text-size', legacySize)
        setTextSize(legacySize)
        writeCookie(TEXT_SIZE_COOKIE, legacySize)
      }
      if (legacyContrast === 'high') {
        root.setAttribute('data-contrast', 'high')
        setHighContrast(true)
        writeCookie(CONTRAST_COOKIE, 'high')
      }

      window.localStorage.removeItem(LEGACY_TEXT)
      window.localStorage.removeItem(LEGACY_CONTRAST)
    } catch {
      // Private browsing can refuse storage. There is nothing to migrate then.
    }
  }, [])

  /*
   * The attribute is set here as well as in the cookie, and both matter: the
   * attribute is what changes the page the visitor is on, the cookie is what
   * makes the next one arrive that way. Cookies cannot be refused the way
   * localStorage can, so there is nothing to catch.
   *
   * 'normal' and 'off' clear their cookie rather than storing the default, so
   * a visitor who turns the setting back off stops sending it.
   */
  const applyTextSize = (next: TextSize) => {
    setTextSize(next)
    const root = document.documentElement
    if (next === 'normal') root.removeAttribute('data-text-size')
    else root.setAttribute('data-text-size', next)
    writeCookie(TEXT_SIZE_COOKIE, next === 'normal' ? null : next)
  }

  const applyContrast = (next: boolean) => {
    setHighContrast(next)
    const root = document.documentElement
    if (next) root.setAttribute('data-contrast', 'high')
    else root.removeAttribute('data-contrast')
    writeCookie(CONTRAST_COOKIE, next ? 'high' : null)
  }

  const sizeButton = (value: TextSize, label: string, srLabel: string) => (
    <button
      key={value}
      type="button"
      onClick={() => applyTextSize(value)}
      aria-pressed={textSize === value}
      className={`min-h-11 min-w-11 rounded-lg border px-3 font-semibold transition-colors ${
        textSize === value
          ? 'border-accent bg-accent text-brand'
          : 'border-white/35 text-white hover:border-white'
      }`}
    >
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{srLabel}</span>
    </button>
  )

  return (
    <section aria-labelledby="a11y-heading" className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <h2 id="a11y-heading" className="text-sm font-semibold tracking-wide text-white uppercase">
        Accessibility
      </h2>

      <div className="flex items-center gap-2">
        <span className="text-sm text-white/75">Text size</span>
        {/*
          `aria-pressed` rather than a radio group: each button is a toggle a
          screen reader announces as pressed or not, which is what a visitor
          needs to hear to know the setting took effect.
        */}
        {sizeButton('normal', 'A', 'Normal text size')}
        {sizeButton('large', 'A+', 'Large text size')}
        {sizeButton('x-large', 'A++', 'Extra large text size')}
      </div>

      <button
        type="button"
        onClick={() => applyContrast(!highContrast)}
        aria-pressed={highContrast}
        className={`min-h-11 rounded-lg border px-4 text-sm font-semibold transition-colors ${
          highContrast
            ? 'border-accent bg-accent text-brand'
            : 'border-white/35 text-white hover:border-white'
        }`}
      >
        High contrast{highContrast ? ': on' : ''}
      </button>
    </section>
  )
}
