import { loadEnv } from '@/utilities/load-env'
import { findMediaId } from '@/utilities/media-lookup'

loadEnv()

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import sharp from 'sharp'

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Puts a photograph behind the portal home page's "Our Vision" band.
 *
 * The band was flat brand blue. SIWS asked for one of their own photographs
 * behind it, under the brand gradient, with the statement still readable —
 * which is what `RichTextBlockView` now renders when a Narrow text section
 * carries a `backgroundImage`. This script supplies the picture and points
 * the block at it.
 *
 * CONSENT (FR-PRV-11). The photograph shows identifiable students, so it is
 * marked `depictsChildren` and the publish hook will refuse the page until a
 * permission record exists. This script does NOT invent one: pass `--consent`
 * only when SIWS actually holds the signed permission, and record where the
 * paperwork is filed with `--ref=...`. Without the flag the image is uploaded
 * and attached, and the page simply will not publish until the record is added
 * in the admin panel — which is the correct failure.
 *
 * Run with:  npm run seed:vision-bg -- --source="C:/path/to/photo.jpg"
 */

const MAX_WIDTH = 1800
const FILENAME = 'portal-vision-background.jpg'
/*
 * NO CAPTION ON THE LIBRARY RECORD, and `null` rather than an omission.
 *
 * This photograph is on two walls headed "In the classroom" — the Secondary
 * section's and the portal's — where "Collaboration and hands-on learning"
 * named neither a room nor a subject and simply said the heading again.
 *
 * The portal home page still prints those words, and they have not been lost:
 * `institution.ts` writes them onto the chosen tile itself, which is where a
 * line somebody composed for one picture belongs. What is cleared here is the
 * library's own caption, which every gallery falls back to.
 *
 * `null`, because `undefined` reads to Payload as "not supplied" and would
 * leave whatever the last run wrote sitting in the column for ever.
 */
const CAPTION = null
const ALT =
  'Secondary School students and their teacher around a laboratory bench, cutting coloured paper into a decoration.'

const arg = (name: string) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}

const run = async () => {
  const payload = await getPayload({ config })

  const source = arg('source')
  if (!source) throw new Error('Pass the photograph with --source="C:/path/to/photo.jpg"')
  if (!fs.existsSync(source)) throw new Error(`No file at ${source}`)

  /* ------------------------------------------------------------- the upload */
  /*
   * Suffix-tolerant, because it has to be. This matched on the exact name, and
   * `media/` is committed — so the name was already taken on disk, the upload
   * landed as `portal-vision-background-1.jpg`, and the next run failed to
   * recognise it and uploaded it again as `-2`. Every run added a copy and
   * re-pointed the Vision band at the newest one.
   */
  let mediaId: number | null = await findMediaId(payload, FILENAME)

  if (mediaId) {
    /*
     * The file is already there, but the words may have moved on, so re-running
     * must bring the text up to date rather than reporting "nothing to do" and
     * leaving a stale line behind. The image itself is not re-uploaded.
     *
     * THIS STEP RUNS AFTER `seed:image-filing`, so whatever it writes here is
     * the last word on this photograph's caption. A correction made in the
     * filing table would be undone a moment later, every run — which is why
     * the caption above is set in this file and not in that one.
     */
    await payload.update({
      collection: 'media',
      id: mediaId,
      overrideAccess: true,
      data: { alt: ALT, caption: CAPTION } as never,
    })
    payload.logger.info(`Already in the library: ${FILENAME} — alt and caption refreshed.`)
  } else {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'siws-vision-'))
    const resized = path.join(workDir, FILENAME)

    // `rotate()` with no argument applies the EXIF orientation, so a photograph
    // off a phone is not served on its side.
    await sharp(source)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(resized)

    const doc = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: {
        alt: ALT,
        // Null: the tile on the "Life at SIWS" wall carries its own words,
        // written in `institution.ts`. See the note on CAPTION above.
        caption: CAPTION,
        // Faces are clearly legible in this photograph.
        depictsChildren: true,
      } as never,
      filePath: resized,
    })
    mediaId = doc.id
    fs.rmSync(workDir, { recursive: true, force: true })
    payload.logger.info(`Uploaded ${FILENAME}`)
  }

  /* ------------------------------------------------------------ the consent */
  if (process.argv.includes('--consent')) {
    await payload.update({
      collection: 'media',
      id: mediaId,
      overrideAccess: true,
      data: {
        parentalConsent: {
          obtained: true,
          reference:
            arg('ref') ?? 'Confirmed by SIWS — please add where the signed records are filed.',
        },
      } as never,
    })
    payload.logger.info('Parental permission recorded against the photograph.')
  } else {
    payload.logger.warn(
      'No permission record written. The home page will not publish until one exists — pass --consent (with --ref=...) once SIWS holds the signed permission, or record it in the admin panel.',
    )
  }

  /* ------------------------------------------------------------- the wiring */
  /*
   * Written straight to the block row, for the reason `seed:nav` gives at
   * length: `payload.update` on the page rewrites the whole document, which
   * re-runs validation over content this script never touched and resets
   * fields it never passed — that is what silently cleared `show_in_nav`
   * across 75 pages earlier. One column on one block is all that changes here.
   */
  const pool = (
    payload.db as unknown as {
      pool: { query: (t: string, v: unknown[]) => Promise<{ rowCount: number | null }> }
    }
  ).pool

  const result = await pool.query(
    `UPDATE pages_blocks_rich_text b
        SET background_image_id = $1
       FROM pages p
      WHERE b._parent_id = p.id
        AND p.unit_id IS NULL
        AND p.slug = 'home'
        AND b.heading = 'Our Vision'`,
    [mediaId],
  )

  if (!result.rowCount) {
    payload.logger.error(
      'No "Our Vision" text section found on the portal home page — nothing was wired up.',
    )
    process.exit(1)
  }

  payload.logger.info(`Background photograph attached to ${result.rowCount} "Our Vision" band(s).`)
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
