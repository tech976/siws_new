/**
 * Sending an event to Google Analytics, if it is running.
 *
 * Analytics only loads for a visitor who accepted the "Analytics" cookies (see
 * `components/analytics/Analytics.tsx`). For everyone else `gtag` does not
 * exist and this does nothing, so callers never need to check consent.
 */
type Gtag = (command: 'event', name: string, params?: Record<string, unknown>) => void

export const trackEvent = (name: string, params: Record<string, unknown> = {}): void => {
  if (typeof window === 'undefined') return
  const gtag = (window as { gtag?: Gtag }).gtag
  if (typeof gtag === 'function') gtag('event', name, params)
}
