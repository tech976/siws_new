import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { RichTextBlock } from '@/payload-types'

import { Section, SectionHeading, SectionSplit, type BlockBackground } from './Section'

export const RichTextBlockView = ({ block }: { block: RichTextBlock }) => {
  const background = block.background as BlockBackground

  /*
   * `narrow` is the one width that stays centred, because it is what editors
   * pick for a single statement — a vision, a quote, a notice. Those want to
   * be read as a unit with nothing beside them; hanging one off a heading rail
   * would leave two-thirds of the row empty and make the statement look like
   * an aside rather than the point of the section.
   */
  if (block.width === 'narrow') {
    const backdrop = block.backgroundImage

    const body = (
      /*
        Left-aligned, not centred. A centred block of prose gives the eye no
        fixed left edge to return to on each line, which is why centred body
        copy is harder to read than the same text ranged left — and it
        detaches this section from the spine every other section on the page
        shares. The statement is set large and given a short accent rule
        instead, which is what makes it read as a statement.
      */
      <div className="mx-auto max-w-[46rem] text-center">
        <span aria-hidden="true" className="mx-auto block h-1 w-12 rounded-full bg-accent" />
        <SectionHeading
          heading={block.heading}
          accentWord={block.accentWord}
          level={block.headingLevel}
          className="mt-6 mb-5"
        />
        <RichText data={block.content} className="text-xl leading-relaxed sm:text-2xl" />
      </div>
    )

    if (!backdrop) {
      return <Section background={background}>{body}</Section>
    }

    /*
     * With a photograph behind it the band is built here rather than through
     * `Section`, because `Section` paints a flat background colour and this
     * one needs three stacked layers: picture, gradient, content.
     *
     * ONE COLOUR: brand blue #2e3192, the value SIWS asked for, at three
     * opacities. The previous wash mixed in `brand-deep` (#24276f) at the
     * edges, which is a different, darker blue — against the page it read as
     * a vignette rather than as the brand.
     *
     * Denser at the edges than in the middle, because the statement sits in
     * the middle: the picture is most readable exactly where there is no text
     * over it. White type measures 5.1:1 over the lightest pixel behind it,
     * past the 4.5:1 AA floor with margin for a brighter photograph than this
     * one — a flat 70% wash was tried first and measured 3.9:1, which fails.
     *
     * `data-invert` flips the heading and body to white, the same signal
     * `Section` sends for a solid brand background, so the type treatment does
     * not have to be restated here.
     */
    return (
      <section data-invert="true" className="relative isolate overflow-hidden py-14 sm:py-20">
        <Media
          resource={backdrop}
          sizes="100vw"
          fill
          className="absolute inset-0 -z-20 object-cover"
          objectPosition="center 38%"
          // Decorative: the statement above it is the content of this section.
          alt="-"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[#2e3192]/92 via-[#2e3192]/72 to-[#2e3192]/92"
        />
        <div className="siws-container">{body}</div>
      </section>
    )
  }

  return (
    <Section background={background}>
      <SectionSplit
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
      >
        <RichText data={block.content} />
      </SectionSplit>
    </Section>
  )
}
