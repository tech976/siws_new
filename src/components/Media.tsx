import Image from 'next/image'

import { toImageSrc } from '@/lib/image-src'
import type { Media as MediaDoc } from '@/payload-types'

/**
 * Renders an image from the media library.
 *
 * Uses `next/image` so the browser is served an appropriately-sized,
 * modern-format derivative rather than the original upload (NFR Performance —
 * "assets compressed and lazy-loaded where appropriate").
 */

interface MediaProps {
  resource: MediaDoc | number | string | null | undefined
  /** Passed to `sizes`. Describe the rendered width, not the file width. */
  sizes?: string
  className?: string
  /** Set for the single largest image above the fold; leave false elsewhere. */
  priority?: boolean
  /** Crop to fill the container rather than preserving intrinsic ratio. */
  fill?: boolean
  /**
   * Overrides the alt text held in the media library.
   *
   * Narrow by design. The library normally owns alt text, because the person
   * who uploads a photograph is the one who knows what is in it. The exception
   * is an image whose accessible name is fixed by its surroundings rather than
   * its content — an organisation's logo in a strip that already names the
   * organisation. There the page is the authority, and letting the library win
   * risks announcing "logo" six times in a row.
   */
  /**
   * Where to anchor the crop when `fill` is set, as an `object-position` value.
   *
   * Only a FALLBACK: an editor who has moved the focal-point marker in the
   * admin panel overrides it, because they are looking at the actual
   * photograph and this is a guess made in advance about photographs that do
   * not exist yet.
   *
   * Passing the equivalent Tailwind class instead does nothing. The focal
   * point is applied as an inline style, and an inline style beats a class —
   * so `object-[center_38%]` on a divider band was silently discarded for as
   * long as it had been there, and every band was centre-cropped.
   */
  objectPosition?: string
  alt?: string
}

const isPopulated = (value: MediaProps['resource']): value is MediaDoc =>
  typeof value === 'object' && value !== null

export const Media = ({
  resource,
  sizes = '100vw',
  className,
  priority = false,
  fill = false,
  alt: altOverride,
  objectPosition,
}: MediaProps) => {
  // An unpopulated relationship means the file was deleted or is not readable;
  // rendering nothing is preferable to a broken image icon.
  if (!isPopulated(resource) || typeof resource.url !== 'string') return null

  /**
   * FR-SW-05 — a photograph withdrawn at a parent's request must disappear from
   * public display at once.
   *
   * Checked here as well as in the publish guard, because the guard only fires
   * when a page is saved: without this, withdrawing an image would leave it on
   * every already-published page until someone happened to re-save each one.
   */
  if (resource.withdrawn?.isWithdrawn === true) return null

  /**
   * A single hyphen is the agreed convention for "decorative" in the media
   * library. An empty `alt` removes the image from the accessibility tree,
   * which is the correct treatment — announcing a decorative image is noise
   * (WCAG 2.1 SC 1.1.1).
   */
  const rawAlt =
    typeof altOverride === 'string'
      ? altOverride.trim()
      : typeof resource.alt === 'string'
        ? resource.alt.trim()
        : ''
  const alt = rawAlt === '-' ? '' : rawAlt

  const src = toImageSrc(resource.url)

  if (fill) {
    /**
     * Honour the focal point Payload already stores on every upload.
     *
     * A filled image is cropped to its container, and the browser's default is
     * the centre of the file — which is only the centre of the *subject* by
     * luck. Wide group photographs in a tall card lose most of their width, and
     * whoever was standing off to one side goes with it.
     *
     * Payload writes 50/50 on every upload rather than leaving the pair null,
     * so "dead centre" is what an untouched photograph looks like and there is
     * no flag that separates it from a deliberate choice. It is therefore read
     * as untouched, which lets a block that knows it is a shallow letterbox
     * supply a better starting guess than the middle of the file. Moving the
     * marker anywhere off-centre hands control back to the editor, who is
     * looking at the actual photograph.
     *
     * The cost is that an editor who deliberately chooses the exact centre of
     * a band gets the band's guess instead. That is worth it: the alternative
     * left every shallow band centre-cropped, which is what cut a row of
     * children off at the chin on the home page.
     */
    const focalX = typeof resource.focalX === 'number' ? resource.focalX : 50
    const focalY = typeof resource.focalY === 'number' ? resource.focalY : 50
    const placed = focalX !== 50 || focalY !== 50
    const position = placed ? `${focalX}% ${focalY}%` : (objectPosition ?? '50% 50%')

    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        priority={priority}
        style={{ objectPosition: position }}
      />
    )
  }

  // Payload records intrinsic dimensions on upload; the fallback keeps the
  // component usable for a record written before that field existed.
  const width = typeof resource.width === 'number' && resource.width > 0 ? resource.width : 1600
  const height = typeof resource.height === 'number' && resource.height > 0 ? resource.height : 900

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      priority={priority}
      // Everything below the fold defers; the caller opts a hero image in.
      loading={priority ? 'eager' : 'lazy'}
    />
  )
}
