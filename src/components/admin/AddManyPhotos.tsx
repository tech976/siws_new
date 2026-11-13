'use client'

import { useConfig, useField, useFormFields } from '@payloadcms/ui'
import { useCallback, useRef, useState } from 'react'

/**
 * "Add photos": one box that takes as many photographs as the teacher chooses
 * or drags in, uploads them together and adds them to the item's photographs.
 *
 * Teachers found the usual route hard — open "Create new", add files, fill in
 * a description for each, save — and often ended up with a single photo. Here
 * there is nothing to fill in: the description is written from the news title
 * after saving (see `name-news-photos.ts`).
 *
 * Large phone photos are shrunk in the browser first (longest side 2560 px),
 * so twenty of them upload in moments on a school connection and none trips
 * the 12 MB limit.
 */

type Status = 'waiting' | 'shrinking' | 'uploading' | 'done' | 'failed'

interface Row {
  key: string
  name: string
  status: Status
  message?: string
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const SHRINK_OVER_BYTES = 2.5 * 1024 * 1024
const MAX_SIDE = 2560
const AT_ONCE = 3

const toId = (value: unknown): number | string | null => {
  if (value && typeof value === 'object' && 'id' in value) return (value as { id: number }).id
  if (typeof value === 'number' || typeof value === 'string') return value
  return null
}

/** Returns a smaller JPEG for a big photo, or the file itself. */
const shrink = async (file: File): Promise<Blob> => {
  if (file.size <= SHRINK_OVER_BYTES || file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

const jpegName = (name: string) => name.replace(/\.[^.]+$/, '') + '.jpg'

export const AddManyPhotos = () => {
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()
  const { value, setValue } = useField<unknown[]>({ path: 'photos' })
  const unit = useFormFields(([fields]) => fields.unit?.value)

  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const upload = useCallback(
    async (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith('image/'))
      if (images.length === 0) return
      setBusy(true)

      const base = (Array.isArray(value) ? value : []).map(toId).filter((id) => id !== null)
      const added: (number | string | null)[] = images.map(() => null)
      const batch: Row[] = images.map((file, index) => ({
        key: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        status: 'waiting',
      }))
      setRows((current) => [...current.filter((row) => row.status !== 'done'), ...batch])

      let next = 0
      const worker = async () => {
        while (next < images.length) {
          const index = next++
          const file = images[index]!
          const row = batch[index]!
          try {
            update(row.key, { status: 'shrinking' })
            const blob = await shrink(file)
            update(row.key, { status: 'uploading' })

            const form = new FormData()
            form.append('file', blob, blob === file ? file.name : jpegName(file.name))
            const data: Record<string, unknown> = {}
            const unitId = toId(unit)
            if (unitId !== null) data.unit = unitId
            form.append('_payload', JSON.stringify(data))

            const res = await fetch(`${serverURL ?? ''}${api}/media`, {
              method: 'POST',
              body: form,
              credentials: 'include',
            })
            const body = (await res.json().catch(() => ({}))) as {
              doc?: { id: number }
              errors?: { message?: string; data?: { errors?: { message?: string }[] } }[]
            }
            if (!res.ok || !body.doc) {
              const first = body.errors?.[0]
              throw new Error(
                first?.data?.errors?.[0]?.message ?? first?.message ?? `Upload failed (${res.status})`,
              )
            }
            added[index] = body.doc.id
            // Add as each one finishes, in the order they were chosen.
            setValue([...base, ...added.filter((id) => id !== null)])
            update(row.key, { status: 'done' })
          } catch (error) {
            update(row.key, {
              status: 'failed',
              message: error instanceof Error ? error.message : 'Upload failed',
            })
          }
        }
      }

      await Promise.all(Array.from({ length: Math.min(AT_ONCE, images.length) }, worker))
      setBusy(false)
      if (input.current) input.current.value = ''
    },
    [api, serverURL, setValue, unit, value],
  )

  const done = rows.filter((row) => row.status === 'done').length
  const failed = rows.filter((row) => row.status === 'failed').length

  const label: Record<Status, string> = {
    waiting: 'Waiting…',
    shrinking: 'Preparing…',
    uploading: 'Uploading…',
    done: 'Added ✓',
    failed: 'Not added',
  }

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !busy) {
            event.preventDefault()
            input.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!busy) void upload(Array.from(event.dataTransfer.files))
        }}
        style={{
          cursor: busy ? 'progress' : 'pointer',
          border: `2px dashed ${dragging ? 'var(--theme-success-500)' : 'var(--theme-elevation-300)'}`,
          background: dragging ? 'var(--theme-success-50)' : 'var(--theme-elevation-50)',
          borderRadius: 10,
          padding: '1.75rem 1.25rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '1.15rem', fontWeight: 600 }}>
          {busy ? 'Uploading your photos…' : '📷  Add photos — as many as you like'}
        </div>
        <div style={{ marginTop: '0.4rem', color: 'var(--theme-elevation-650)' }}>
          Click here and select all your photos at once (hold Ctrl, or press Ctrl + A in the
          folder), or drag them all into this box. Nothing else to fill in.
        </div>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(event) => void upload(Array.from(event.target.files ?? []))}
        />
      </div>

      {rows.length > 0 ? (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
            {done} added{failed ? `, ${failed} not added` : ''}
            {!busy && done > 0 ? ' — press Publish (or Save draft) to keep them.' : ''}
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.2rem' }}>
            {rows.map((row) => (
              <li key={row.key} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem' }}>
                <span
                  style={{
                    minWidth: '6.5rem',
                    color:
                      row.status === 'done'
                        ? 'var(--theme-success-600)'
                        : row.status === 'failed'
                          ? 'var(--theme-error-600)'
                          : 'var(--theme-elevation-600)',
                  }}
                >
                  {label[row.status]}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.name}
                  {row.message ? ` — ${row.message}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default AddManyPhotos
