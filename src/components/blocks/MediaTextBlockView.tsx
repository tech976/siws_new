import { CMSLink } from '@/components/CMSLink'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { MediaTextBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * The ratio is held by the wrapper, with the photograph filling it.
 *
 * Putting an `aspect-*` class on the image itself does nothing: `next/image`
 * writes real width and height attributes from the upload, and the base
 * `img { height: auto }` rule then wins over the ratio — so a portrait
 * snapshot rendered a metre tall beside three lines of text, and the two
 * columns no longer balanced.
 *
 * `4/5` rather than a square or a letterbox: a portrait-ish frame sits level
 * with a column of prose without either side leaving a gap.
 */
/**
 * The frame keeps a fixed ratio while stacked, and matches the text column's
 * height once the two sit side by side.
 *
 * A fixed ratio at every width cannot work here: it ties the picture's height
 * to the column's WIDTH, while the text's height comes from how much of it
 * there is. So the two columns only agreed when a section's prose happened to
 * run to the right length — About SIWS, at four paragraphs, left a 213px step
 * beside its photograph while Our History, at three, looked fine.
 *
 * From `lg` the frame stretches to the row instead, so the columns are level
 * whatever an editor writes. Below `lg` the columns are stacked and there is
 * no row to match, so the ratio is what stops a portrait upload running off
 * the screen.
 *
 * The circle is exempt: a circle stretched to a text column is an ellipse.
 */
const SHAPE_CLASS: Record<string, string> = {
  /*
   * THE FRAME STRETCHES TO THE ROW ON DESKTOP.
   *
   * A fixed ratio was tried here to stop a photograph being cropped, and it
   * cost too much: on the portal, where these sections carry several
   * paragraphs, the picture no longer grew with the text and the History and
   * About bands visibly shrank. The stretch is what makes the image read as
   * the subject of the band rather than as an illustration beside it.
   *
   * The cropping it can cause is fixed at the source instead — by uploading a
   * LANDSCAPE photograph. A portrait upload stretched into a wide frame loses
   * its top and bottom, which is where faces are; that is what went wrong on
   * Primary, and the answer was a better photograph, not a smaller frame.
   */
  rounded: 'rounded-2xl aspect-[5/4] lg:aspect-auto lg:h-full',
  square: 'rounded-none aspect-[5/4] lg:aspect-auto lg:h-full',
  circle: 'rounded-full aspect-square',
  /*
   * The one shape that does NOT stretch to the row.
   *
   * For an upright photograph. The rule above — upload landscape — holds
   * wherever there is a choice, but some pictures only exist upright: three
   * pupils standing together is one, and stretching 1200x1600 into a frame
   * twice as wide as it is tall keeps the middle 43% and cuts the heads off.
   *
   * So this frame keeps its own height instead of stretching to the row,
   * and the text column centres against it.
   *
   * Square rather than the full 3:4, which is a crop of the CEILING. At 3:4
   * an upright photograph beside two paragraphs left the words floating in
   * the middle of a 900px band with 300px of empty tint above and below
   * them. A square takes a quarter off the height, and the focal point saved
   * with the picture decides which quarter — set it low and the ceiling goes
   * while the faces stay whole. That is the trade the wide frame could not
   * make: it needed to lose HALF the height, which is faces.
   */
  portrait: 'rounded-2xl aspect-square',
}

export const MediaTextBlockView = ({ block }: { block: MediaTextBlock }) => {
  const imageFirst = block.imagePosition !== 'right'
  const cta = block.cta?.[0]?.link
  /*
   * An upright frame keeps its own height instead of stretching to the row,
   * which changes how the row is put together: the words centre against the
   * picture rather than filling beside it, and they sit CLOSE to it. The wide
   * gutter is there to separate a photograph from a column of prose of the
   * same height; against a tall frame it just reads as a hole between them.
   */
  const upright = block.imageShape === 'portrait'
  /*
   * This section IS the top of the page — the route hands its header over to
   * any first block whose heading is the page title. So the words beside the
   * picture are the page's lead paragraph, and they take the lead size the
   * route's own header used to give them, not body size.
   */
  const isPageLead = block.headingLevel === 'h1'

  /* ------------------------------------------------------------- image above
   *
   * A stacked band: heading, then the photograph across the full measure, then
   * the words beneath it.
   *
   * The side-by-side split is right when the text has enough substance to hold
   * its own column. When it is two or three lines it does not — the column runs
   * out halfway down and leaves a pane of empty white beside a tall picture,
   * which is what "the alignment is not correct" meant. Stacking gives the
   * photograph the whole width, which is the point of choosing this option, and
   * the short text sits under it as a caption would.
   *
   * The frame keeps a wide ratio rather than stretching: there is no text
   * column beside it to match a height to.
   */
  /* ------------------------------------------------------------- figure
   *
   * A single photograph, centred, with its caption underneath — what a print
   * figure does.
   *
   * The `above` band would not serve this: it stretches the picture to the
   * full measure at 21:9, which is right for a wide campus shot and wrong for
   * a portrait group photograph, where it would crop three people down to a
   * strip of their shoulders. Here the frame follows the picture instead —
   * capped in width and left to take its own height.
   *
   * The caption is centred and set in brand weight, so it reads as a label
   * belonging to the image rather than as the first line of the next section.
   */
  if (block.imagePosition === 'figure') {
    return (
      <Section background={block.background as BlockBackground}>
        {block.heading ? (
          <div className="mb-10">
            <span aria-hidden="true" className="mx-auto mb-5 block h-1 w-12 rounded-full bg-accent" />
            <SectionHeading
              heading={block.heading}
              accentWord={block.accentWord}
              level={block.headingLevel}
            />
          </div>
        ) : null}

        <figure className="mx-auto w-full max-w-lg">
          {/*
            `w-full h-auto` with real intrinsic dimensions rather than a fixed
            ratio: the picture keeps its own shape, so nothing is cropped and a
            portrait and a landscape both sit correctly in the same block.
          */}
          <div className="overflow-hidden rounded-3xl bg-brand-tint ring-1 ring-line/70 shadow-[0_2px_6px_rgba(36,39,111,0.06),0_18px_44px_-18px_rgba(36,39,111,0.30)]">
            <Media
              resource={block.image}
              sizes="(min-width: 768px) 32rem, 100vw"
              className="h-auto w-full object-cover"
            />
          </div>

          <figcaption className="mt-6 text-center text-xl font-bold text-balance text-brand">
            <RichText data={block.content} className="siws-centre" />
          </figcaption>
        </figure>
      </Section>
    )
  }

  if (block.imagePosition === 'above') {
    return (
      <Section background={block.background as BlockBackground}>
        <div className="mb-10">
          <span aria-hidden="true" className="mx-auto mb-5 block h-1 w-12 rounded-full bg-accent" />
          <SectionHeading
            heading={block.heading}
            accentWord={block.accentWord}
            level={block.headingLevel}
          />
        </div>

        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-card sm:aspect-[21/9]">
          <Media resource={block.image} sizes="100vw" fill className="object-cover" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand/45 via-brand/5 to-transparent"
          />
        </div>

        {/*
          A measured column under a full-width picture. Left to the container
          the line would run the whole 1200px and be unreadable; centred, it
          sits on the same axis as the heading above it.
        */}
        <div className="siws-centre mx-auto mt-10 max-w-3xl">
          <RichText data={block.content} />

          {cta ? (
            <div className="mt-7">
              <CMSLink link={cta} />
            </div>
          ) : null}
        </div>
      </Section>
    )
  }

  return (
    <Section background={block.background as BlockBackground}>
      {/*
        The heading sits above the split, not inside the text column.
        Alternating the photograph left and right is what gives a run of these
        sections any rhythm — but with the heading inside the text column, a
        right-hand photograph pushed the heading to the middle of the page
        while every other section on the site started at the left margin. One
        heading 600px out of line breaks the spine the whole page is read
        against. Lifting it out keeps the alternation and the alignment.
      */}
      <div className="mb-10">
        <span aria-hidden="true" className="mx-auto mb-5 block h-1 w-12 rounded-full bg-accent" />
        <SectionHeading
          heading={block.heading}
          accentWord={block.accentWord}
          level={block.headingLevel}
        />
      </div>

      {/*
        The photograph gets the larger share, 7 columns to the text's 5.
        At an even split the picture was the same width as a column of prose
        and read as an illustration beside the text rather than as the subject
        of the band — which is what "the image is small" meant.
      */}
      <div
        className={`grid lg:grid-cols-12 ${
          upright
            ? 'items-center gap-8 lg:gap-10'
            : 'items-stretch gap-10 lg:gap-14'
        }`}
      >
        <div
          className={[
            // On a phone the image always leads, whichever side was chosen —
            // `order` only applies once there are two columns to order.
            imageFirst ? 'lg:order-1' : 'lg:order-2',
            'lg:col-span-7',
            // Passes the stretched row height down to the frame inside.
            'lg:min-h-96',
          ].join(' ')}
        >
          <div
            className={`relative w-full overflow-hidden shadow-card ${
              SHAPE_CLASS[block.imageShape ?? 'rounded'] ?? SHAPE_CLASS.rounded
            }`}
          >
            <Media
              resource={block.image}
              sizes="(min-width: 1024px) 45vw, 100vw"
              fill
              className="object-cover"
            />
            {/*
              A blue wash rising from the foot of the frame. It ties the
              photographs to the palette so a set of pictures taken on
              different days under different light still reads as one page,
              and it weights the bottom of the frame so the image sits
              against the text column instead of floating beside it.
              Transparent for the top two-thirds, so the subject is untouched.
            */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand/55 via-brand/10 to-transparent"
            />
          </div>
        </div>

        <div className={`flex flex-col justify-center lg:col-span-5 ${imageFirst ? 'lg:order-2' : 'lg:order-1'}`}>
          {/*
            RAGGED RIGHT, not justified, and this is the one place on the site
            that overrides it.

            `.siws-prose` justifies with `hyphens: auto`, which is right for
            the full-measure columns it was written for. This column is five
            of twelve — about 37 characters a line. Justification works by
            spreading the slack across the word spaces on a line, and with
            only six or seven words to spread it over there is nowhere for it
            to go: the gaps opened up wide enough to read as holes, which is
            what made the paragraph hard to follow. Hyphenation cannot save
            it either, since a line that short often has no breakable word in
            the right place.

            Ragged right puts every space back to its normal width and moves
            the unevenness to the right margin, where the eye does not have
            to travel through it.
          */}
          <RichText
            data={block.content}
            className={isPageLead ? 'text-left text-[1.1875rem]' : undefined}
          />

          {cta ? (
            <div className="mt-7">
              <CMSLink link={cta} />
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  )
}
