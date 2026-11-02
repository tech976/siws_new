'use client'

import Script from 'next/script'
import { useEffect } from 'react'

import { trackEvent } from '@/lib/analytics'

/**
 * Google Analytics 4 and Microsoft Clarity — only with the visitor's consent.
 *
 * SEO audit (2026-10-21): neither was installed, so the school could not see
 * which pages bring enquiries. Two rules decide whether anything loads:
 *
 *  1. The account IDs are set on the server (`NEXT_PUBLIC_GA_ID`,
 *     `NEXT_PUBLIC_CLARITY_ID` in .env). Without them nothing loads at all.
 *  2. The visitor accepted "Analytics" in the cookie banner. `allowed` is
 *     worked out on the server from the consent cookie; after the banner is
 *     answered the page re-renders and this picks the choice up.
 *
 * Google Consent Mode v2: analytics storage is granted (they said yes), and
 * every advertising signal is denied. The site does not advertise, and the
 * cookie notice promises analytics without profiling.
 *
 * Conversions tracked: phone, email and WhatsApp link clicks (here), and
 * enquiry / campus-tour form submissions (in `EnquiryForm`).
 */
export const Analytics = ({ allowed }: { allowed: boolean }) => {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID

  // One listener for every tel:, mailto: and WhatsApp link on the site.
  useEffect(() => {
    if (!allowed || !gaId) return
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link) return
      const href = link.getAttribute('href') ?? ''
      const page = window.location.pathname
      if (href.startsWith('tel:')) trackEvent('phone_click', { page, number: href.slice(4) })
      else if (href.startsWith('mailto:'))
        trackEvent(/admissions@/i.test(href) ? 'admissions_email_click' : 'email_click', { page })
      else if (/(^|\/\/)(wa\.me|api\.whatsapp\.com)\//i.test(href)) trackEvent('whatsapp_click', { page })
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [allowed, gaId])

  if (!allowed) return null

  return (
    <>
      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('js',new Date());
gtag('config',${JSON.stringify(gaId)},{allow_google_signals:false,allow_ad_personalization_signals:false});`}
          </Script>
        </>
      ) : null}

      {clarityId ? (
        <Script id="clarity" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window,document,"clarity","script",${JSON.stringify(clarityId)});`}
        </Script>
      ) : null}
    </>
  )
}
