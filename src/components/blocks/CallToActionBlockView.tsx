import { CMSLink } from '@/components/CMSLink'
import { RichText } from '@/components/RichText'
import type { CallToActionBlock } from '@/payload-types'

import { Section, type BlockBackground } from './Section'

export const CallToActionBlockView = ({ block }: { block: CallToActionBlock }) => {
  const links = block.links ?? []

  return (
    <Section background={block.background as BlockBackground}>
      <div className="siws-centre mx-auto max-w-3xl">
        <h2>{block.heading}</h2>

        {block.text ? <RichText data={block.text} className="mt-4 [&_a]:text-inherit" /> : null}

        {links.length > 0 ? (
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {links.map((entry, index) => (
              <CMSLink key={entry.id ?? index} link={entry.link} />
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  )
}
