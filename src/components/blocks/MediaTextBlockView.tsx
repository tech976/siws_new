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
   * students standing together is one, and stretching 1200x1600 into a frame
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
  /*
   * For a DOCUMENT — a certificate, an award, anything whose content is the
   * words printed on it.
   *
   * It keeps the ratio the paper was photographed at instead of stretching to
   * the row, because a document cropped at the edges has lost part of itself:
   * the wide frame took the signatures off the foot of this certificate and
   * clipped its border. 3:2 is within about two per cent of the photograph's
   * own shape, so what goes is a sliver of margin.
   */
  document: 'rounded-2xl aspect-[3/2]',
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
      {/*
        A FLEX ROW WHEN THE FRAME IS UPRIGHT, so the photograph ends level
        with the words instead of towering over them.

        The twelve-column grid gives the image a share of the WIDTH — seven
        columns — and a square frame then takes whatever height that width
        implies. At 660px wide that was a 660px-tall photograph beside about
        370px of text, and no amount of vertical centring hides 290px of
        difference.

        Here the two are flex items on a stretched line, so both are exactly
        as tall as the taller one — and since the frame has no intrinsic
        height of its own, that is the text. `aspect-square` with an `auto`
        width then works the other way round from usual: the height comes
        from the row and the WIDTH is derived from it. The photograph sizes
        itself down to match the words, and it does so without cropping,
        which is the whole reason this frame exists.
      */}
      <div
        className={
          upright
            ? `flex flex-col items-center gap-8 lg:items-stretch lg:justify-center lg:gap-10 ${
                imageFirst ? 'lg:flex-row' : 'lg:flex-row-reverse'
              }`
            : 'grid items-stretch gap-10 lg:grid-cols-12 lg:gap-14'
        }
      >
        <div
          className={
            upright
              ? // The flex item, and it carries a REAL width.
                //
                // Deriving the width from the stretched height instead —
                // `aspect-square` on an auto-width item — is circular, and
                // the browser resolves it by sizing the cell from content
                // it has not laid out yet: the frame rendered at its full
                // height straight across the words beside it. Flex settles
                // main size before cross size, so the width has to be known
                // going in and the height is what comes out.
                'w-full max-w-sm lg:w-[23rem] lg:max-w-none lg:shrink-0'
              : [
                  // On a phone the image always leads, whichever side was
                  // chosen — `order` only applies once there are two columns.
                  imageFirst ? 'lg:order-1' : 'lg:order-2',
                  'lg:col-span-7',
                  // Passes the stretched row height down to the frame inside.
                  'lg:min-h-96',
                ].join(' ')
          }
        >
          <div
            className={
              upright
                ? // Square on a phone, where the frame has only a width to
                  // work from. From `lg` the ratio steps aside and the frame
                  // takes the row's height, which is the text's — so the two
                  // finish level. The result is near enough square that the
                  // crop stays small, and the focal point saved with the
                  // picture decides which sliver goes.
                  'relative aspect-square w-full overflow-hidden rounded-2xl shadow-card lg:aspect-auto lg:h-full'
                : `relative w-full overflow-hidden shadow-card ${
                    SHAPE_CLASS[block.imageShape ?? 'rounded'] ?? SHAPE_CLASS.rounded
                  }`
            }
          >
            <Media
              resource={block.image}
              sizes={upright ? '(min-width: 1024px) 28rem, 24rem' : '(min-width: 1024px) 45vw, 100vw'}
              fill
              className="object-cover"
            />
            {/*
              A blue wash rising from the foot of the frame. It ties the
              photographs to the palette so a set of pictures taken on
              different days under different light still reads as one page,
              and it weights the bottom of the frame so the image sits
              against the text column instead of floating beside it.

              Its own justification was that the top two-thirds stay clear, so
              the subject is untouched — which held while these frames carried
              a wide scene with the subject up in it. A picture cropped TO its
              subject has no spare bottom third: at full strength the wash sat
              over three sets of clothes and turned them a flat purple. So the
              upright frame gets a quarter of it — enough to keep the tie to
              the palette, not enough to colour anybody in.
            */}
            {/*
              No wash at all over a document. The tint is there to make a set
              of photographs taken on different days read as one page; run it
              over a certificate and it stops looking like a certificate and
              starts looking like a photocopy with something spilled on it.
              The point of putting the award on the page is that a parent can
              read what it says.
            */}
            {block.imageShape === 'document' ? null : (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent ${
                  upright ? 'from-brand/25 via-brand/5' : 'from-brand/55 via-brand/10'
                }`}
              />
            )}
          </div>
        </div>

        <div
          className={
            upright
              ? // A SET measure, because it is what decides the row height —
                // and therefore the size of the photograph beside it. Left
                // flexible, the width would depend on the image, whose width
                // depends on this height, which depends on this width.
                'flex flex-col justify-center lg:w-[27rem] lg:shrink-0'
              : `flex flex-col justify-center lg:col-span-5 ${imageFirst ? 'lg:order-2' : 'lg:order-1'}`
          }
        >
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
            className={isPageLead ? 'text-left t-h4' : undefined}
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
