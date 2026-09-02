import { ExternalLink, FileText, Link2, Megaphone } from 'lucide-react'

import { CMSLink } from '@/components/CMSLink'
import type { AnnouncementsBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

const HEIGHTS: Record<string, string> = {
  short: 'max-h-72',
  medium: 'max-h-104',
  all: '',
}

/** A date the browser and a screen reader both read correctly. */
const formatDate = (value: string): { iso: string; label: string } | null => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return {
    iso: parsed.toISOString().slice(0, 10),
    label: parsed.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  }
}

/**
 * The notice board.
 *
 * The icon tells a parent what they are about to open — a PDF, a page, or
 * another website — before they tap it on a metered connection. It is chosen
 * from the link itself rather than authored, so it cannot fall out of step
 * with where the notice actually goes.
 */
export const AnnouncementsBlockView = ({ block }: { block: AnnouncementsBlock }) => {
  const items = block.items ?? []
  if (items.length === 0) return null

  const height = HEIGHTS[block.maxHeight ?? 'medium'] ?? HEIGHTS.medium
  const scrolls = height.length > 0

  return (
    <Section background={block.background as BlockBackground}>
      <div className="mb-8 flex items-center justify-center gap-3">
        <span aria-hidden="true" className="text-brand">
          <Megaphone size={30} strokeWidth={1.75} />
        </span>
        <SectionHeading
          heading={block.heading}
          accentWord={block.accentWord}
          level={block.headingLevel}
          className="mb-0"
        />
      </div>

      <div className="max-w-4xl rounded-2xl bg-white p-2 shadow-card sm:p-4">
        {/*
          `tabIndex={0}` on a scrollable region is deliberate: WCAG 2.1 SC 2.1.1
          means a keyboard user must be able to scroll it, and a div with
          overflow is not focusable by default. The accessible name comes from
          the heading via aria-label.
        */}
        <ul
          className={`divide-y divide-line overflow-y-auto ${height}`}
          {...(scrolls
            ? { tabIndex: 0, role: 'region', 'aria-label': block.heading ?? 'Announcements' }
            : {})}
        >
          {items.map((item, index) => {
            // Optional: an announcement with nothing to open is still a notice.
            const link = item.cta?.[0]?.link ?? null
            const isFile =
              link?.type !== 'external' &&
              typeof link?.reference === 'object' &&
              link.reference !== null &&
              'relationTo' in link.reference &&
              link.reference.relationTo === 'media'

            const isExternal = link?.type === 'external'
            const Icon = !link ? Megaphone : isFile ? FileText : isExternal ? ExternalLink : Link2
            const date = item.date ? formatDate(item.date) : null

            return (
              <li key={item.id ?? index} className="px-3 py-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-0.5 shrink-0 text-brand">
                    <Icon size={18} strokeWidth={2} />
                  </span>

                  <div className="min-w-0">
                    {link ? (
                      <CMSLink
                        link={link}
                        overrideClassName
                        className="t-small leading-relaxed font-medium text-brand underline decoration-accent-deep decoration-2 underline-offset-4 hover:text-brand-deep"
                      >
                        {item.title}
                      </CMSLink>
                    ) : (
                      <p className="t-small leading-relaxed font-medium text-brand">
                        {item.title}
                      </p>
                    )}

                    {date ? (
                      <p className="mt-1 text-sm text-ink-muted">
                        <time dateTime={date.iso}>{date.label}</time>
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Section>
  )
}
