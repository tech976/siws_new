import config from '@payload-config'
import { getPayload } from 'payload'

import { CATEGORY_DETAIL, CONSENT_CATEGORIES } from '@/lib/cookie-consent'
import type { CookieInventoryBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * FR-PRV-04 — "name, provider, purpose, category and duration", grouped by the
 * categories the banner offers, so a visitor can match what they allowed to
 * what it lets in.
 *
 * A table per category rather than one long table: the question a visitor is
 * asking is "what did I agree to when I ticked this", and that is answered by
 * the group, not by a column. On a phone each table scrolls sideways inside
 * itself rather than widening the page.
 */

interface CookieRow {
  id?: string
  name: string
  provider: string
  category: string
  purpose: string
  duration: string
}

export const CookieInventoryBlockView = async ({ block }: { block: CookieInventoryBlock }) => {
  let cookies: CookieRow[] = []
  let text: Record<string, { label?: string; description?: string } | undefined> = {}

  try {
    const payload = await getPayload({ config })
    const inventory = (await payload.findGlobal({
      slug: 'cookie-inventory',
      depth: 0,
      overrideAccess: false,
    })) as unknown as { cookies?: CookieRow[] } & typeof text
    cookies = inventory.cookies ?? []
    text = inventory
  } catch {
    cookies = []
  }

  return (
    <Section background={(block.background ?? 'white') as BlockBackground}>
      {block.heading ? (
        <SectionHeading heading={block.heading} accentWord={block.accentWord} level={block.headingLevel} />
      ) : null}

      {block.intro ? <p className="mx-auto mb-8 max-w-3xl text-ink-soft">{block.intro}</p> : null}

      <div className="mx-auto grid max-w-5xl gap-10">
        {CONSENT_CATEGORIES.map((category) => {
          const rows = cookies.filter((row) => row.category === category)
          const label = text[category]?.label || CATEGORY_DETAIL[category].label
          const description = text[category]?.description || CATEGORY_DETAIL[category].description

          return (
            <div key={category}>
              <h3 className="mb-1 text-lg font-bold text-brand">{label}</h3>
              <p className="mb-4 text-sm text-ink-soft">{description}</p>

              {rows.length === 0 ? (
                <p className="rounded-2xl bg-sea-soft px-5 py-3 text-sm text-ink">
                  This website does not currently set any cookies in this category.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl ring-1 ring-line">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <caption className="sr-only">{label} cookies</caption>
                    <thead className="bg-sea-soft text-brand">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Set by</th>
                        <th scope="col" className="px-4 py-3 font-semibold">What it is for</th>
                        <th scope="col" className="px-4 py-3 font-semibold">How long</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={row.id ?? `${row.name}-${index}`} className="border-t border-line align-top">
                          <td className="px-4 py-3 font-mono text-[0.8rem] break-all">{row.name}</td>
                          <td className="px-4 py-3">{row.provider}</td>
                          <td className="px-4 py-3">{row.purpose}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{row.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}
