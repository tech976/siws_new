import { Media } from '@/components/Media'
import type { Media as MediaDoc, VideoGalleryBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'
import { VideoCard } from './VideoCard'
import Link from 'next/link'
import { readConsent } from '@/app/(frontend)/actions/consent'
import { hasConsent } from '@/lib/cookie-consent'

/**
 * A row of event videos.
 *
 * THE STILLS ARE LETTERBOXED, NOT CROPPED.
 *
 * A school's videos are filmed on whatever was to hand: the Independence Day
 * one is 16:9 off a camera, the Raksha Bandhan one is 9:16 off a phone. Every
 * card keeps the same 16:9 frame so the row lines up, and `object-contain`
 * fits each still inside it — an upright film shows as a tall still with dark
 * either side, which is what every video player on earth does and what a
 * viewer already reads as "this was filmed on a phone".
 *
 * Cropping to fill instead would take a 9:16 still down to its middle third,
 * and on these particular films that is where the caption is.
 */
export const VideoGalleryBlockView = async ({ block }: { block: VideoGalleryBlock }) => {
  const videos = (block.videos ?? []).filter(
    (item) => item.poster && typeof item.poster === 'object' && item.driveUrl,
  )

  if (videos.length === 0) return null

  /*
   * FR-PRV-02 — Drive's player is a third-party frame that sets Google's
   * cookies. `VideoCard` is a client component (it holds the play state), so
   * the check cannot live inside it: consent is resolved here, on the server,
   * and the card is only given the id it needs to build the frame once the
   * visitor has allowed embedded media.
   *
   * The POSTER still renders either way. It is our own photograph out of the
   * media library, so a visitor who declined cookies sees the gallery and what
   * each film is of — they simply cannot press play.
   */
  const embedsAllowed = hasConsent(await readConsent(), 'embeds')

  return (
    <Section background={block.background as BlockBackground}>
      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
        className="mb-10"
      />

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {videos.map((item, index) => {
          const poster = item.poster as MediaDoc

          return (
            <li
              key={item.id ?? index}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-line/70 shadow-[0_1px_2px_rgba(36,39,111,0.04),0_10px_28px_-14px_rgba(36,39,111,0.22)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_6px_rgba(36,39,111,0.08),0_22px_46px_-18px_rgba(36,39,111,0.34)]"
            >
              {/*
                Black, because that is what Drive's player letterboxes with.
                The brand blue was the one place on this card where pressing
                play changed something it should not have: the bars either
                side of the upright film jumped from blue to black at the
                moment the picture became a video. Matching them means the
                frame holds still and only its contents come alive.
              */}
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                {embedsAllowed ? (
                  <VideoCard title={item.title} driveId={item.driveUrl}>
                    <Media
                      resource={poster}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                      fill
                      className="object-contain"
                    />
                  </VideoCard>
                ) : (
                  <>
                    <Media
                      resource={poster}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                      fill
                      className="object-contain"
                    />
                    {/*
                      Over the still rather than replacing it: the photograph is
                      ours and worth showing, and this says why pressing it does
                      nothing yet.
                    */}
                    <Link
                      href="/cookies"
                      className="absolute inset-0 grid place-items-center bg-black/55 p-4 text-center text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      Allow embedded media to play this film
                    </Link>
                  </>
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="card-title font-semibold text-brand">{item.title}</h3>
                {item.description ? (
                  <p className="mt-1.5 t-small leading-snug text-ink-soft">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
