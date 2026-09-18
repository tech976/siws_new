import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('./lexical')

/**
 * Fills Data protection → Cookies with the cookies this site actually sets,
 * and puts the live cookie list on the cookie policy page.
 *
 * The list is what the code sets today, surveyed from the code rather than
 * guessed: our own preference and consent cookies, the admin panel's session,
 * the language choice, and what the four embed providers set once a visitor
 * allows embedded media. There is no analytics on the site, so that category is
 * deliberately empty — the page says so rather than listing something that is
 * not there.
 *
 * On the /cookies page it changes only the two sections that were placeholders
 * for SYSTEM behaviour — the cookie list, and how to change your choice — and
 * only while they still say "To be supplied by SIWS". The policy's own wording
 * is the school's and is left alone.
 *
 * Run with:  npm run seed:cookies
 * The cookie list is written only if it is empty; pass --force to replace it.
 */

const FORCE = process.argv.includes('--force')

const COOKIES = [
  {
    name: 'siws-cookie-consent',
    provider: 'SIWS (this website)',
    category: 'necessary',
    purpose:
      'Remembers the cookie choice you made, and the anonymous reference it is recorded under, so we do not ask again on every page.',
    duration: '1 year',
  },
  {
    name: 'siws_text_size, siws_contrast',
    provider: 'SIWS (this website)',
    category: 'necessary',
    purpose: 'Remember the text size and high-contrast setting you chose in the accessibility controls.',
    duration: '1 year',
  },
  {
    name: 'siws-dismissed-notices',
    provider: 'SIWS (this website)',
    category: 'necessary',
    purpose: 'Remembers which general notices at the top of the page you closed, so they stay closed.',
    duration: 'Until you close your browser',
  },
  {
    name: 'googtrans',
    provider: 'SIWS, for Google Translate',
    category: 'necessary',
    purpose:
      'Set only when you choose a language in the top bar, to remember that choice. Choosing a language also loads Google Translate, which may set cookies of its own.',
    duration: '1 year, or until you switch back to English',
  },
  {
    name: 'payload-token',
    provider: 'SIWS (this website)',
    category: 'necessary',
    purpose: 'Keeps school staff signed in to the admin panel. Never set for visitors to the website.',
    duration: '2 hours',
  },
  {
    name: 'NID and related Google cookies',
    provider: 'Google Maps',
    category: 'embeds',
    purpose: 'Set by Google when a map on our contact pages loads.',
    duration: 'Set by Google — up to 6 months',
  },
  {
    name: 'YSC, VISITOR_INFO1_LIVE and related',
    provider: 'YouTube',
    category: 'embeds',
    purpose: 'Set by YouTube when a live telecast or video loads on the page.',
    duration: 'Set by YouTube — from the end of your session up to 6 months',
  },
  {
    name: 'Google account and player cookies',
    provider: 'Google Drive',
    category: 'embeds',
    purpose: 'Set by Google when you play one of our event videos.',
    duration: 'Set by Google',
  },
  {
    name: 'csrftoken, mid, ig_did and related',
    provider: 'Instagram (Meta)',
    category: 'embeds',
    purpose: 'Set by Instagram when our Instagram posts load on the page.',
    duration: 'Set by Instagram — up to 1 year',
  },
]

const main = async () => {
  const payload = await getPayload({ config })

  const inventory = (await payload.findGlobal({
    slug: 'cookie-inventory',
    depth: 0,
    overrideAccess: true,
  })) as unknown as { cookies?: unknown[] }

  if (FORCE || !inventory.cookies || inventory.cookies.length === 0) {
    await payload.updateGlobal({
      slug: 'cookie-inventory',
      data: { cookies: COOKIES } as never,
      overrideAccess: true,
    })
    payload.logger.info(`Cookie list written: ${COOKIES.length} entries.`)
  } else {
    payload.logger.info(`Cookie list already has ${inventory.cookies.length} entries — left alone.`)
  }

  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'cookies' } }, { unit: { exists: false } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const page = docs[0] as unknown as
    | { id: number; layout?: Record<string, unknown>[] }
    | undefined

  if (!page) {
    payload.logger.warn('No /cookies page — run npm run seed:legal first.')
    process.exit(0)
  }

  const stillPlaceholder = (block: Record<string, unknown>) =>
    JSON.stringify(block.content ?? '').includes('To be supplied by SIWS')

  let changed = 0
  const layout = (page.layout ?? []).map((block) => {
    if (block.blockType !== 'richText' || !stillPlaceholder(block)) return block

    if (block.heading === 'The cookies this site uses') {
      changed += 1
      return {
        blockType: 'cookieInventory',
        heading: 'The cookies this site uses',
        intro:
          'Grouped by the categories in our cookie banner. Strictly necessary cookies are always on; the others are only set if you allow them.',
        background: 'white',
      }
    }

    if (block.heading === 'Changing your choice') {
      changed += 1
      return {
        ...block,
        content: richText([
          'Choose “Cookie settings” at the foot of any page. Your choice is cleared and the cookie banner appears again, so you can choose differently — withdrawing takes one click, the same as agreeing did.',
          'Until you allow embedded media, videos, maps and social posts are not loaded at all: you will see a link to open them on the provider’s own site instead.',
          'Every choice is recorded in our consent register under an anonymous reference kept in your browser. It does not identify you.',
        ]),
      }
    }

    return block
  })

  if (changed > 0) {
    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { layout } as never,
      overrideAccess: true,
    })
    payload.logger.info(`Cookie policy page: ${changed} placeholder section(s) replaced.`)
  } else {
    payload.logger.info('Cookie policy page: nothing to replace.')
  }

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
