'use client'

import { useEffect, useRef } from 'react'

/**
 * A performance on the Centre's stage, played in place.
 *
 * It starts muted, as the hero film does, and only while it is on screen —
 * a clip running behind the visitor's back costs their data for nothing.
 * With reduced motion asked for it never starts by itself. The controls are
 * always there, so the music is one press away.
 */
export const StageVideo = ({ src, poster, label }: { src: string; poster?: string; label: string }) => {
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const node = video.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        // Never take over a clip the visitor has unmuted and is listening to.
        if (entry.isIntersecting) {
          if (node.muted) node.play().catch(() => {})
        } else if (node.muted) {
          node.pause()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={video}
      muted
      loop
      playsInline
      controls
      preload="metadata"
      poster={poster}
      aria-label={label}
      className="absolute inset-0 h-full w-full bg-brand-deep object-cover"
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}
