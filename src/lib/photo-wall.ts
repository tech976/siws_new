import type { CSSProperties } from 'react'

import type { Media } from '@/payload-types'

/**
 * THE PHOTO WALL — rows of photographs, every one at its own proportions.
 *
 * WHAT IT REPLACES
 * ----------------
 * The wall used to be a collage: a repeating pattern of tile shapes — big,
 * small, small, tall, wide, small — with each photograph cropped to whichever
 * shape its POSITION happened to land on. Nothing looked at the photograph. A
 * teacher's upright phone picture that fell on the wide slot kept a third of
 * its height, and the crop came out of the middle, which is where the faces
 * are.
 *
 * Here the tile takes its shape from the picture instead. Each row is filled
 * with photographs scaled to one shared height, so an upright picture gets a
 * narrow tile and a group photograph a wide one, both edges of the wall stay
 * flush, and nothing is cut off any of them.
 *
 * WHY THE ROWS ARE WORKED OUT HERE AND NOT BY THE BROWSER
 * -------------------------------------------------------
 * The usual stylesheet-only version (`flex-grow` in proportion to each
 * picture's width) cannot stop the last row stretching, so a single leftover
 * photograph fills the whole width at several times the height of the rows
 * above it. Measuring the container in script instead would cost a layout
 * shift on every page load.
 *
 * Neither is needed. Every picture's width and height are already on its
 * record, so which photographs share a row is plain arithmetic, done once per
 * screen width — phone, tablet, desktop — and handed to the stylesheet as a
 * fraction of the row. See `.siws-wall` in `globals.css` for the other half.
 */

export interface WallPhoto {
  media: Pick<Media, 'width' | 'height' | 'sizes'>
  /** A marquee photograph: its row is cut short so that it stands taller. */
  feature?: boolean
}

export interface WallTile {
  /** Custom properties for the tile; `.siws-wall` turns them into a width. */
  style: CSSProperties
  /** The `sizes` attribute for the photograph inside it. */
  sizes: string
  /**
   * False when the record carried no dimensions and the tile's shape is a
   * guess. The picture must then be fitted inside the tile, not cropped to it.
   */
  measured: boolean
}

/**
 * How much picture a row holds, as a sum of width-over-height: one figure for
 * a phone, one from 640px and one from 1024px, matching the breakpoints in
 * `.siws-wall`.
 *
 * A landscape photograph is about 1.4 and an upright one about 0.7, so a
 * phone row is one landscape or a pair of uprights, and a desktop row is
 * three landscapes or two and a pair of uprights. Raising a figure puts more
 * photographs in each row and makes every one of them smaller.
 */
const CAPACITY = [1.5, 3, 4.5] as const

/** A row holding a marquee photograph is planned this much shorter. */
const FEATURE = 0.6

/**
 * How much taller the last row may stand in order to reach both edges —
 * taller than a row was planned to be, or than the rows above it came out,
 * whichever is the more generous. Past this it takes the height of the rows
 * above and sits centred instead: the difference between a row that is a
 * little generous and one leftover photograph blown up to fill the page.
 */
const LAST_ROW_STRETCH = 1.2

/** Used only for a record with no dimensions at all. */
const UNKNOWN_RATIO = 3 / 2

/**
 * A photograph's width over its height as a visitor sees it, or null if
 * nothing on the record says.
 *
 * READ OFF A RESIZED COPY FIRST, and that order is deliberate. A phone camera
 * stores an upright picture sideways with a note to rotate it; Payload
 * records the `width` and `height` of the file as stored, so that picture is
 * down as landscape while every browser shows it upright. The resized copies
 * are made after the rotation, so their dimensions are the true ones.
 */
const proportionsOf = (media: WallPhoto['media']): number | null => {
  for (const measured of [media.sizes?.small, media.sizes?.medium, media.sizes?.large, media]) {
    const width = measured?.width
    const height = measured?.height
    if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
      return width / height
    }
  }
  return null
}

interface Shape {
  ratio: number
  feature: boolean
}

interface Row {
  start: number
  end: number
  /** The ratios in the row added up. Its height is the row's width over this. */
  sum: number
  featured: boolean
}

const breakIntoRows = (shapes: Shape[], capacity: number): Row[] => {
  const rows: Row[] = []
  let row: Row = { start: 0, end: 0, sum: 0, featured: false }

  for (const shape of shapes) {
    if (row.end > row.start) {
      /*
       * Taking this photograph makes the row SHORTER than intended by `over`;
       * closing without it leaves the row TALLER by `under`. Whichever lands
       * nearer the intended height wins, so no row is far out either way.
       */
      const over = (row.sum + shape.ratio) / (capacity * (row.featured || shape.feature ? FEATURE : 1))
      const under = (capacity * (row.featured ? FEATURE : 1)) / row.sum

      if (over > 1 && over > under) {
        rows.push(row)
        row = { start: row.end, end: row.end, sum: 0, featured: false }
      }
    }

    row.end += 1
    row.sum += shape.ratio
    row.featured ||= shape.feature
  }

  if (row.end > row.start) rows.push(row)
  return rows
}

interface Placement {
  /** This tile's part of the row's width, gutters excluded. */
  share: number
  /** How many tiles are in its row, which is how many gutters to leave out. */
  count: number
}

const placeRows = (shapes: Shape[], capacity: number): Placement[] => {
  const rows = breakIntoRows(shapes, capacity)

  /* The height the rows above the last one average, as a part of the width. */
  const full = rows.slice(0, -1)
  const usual =
    full.length > 0 ? full.reduce((total, row) => total + 1 / row.sum, 0) / full.length : 1 / capacity

  return rows.flatMap((row, index) => {
    let span = row.sum

    if (index === rows.length - 1) {
      const lift = row.featured ? FEATURE : 1
      const settled = usual / lift
      const planned = 1 / (capacity * lift)
      if (1 / row.sum > Math.max(settled, planned) * LAST_ROW_STRETCH) span = 1 / settled
    }

    return shapes
      .slice(row.start, row.end)
      .map((shape) => ({ share: shape.ratio / span, count: row.end - row.start }))
  })
}

/** Five places is a hundredth of a pixel on the widest wall. */
const trim = (value: number) => Number(value.toFixed(5))

const vw = (share: number) => `${Math.max(1, Math.ceil(share * 100))}vw`

/**
 * Places every photograph on the wall, in the order given.
 *
 * Returns one entry per photograph: the custom properties its tile needs and
 * the `sizes` string for its image, so the browser downloads a file to suit
 * the tile it is actually getting rather than a guess made for all of them.
 */
export const layWall = (photos: WallPhoto[]): WallTile[] => {
  const ratios = photos.map((photo) => proportionsOf(photo.media))
  const shapes = photos.map((photo, index) => ({
    ratio: ratios[index] ?? UNKNOWN_RATIO,
    feature: photo.feature === true,
  }))

  const [phone, tablet, desktop] = CAPACITY.map((capacity) => placeRows(shapes, capacity))

  return shapes.map((shape, index) => {
    const steps = [phone![index]!, tablet![index]!, desktop![index]!]

    const style: Record<string, number> = { '--r': trim(shape.ratio) }
    steps.forEach((step, at) => {
      style[`--s${at}`] = trim(step.share)
      style[`--n${at}`] = step.count
    })

    return {
      style: style as CSSProperties,
      sizes: `(min-width: 1024px) ${vw(steps[2]!.share)}, (min-width: 640px) ${vw(steps[1]!.share)}, ${vw(steps[0]!.share)}`,
      measured: ratios[index] !== null,
    }
  })
}
