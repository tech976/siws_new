import { CalendarDays } from 'lucide-react'
import { youtubeEmbed } from '@/lib/youtube'

import { GalleryPager } from '@/components/blocks/GalleryPager'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import type { Post } from '@/payload-types'

import { Section } from './Section'

/**
 * Renders a department write-up from its template.
 *
 * The author picked one of three arrangements and supplied text, photographs
 * and perhaps a video; everything about how those sit on the page is decided
 * here. That is the point — the trustees asked that HODs "should not have to
 * design or create web pages", so there is no per-post styling to get wrong.
 */


const PostVideo = ({ post }: { post: Post }) => {
  const embed = post.video?.youtubeUrl ? youtubeEmbed(post.video.youtubeUrl) : null

  if (embed) {
    return (
      <div className="mt-10 overflow-hidden rounded-2xl bg-brand-deep">
        {/*
          youtube-nocookie, so a visitor who only reads a news item is not
          handed advertising cookies by a school website (DPDPA 2023 sits
          badly with silently profiling a parent who came to see a sports day).
        */}
        <iframe
          src={embed}
          title={`Video — ${post.title}`}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="aspect-video w-full border-0"
        />
      </div>
    )
  }

  const file = post.video?.file
  if (file && typeof file === 'object' && typeof file.url === 'string') {
    return (
      <video
        controls
        preload="metadata"
        className="mt-10 aspect-video w-full rounded-2xl bg-brand-deep"
        src={file.url}
      >
        Your browser cannot play this video.
      </video>
    )
  }

  return null
}

const PostPhotos = ({ post }: { post: Post }) => {
  const photos = (post.photos ?? []).filter(
    (photo): photo is NonNullable<typeof photo> & object =>
      typeof photo === 'object' && photo !== null,
  )
  if (photos.length === 0) return null

  /*
   * `relative` and the aspect ratio belong to the figure, not the image. A
   * filled image is positioned absolutely against its nearest positioned
   * ancestor; with none, the first version escaped its frame and covered the
   * whole page.
   */
  const tiles = photos.map((photo) => (
    <figure key={photo.id} className="relative aspect-4/3 overflow-hidden rounded-2xl bg-sea">
      <Media
        resource={photo}
        fill
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
        className="object-cover"
      />
    </figure>
  ))

  // Paged, so a sixty-photograph album is not one endless scroll.
  return (
    <div className="mt-10">
      <GalleryPager items={tiles} perPage={12} />
    </div>
  )
}

export const PostView = ({ post }: { post: Post }) => {
  const when = post.date
    ? new Date(post.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const text = post.body ? <RichText data={post.body} className="mx-auto max-w-3xl" /> : null
  const album = post.template === 'album'

  return (
    <article>
      <Section background="sea">
        <div className="mx-auto max-w-3xl text-center">
          {when ? (
            <p className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand">
              <CalendarDays aria-hidden="true" size={16} />
              {/* A machine-readable date beside the human one, for search results. */}
              <time dateTime={post.date ?? undefined}>{when}</time>
            </p>
          ) : null}
          <h1 className="mt-3 text-3xl sm:text-4xl">{post.title}</h1>
          {post.summary ? <p className="mt-4 text-lg text-ink-soft">{post.summary}</p> : null}
        </div>
      </Section>

      <Section background="white">
        {/*
          The only thing the template changes: an album leads with the pictures
          and explains underneath, a story explains first. A notice has no
          photographs at all, so both orderings collapse to the same thing.
        */}
        {album ? (
          <>
            <PostPhotos post={post} />
            {text ? <div className="mt-10">{text}</div> : null}
          </>
        ) : (
          <>
            {text}
            {post.template === 'notice' ? null : <PostPhotos post={post} />}
          </>
        )}

        <PostVideo post={post} />
      </Section>
    </article>
  )
}
