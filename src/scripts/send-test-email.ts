import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Sends one real email, to prove the SMTP settings in `.env` work.
 *
 * Every form on the site stores its submission and then emails the school. If
 * SMTP is not configured, Payload writes the email to the server log instead
 * and reports success — so the forms look fine and nobody is told anything.
 * This is the check to run after setting SMTP_HOST, SMTP_USER and
 * SMTP_PASSWORD, before trusting that enquiries reach the office.
 *
 * Usage:  NODE_ENV=production npx tsx src/scripts/send-test-email.ts you@example.com
 */

const to = process.argv[2]

const main = async () => {
  if (!to || !to.includes('@')) {
    console.error('Give an address to send to: npx tsx src/scripts/send-test-email.ts you@example.com')
    process.exit(1)
  }

  const configured = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD,
  )
  if (!configured) {
    console.error(
      'SMTP is NOT configured: SMTP_HOST, SMTP_USER and SMTP_PASSWORD must all be set in .env.\n' +
        'Without them no form on the website emails anybody — submissions are only stored.',
    )
    process.exit(1)
  }

  const payload = await getPayload({ config })
  await payload.sendEmail({
    to,
    subject: 'SIWS website — test email',
    text:
      'This is a test from the SIWS website. If it arrived, admission enquiries, feedback and data requests will reach the school by email.',
  })

  console.log(`Sent to ${to} through ${process.env.SMTP_HOST}. Check the inbox (and spam).`)
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error('Sending failed:', error)
  process.exit(1)
})
