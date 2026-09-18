import { EmbedGate } from '@/components/consent/EmbedGate'
import { youtubeEmbed } from '@/lib/youtube'

/**
 * Renders a YouTube block placed inside rich text. Waits for "embedded media"
 * consent like every embed on the site; until then the visitor gets a link to
 * the video on YouTube instead.
 */
export const VideoEmbedView = ({
  fields,
}: {
  fields: { url?: string; title?: string; caption?: string | null }
}) => {
  const src = fields.url ? youtubeEmbed(fields.url) : null
  if (!src) return null

  return (
    <figure className="not-prose my-8">
      <EmbedGate label="video" provider="YouTube" href={fields.url}>
        <div className="overflow-hidden rounded-2xl bg-black">
          <iframe
            src={src}
            title={fields.title || 'Video'}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="aspect-video w-full border-0"
          />
        </div>
      </EmbedGate>
      {fields.caption ? (
        <figcaption className="mt-2 text-sm text-ink-muted">{fields.caption}</figcaption>
      ) : null}
    </figure>
  )
}
