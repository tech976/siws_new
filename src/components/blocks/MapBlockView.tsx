import type { MapBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'
import { EmbedGate } from '@/components/consent/EmbedGate'

const HEIGHT_CLASS: Record<string, string> = {
  short: 'h-64 sm:h-72',
  medium: 'h-80 sm:h-96',
  tall: 'h-96 sm:h-[32rem]',
}

/**
 * A location map.
 *
 * The embed URL is BUILT from the address rather than stored, so nothing an
 * editor types is ever interpreted as markup: `encodeURIComponent` means the
 * worst a malicious address can do is fail to find a place. Storing a pasted
 * `<iframe>` instead would put third-party HTML in the database and render it
 * into the page, which is a script-injection route through the CMS.
 *
 * `q=` with a plain address needs no API key and no billing account — the
 * keyed Embed API would put a credential in the client bundle and bill the
 * school per view, for a map that never changes.
 */
export const MapBlockView = async ({ block }: { block: MapBlock }) => {
  const address = block.address?.trim()
  if (!address) return null

  const query = encodeURIComponent(address)
  const embedSrc = `https://www.google.com/maps?q=${query}&output=embed`
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${query}`

  const title = block.label?.trim()
    ? `Map showing ${block.label.trim()}`
    : 'Map showing the school’s location'

  return (
    <Section background={(block.background ?? 'white') as BlockBackground}>
      <SectionHeading heading={block.heading} accentWord={block.accentWord} level="h2" />

      {/*
        FR-PRV-02 — the frame is Google's and sets Google's cookies, so it is
        not rendered until the visitor has allowed embedded media. The address
        and the directions link below are ours and stay unconditional: a parent
        who declined cookies still needs to know where the school is.
      */}
      <div className="mt-6">
        <EmbedGate label="map" provider="Google Maps" href={directionsHref}>
          <div className="overflow-hidden rounded-card border border-line shadow-card">
            <iframe
              src={embedSrc}
              title={title}
              className={`w-full border-0 ${HEIGHT_CLASS[block.height ?? 'medium'] ?? HEIGHT_CLASS.medium}`}
              loading="lazy"
              /*
               * `no-referrer-when-downgrade` is what Google's own embed uses.
               * The map is a third-party frame, so it is denied everything it
               * does not need — no camera, microphone or location.
               */
              referrerPolicy="no-referrer-when-downgrade"
              allow="fullscreen"
            />
          </div>
        </EmbedGate>
      </div>

      {/*
        The address in text beneath, not only inside the frame. An iframe is
        opaque to a screen reader, unreachable without JavaScript, and useless
        to anyone printing the page — so the address a visitor actually needs
        is on the page itself, with directions one tap away on a phone.
      */}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <address className="not-italic">
          {block.label ? (
            <span className="block font-semibold text-brand">{block.label}</span>
          ) : null}
          <span className="mt-1 block whitespace-pre-line text-ink-soft">{address}</span>
        </address>

        <a
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm"
        >
          Get directions
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </Section>
  )
}
