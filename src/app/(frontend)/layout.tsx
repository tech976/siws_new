import type { Metadata, Viewport } from 'next'
import { cookies, draftMode } from 'next/headers'
import type { ReactNode } from 'react'

import { LivePreviewListener } from '@/components/preview/LivePreviewListener'
import { PreviewBanner } from '@/components/preview/PreviewBanner'
import { fontVariables } from '@/fonts'

import './globals.css'

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/**
 * BR-SEO-08 — "The staging site shall be excluded from search-engine indexing,
 * and go-live shall include an explicit step to enable indexing on the
 * production site."
 *
 * Indexing is therefore opt-in: a deployment must set the flag deliberately.
 * A missing or malformed value keeps the site out of the index, so the failure
 * mode is a staging site that stays private rather than one that leaks.
 */
const indexingEnabled = process.env.NEXT_PUBLIC_ENABLE_INDEXING === 'true'

export const metadata: Metadata = {
  metadataBase: new URL(serverURL),
  title: {
    default: "South Indians' Welfare Society (SIWS)",
    template: "%s · South Indians' Welfare Society",
  },
  description:
    "South Indians' Welfare Society — a trusted Mumbai educational institution since 1934, with Kindergarten, Primary, Secondary and Junior College units.",
  robots: indexingEnabled
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
  openGraph: {
    type: 'website',
    siteName: "South Indians' Welfare Society (SIWS)",
    locale: 'en_IN',
  },
  // FR-SOC-07 — shared links render correctly on social platforms.
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Deliberately NOT capping maximum-scale: preventing pinch-zoom fails
  // WCAG 2.1 SC 1.4.4 (Resize Text).
  // The browser-chrome colour on mobile. A literal rather than a `var()`,
  // because this is read from the document head before any stylesheet is
  // parsed — so it has to be kept in step with `SIWS_BRAND.brand` by hand.
  themeColor: '#2e3192',
}

/**
 * The visitor's saved text-size and contrast choice, read on the SERVER.
 *
 * WHY A COOKIE AND NOT localStorage
 * ---------------------------------
 * This used to be an inline `<script>` in a hand-written `<head>` that read
 * localStorage and set the attributes before first paint. The intent was right
 * and the mechanism was not:
 *
 *  - React 19 refuses to run a script it creates on the client, and says so on
 *    the console every time it renders one. The tag worked from the
 *    server-rendered HTML and would have silently stopped working on any
 *    render that recreated it — the failure mode being no visible error and a
 *    visitor who needs large text not getting it.
 *  - It also had to mutate `<html>` before hydration, which is a deliberate
 *    server/client mismatch. That is what `suppressHydrationWarning` on the
 *    element below was covering for.
 *
 * localStorage cannot be read on the server; a cookie can. So the attributes
 * are now rendered into the HTML by the server that sends it. There is no
 * script to run, nothing to mutate before hydration, and no frame in which the
 * default is on screen — the markup arrives correct.
 *
 * The layout already awaits `draftMode()`, so it was never static and reading
 * a cookie costs it no caching it had.
 *
 * VALUES ARE WHITELISTED, NOT PASSED THROUGH. A cookie is visitor-controlled
 * input, and this one is written straight into an attribute on `<html>`.
 * Anything but the two known settings is ignored.
 */
const TEXT_SIZE_COOKIE = 'siws_text_size'
const CONTRAST_COOKIE = 'siws_contrast'

const FrontendLayout = async ({ children }: { children: ReactNode }) => {
  // BR-EDIT-04 — the preview chrome exists only while draft mode is on, so a
  // public visitor is never served either component.
  const { isEnabled: isDraft } = await draftMode()

  const cookieStore = await cookies()
  const savedSize = cookieStore.get(TEXT_SIZE_COOKIE)?.value
  const textSize = savedSize === 'large' || savedSize === 'x-large' ? savedSize : undefined
  const contrast = cookieStore.get(CONTRAST_COOKIE)?.value === 'high' ? 'high' : undefined

  return (
    <html
      lang="en-IN"
      className={fontVariables}
      /*
       * Kept even though the pre-hydration script is gone: browser extensions
       * and translation tools routinely add attributes to <html> before React
       * looks at it, and the accessibility controls change these two at
       * runtime. Neither is a mismatch worth a console error.
       */
      suppressHydrationWarning
      data-text-size={textSize}
      data-contrast={contrast}
    >
      <body>
        {/* SRS 4.4 — skip-to-content link, the first thing a keyboard user reaches. */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        {isDraft ? (
          <>
            <PreviewBanner />
            <LivePreviewListener />
          </>
        ) : null}

        {children}
      </body>
    </html>
  )
}

export default FrontendLayout
