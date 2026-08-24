import { Media } from '@/components/Media'
import type { DividerBlock } from '@/payload-types'

/**
 * A photographic band between sections.
 *
 * The overlay is a gradient rather than a flat tint. Flat colour over a
 * photograph reads as a mistake — as though the image failed to load properly
 * — where a directional wash reads as intent, and it keeps the picture legible
 * at the light end while guaranteeing contrast for any text at the dark end.
 *
 * Every option is dark enough that white text clears 4.5:1 whatever photograph
 * an editor uploads. That is the point of fixing the overlay to three brand
 * values instead of offering a colour picker: a divider cannot be made
 * unreadable from the admin panel.
 *
 * `aria-hidden` on the picture and no heading anywhere: this band is
 * decoration, and announcing it would interrupt the document outline between
 * two real sections. Any line of text on it is rendered as an ordinary
 * paragraph, so it is still read aloud.
 */

/*
 * A DARK overlay, not a tint.
 *
 * These sat at 95-70% of a mid-tone brand colour, which washed the photograph
 * out without ever getting dark enough for the text to feel deliberate — the
 * worst of both. They are now anchored on the darkest brand value and stay
 * dense across the whole band, so the type reads as set ON the picture rather
 * than floating over a faded one.
 *
 * Sea is the exception: it is a pale blue, so a "sea" divider uses the deep
 * value with a sea cast rather than the pale value itself, which could never
 * carry white text at all.
 */
const OVERLAY_CLASS: Record<string, string> = {
  brand: 'bg-gradient-to-r from-brand-deep/92 via-brand/88 to-brand-deep/92',
  sea: 'bg-gradient-to-r from-brand-deep/90 via-sky/85 to-brand-deep/90',
  accent: 'bg-gradient-to-r from-accent-deep/92 via-accent-deep/85 to-accent-deep/92',
}

/*
 * A FIXED height, not a ratio.
 *
 * A band is a rule between two sections, and a rule keeps the same weight
 * whatever the screen. An `aspect-` ratio does the opposite: it grows with the
 * viewport, and `aspect-[8/3]` turned a 208px strip into a 715px slab on a
 * wide monitor that read as a second hero rather than a divider.
 *
 * Slightly deeper than the 160/208px it was, which buys back some of the
 * picture without changing what the band IS. The framing problem it used to
 * have is not solved here at all — it is solved by `objectPosition` below and
 * by the focal point on each photograph, which put the strip over the faces
 * instead of the middle of the file.
 *
 * A strip this shallow shows about a quarter of a landscape photograph and a
 * tenth of a portrait one, so it cannot hold a deep row of faces however it is
 * placed. It wants a WIDE photograph whose subject sits in a band across it;
 * given one, nobody is cut.
 */
const HEIGHT_CLASS: Record<string, string> = {
  slim: 'min-h-44 sm:min-h-60',
  tall: 'min-h-72 sm:min-h-96',
}


export const DividerBlockView = ({ block }: { block: DividerBlock }) => {
  if (!block.image) return null

  const text = block.text?.trim()

  return (
    <section
      data-invert="true"
      className={`relative isolate flex items-center overflow-hidden ${
        HEIGHT_CLASS[block.height ?? 'slim'] ?? HEIGHT_CLASS.slim
      }`}
    >
      <Media
        resource={block.image}
        sizes="100vw"
        fill
        className="absolute inset-0 -z-20 object-cover"
        /* A fallback, used only until someone moves this photograph's focal
           point off centre. Faces sit high in a classroom or assembly frame —
           from roughly an eighth to two-thirds of the way down — so a centred
           crop in a band this shallow takes the back row's heads off and
           spends the space on floor. 30% holds the whole face row for both
           photographs currently on the home page. */
        objectPosition="center 30%"
        // Decorative: the band says nothing the surrounding sections do not.
        alt="-"
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 ${OVERLAY_CLASS[block.overlay ?? 'brand'] ?? OVERLAY_CLASS.brand}`}
      />

      {text ? (
        <div className="siws-container py-10 text-center">
          <p className="mx-auto max-w-3xl text-xl leading-snug text-balance text-white sm:text-2xl">
            {text}
          </p>
          {block.attribution ? (
            <p className="mt-3 text-sm font-semibold tracking-[0.12em] text-white/70 uppercase">
              {block.attribution}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
