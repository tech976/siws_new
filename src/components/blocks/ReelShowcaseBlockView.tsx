'use client'

import { useEffect, useRef, useState } from 'react'

import type { ReelShowcaseBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * A row of short films, each playing itself without sound until asked.
 *
 * WHY MUTED IS NOT A PREFERENCE. Every browser blocks a video that starts with
 * sound: `play()` returns a rejected promise and the frame sits there. Muted
 * autoplay is the only autoplay there is, and the button on each tile is how
 * sound gets turned on, because a click is the gesture browsers accept.
 *
 * ONE FILM HAS SOUND AT A TIME. Turning a second on while the first is still
 * audible gives two soundtracks at once, which is easy to do by accident on a
 * row of three. Turning one on turns the rest off.
 *
 * NOTHING PLAYS OFF-SCREEN. These are minutes long and megabytes each; three
 * decoding at once is battery, data and a page that stutters as it scrolls. An
 * observer starts a film when it comes into view and pauses it when it leaves,
 * so the work follows the reader — and a film is never audible out of sight.
 */
export const ReelShowcaseBlockView = ({ block }: { block: ReelShowcaseBlock }) => {
  const reels = (block.reels ?? []).filter((reel) => Boolean(reel.src))
  const portrait = block.shape === 'portrait'
  const refs = useRef(new Map<string, HTMLVideoElement>())
  const [audibleKey, setAudibleKey] = useState<string | null>(null)

  useEffect(() => {
    const nodes = [...refs.current.values()]
    if (nodes.length === 0) return

    /*
     * Without IntersectionObserver — an old browser, or a test environment —
     * every film plays. That is the simpler behaviour rather than a row of
     * stills, and it is still silent.
     */
    if (typeof IntersectionObserver === 'undefined') {
      for (const node of nodes) void node.play().catch(() => {})
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement
          if (entry.isIntersecting) {
            // A rejected play() is normal — data saver, or a background tab.
            // The poster stays up, which is the right outcome.
            void video.play().catch(() => {})
          } else {
            video.pause()
            if (!video.muted) {
              video.muted = true
              setAudibleKey(null)
            }
          }
        }
      },
      // Half showing, so a film at the edge of the viewport is not started and
      // stopped again as the page settles.
      { threshold: 0.5 },
    )

    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [reels.length])

  const toggleSound = (key: string) => {
    const next = audibleKey === key ? null : key
    for (const [k, node] of refs.current) {
      node.muted = k !== next
      if (k === next) void node.play().catch(() => {})
    }
    setAudibleKey(next)
  }

  if (reels.length === 0) return null

  return (
    <Section background={block.background as BlockBackground}>
      {block.heading ? (
        <div className="siws-centre mx-auto max-w-2xl text-center">
          <SectionHeading
            heading={block.heading}
            accentWord={block.accentWord}
            level={block.headingLevel}
            className="mb-8"
          />
        </div>
      ) : null}

      <ul
        className={
          portrait
            ? // Tall films run four across at most: at 9:16 a three-column row
              // on a wide screen makes each one taller than the viewport.
              'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
            : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
        }
      >
        {reels.map((reel, index) => {
          const key = reel.id ?? `reel-${index}`
          const audible = audibleKey === key

          return (
            <li key={key}>
              <figure className="group relative overflow-hidden rounded-2xl bg-brand-deep ring-1 ring-line/60">
                <video
                  ref={(node) => {
                    if (node) refs.current.set(key, node)
                    else refs.current.delete(key)
                  }}
                  src={reel.src ?? undefined}
                  poster={reel.poster ?? undefined}
                  muted
                  loop
                  playsInline
                  /*
                   * `metadata`, not `auto`: the browser reads the header and
                   * stops. These are several megabytes each, and three of them
                   * fetched in full on page load is most of a mobile data
                   * allowance for a section nobody has scrolled to yet.
                   */
                  preload="metadata"
                  aria-label={reel.label ?? undefined}
                  className={`w-full object-cover ${portrait ? 'aspect-[9/16]' : 'aspect-video'}`}
                />

                <button
                  type="button"
                  onClick={() => toggleSound(key)}
                  aria-pressed={audible}
                  aria-label={
                    audible ? `Mute ${reel.label ?? 'this film'}` : `Unmute ${reel.label ?? 'this film'}`
                  }
                  className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-3 focus-visible:outline-offset-2"
                >
                  {audible ? <SpeakerOn /> : <SpeakerOff />}
                </button>

                {reel.label ? (
                  <figcaption className="bg-white px-4 py-3 t-small font-semibold text-brand">
                    {reel.label}
                  </figcaption>
                ) : null}
              </figure>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

/* Two glyphs rather than one crossed out, so the state reads at a glance. */
const SpeakerOn = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path
      d="M11 5 6 9H3v6h3l5 4V5Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

const SpeakerOff = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path
      d="M11 5 6 9H3v6h3l5 4V5Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)
