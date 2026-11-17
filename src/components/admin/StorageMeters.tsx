import { HardDrive } from 'lucide-react'
import type { Payload, TypedUser } from 'payload'

import { isActiveUser, isAdmin, unitIdsOf } from '@/access'
import type { AccessUser } from '@/access'
import {
  STORAGE_COUNT_FROM,
  STORAGE_LIMIT_BYTES,
  formatBytes,
  storageByUnit,
} from '@/lib/media-storage'

/**
 * "Photo storage": one bar per school, showing how much has been uploaded to it
 * against the 2 GB allowance. Information only — see `@/lib/media-storage`.
 *
 * A Server Component (it reads the totals directly). An administrator sees all
 * four schools; anyone else sees only the school(s) they belong to, and nothing
 * at all if they belong to none (the sports and fine arts teachers).
 */

const since = new Date(STORAGE_COUNT_FROM).toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
})

export const StorageMeters = async ({
  payload,
  user,
  compact = false,
}: {
  payload: Payload
  user?: TypedUser | null
  compact?: boolean
}) => {
  const accessUser = (user ?? null) as AccessUser | null
  if (!payload || !isActiveUser(accessUser)) return null

  const unitIds = isAdmin(accessUser) ? undefined : unitIdsOf(accessUser)
  if (unitIds && unitIds.length === 0) return null

  const rows = await storageByUnit(payload, unitIds)
  if (rows.length === 0) return null

  return (
    <section
      aria-labelledby="siws-storage-heading"
      data-siws-storage=""
      style={{
        margin: compact ? '0 0 1.25rem' : '1.75rem 0',
        padding: '1.1rem 1.25rem',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '12px',
        background: 'var(--theme-elevation-0)',
      }}
    >
      <h2
        id="siws-storage-heading"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.05rem' }}
      >
        <HardDrive size={18} strokeWidth={2} aria-hidden="true" />
        Photo storage
      </h2>
      <p style={{ margin: '0.3rem 0 0.9rem', color: 'var(--theme-elevation-600)', fontSize: '0.85rem' }}>
        Each school has 2 GB. This counts photos and files uploaded since {since}. It is for your
        information only &mdash; uploading is never stopped.
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.9rem' }}>
        {rows.map((row) => {
          const over = row.used > STORAGE_LIMIT_BYTES
          const percent = Math.min(100, (row.used / STORAGE_LIMIT_BYTES) * 100)
          const tone = over ? '#c0392b' : percent >= 80 ? '#d68910' : '#1e8449'
          return (
            <li key={String(row.id)} data-storage-unit={row.name} data-storage-used={row.used}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  gap: '0.25rem 1rem',
                  fontSize: '0.92rem',
                }}
              >
                <strong>{row.name}</strong>
                <span>
                  {`${formatBytes(row.used)} of 2 GB used`}
                  <span style={{ color: 'var(--theme-elevation-600)' }}>
                    {' '}
                    &middot; {row.files} {row.files === 1 ? 'file' : 'files'}
                  </span>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${row.name} storage used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
                style={{
                  marginTop: '0.35rem',
                  height: '10px',
                  borderRadius: '999px',
                  background: 'var(--theme-elevation-100)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${row.used > 0 ? Math.max(percent, 1) : 0}%`,
                    height: '100%',
                    background: tone,
                    borderRadius: '999px',
                  }}
                />
              </div>
              {over ? (
                <p
                  role="note"
                  data-storage-over=""
                  style={{ margin: '0.4rem 0 0', color: '#c0392b', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {`The 2 GB limit has been crossed (${formatBytes(row.used)} used). You can still upload — this note is for your information only.`}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** For the Media library list (`beforeList`), which passes `payload` and `user`. */
export const MediaLibraryStorage = (props: { payload: Payload; user?: TypedUser | null }) => (
  <div className="gutter gutter--left gutter--right" style={{ paddingTop: '1rem' }}>
    <StorageMeters payload={props.payload} user={props.user} compact />
  </div>
)
