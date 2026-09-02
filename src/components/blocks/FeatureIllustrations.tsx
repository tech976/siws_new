import type { SVGProps } from 'react'

/**
 * Soft-3D illustrations for the "Cards" layout of the points list.
 *
 * These are drawn here rather than imported as artwork on purpose. The design
 * they follow uses a commercial 3D icon pack, and a school's public website is
 * exactly the wrong place to be relying on assets nobody can produce the licence
 * for. Hand-drawn SVG carries no such question, weighs a couple of kilobytes,
 * stays sharp at any size, and takes its colour from the card it sits on.
 *
 * The 3D read comes from three things, applied consistently so the set looks
 * like one family: a light source at the top-left, a darker plane where a
 * surface turns away from it, and a soft contact shadow underneath. Nothing
 * here uses a filter — blurs are expensive to composite and a flattened ellipse
 * at low opacity reads the same at this size.
 *
 * Gradient ids are suffixed per illustration. Seven of these render on one
 * page, and SVG gradient ids are global to the document: duplicates mean every
 * shape picks up whichever definition happened to render last.
 */

type IllustrationProps = SVGProps<SVGSVGElement>

const base = (props: IllustrationProps) => ({
  viewBox: '0 0 96 96',
  role: 'presentation' as const,
  focusable: 'false' as const,
  ...props,
})

/** The soft ellipse every illustration stands on. */
const Ground = ({ fill }: { fill: string }) => (
  <ellipse cx="48" cy="84" rx="30" ry="4.5" fill={fill} opacity="0.22" />
)

export const ClassroomIllustration = (props: IllustrationProps) => (
  <svg {...base(props)}>
    <defs>
      <linearGradient id="cls-room" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#eaf1ff" />
        <stop offset="1" stopColor="#c9dbfa" />
      </linearGradient>
      <linearGradient id="cls-board" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#41528f" />
        <stop offset="1" stopColor="#25315e" />
      </linearGradient>
      <linearGradient id="cls-desk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7ea6e8" />
        <stop offset="1" stopColor="#4c78c8" />
      </linearGradient>
    </defs>
    <Ground fill="#3f5fa8" />
    <rect x="12" y="14" width="72" height="56" rx="9" fill="url(#cls-room)" />
    {/* Floor plane — the surface turning away from the light. */}
    <path d="M12 52h72v9a9 9 0 0 1-9 9H21a9 9 0 0 1-9-9z" fill="#b3cbf3" />
    <rect x="25" y="21" width="46" height="26" rx="4" fill="url(#cls-board)" />
    <rect x="30" y="27" width="22" height="3.2" rx="1.6" fill="#ffffff" opacity="0.6" />
    <rect x="30" y="34" width="31" height="3.2" rx="1.6" fill="#ffffff" opacity="0.38" />
    {[16, 52].map((x) => (
      <g key={x}>
        <rect x={x} y="55" width="28" height="6" rx="3" fill="url(#cls-desk)" />
        <rect x={x + 3} y="61" width="3.5" height="10" rx="1.75" fill="#4c78c8" />
        <rect x={x + 21} y="61" width="3.5" height="10" rx="1.75" fill="#4c78c8" />
      </g>
    ))}
  </svg>
)

export const SecurityIllustration = (props: IllustrationProps) => (
  <svg {...base(props)}>
    <defs>
      <linearGradient id="sec-body" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor="#8fd39a" />
        <stop offset="0.55" stopColor="#4faf68" />
        <stop offset="1" stopColor="#2f8c4a" />
      </linearGradient>
    </defs>
    <Ground fill="#2f8c4a" />
    <path
      d="M48 10 76 21v25c0 16.5-12.2 27.9-28 34-15.8-6.1-28-17.5-28-34V21z"
      fill="url(#sec-body)"
    />
    {/* Highlight down the lit edge, and a darker face where it turns away. */}
    <path d="M48 10 76 21v25c0 16.5-12.2 27.9-28 34z" fill="#000000" opacity="0.09" />
    <path d="M48 14.5 24 24v22c0 8.6 4.2 15.4 10 20.4V24z" fill="#ffffff" opacity="0.22" />
    <path
      d="m36 47 8.5 8.5L61 39"
      fill="none"
      stroke="#ffffff"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * Play is drawn as stacking blocks, not the slide the reference uses.
 *
 * A slide needs a ladder, a deck and a chute to be recognisable, and at 80px
 * those three collapse into one another — two attempts produced something that
 * read as an arrow and then as a curl. Blocks hold their silhouette at any
 * size, and for a kindergarten they say the same thing.
 */
export const PlayIllustration = (props: IllustrationProps) => (
  <svg {...base(props)}>
    <defs>
      <linearGradient id="play-a" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#a99af0" />
        <stop offset="1" stopColor="#7f6ae0" />
      </linearGradient>
      <linearGradient id="play-b" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8874e4" />
        <stop offset="1" stopColor="#5e4ac4" />
      </linearGradient>
      <linearGradient id="play-c" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#cdc4f8" />
        <stop offset="1" stopColor="#a495ef" />
      </linearGradient>
    </defs>
    <Ground fill="#6f5bd4" />
    {/* Top block, set back and lightest, so the stack reads front-to-back. */}
    <rect x="31" y="14" width="34" height="30" rx="8" fill="url(#play-c)" />
    <rect x="35" y="18" width="26" height="7" rx="3.5" fill="#ffffff" opacity="0.45" />
    <rect x="10" y="46" width="34" height="30" rx="8" fill="url(#play-a)" />
    <rect x="14" y="50" width="26" height="7" rx="3.5" fill="#ffffff" opacity="0.35" />
    <rect x="52" y="46" width="34" height="30" rx="8" fill="url(#play-b)" />
    <rect x="56" y="50" width="26" height="7" rx="3.5" fill="#ffffff" opacity="0.28" />
  </svg>
)

export const ActivityRoomIllustration = (props: IllustrationProps) => (
  <svg {...base(props)}>
    <defs>
      <linearGradient id="act-top" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f6c98a" />
        <stop offset="1" stopColor="#dd9843" />
      </linearGradient>
      <linearGradient id="act-chair" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e8ab5c" />
        <stop offset="1" stopColor="#c9832f" />
      </linearGradient>
    </defs>
    <Ground fill="#b9762a" />
    {/*
      Chair backs rise well clear of the table line. Drawn at the same height as
      the table they merged into one amber mass and the icon read as a blob.
    */}
    {[10, 68].map((x) => (
      <g key={x}>
        <rect x={x} y="20" width="18" height="26" rx="6" fill="url(#act-chair)" />
        <rect x={x + 2.5} y="46" width="4" height="28" rx="2" fill="#b9762a" />
        <rect x={x + 11.5} y="46" width="4" height="28" rx="2" fill="#b9762a" />
      </g>
    ))}
    <ellipse cx="48" cy="46" rx="27" ry="10" fill="url(#act-top)" />
    <path d="M21 46a27 10 0 0 0 54 0v5a27 10 0 0 1-54 0z" fill="#c9832f" />
    <rect x="44" y="54" width="8" height="20" rx="4" fill="#dd9843" />
    <ellipse cx="48" cy="76" rx="14" ry="4.5" fill="#c9832f" />
  </svg>
)

export const CanteenIllustration = (props: IllustrationProps) => (
  <svg {...base(props)}>
    <defs>
      <linearGradient id="can-tray" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9fded0" />
        <stop offset="1" stopColor="#5cbfa9" />
      </linearGradient>
      <linearGradient id="can-glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#d9f3ec" />
        <stop offset="1" stopColor="#a7ddd0" />
      </linearGradient>
    </defs>
    <Ground fill="#2f8f7c" />
    {/* Glass first, so the tray in front of it establishes the depth order. */}
    <path d="M62 22h20l-2.6 34a5 5 0 0 1-5 4.6h-4.8a5 5 0 0 1-5-4.6z" fill="url(#can-glass)" />
    <path
      d="M62.9 31h18.2l-1.9 25a5 5 0 0 1-5 4.6h-4.4a5 5 0 0 1-5-4.6z"
      fill="#ffffff"
      opacity="0.85"
    />
    <rect x="10" y="50" width="62" height="18" rx="8" fill="url(#can-tray)" />
    <rect x="10" y="60" width="62" height="8" rx="4" fill="#3a9d87" />
    {/*
      Three large rounds on the tray, not six small ones in compartments — at
      80px the compartments closed up and the food inside them disappeared.
    */}
    <circle cx="25" cy="47" r="9" fill="#f2a03f" />
    <circle cx="43" cy="45" r="10" fill="#5aa845" />
    <circle cx="60" cy="47" r="8" fill="#e2683f" />
    <circle cx="22" cy="44" r="3" fill="#ffffff" opacity="0.35" />
    <circle cx="40" cy="41" r="3" fill="#ffffff" opacity="0.3" />
  </svg>
)

export const HygieneIllustration = (props: IllustrationProps) => (
  <svg {...base(props)}>
    <defs>
      <linearGradient id="hyg-basin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#bcdcf8" />
        <stop offset="1" stopColor="#6aa8e0" />
      </linearGradient>
      {/*
        Darker than it looks like it should be. The mirror sits on a #d4e8f6
        disc, and the first pass started lighter than that — the whole circle
        disappeared into its own background.
      */}
      <linearGradient id="hyg-mirror" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9cc7ec" />
        <stop offset="1" stopColor="#5f9ed8" />
      </linearGradient>
    </defs>
    <Ground fill="#3f7fbb" />
    {/*
      A running tap over a basin, and nothing else. A mirror was tried above it
      twice — first so pale it vanished into the disc, then dark enough to read
      as a balloon on a stick. Running water is what makes a basin legible at
      this size, so the drops do the work the mirror was failing to do.
    */}
    <path
      d="M70 50V26a8 8 0 0 0-8-8H48"
      fill="none"
      stroke="url(#hyg-mirror)"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="42" y="14" width="10" height="12" rx="4" fill="#5f9ed8" />
    {/* Falling water — the tallest drop nearest the spout, fading as it goes. */}
    <ellipse cx="47" cy="34" rx="3.6" ry="5" fill="#8fc2ea" />
    <ellipse cx="47" cy="45" rx="3" ry="4" fill="#8fc2ea" opacity="0.75" />
    <circle cx="47" cy="54" r="2.4" fill="#8fc2ea" opacity="0.5" />
    <rect x="14" y="58" width="68" height="14" rx="7" fill="url(#hyg-basin)" />
    <rect x="14" y="65" width="68" height="7" rx="3.5" fill="#5f9ed8" />
    <rect x="42" y="72" width="12" height="8" rx="3" fill="#7db4e4" />
  </svg>
)

export const StaffIllustration = (props: IllustrationProps) => (
  <svg {...base(props)}>
    <defs>
      <linearGradient id="stf-mid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f286ad" />
        <stop offset="1" stopColor="#d94d80" />
      </linearGradient>
      <linearGradient id="stf-side" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f8b4cd" />
        <stop offset="1" stopColor="#ef86ae" />
      </linearGradient>
    </defs>
    <Ground fill="#c73d70" />
    {/* Flanking figures sit lower and paler, so the centre one reads as nearest. */}
    <g fill="url(#stf-side)">
      <circle cx="24" cy="36" r="10" />
      <path d="M8 76a16 16 0 0 1 32 0z" />
      <circle cx="72" cy="36" r="10" />
      <path d="M56 76a16 16 0 0 1 32 0z" />
    </g>
    <g fill="url(#stf-mid)">
      <circle cx="48" cy="30" r="12" />
      <path d="M29 76a19 19 0 0 1 38 0z" />
    </g>
  </svg>
)

/**
 * Solid single-colour glyphs for the small white discs on photo cards.
 *
 * Separate from the illustrations above because they do a different job. Those
 * are the picture on a card that has no photograph — big, modelled, multi-tone.
 * These sit at 22px inside a white circle beside a photograph, where modelling
 * is invisible and an outline icon looks thin and unfinished next to a solid
 * one. They are drawn filled and take `currentColor`, so each one picks up its
 * card's accent without a second set of colour definitions.
 */
const glyph = (props: IllustrationProps) => ({
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  role: 'presentation' as const,
  focusable: 'false' as const,
  ...props,
})

export const StudyGlyph = (props: IllustrationProps) => (
  <svg {...glyph(props)}>
    <path d="M12 2.6 1.2 7.9 12 13.2l10.8-5.3z" />
    <path d="M5.6 11.1v4.3c0 2 2.9 3.5 6.4 3.5s6.4-1.5 6.4-3.5v-4.3L12 14.6z" />
    <path d="M21.3 9.1v5.6a.9.9 0 0 1-1.8 0V9.1z" />
    <circle cx="20.4" cy="16.3" r="1.6" />
  </svg>
)

export const BoardGlyph = (props: IllustrationProps) => (
  <svg {...glyph(props)}>
    <path d="M4 3h16a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 20 17h-6.9v2.2l3 1.6a.9.9 0 1 1-.9 1.6L12 20.6l-3.2 1.8a.9.9 0 1 1-.9-1.6l3-1.6V17H4a2.5 2.5 0 0 1-2.5-2.5v-9A2.5 2.5 0 0 1 4 3z" />
    {/* Knocked back out in the disc's own white, so the screen reads as a screen. */}
    <path d="M6 6.5h7v1.7H6zM6 9.6h9v1.7H6z" fill="#ffffff" opacity="0.85" />
  </svg>
)

export const StaffGlyph = (props: IllustrationProps) => (
  <svg {...glyph(props)}>
    <circle cx="9" cy="7.2" r="3.6" />
    <path d="M9 12.4c-3.7 0-6.7 2.9-6.7 6.5v1.4h13.4v-1.4c0-3.6-3-6.5-6.7-6.5z" />
    <circle cx="17.4" cy="8.4" r="2.7" />
    <path d="M17.4 13.1c-.6 0-1.2.1-1.7.3a8.6 8.6 0 0 1 2.4 5.9h3.6v-1.2c0-2.8-1.9-5-4.3-5z" />
  </svg>
)

export const ShieldGlyph = (props: IllustrationProps) => (
  <svg {...glyph(props)}>
    <path d="M12 1.8 3.2 5.3v6.4c0 5 3.7 8.9 8.8 10.7 5.1-1.8 8.8-5.7 8.8-10.7V5.3z" />
    <path
      d="m8.2 11.6 2.7 2.7 5-5"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const BallGlyph = (props: IllustrationProps) => (
  <svg {...glyph(props)}>
    <circle cx="12" cy="12" r="10.2" />
    <g fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round">
      <path d="M12 1.8c-3.1 3-4.6 6.5-4.6 10.2S8.9 19.2 12 22.2" />
      <path d="M2.4 8.6c3.4 1.3 6.6 1.3 9.6 0s6.2-1.3 9.6 0" />
      <path d="M2.4 15.4c3.4-1.3 6.6-1.3 9.6 0s6.2 1.3 9.6 0" />
    </g>
  </svg>
)

/** Kept for a future use where it is drawn larger; not in the glyph map. */
export const BrainGlyph = (props: IllustrationProps) => (
  <svg {...glyph(props)}>
    <path d="M11.1 2.2a3.4 3.4 0 0 0-3.3 2.5 3.2 3.2 0 0 0-2.6 3.1c0 .6.2 1.2.5 1.7a3.3 3.3 0 0 0-1 2.4c0 1.1.5 2 1.4 2.6-.1.3-.2.7-.2 1.1a3.3 3.3 0 0 0 3.3 3.3c.6 0 1.2-.2 1.7-.5v3a.9.9 0 0 0 1.8 0V3.1a.9.9 0 0 0-.9-.9z" />
    <path d="M12.9 2.2a.9.9 0 0 0-.9.9v18.3a.9.9 0 0 0 1.8 0v-3c.5.3 1.1.5 1.7.5a3.3 3.3 0 0 0 3.3-3.3c0-.4-.1-.8-.2-1.1.9-.6 1.4-1.5 1.4-2.6 0-.9-.4-1.8-1-2.4.3-.5.5-1.1.5-1.7a3.2 3.2 0 0 0-2.6-3.1 3.4 3.4 0 0 0-3.3-2.5z" />
  </svg>
)

/** Keyed by the values in `FEATURE_ICON_OPTIONS`. Falls back to the line icon. */
export const FEATURE_GLYPHS: Record<string, (props: IllustrationProps) => React.JSX.Element> = {
  study: StudyGlyph,
  computers: BoardGlyph,
  staff: StaffGlyph,
  security: ShieldGlyph,
  sport: BallGlyph,
  /*
   * `thinking` is deliberately absent, so it falls through to the outline icon.
   * A brain is folds, and filling them solid at 24px produced one dark blob —
   * the outline keeps the folds legible, and the design this follows draws its
   * brain as an outline too while everything around it is solid.
   */
}

/** Keyed by the values in `FEATURE_ICON_OPTIONS`. */
export const FEATURE_ILLUSTRATIONS: Record<
  string,
  (props: IllustrationProps) => React.JSX.Element
> = {
  classroom: ClassroomIllustration,
  security: SecurityIllustration,
  play: PlayIllustration,
  activity: ActivityRoomIllustration,
  canteen: CanteenIllustration,
  hygiene: HygieneIllustration,
  staff: StaffIllustration,
}
