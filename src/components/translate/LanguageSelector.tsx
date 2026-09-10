'use client'

import { ChevronDown, Globe } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * The language selector in the top bar.
 *
 * SRS 1.2 lists multi-language support as Phase 2, delivered as translated
 * content with per-language management in the CMS. This is not that: it is
 * machine translation, added at SIWS's request ahead of that phase. The
 * distinction matters when reading the two against each other — a translated
 * page here is Google's rendering of the English, not copy anybody at the
 * school has approved.
 *
 * WHY THE SCRIPT LOADS ON DEMAND
 * ------------------------------
 * Google's widget sets its own cookies and calls its own servers. FR-PRV-02
 * forbids a non-essential third-party embed executing before the visitor has
 * consented, and the site now publishes a cookie policy that says so. Loading
 * it only when somebody actually chooses a language means a visitor who never
 * translates is never given a Google cookie — the requirement is met by not
 * making the request rather than by asking permission to make it.
 *
 * It also keeps the cost off every page: nobody pays for a translation widget
 * they did not ask for.
 *
 * THE LANGUAGES
 * -------------
 * The twenty-two languages of the Eighth Schedule to the Constitution, plus
 * English. Ordered by name rather than by number of speakers: a list ranked by
 * size makes a political claim about which of India's languages matter most,
 * and alphabetical order makes none.
 *
 * Each is shown in its OWN script with the English name beside it. Somebody
 * looking for Tamil is looking for "தமிழ்", and a list of English names is a
 * list they have to translate before they can use it.
 */

interface Language {
  /** Google Translate's code. */
  code: string
  /** The name in its own script. */
  native: string
  /** The English name, for anyone who cannot read the script above. */
  english: string
}

const LANGUAGES: Language[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'as', native: 'অসমীয়া', english: 'Assamese' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'bho', native: 'भोजपुरी', english: 'Bhojpuri' },
  { code: 'doi', native: 'डोगरी', english: 'Dogri' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'gom', native: 'कोंकणी', english: 'Konkani' },
  { code: 'mai', native: 'मैथिली', english: 'Maithili' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
  { code: 'mni-Mtei', native: 'ꯃꯤꯇꯩꯂꯣꯟ', english: 'Manipuri' },
  { code: 'mr', native: 'मराठी', english: 'Marathi' },
  { code: 'ne', native: 'नेपाली', english: 'Nepali' },
  { code: 'or', native: 'ଓଡ଼ିଆ', english: 'Odia' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
  { code: 'sa', native: 'संस्कृतम्', english: 'Sanskrit' },
  { code: 'sd', native: 'سنڌي', english: 'Sindhi' },
  { code: 'si', native: 'සිංහල', english: 'Sinhala' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'ur', native: 'اردو', english: 'Urdu' },
]

/** Google reads the chosen language from this cookie on the next page load. */
const GOOGLE_COOKIE = 'googtrans'

const setGoogleCookie = (code: string) => {
  /*
   * Written for the bare host AND for `.host`, because Google's widget reads
   * whichever it finds and a value on only one of them is silently ignored on
   * some paths. Cleared the same way when returning to English.
   */
  const host = window.location.hostname
  const value = code === 'en' ? '' : `/en/${code}`
  const expiry =
    code === 'en'
      ? 'Thu, 01 Jan 1970 00:00:00 GMT'
      : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toUTCString()

  for (const domain of [host, `.${host}`]) {
    document.cookie = `${GOOGLE_COOKIE}=${value}; expires=${expiry}; path=/; domain=${domain}`
  }
  document.cookie = `${GOOGLE_COOKIE}=${value}; expires=${expiry}; path=/`
}

const readGoogleCookie = (): string => {
  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/)
  if (!match?.[1]) return 'en'
  /* The value is "/en/hi"; the target is the last segment. */
  const target = decodeURIComponent(match[1]).split('/').filter(Boolean).pop()
  return target && target !== 'en' ? target : 'en'
}

export const LanguageSelector = () => {
  const [current, setCurrent] = useState('en')
  const [busy, setBusy] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  /*
   * The chosen language survives navigation in Google's own cookie rather than
   * in React state, so the selector has to read it back on mount — otherwise it
   * shows "English" on every page while the page itself is in Tamil.
   */
  useEffect(() => {
    setCurrent(readGoogleCookie())
  }, [])

  const change = (code: string) => {
    setCurrent(code)
    setBusy(true)
    setGoogleCookie(code)

    /*
     * A reload rather than driving the widget in place.
     *
     * Google's element rewrites the DOM it is given; React then owns the same
     * DOM and reconciles against a tree that no longer matches, which produces
     * both hydration errors and half-translated pages. Reloading hands Google a
     * finished document and keeps the two out of each other's way — and it is
     * what the widget's own cookie mechanism is designed for.
     */
    window.location.reload()
  }

  return (
    /*
     * `notranslate` ON THE WHOLE CONTROL, and this is the requirement that
     * matters most.
     *
     * Google translates every text node it is given, including this list. So
     * choosing Urdu rewrote the options into Urdu — and a visitor who picked a
     * language by mistake was left reading a menu in a script they cannot read,
     * with no way back to English. The one control that must never be
     * translated is the one that changes the language.
     *
     * The names are already in their own scripts, so nothing is lost: a Urdu
     * reader sees "اردو" whether the page is in English or Urdu, and an English
     * reader sees "Urdu" beside it either way.
     */
    <div className="notranslate relative ml-auto flex shrink-0 items-center gap-1.5 py-1.5 pl-4" translate="no">
      <Globe size={15} aria-hidden="true" className="shrink-0" />

      {/*
        The chosen language, drawn by us, plus a caret.
        
        A native `<select>` reserves room for the operating system's own arrow
        and the width of that arrow is not ours to set — which left the control
        ending 100px short of the header above it however the padding was
        trimmed. So the label is rendered here and the real `<select>` is laid
        transparently over the top: the browser still owns the menu, the
        keyboard and the touch behaviour, and the bar still lines up.
      */}
      <span aria-hidden="true" className="pointer-events-none text-sm font-semibold whitespace-nowrap">
        {LANGUAGES.find((l) => l.code === current)?.native ?? 'English'}
      </span>
      <ChevronDown size={14} aria-hidden="true" className="pointer-events-none shrink-0" />

      <label htmlFor="siws-language" className="sr-only">
        Choose a language. Pages are translated automatically by Google Translate.
      </label>

      <select
        id="siws-language"
        ref={selectRef}
        value={current}
        disabled={busy}
        onChange={(event) => change(event.target.value)}
        /*
         * Transparent and stretched over the label above. `inset-0` rather than
         * a width, so it always covers exactly what is drawn.
         */
        className="absolute inset-0 cursor-pointer appearance-none bg-transparent text-transparent opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait"
      >
        {LANGUAGES.map((language) => (
          /*
           * `text-ink` on the option, not inherited white: the list is drawn by
           * the operating system on a white background, so white-on-white is an
           * invisible menu. This is the one place the bar's colour cannot carry
           * through.
           */
          <option key={language.code} value={language.code} className="text-ink" translate="no">
            {/*
              BOTH names on every row, English included.
              
              The native name alone is unreadable to somebody who landed in the
              wrong language; the English name alone is unreadable to the reader
              the language is for. Showing both means the row is legible to
              either, which is what makes the list usable as an escape route
              rather than only as a way in.
            */}
            {language.code === 'en'
              ? 'English'
              : `${language.native} · ${language.english}`}
          </option>
        ))}
      </select>
    </div>
  )
}
