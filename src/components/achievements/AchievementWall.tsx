'use client'

import { Expand } from 'lucide-react'
import { useCallback, useState } from 'react'

import { LightboxModal } from '@/components/gallery/LightboxModal'
import type { GalleryPhoto } from '@/components/gallery/types'
import { Media } from '@/components/Media'

/**
 * One achievement as the wall needs it. `GalleryPhoto` carries the picture and
 * the two lines the lightbox already knows how to show; `when` and `feature`
 * are the wall's own.
 */
export interface Achievement extends GalleryPhoto {
  when?: string
  feature: boolean
}

/**
 * THE TILE.
 *
 * A photograph, the occasion and the year at rest; the yellow prize badge only
 * once the tile is hovered or focused. Nine of those badges lit at once read as
 * a wall of labels rather than a wall of photographs, which is what the badges
 * were doing to this page.
 *
 * WHAT THAT COSTS, AND WHAT PAYS IT BACK
 * --------------------------------------
 * It does mean the prize is not on screen at rest, and a phone has no hover to
 * give. Three things keep it reachable rather than lost:
 *
 *  - the occasion is still the tile's title, so nothing about WHAT the tile
 *    shows depends on a pointer — only the prize does;
 *  - the whole tile is a button, and opening it shows the prize as a badge in
 *    the lightbox, which is the path a phone takes anyway;
 *  - the button's accessible name already carries the prize, so a screen
 *    reader never depended on the badge being painted.
 *
 * `group-focus-within` matters as much as `group-hover` here: without it the
 * badge would be reachable by mouse and by tap but not by keyboard.
 *
 * WHAT MOVES, AND WHY
 * -------------------
 * The photograph scales a little and the tile lifts, both on hover and on
 * keyboard focus. That is the affordance — it says the tile is a control
 * before anybody clicks it — and the expand glyph in the corner says what
 * kind. Under `prefers-reduced-motion` all of it becomes a change of shadow
 * and a change of scrim, so the affordance survives without the movement
 * (SC 2.3.3): `motion-safe:` is doing that work on every transform below.
 *
 * WHY THE SCRIM IS ALWAYS THERE
 * -----------------------------
 * White text on an unknown photograph is a contrast failure waiting for the
 * wrong picture (SC 1.4.3). The gradient is opaque under the text and clear
 * over the top half, so the tile still reads as a photograph rather than as a
 * dark card, and it deepens on hover so the type stays comfortable while the
 * picture behind it is zooming.
 */
const AchievementTile = ({
  item,
  eager,
  onOpen,
}: {
  item: Achievement
  eager: boolean
  onOpen: () => void
}) => (
  <li
    className={[
      'group relative overflow-hidden rounded-3xl bg-brand-tint',
      'ring-1 ring-line/60 shadow-[0_1px_2px_rgba(36,39,111,0.04),0_10px_28px_-14px_rgba(36,39,111,0.22)]',
      'transition-[transform,box-shadow] duration-300 ease-out',
      'hover:shadow-[0_2px_8px_rgba(36,39,111,0.10),0_26px_50px_-18px_rgba(36,39,111,0.38)]',
      'focus-within:shadow-[0_2px_8px_rgba(36,39,111,0.10),0_26px_50px_-18px_rgba(36,39,111,0.38)]',
      'motion-safe:hover:-translate-y-1 motion-safe:focus-within:-translate-y-1',
      item.feature ? 'sm:col-span-2 sm:row-span-2' : '',
    ].join(' ')}
  >
    <Media
      resource={item.media}
      /*
       * A feature tile is genuinely twice the width of the others, and telling
       * the browser otherwise is how a wall ends up either soft or several
       * times heavier than it needs to be.
       */
      sizes={
        item.feature
          ? '(min-width: 1024px) 66vw, (min-width: 640px) 100vw, 100vw'
          : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
      }
      priority={eager}
      fill
      className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.06] motion-safe:group-focus-within:scale-[1.06]"
    />

    {/*
      Legibility first, atmosphere second.

      The gradient runs out at 60% of the tile, so the top of every photograph
      is untouched. Reaching further — an even fade over the whole tile — put a
      wash of brand blue across nine photographs at once and made the wall look
      tinted rather than photographed.

      TWO layers, not one: a gradient cannot be transitioned between two sets
      of colour stops, so a single scrim that changed its stops on hover would
      snap. The base never moves and the second fades in over it.
    */}
    {/*
      SOFTENED, NOT REMOVED. It was 95% brand at the foot of the tile falling
      to nothing by 60% of its height — nearly solid navy under the words, and
      the whole drop happening across a third of the tile. Two things made that
      read as harsh: the darkest point was close enough to opaque that the
      photograph simply stopped, and the ramp was short enough to show as a
      band rather than a fade.

      So the floor comes down and the ramp lengthens: 82% at the very bottom,
      still dark enough to carry white type over any photograph, easing through
      a lower mid-point over a longer distance so there is no visible edge. The
      top of every picture is still untouched — reaching further up is what
      tints a wall of nine photographs blue, which is the other way this goes
      wrong.
    */}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-deep/82 via-brand-deep/44 via-30% to-transparent to-68%"
    />
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-deep/38 via-brand-deep/16 via-30% to-transparent to-76% opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
    />

    {/*
      The affordance. It appears rather than sitting there permanently,
      because at rest the tile should read as a photograph with a caption, and
      a glyph on every tile of a nine-tile wall is nine pieces of furniture.
    */}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/95 text-brand opacity-0 shadow-card transition-[opacity,transform] duration-300 group-hover:opacity-100 group-focus-within:opacity-100 motion-safe:scale-90 motion-safe:group-hover:scale-100 motion-safe:group-focus-within:scale-100"
    >
      <Expand size={16} strokeWidth={2.4} />
    </span>

    {/* ------------------------------------------------------------ the words */}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 sm:p-6">
      {/*
        THE PRIZE, WHICH IS THE PART THAT WAITS.

        It grows from nothing rather than fading in place, so at rest it costs
        no space at all — a badge held at `opacity-0` in the flow would leave a
        blank band over the photograph on all nine tiles, which is the thing
        being removed.

        `max-height` rather than `height`: the badge wraps to two lines on the
        longer awards and no fixed height fits both. 6rem is a ceiling the
        content never reaches, and animating to a ceiling only means the last
        few milliseconds of the transition have nothing left to move.

        Nothing below it shifts. The caption block is anchored to the BOTTOM of
        the tile, so the row opens upward into the photograph and the occasion
        stays exactly where the eye left it.
      */}
      {item.category ? (
        <div
          className={[
            'max-h-0 overflow-hidden opacity-0',
            'transition-[max-height,opacity] duration-300 ease-out',
            'group-hover:max-h-24 group-hover:opacity-100',
            'group-focus-within:max-h-24 group-focus-within:opacity-100',
          ].join(' ')}
        >
          <span className="mb-2 inline-block rounded-pill bg-accent px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-brand-deep">
            {item.category}
          </span>
        </div>
      ) : null}

      {/* The year stays. It is one short line and it dates the photograph. */}
      {item.when ? (
        <span className="block text-[0.8125rem] font-semibold text-white/80">{item.when}</span>
      ) : null}

      <p
        className={[
          'mt-2 font-bold leading-snug text-balance text-white',
          /*
           * The feature tile is four times the area, so its title steps up a
           * size. Without that the large tile reads as a small tile that has
           * been stretched, which is the usual way a bento grid goes wrong.
           */
          item.feature ? 'text-[1.125rem] sm:text-[1.375rem]' : 'text-[1.0625rem]',
        ].join(' ')}
      >
        {item.caption}
      </p>
    </div>

    {/*
      THE WHOLE TILE IS THE BUTTON, and it is a real one — reached by Tab,
      fired by Enter and Space, and named by what it opens. An `onClick` on the
      `<li>` would be none of those things.

      It is last in the source so it sits over the scrim and the words; those
      are all `pointer-events-none`, so nothing above it swallows the press.
    */}
    <button
      type="button"
      onClick={onOpen}
      className="absolute inset-0 size-full cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent focus-visible:ring-inset"
    >
      <span className="sr-only">
        {`Look closely at ${item.caption}${item.category ? ` — ${item.category}` : ''}`}
      </span>
    </button>
  </li>
)

/**
 * The wall, and the one piece of state it has: which photograph is open.
 *
 * WHY OPENING ONE MATTERS HERE MORE THAN ON A GALLERY
 * --------------------------------------------------
 * Almost every one of these is a group photograph of fifteen small children.
 * At a third of a page nobody can see a face, and the thing a parent is
 * actually doing on this page is looking for their own child. The lightbox is
 * not decoration on this wall; it is the point of it, which is why the tiles
 * carry an expand affordance and why the arrow keys step between them.
 *
 * The heading and intro are rendered on the SERVER and passed in as children,
 * so the rich text converter never reaches the client bundle.
 */
export const AchievementWall = ({
  items,
  children,
}: {
  items: Achievement[]
  children?: React.ReactNode
}) => {
  const [openId, setOpenId] = useState<string | null>(null)

  const index = items.findIndex((item) => item.id === openId)
  const open = index >= 0 ? items[index]! : null

  const step = useCallback(
    (by: number) => {
      if (items.length === 0) return
      setOpenId((current) => {
        const at = items.findIndex((item) => item.id === current)
        if (at < 0) return current
        return items[(at + by + items.length) % items.length]!.id
      })
    },
    [items],
  )

  return (
    <>
      {children}

      <ul
        /*
         * The row is TALLER on a phone, not shorter. Below `sm` no tile spans
         * anything, so the wall is a single stack of photographs — and a
         * photograph in a stack wants height, where one in a three-across row
         * is already wide enough to read.
         *
         * `grid-flow-dense` backfills whatever hole the large tile leaves, so
         * a wall of any length finishes square rather than trailing off.
         */
        className={[
          /*
           * The gap belongs to the heading, not to the grid. A wall with no
           * preamble opens at the top of its band; keeping `mt-10`
           * unconditionally left it floating below an empty strip.
           */
          children ? 'mt-10' : '',
          'grid auto-rows-[16rem] grid-flow-dense grid-cols-1 gap-4 sm:auto-rows-[14rem] sm:grid-cols-2 sm:gap-5 lg:auto-rows-[16rem] lg:grid-cols-3',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {items.map((item, i) => (
          <AchievementTile
            key={item.id}
            item={item}
            /* The first row or two are above the fold and are not lazy. */
            eager={i < 3}
            onOpen={() => setOpenId(item.id)}
          />
        ))}
      </ul>

      <LightboxModal
        photo={open}
        onClose={() => setOpenId(null)}
        onPrevious={() => step(-1)}
        onNext={() => step(1)}
        position={index + 1}
        total={items.length}
      />
    </>
  )
}
