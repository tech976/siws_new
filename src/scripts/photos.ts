import fs from 'fs'
import path from 'path'

import sharp from 'sharp'

import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Bulk photograph intake.
 *
 * Two commands, run in order:
 *
 *   npm run photos:scan     walks `photos-inbox/`, writes `photos-inbox/manifest.csv`
 *                           with one row per image and the filenames filled in
 *   npm run photos:import   reads that manifest, resizes and uploads every row
 *                           that is ready, and reports every row that is not
 *
 * WHY A MANIFEST RATHER THAN JUST A FOLDER
 * ----------------------------------------
 * Two things cannot be derived from an image file, and both are required:
 *
 *  1. ALT TEXT. A description of a photograph nobody has looked at is worse
 *     than none, because a screen-reader user cannot tell that it is wrong.
 *     Filenames like `IMG_20260204_113045.jpg` carry no meaning at all.
 *
 *  2. WHETHER A STUDENT IS IDENTIFIABLE, and if so the evidence of parental
 *     permission. FR-PRV-11 requires the platform to record that verifiable
 *     consent was obtained, by whom and on what date, and to refuse
 *     publication otherwise. That is a fact about the school's paperwork, not
 *     about the pixels.
 *
 * So the importer never guesses either. A row missing alt text is skipped and
 * listed; a row marked as showing children without consent details is imported
 * but stays unpublishable until the record is completed, which is exactly what
 * the consent hook enforces.
 *
 * The originals stay where they are. Camera files run to 6000×4000 and 19 MB,
 * past the 12 MB upload ceiling, so each is resized to 1800px on the long edge
 * on the way in. Nothing binary enters version control.
 */

const INBOX = path.resolve(process.cwd(), 'photos-inbox')
const MANIFEST = path.join(INBOX, 'manifest.csv')
const MAX_WIDTH = 1800

/**
 * Everything sharp can read and turn into a web JPEG.
 *
 * HEIC is here because iPhones produce it by default, and SIWS sent 50 of them
 * — a quarter of the set. Payload will not accept HEIC as an upload, but that
 * does not matter: every file is re-encoded to JPEG on the way in, so the
 * format only has to survive as far as sharp.
 */
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.tif', '.tiff'])

/**
 * A third of SIWS's photographs arrived with NO extension at all — `1`, `10`,
 * `11` — but with `ftypheic` in their first bytes. Something stripped the
 * suffix in transit.
 *
 * Extension-only matching silently ignored every one of them, and a photo
 * library that quietly drops a quarter of what it was given is worse than one
 * that refuses loudly. So a file with no extension is sniffed instead: the
 * magic bytes are the truth, the filename is only a hint.
 */
const MAGIC: { bytes: number[]; offset: number }[] = [
  { bytes: [0xff, 0xd8, 0xff], offset: 0 }, // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 }, // PNG
  { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ISO-BMFF: HEIC / AVIF / MP4
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF (WebP)
]

const looksLikeImage = (file: string): boolean => {
  let fd: number | undefined
  try {
    fd = fs.openSync(file, 'r')
    const head = Buffer.alloc(16)
    fs.readSync(fd, head, 0, 16, 0)

    // `ftyp` also fronts MP4 video, so the brand that follows decides.
    if (head.subarray(4, 8).toString('latin1') === 'ftyp') {
      const brand = head.subarray(8, 12).toString('latin1')
      return brand.startsWith('hei') || brand.startsWith('mif') || brand.startsWith('avi')
    }

    return MAGIC.some((sig) =>
      sig.bytes.every((byte, i) => head[sig.offset + i] === byte),
    )
  } catch {
    return false
  } finally {
    if (fd !== undefined) fs.closeSync(fd)
  }
}

const COLUMNS = [
  'file',
  'section',
  'campus',
  'category',
  'in_gallery',
  'alt',
  'caption',
  'credit',
  'shows_students',
  'consent_method',
  'consent_date',
  'consent_reference',
] as const

type Row = Record<(typeof COLUMNS)[number], string>

/** Minimal CSV writer — quotes every field, so commas and quotes are safe. */
const toCsv = (rows: string[][]): string =>
  rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n')

/**
 * Minimal CSV reader. Handles quoted fields, escaped quotes and embedded
 * newlines — a caption typed in Excel will contain at least one of those.
 */
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else quoted = false
      } else cell += char
      continue
    }

    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') cell += char
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((entry) => entry.some((value) => value.trim().length > 0))
}

/** Every image under the inbox, as a path relative to it. */
const findImages = (dir: string, base = dir): string[] => {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return findImages(full, base)

    const ext = path.extname(entry.name).toLowerCase()
    // A known image extension, or no extension at all and the bytes say image.
    const keep = ext.length > 0 ? IMAGE_EXT.has(ext) : looksLikeImage(full)
    if (!keep) return []

    return [path.relative(base, full).split(path.sep).join('/')]
  })
}

/**
 * A stable library filename: `section-folder-name.jpg`.
 *
 * Camera filenames collide across folders (every phone produces an IMG_0001),
 * and the library is flat, so the path is folded into the name.
 */
const libraryName = (relative: string): string => {
  const withoutExt = relative.replace(/\.[^.]+$/, '')
  const slug = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/\//g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug}.jpg`
}

/**
 * Reads any supported original and returns a web-sized JPEG.
 *
 * HEIC needs a detour. `sharp` reports HEIF support, but that is the container
 * only — the prebuilt binary ships without the HEVC decoder, which is
 * patent-encumbered. It reads the metadata happily and then fails on the pixels
 * with `bad seek to …`, which reads like a corrupt file rather than a missing
 * codec. Windows cannot decode them either: the HEVC extension is a paid Store
 * add-on, and GDI+ reports its absence as "Out of memory".
 *
 * `heic-decode` is a pure-JavaScript decoder, so it needs nothing installed on
 * the machine. It hands back raw RGBA, which sharp then resizes and encodes as
 * usual. Half of SIWS's Primary photographs are HEIC — a fifth of everything
 * they sent — so this path is not an edge case.
 */
const toWebJpeg = async (source: string): Promise<Buffer> => {
  const isHeic =
    ['.heic', '.heif'].includes(path.extname(source).toLowerCase()) ||
    (path.extname(source) === '' && looksLikeImage(source))

  const pipeline = async (input: Buffer | string, raw?: sharp.CreateRaw) =>
    sharp(input as never, raw ? { raw } : undefined)
      // Honours the EXIF orientation flag; phone photos arrive sideways.
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()

  if (!isHeic) return pipeline(source)

  try {
    return await pipeline(source)
  } catch {
    const { default: decode } = await import('heic-decode')
    const { width, height, data } = await decode({ buffer: fs.readFileSync(source) })
    // Raw RGBA out of the decoder, so sharp is told the shape explicitly.
    return pipeline(Buffer.from(data), { width, height, channels: 4 })
  }
}

// ---------------------------------------------------------------- scan
const scan = async () => {
  /**
   * The folder name is only used as the section when it actually names one.
   * Guessing from any folder produced rows saying `section: shared`, which is
   * not a school — the import then rejected them, and the person filling in the
   * manifest had to work out why a value the tool wrote itself was invalid.
   *
   * The database is consulted for the real list, but scanning does not REQUIRE
   * it. This step only reads files and writes a spreadsheet; refusing to do that
   * because Postgres happens to be down would block the slow part of the job —
   * writing alt text — on the fast part. The fallback is the four units the SRS
   * fixes, and `photos:import` re-checks every section against the database
   * anyway, so a stale fallback cannot let a bad value through.
   */
  const FALLBACK_SECTIONS = ['kindergarten', 'primary', 'secondary', 'junior-college']

  let knownSections: Set<string>
  try {
    const payload = await getPayload({ config })
    const { docs: units } = await payload.find({
      collection: 'units',
      limit: 20,
      depth: 0,
      overrideAccess: true,
    })
    knownSections = new Set(units.map((unit) => unit.slug as string))
  } catch {
    knownSections = new Set(FALLBACK_SECTIONS)
    console.log('\nNote: could not reach the database, using the standard section list.')
  }

  if (!fs.existsSync(INBOX)) {
    fs.mkdirSync(INBOX, { recursive: true })
    console.log(`Created ${INBOX}`)
  }

  const images = findImages(INBOX)
  if (images.length === 0) {
    console.log(
      `\nNo images found in ${INBOX}.\n\nPut the photographs in there — subfolders are fine and become the section — then run this again.\n`,
    )
    return
  }

  /** Keeps anything already filled in, so re-scanning is safe. */
  const existing = new Map<string, Row>()
  if (fs.existsSync(MANIFEST)) {
    const rows = parseCsv(fs.readFileSync(MANIFEST, 'utf8'))
    const header = rows.shift() ?? []
    for (const row of rows) {
      const record = Object.fromEntries(header.map((key, i) => [key, row[i] ?? ''])) as Row
      if (record.file) existing.set(record.file, record)
    }
  }

  const body = images.map((relative) => {
    const previous = existing.get(relative)
    const segments = relative.split('/')
    /**
     * Section is looked for anywhere in the path, not just the first segment:
     * SIWS sent "Pre Primary Section/Festivals/1.jpg", where neither level names
     * a unit slug. It stays blank rather than wrong, and is filled in once.
     */
    const guessedSection = segments.find((segment) => knownSections.has(segment)) ?? ''
    /**
     * Category is the folder the file sits in — "Festivals", "Sports". Schools
     * already sort photographs this way, and it is what the gallery groups by,
     * so the structure they sent is preserved rather than flattened.
     */
    const guessedCategory = segments.length > 1 ? segments[segments.length - 2]! : ''
    /**
     * Wadala and Matunga are separate campuses of one Primary Section, and the
     * school keeps a folder per campus. The name is matched loosely because
     * their folders read "Wadala Primary Images" and "Matunga Web Site Images".
     */
    const lower = relative.toLowerCase()
    const guessedCampus = lower.includes('matunga')
      ? 'matunga'
      : lower.includes('wadala')
        ? 'wadala'
        : ''
    return COLUMNS.map((column) => {
      if (column === 'file') return relative
      if (column === 'section') return previous?.section ?? guessedSection
      if (column === 'campus') return previous?.campus ?? guessedCampus
      if (column === 'category') return previous?.category ?? guessedCategory
      return previous?.[column] ?? ''
    })
  })

  fs.writeFileSync(MANIFEST, toCsv([[...COLUMNS], ...body]), 'utf8')

  const blank = body.filter((row) => row[COLUMNS.indexOf('alt')]!.trim().length === 0).length

  console.log(`\n${images.length} image(s) found. Manifest written to:\n  ${MANIFEST}\n`)
  console.log(`  ${blank} row(s) still need alt text.\n`)
  console.log('Columns to fill in:')
  console.log('  section            kindergarten | primary | secondary | junior-college')
  console.log('                     (leave blank to share the photo across all sections)')
  console.log('  campus             wadala | matunga (Primary only; blank otherwise)')
  console.log('  category           the group it appears under, e.g. Festivals, Sports')
  console.log('  in_gallery         no to keep it out of the photo gallery (posters, thumbnails)')
  console.log('  alt         REQ    what is in the picture, for someone who cannot see it')
  console.log('  caption            optional line shown under the photo')
  console.log('  credit             photographer, if one should be named')
  console.log('  shows_students     yes | no — can any student be recognised?')
  console.log('  consent_method     admission_form | permission_slip | written_confirmation | other')
  console.log('  consent_date       YYYY-MM-DD')
  console.log('  consent_reference  where the signed paperwork is filed')
  console.log('\nThen run:  npm run photos:import\n')
}

// -------------------------------------------------------------- import
const CONSENT_METHODS = new Set([
  'admission_form',
  'permission_slip',
  'written_confirmation',
  'other',
])

const importPhotos = async () => {
  if (!fs.existsSync(MANIFEST)) {
    console.error(`No manifest at ${MANIFEST}. Run \`npm run photos:scan\` first.`)
    process.exit(1)
  }

  const payload = await getPayload({ config })

  const rows = parseCsv(fs.readFileSync(MANIFEST, 'utf8'))
  const header = rows.shift() ?? []
  const records = rows.map(
    (row) => Object.fromEntries(header.map((key, i) => [key, (row[i] ?? '').trim()])) as Row,
  )

  const { docs: units } = await payload.find({
    collection: 'units',
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const unitBySlug = new Map(units.map((unit) => [unit.slug, unit.id]))

  let created = 0
  let updated = 0
  const skipped: string[] = []
  const needConsent: string[] = []

  for (const record of records) {
    const source = path.join(INBOX, record.file)

    if (!record.file || !fs.existsSync(source)) {
      skipped.push(`${record.file || '(blank)'} — file not found in the inbox`)
      continue
    }

    if (record.alt.length === 0) {
      skipped.push(`${record.file} — no alt text. Describe what is in the picture.`)
      continue
    }

    if (record.section && !unitBySlug.has(record.section)) {
      skipped.push(
        `${record.file} — unknown section "${record.section}". Use one of: ${[...unitBySlug.keys()].join(', ')}, or leave blank.`,
      )
      continue
    }

    /**
     * BLANK IS NOT "NO".
     *
     * This read `/^(y|yes|true|1)$/.test(value)`, so an empty cell meant "no
     * students in this picture" — the unsafe answer, silently, for the single
     * field that decides whether a photograph of a child needs a permission
     * record. On a 203-row school photo set, one unfilled column would have
     * published children's faces.
     *
     * Unanswered is now its own state, and the row is skipped until somebody
     * says one way or the other.
     */
    const answer = record.shows_students.trim().toLowerCase()
    const saysYes = ['y', 'yes', 'true', '1'].includes(answer)
    const saysNo = ['n', 'no', 'false', '0'].includes(answer)

    if (!saysYes && !saysNo) {
      skipped.push(
        `${record.file} — shows_students is blank. Answer yes or no: can any student be recognised?`,
      )
      continue
    }

    const showsStudents = saysYes

    /**
     * A photograph of an identifiable student is imported even without consent
     * details, deliberately — the picture still needs to reach the library so
     * staff can see what they have. What it cannot do is appear on a published
     * page, and the consent hook already refuses that. It is reported here so
     * the gap is visible rather than discovered at publish time.
     */
    const consentComplete =
      showsStudents &&
      CONSENT_METHODS.has(record.consent_method) &&
      /^\d{4}-\d{2}-\d{2}$/.test(record.consent_date)

    if (showsStudents && !consentComplete) {
      needConsent.push(record.file)
    }

    const filename = libraryName(record.file)

    let buffer: Buffer
    try {
      buffer = await toWebJpeg(source)
    } catch (error) {
      skipped.push(`${record.file} — could not read the image: ${(error as Error).message}`)
      continue
    }

    const data: Record<string, unknown> = {
      alt: record.alt,
      category: record.category || undefined,
      // Blank means yes: the column was added later and every existing
      // manifest leaves it empty.
      showInGallery: !/^(no|false|n)$/i.test(record.in_gallery.trim()),
      campus: record.campus || undefined,
      caption: record.caption || undefined,
      credit: record.credit || undefined,
      unit: record.section ? unitBySlug.get(record.section) : undefined,
      depictsChildren: showsStudents,
      ...(consentComplete
        ? {
            parentalConsent: {
              obtained: true,
              method: record.consent_method,
              obtainedOn: new Date(`${record.consent_date}T00:00:00Z`).toISOString(),
              reference: record.consent_reference || undefined,
            },
          }
        : {}),
    }

    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (existing.docs[0]) {
      /**
       * METADATA ONLY on update — deliberately no `file`.
       *
       * Re-sending the buffer made Payload write a second copy, and because the
       * original name was still on disk it appended a number: a re-import of
       * `…-activities-photos-1.jpg` landed as `…-activities-photos-13.jpg`
       * carrying photo 1's alt text. The document's filename then no longer
       * matched what the next run looked up, so it created another, and another.
       * Three imports of 46 photographs had produced 71 rows.
       *
       * The bytes have not changed — only the spreadsheet has — so there is
       * nothing to re-upload. This is also much faster.
       */
      await payload.update({
        collection: 'media',
        id: existing.docs[0].id,
        data: data as never,
        overrideAccess: true,
      })
      updated += 1
    } else {
      await payload.create({
        collection: 'media',
        data: data as never,
        file: { data: buffer, mimetype: 'image/jpeg', name: filename, size: buffer.length },
        overrideAccess: true,
      })
      created += 1
    }
  }

  console.log(`\nImported — ${created} new, ${updated} updated.\n`)

  /**
   * Re-checked against the DATABASE, not the manifest.
   *
   * This used to report every row whose manifest line had no consent columns —
   * which after a second import listed 44 photographs as needing permission
   * when 36 of them already had a record entered elsewhere, through the admin
   * panel or `photos:consent`. Telling a school that permission is missing when
   * it is not invites someone to go and re-collect it.
   */
  const { docs: stillPending } = await payload.find({
    collection: 'media',
    where: {
      and: [
        { depictsChildren: { equals: true } },
        { 'parentalConsent.obtained': { not_equals: true } },
      ],
    },
    limit: 2000,
    depth: 0,
    overrideAccess: true,
  })

  needConsent.length = 0
  needConsent.push(...stillPending.map((doc) => String(doc.filename ?? doc.id)))

  if (needConsent.length > 0) {
    console.log(
      `PERMISSION STILL NEEDED for ${needConsent.length} photograph(s) showing identifiable students.`,
    )
    console.log(
      'They are in the library but cannot be published until the permission record is complete.',
    )
    for (const file of needConsent.slice(0, 20)) console.log(`  • ${file}`)
    if (needConsent.length > 20) console.log(`  … and ${needConsent.length - 20} more`)
    console.log('')
  }

  if (skipped.length > 0) {
    console.log(`SKIPPED ${skipped.length} row(s):`)
    for (const reason of skipped.slice(0, 30)) console.log(`  • ${reason}`)
    if (skipped.length > 30) console.log(`  … and ${skipped.length - 30} more`)
    console.log('')
  }

  process.exit(0)
}

const command = process.argv[2]

if (command === 'scan') {
  await scan()
  process.exit(0)
} else if (command === 'import') {
  await importPhotos()
} else {
  console.error('Usage: tsx src/scripts/photos.ts scan|import')
  process.exit(1)
}
