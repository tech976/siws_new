/**
 * Turns any YouTube address a person might paste into an embeddable one.
 *
 * WHY EVERY SHAPE, AND NOT JUST THE ONE IN THE DOCS. Somebody copying a link
 * gets whatever the button they pressed hands them: the watch page from the
 * address bar, a youtu.be link from Share, a `/live/` link from a stream, a
 * `/shorts/` link from a phone. All four name the same video and only one of
 * them is the embed form, so the parser takes the id out of any of them rather
 * than asking an editor to know the difference.
 *
 * WHY `youtube-nocookie`. A visitor who came to watch a school prize-giving is
 * handed advertising cookies by the ordinary embed before they press play.
 * The no-cookie host does not set them until playback starts, which is the
 * right default for a school site and sits far better with the DPDPA 2023 than
 * silently profiling a parent.
 *
 * Returns null when the address is not YouTube at all, so a caller can decide
 * what to do rather than rendering a broken frame.
 */
export const youtubeEmbed = (url: string): string | null => {
  const trimmed = url.trim()
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{6,})/i,
    /(?:youtu\.be\/)([\w-]{6,})/i,
    /(?:youtube\.com\/(?:live|shorts|embed)\/)([\w-]{6,})/i,
  ]
  for (const pattern of patterns) {
    const id = trimmed.match(pattern)?.[1]
    if (id) return `https://www.youtube-nocookie.com/embed/${id}`
  }
  return null
}
