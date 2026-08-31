import { Media } from '@/components/Media'
import type { Media as MediaDoc, VideoGalleryBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'
import { VideoCard } from './VideoCard'

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
export const VideoGalleryBlockView = ({ block }: { block: VideoGalleryBlock }) => {
  const videos = (block.videos ?? []).filter(
    (item) => item.poster && typeof item.poster === 'object' && item.driveUrl,
  )

  if (videos.length === 0) return null

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
                <VideoCard title={item.title} driveId={item.driveUrl}>
                  <Media
                    resource={poster}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    fill
                    className="object-contain"
                  />
                </VideoCard>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="card-title font-semibold text-brand">{item.title}</h3>
                {item.description ? (
                  <p className="mt-1.5 text-[0.9375rem] leading-snug text-ink-soft">
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
