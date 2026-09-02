'use client'

import { useEffect, useRef, useState } from 'react'

export interface Reel {
  key: string
  /** The MP4. Only Graph returns one; without a token there is nothing to play. */
  videoUrl: string
  /** The frame to hold until the video has enough to start. */
  posterUrl: string | null
  caption: string | null
  href: string | null
}

/**
 * The reels rail: each film plays itself, silently, until somebody asks for sound.
 *
 * WHY MUTED IS NOT A PREFERENCE
 * -----------------------------
 * Every browser blocks a video that tries to start with sound. The block is
 * silent — `play()` returns a rejected promise and the frame simply sits there
 * — so a reel that asked for audio would not play at all, rather than playing
 * loudly. Muted autoplay is the only autoplay there is; the button below is
 * how sound gets turned on, because a click is the gesture browsers accept.
 *
 * ONE REEL HAS SOUND AT A TIME
 * ----------------------------
 * Unmuting a second while the first is still audible gives two soundtracks at
 * once, which no one wants and which is easy to do by accident on a rail of
 * five. Unmuting one therefore mutes the rest.
 *
 * NOTHING PLAYS OFF-SCREEN
 * ------------------------
 * Five videos decoding at once on a phone is a real cost — battery, data and
 * a page that stutters while it scrolls. An observer starts a reel when it
 * comes into view and pauses it when it leaves, so the work follows the
 * reader. It also means a reel is never audible while out of sight.
 */
export const InstagramReels = ({ reels }: { reels: Reel[] }) => {
  const refs = useRef(new Map<string, HTMLVideoElement>())
  const [audibleKey, setAudibleKey] = useState<string | null>(null)

  /* Play what is on screen, pause what is not. */
  useEffect(() => {
    const nodes = [...refs.current.values()]
    if (nodes.length === 0) return

    /*
     * Without IntersectionObserver — an old browser, or a test environment —
     * every reel simply plays. That is the previous behaviour rather than a
     * blank rail, and it is still muted.
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
            // A rejected play() is normal — a data-saver setting, or the tab
            // in the background. The poster stays up, which is the right
            // outcome, so there is nothing to handle.
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
      // Half of it showing, so a reel at the edge of the viewport is not
      // started and stopped as the page settles.
      { threshold: 0.5 },
    )

    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [reels])

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
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {reels.map((reel) => {
        const audible = audibleKey === reel.key

        return (
          <li key={reel.key} className="group relative">
            <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-brand-deep ring-1 ring-line/60">
              <video
                ref={(node) => {
                  if (node) refs.current.set(reel.key, node)
                  else refs.current.delete(reel.key)
                }}
                src={reel.videoUrl}
                poster={reel.posterUrl ?? undefined}
                muted
                loop
                playsInline
                preload="metadata"
                /*
                 * The caption is on the link below, and the button announces
                 * the sound state, so the video itself has nothing to say to a
                 * screen reader that is not already said twice.
                 */
                aria-hidden="true"
                className="size-full object-cover"
              />

              {/*
                The whole tile opens the post on Instagram, EXCEPT the sound
                button. An overlay link rather than a wrapper, so the button
                can sit above it and take its own click.
              */}
              {reel.href ? (
                <a
                  href={reel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 focus-visible:outline-3 focus-visible:outline-offset-2"
                >
                  <span className="sr-only">
                    {reel.caption ? `Watch on Instagram: ${reel.caption}` : 'Watch on Instagram'}
                  </span>
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => toggleSound(reel.key)}
                aria-pressed={audible}
                aria-label={audible ? 'Mute this reel' : 'Unmute this reel'}
                className="absolute bottom-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-3 focus-visible:outline-offset-2"
              >
                {audible ? <SpeakerOn /> : <SpeakerOff />}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
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
