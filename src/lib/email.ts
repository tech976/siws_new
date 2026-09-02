import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

/**
 * How a form on this site actually reaches an inbox.
 *
 * WHY THIS FILE EXISTS AT ALL
 * ---------------------------
 * `actions/enquiry.ts` has called `payload.sendEmail` since the admission form
 * was written, and every run of it succeeded. Nothing was ever delivered.
 * Payload with no `email` configured falls back to a console transport: it
 * logs the message, returns as though it sent, and prints one line at boot —
 *
 *   WARN: No email adapter provided. Email will be written to console.
 *
 * — which is easy to read past among the seed output. So the enquiry was
 * stored, `emailDelivered` was ticked, and the admissions office was told
 * nothing. A form that reports success and reaches nobody is worse than one
 * that fails, because nobody goes looking for it.
 *
 * CONFIGURED BY ENVIRONMENT, NOT BY CODE
 * --------------------------------------
 * The SMTP credentials belong to SIWS and cannot live in the repository. Set
 * these in `.env` and mail is delivered; leave them out and Payload's console
 * transport is used exactly as before, so a developer's clone still runs and a
 * teammate is not asked for the school's mail password to see a page.
 *
 *   SMTP_HOST      e.g. smtp.gmail.com
 *   SMTP_PORT      465 for TLS, 587 for STARTTLS (default 587)
 *   SMTP_USER      the mailbox to authenticate as
 *   SMTP_PASSWORD  its password, or an app password
 *   SMTP_FROM      what the school's staff see in "From"
 *                  (default: SMTP_USER)
 *   SMTP_FROM_NAME (default: "SIWS website")
 *
 * WHAT IS DELIBERATELY NOT DONE HERE
 * ----------------------------------
 * No fallback to a default host, and no silent retry against a second server.
 * Both would mean a misconfigured address quietly delivering somewhere other
 * than where the admin panel says it goes, which for a form carrying a child's
 * name and a parent's telephone number is the one failure that must be loud.
 */

const has = (name: string) => {
  const value = process.env[name]
  return typeof value === 'string' && value.trim().length > 0
}

/** True when SIWS's mail server has been configured on this machine. */
export const smtpConfigured = (): boolean =>
  has('SMTP_HOST') && has('SMTP_USER') && has('SMTP_PASSWORD')

/**
 * The adapter, or `undefined` to leave Payload on its console transport.
 *
 * `undefined` rather than a throw: a clone with no credentials must still boot,
 * and every seed script builds a Payload instance. What must not happen is a
 * HALF-configured server — a host with no password would authenticate as
 * nobody and bounce — so all three are required together or none is used.
 */
export const emailAdapter = () => {
  if (!smtpConfigured()) return undefined

  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = String(process.env.SMTP_USER)

  return nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_FROM?.trim() || user,
    defaultFromName: process.env.SMTP_FROM_NAME?.trim() || 'SIWS website',
    transportOptions: {
      host: process.env.SMTP_HOST,
      port,
      // 465 is implicit TLS; 587 opens plain and upgrades with STARTTLS.
      secure: port === 465,
      auth: { user, pass: process.env.SMTP_PASSWORD },
    },
  })
}
