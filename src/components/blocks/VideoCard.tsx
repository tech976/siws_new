'use client'

import { useState } from 'react'

/**
 * One video: a still with a play button, which becomes the player when pressed.
 *
 * The only reason this is a client component. Everything visible before the
 * press is rendered on the server — the still, the title, the frame — and the
 * state here is a single boolean saying whether anybody has asked to watch.
 *
 * A BUTTON, NOT A DIV WITH AN ONCLICK. It is reached by Tab, it announces
 * itself as "Play <title>, button", and it fires on Enter and Space without
 * any of that being written by hand. A play triangle drawn over a picture is
 * only a signifier; the control underneath has to be a real one.
 */
export const VideoCard = ({
  title,
  driveId,
  children,
}: {
  title: string
  driveId: string
  /** The still, rendered on the server so it needs no JavaScript to appear. */
  children: React.ReactNode
}) => {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <iframe
        // Built here from the id, never stored as a URL. See VideoGalleryBlock.
        src={`https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`}
        title={title}
        /*
         * LAID OUT AT DOUBLE SIZE, THEN SCALED BACK TO FIT.
         *
         * Drive's player will not lay itself out below a certain width. Given
         * a 365px card it built itself bigger anyway and the frame clipped
         * the result — the left edge of the title gone, the foot of the
         * picture cut off. Nothing about that is fixable by nudging the
         * iframe: it is too big for the hole.
         *
         * So the iframe is given 200% of the frame in both directions, which
         * is room Drive is happy in, and then scaled by half from its top-left
         * corner — landing exactly on the frame it started from. The player
         * renders at full resolution and is drawn at half, so it stays sharp.
         * The two numbers are locked to each other: 200% and 0.5.
         */
        className="absolute left-0 top-0 h-[200%] w-[200%] origin-top-left scale-50 border-0"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${title}`}
      className="group/play absolute inset-0 size-full cursor-pointer"
    >
      {children}

      {/*
        A scrim under the button so the white triangle holds up over a pale
        frame. Weak enough that the still still reads as a photograph, and it
        deepens on hover so the card answers the pointer.
      */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-brand-deep/20 transition-colors duration-300 group-hover/play:bg-brand-deep/35"
      />

      <span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center"
      >
        <span className="grid size-16 place-items-center rounded-full bg-white/95 shadow-[0_4px_20px_rgba(0,0,0,0.35)] ring-1 ring-black/5 transition-transform duration-300 group-hover/play:scale-110">
          {/*
            A solid triangle, nudged right by a pixel: a play mark centred on
            its bounding box looks left of centre, because its visual mass sits
            to the left of the point.
          */}
          <svg viewBox="0 0 24 24" className="ml-0.5 size-7 fill-brand" aria-hidden="true">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
          </svg>
        </span>
      </span>
    </button>
  )
}
