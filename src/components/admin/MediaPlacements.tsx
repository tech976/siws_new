'use client'

import { useConfig, useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

import type { MediaPlacement } from '@/utilities/media-placements'

/**
 * "Where this picture appears on the website" — at the top of a media item.
 *
 * The words printed over a photograph on the website are usually written on
 * the PAGE that shows it, not on the picture. This lists each place, the words
 * shown there, and a button that opens the page where they can be changed.
 */
export const MediaPlacements = () => {
  const { id } = useDocumentInfo()
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()
  const [placements, setPlacements] = useState<MediaPlacement[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (id === undefined || id === null) return
    let cancelled = false
    fetch(`${serverURL ?? ''}${api}/media/${id}/placements`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body: { placements: MediaPlacement[] }) => {
        if (!cancelled) setPlacements(body.placements)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [id, api, serverURL])

  // A new upload is not on the website anywhere yet.
  if (id === undefined || id === null) return null

  const box: React.CSSProperties = {
    marginBottom: '1.5rem',
    padding: '1rem 1.25rem',
    borderRadius: 8,
    border: '1px solid var(--theme-elevation-150)',
    background: 'var(--theme-elevation-50)',
  }

  if (failed) return null
  if (placements === null) {
    return <div style={box}>Checking where this picture is used on the website…</div>
  }

  if (placements.length === 0) {
    return (
      <div style={box}>
        <strong>Where this picture appears</strong>
        <p style={{ margin: '0.4rem 0 0' }}>
          It is not placed on any page yet. If it is filed under a gallery heading, it can still
          appear in that gallery, with the caption below.
        </p>
      </div>
    )
  }

  return (
    <div style={box}>
      <strong style={{ fontSize: '1.05rem' }}>
        Where this picture appears on the website ({placements.length})
      </strong>
      <p style={{ margin: '0.4rem 0 0.9rem', color: 'var(--theme-elevation-700)' }}>
        The words shown with the picture on a page are written on that page. To change them, open
        the page with the button and edit the row named below.
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem' }}>
        {placements.map((place, index) => {
          const where = [
            place.school,
            `${place.collectionLabel}: ${place.docTitle}`,
          ]
            .filter(Boolean)
            .join(' › ')
          const inside = [
            place.section
              ? `Section ${place.sectionNumber ?? ''} ${place.section}`.replace(/\s+/g, ' ')
              : '',
            place.rowNumber ? `row ${place.rowNumber}` : '',
          ]
            .filter(Boolean)
            .join(', ')
          return (
            <li
              key={`${place.collection}-${place.docId}-${index}`}
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: 6,
                background: 'var(--theme-elevation-0)',
                border: '1px solid var(--theme-elevation-100)',
              }}
            >
              <div style={{ fontWeight: 600 }}>{where}</div>
              {inside ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--theme-elevation-650)' }}>{inside}</div>
              ) : null}
              {place.texts.length > 0 ? (
                <dl style={{ margin: '0.5rem 0 0', display: 'grid', gap: '0.15rem' }}>
                  {place.texts.map((t) => (
                    <div key={t.label} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.92rem' }}>
                      <dt style={{ minWidth: '7.5rem', color: 'var(--theme-elevation-600)' }}>{t.label}</dt>
                      <dd style={{ margin: 0 }}>“{t.value}”</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <a
                href={place.editUrl}
                className="btn btn--style-secondary btn--size-small"
                style={{ marginTop: '0.6rem', marginBottom: 0, display: 'inline-flex' }}
              >
                Change the words on this page →
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default MediaPlacements
