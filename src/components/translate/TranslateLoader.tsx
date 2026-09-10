'use client'

import { useEffect } from 'react'

/**
 * Loads Google's translation script, but only when a language is actually in
 * use.
 *
 * WHY IT IS CONDITIONAL
 * ---------------------
 * FR-PRV-02: no non-essential third-party embed may execute before consent, and
 * the site publishes a cookie policy saying so. A visitor reading the site in
 * English never chooses a language, so the script is never fetched and Google
 * never sets a cookie — the requirement is met by not making the request at
 * all, which is stronger than asking permission to make it.
 *
 * Once somebody has chosen a language the cookie exists, and from then on the
 * script loads on each page so their choice keeps applying. That is a
 * third-party call they have asked for by choosing it.
 *
 * WHY THE BANNER IS SUPPRESSED
 * ----------------------------
 * Google's widget inserts a fixed bar at the top of the document and shifts the
 * whole page down by 40px. On this site that pushes the section bar, the school
 * crest and any emergency notice out of view, and FR-EMG-01 requires an
 * emergency notice to sit above all other content. The CSS below neutralises
 * the bar and the shift; the translation itself is unaffected.
 */

/*
 * The deprecated Website Translator element. Google retired it for new sites
 * and it is unsupported, so this can stop working without warning — which is
 * the trade SIWS accepted in asking for machine translation ahead of the
 * Phase 2 the SRS scopes. If it does stop, the selector degrades to a control
 * that reloads the page in English and nothing else breaks.
 */
const SCRIPT_ID = 'google-translate-script'
const SCRIPT_SRC =
  'https://translate.google.com/translate_a/element.js?cb=siwsTranslateInit'

const hasLanguageChosen = (): boolean => {
  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/)
  if (!match?.[1]) return false
  const target = decodeURIComponent(match[1]).split('/').filter(Boolean).pop()
  return Boolean(target) && target !== 'en'
}

export const TranslateLoader = () => {
  useEffect(() => {
    if (!hasLanguageChosen()) return
    if (document.getElementById(SCRIPT_ID)) return

    /* Google calls this by name once the script has parsed. */
    ;(window as unknown as Record<string, unknown>).siwsTranslateInit = () => {
      const google = (window as unknown as { google?: { translate?: { TranslateElement?: new (o: unknown, e: string) => void } } }).google
      const Element = google?.translate?.TranslateElement
      if (!Element) return

      new Element(
        {
          pageLanguage: 'en',
          autoDisplay: false,
          /* The selector in the top bar is the control; this host stays hidden. */
          layout: 0,
        },
        'siws-translate-host',
      )
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    document.head.appendChild(script)
  }, [])

  return (
    <>
      {/* Google needs an element to attach to. Nothing is drawn in it. */}
      <div id="siws-translate-host" aria-hidden="true" className="hidden" />

      <style>{`
        /* Google's own bar and the 40px shift it applies to <body>. */
        .skiptranslate iframe.skiptranslate,
        iframe.goog-te-banner-frame { display: none !important; }
        body { top: 0 !important; position: static !important; }

        /* The highlight it paints over translated text, which fights the brand. */
        .goog-text-highlight { background: none !important; box-shadow: none !important; }
      `}</style>
    </>
  )
}
