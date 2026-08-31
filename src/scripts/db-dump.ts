import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

import { loadEnv } from '@/utilities/load-env'

loadEnv()

/**
 * Dumps the site's content to `db/siws-content.sql.gz`.
 *
 * WHY THIS IS A SCRIPT AND NOT AN npm ONE-LINER
 * ---------------------------------------------
 * Two reasons, both of which bit the one-liner version.
 *
 * npm does not read `.env`, so a `pg_dump "$DATABASE_URI"` in package.json
 * runs against an empty string and dumps nothing — silently, with exit code 0,
 * leaving a valid-looking gzip holding a handful of bytes. Loading the
 * environment the way every other script here does removes that whole class of
 * failure.
 *
 * And `$DATABASE_URI` inside a JSON string in package.json is expanded by
 * whichever shell npm picked, which on Windows is not the one you were
 * thinking of.
 *
 * WHAT IT LEAVES OUT, AND WHY
 * ---------------------------
 * The structure of every table comes across; the ROWS of four do not.
 *
 *   users              — password hashes. A credential does not belong in a
 *                        git repository, and a teammate could not use it
 *                        anyway without being told the password.
 *   enquiries          — parents' names, telephone numbers and messages,
 *                        submitted to a school in confidence. Publishing them
 *                        to every clone of the repo is exactly the kind of
 *                        onward disclosure the DPDPA 2023 exists to prevent.
 *   audit_logs         — the compliance record of consent decisions
 *                        (FR-PRV-11); it belongs to the live installation that
 *                        made them, not to a checkout.
 *   payload_preferences — one developer's collapsed sidebars and last-used
 *                        filters. Noise in every diff, meaning to nobody.
 *
 * Run with:  npm run db:dump
 */

const EXCLUDED = [
  'public.users',
  'public.users_*',
  'public.enquiries',
  'public.audit_logs',
  'public.payload_preferences*',
]

const uri = process.env.DATABASE_URI
if (!uri) throw new Error('DATABASE_URI is not set — check .env')

/*
 * `pg_dump` is not on PATH in a default Windows PostgreSQL install, so the
 * bin directory is tried as well before giving up with something actionable.
 */
const candidates = [
  'pg_dump',
  ...(process.platform === 'win32'
    ? ['18', '17', '16'].map((v) => `C:/Program Files/PostgreSQL/${v}/bin/pg_dump.exe`)
    : []),
]

const binary = candidates.find((candidate) => {
  try {
    execFileSync(candidate, ['--version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})

if (!binary) {
  throw new Error(
    `pg_dump not found. Tried: ${candidates.join(', ')}. Install the PostgreSQL client tools, or add its bin directory to PATH.`,
  )
}

const out = path.resolve(process.cwd(), 'db/siws-content.sql.gz')
fs.mkdirSync(path.dirname(out), { recursive: true })

const sql = execFileSync(
  binary,
  [
    uri,
    '--no-owner',
    '--no-privileges',
    // So a restore over an existing database replaces it rather than colliding.
    '--clean',
    '--if-exists',
    ...EXCLUDED.map((table) => `--exclude-table-data=${table}`),
  ],
  { maxBuffer: 512 * 1024 * 1024, encoding: 'buffer' },
)

/*
 * A dump this small means the connection succeeded and the database was empty
 * — the failure the one-liner used to hide. Better to refuse than to overwrite
 * a good dump with an empty one.
 */
if (sql.length < 100_000) {
  throw new Error(
    `pg_dump returned only ${sql.length} bytes. That is an empty or wrong database — the existing dump has been left alone.`,
  )
}

/*
 * LINE ENDINGS NORMALISED TO LF.
 *
 * `pg_dump.exe` writes CRLF through a pipe on Windows and LF everywhere else,
 * so the same database dumped on two machines produced two different files and
 * every dump showed as a whole-file change in git. Normalising means the
 * committed dump is the same bytes whoever ran it.
 *
 * Safe for the content: inside a COPY block a carriage return that belongs to
 * a value is escaped as \r by pg_dump, so every raw CR in the stream is a line
 * terminator and nothing else.
 */
const text = sql.toString('utf8').replace(/\r\n/g, '\n')

/*
 * MADE RESTORABLE ON OLDER POSTGRESQL, because teammates do not all run 18.
 *
 * A dump written by pg_dump 18 carries two things a 16 or 17 client rejects
 * outright, and neither is data:
 *
 *   \restrict / \unrestrict   psql meta-commands added in 18 that fence off
 *                             the restore from injected commands. psql 16 does
 *                             not know them and stops with "invalid command".
 *   SET transaction_timeout   a GUC added in 17. On 16 the server answers
 *                             "unrecognized configuration parameter" and, with
 *                             ON_ERROR_STOP, the restore ends there.
 *
 * Both are stripped. The guard they provide matters when restoring a dump from
 * somewhere untrusted; this one is produced from, and restored into, a
 * developer's own database from a file in the repository, and the alternative
 * is a teammate who simply cannot load the site.
 *
 * Nothing that carries schema or content is touched — the deletions are whole
 * lines, matched at the start of a line, and the count is reported so a change
 * in pg_dump's output cannot silently turn this into a no-op.
 */
const portable = text
  .split('\n')
  .filter(
    (line) =>
      !line.startsWith('\\restrict ') &&
      !line.startsWith('\\unrestrict ') &&
      !line.startsWith('SET transaction_timeout'),
  )
  .join('\n')

const stripped = text.split('\n').length - portable.split('\n').length
if (stripped === 0) {
  console.warn(
    'Note: no version-specific lines were found to strip. Either pg_dump changed its output, or this dump came from an older server — check before assuming it restores on 16.',
  )
}

fs.writeFileSync(out, zlib.gzipSync(Buffer.from(portable, 'utf8'), { level: 9 }))

/*
 * Counts the data rows pg_dump emitted for one table, for the summary line.
 *
 * A COPY block runs from its header line to a line holding only a backslash
 * and a full stop. Both ends have to be anchored to line starts: without that
 * the terminator search walks past the end of the block and the count comes
 * out in the thousands, which is how the first version of this reported eight
 * thousand pages for a hundred and two.
 */
const rows = (table: string) => {
  const header = text.indexOf('\nCOPY public.' + table + ' (')
  if (header < 0) return 0
  const from = text.indexOf('\n', header + 1) + 1
  const end = text.indexOf('\n\\.\n', from)
  if (end < 0) return 0
  const body = text.slice(from, end)
  return body.length === 0 ? 0 : body.split('\n').length
}

console.log(
  `db/siws-content.sql.gz written — ${(fs.statSync(out).size / 1024 / 1024).toFixed(2)} MB, ` +
    `${rows('pages')} pages, ${rows('media')} media records, ${stripped} version-specific line(s) stripped.`,
)
console.log('Commit it, or your teammates keep the layout you just changed.')
