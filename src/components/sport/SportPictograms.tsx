import type { LucideProps } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * A pictogram for each sport SIWS offers, drawn for this page.
 *
 * Lucide has a volleyball, a chess knight and crossed swords, and nothing for
 * the rest: the tiles borrowed a flame for both Kho-Kho and Kabaddi and the
 * same dot for Badminton, Table Tennis and Carrom, so three tiles in a row
 * looked alike. These are drawn on Lucide's 24px grid with its round 2px
 * stroke, so they sit beside its icons without a seam and take the same
 * `size`, `strokeWidth` and `className`.
 */
const pictogram = (name: string, body: ReactNode) => {
  const Pictogram = ({ size = 24, strokeWidth = 2, className, ...rest }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {body}
    </svg>
  )
  Pictogram.displayName = name
  return Pictogram
}

/** Two foils crossed, each with its bell guard. */
export const Fencing = pictogram(
  'Fencing',
  <>
    <path d="M4 4 17 17M20 4 7 17" />
    <path d="M14.5 19.5q4-1 5-5M9.5 19.5q-4-1-5-5" />
    <path d="M17.5 17.5 20 20M6.5 17.5 4 20" />
  </>,
)

/** A ball: the pentagon in the middle and the seams out to the edge. */
export const Football = pictogram(
  'Football',
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 7.5l4.3 3.1-1.7 5H9.4l-1.7-5z" />
    <path d="M12 7.5V2M16.3 10.6l5.2-1.7M14.6 15.6l3.3 4.5M9.4 15.6l-3.3 4.5M7.7 10.6 2.5 8.9" />
  </>,
)

/** A bat on the slant and a ball beside it. */
export const Cricket = pictogram(
  'Cricket',
  <>
    <rect x="8.25" y="7" width="4.5" height="13" rx="2" transform="rotate(45 10.5 13.5)" />
    <path d="M15.1 8.9 19.5 4.5" />
    <circle cx="18" cy="17.5" r="2.5" />
  </>,
)

/** A ball with its two straight seams and two curved ones. */
export const Basketball = pictogram(
  'Basketball',
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2v20M2 12h20" />
    <path d="M5 4.9c3 3.1 3 11.1 0 14.2M19 4.9c-3 3.1-3 11.1 0 14.2" />
  </>,
)

/** A runner in full stride. */
export const Athletics = pictogram(
  'Athletics',
  <>
    <circle cx="16" cy="4" r="2" />
    <path d="m14 7.5-3 5.5" />
    <path d="m14 7.5 3 3 2.5-1.5M14 7.5l-3.5-.5L8 9.5" />
    <path d="m11 13 3.5 2.5-1 5.5M11 13l-2.5 4.5h-4" />
  </>,
)

/** A shuttlecock, cork down. */
export const Badminton = pictogram(
  'Badminton',
  <>
    <path d="M9 17h6v.5a3 3 0 0 1-6 0z" />
    <path d="M9 17 5 4M15 17l4-13M12 17V3.5" />
    <path d="M5 4q7-2 14 0M7 10.5q5-1 10 0" />
  </>,
)

/** A round bat and the ball. */
export const TableTennis = pictogram(
  'TableTennis',
  <>
    <circle cx="13.5" cy="9.5" r="6.5" />
    <rect x="5.5" y="13" width="3.5" height="7" rx="1.5" transform="rotate(45 7.25 16.5)" />
    <circle cx="4.5" cy="5" r="2" />
  </>,
)

/** A raider reaching for the pole. */
export const KhoKho = pictogram(
  'KhoKho',
  <>
    <circle cx="9" cy="5" r="2" />
    <path d="M8 9 6 14" />
    <path d="m8 9 4 2 5.5-1M8 9l-3.5 1" />
    <path d="m6 14 3 3-1 4M6 14l-2 4H2" />
    <path d="M19.5 3v18" />
  </>,
)

/** Two players squared up across the midline. */
export const Kabaddi = pictogram(
  'Kabaddi',
  <>
    <circle cx="5.5" cy="5" r="2" />
    <circle cx="18.5" cy="5" r="2" />
    <path d="M5.5 8v6M5.5 10l4.5-1M5.5 14 3 20M5.5 14 8 20" />
    <path d="M18.5 8v6M18.5 10 14 9M18.5 14 16 20M18.5 14l2.5 6" />
    <path d="M12 3v1.5M12 8v1.5M12 13v1.5M12 18v1.5" />
  </>,
)

/** The board from above: four pockets and the centre ring. */
export const Carrom = pictogram(
  'Carrom',
  <>
    <rect x="3" y="3" width="18" height="18" rx="2.5" />
    <circle cx="6.5" cy="6.5" r="1" />
    <circle cx="17.5" cy="6.5" r="1" />
    <circle cx="6.5" cy="17.5" r="1" />
    <circle cx="17.5" cy="17.5" r="1" />
    <circle cx="12" cy="12" r="3" />
  </>,
)

/** A figure seated cross-legged, hands resting on the knees. */
export const Yoga = pictogram(
  'Yoga',
  <>
    <circle cx="12" cy="4.5" r="2" />
    <path d="M12 8v6.5" />
    <path d="M12 9.5 8 12.5 5.5 16M12 9.5l4 3 2.5 3.5" />
    <path d="M3 17q9-5.5 18 0M6 20q6-3.5 12 0" />
  </>,
)

/** A belt, knotted, its two ends hanging. */
export const Karate = pictogram(
  'Karate',
  <>
    <path d="M2 8.5h8M14 8.5h8M2 12.5h8M14 12.5h8" />
    <rect x="10" y="7.5" width="4" height="6" rx="1" />
    <path d="M11 13.5 8.5 21M13 13.5l2.5 7.5" />
  </>,
)

/** A roller skate, side on. */
export const Skating = pictogram(
  'Skating',
  <>
    <path d="M5 3h6v8l7 2a2.5 2.5 0 0 1 2 2.5V17H5z" />
    <path d="M8 6.5h3M8 9.5h3" />
    <circle cx="7.5" cy="20" r="1.75" />
    <circle cx="17.5" cy="20" r="1.75" />
  </>,
)
