import { RichText } from '@/components/RichText'
import type { AccordionBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * Built on native `<details>` / `<summary>`.
 *
 * This ships zero JavaScript, works before hydration, and gets correct
 * keyboard handling, focus management and screen-reader announcement from the
 * browser — all of which a hand-rolled accordion has to reimplement and
 * usually gets subtly wrong.
 */
export const AccordionBlockView = ({ block, index }: { block: AccordionBlock; index: number }) => {
  const items = block.items ?? []
  if (items.length === 0) return null

  /**
   * The `name` attribute makes a group of `<details>` mutually exclusive
   * natively. It must be unique per block, or two accordions on the same page
   * would close each other's items.
   */
  const groupName = block.allowMultipleOpen === false ? `accordion-${block.id ?? index}` : undefined

  return (
    <Section background={block.background as BlockBackground}>
      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
        className="mb-8"
      />

      {/* `siws-accordion` is the hook the open/close transition hangs on —
          see the note beside it in globals.css. */}
      <div className="siws-accordion mx-auto max-w-3xl divide-y divide-line border-y border-line">
        {items.map((item, itemIndex) => (
          <details key={item.id ?? itemIndex} name={groupName} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-brand [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-full bg-sea text-brand transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="pb-5">
              <RichText data={item.answer} />
            </div>
          </details>
        ))}
      </div>
    </Section>
  )
}
