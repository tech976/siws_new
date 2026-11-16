'use client'

import { useConfig, useField, useForm, useFormFields } from '@payloadcms/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

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
 *
 * TWO WAYS PHOTOGRAPHS WERE STILL LOST (testing, 2026-11-16):
 *  - Pressing Publish while the box was still uploading saved the item with
 *    only the photographs that had finished, and leaving the page mid-upload
 *    gave no warning. While anything is uploading the form is now locked (so
 *    Publish and Save cannot be pressed) and leaving the page asks first.
 *  - Re-adding photographs named like "photo-1.jpg" failed for some of them:
 *    the server renames a clash to "photo-2", which clashed with another file
 *    of the same batch uploading at that moment. A file refused for its name
 *    is now retried under a slightly different name.
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

/** "photo-1.jpg" -> "photo-1-k3f9.jpg", for a retry after a name clash. */
const varyName = (name: string) => {
  const dot = name.lastIndexOf('.')
  const tag = Math.random().toString(36).slice(2, 6)
  return dot > 0 ? `${name.slice(0, dot)}-${tag}${name.slice(dot)}` : `${name}-${tag}`
}

const NAME_CLASH = /field is invalid: filename/i

/** The server's message, in words a teacher can act on. */
const plainMessage = (message: string): string => {
  if (NAME_CLASH.test(message)) return 'The file name clashed with another photo. Please add this one again.'
  if (/field is invalid: file\b/i.test(message)) {
    return 'This file could not be read as a photo. Please choose a JPG or PNG photo.'
  }
  if (/not allowed|forbidden/i.test(message)) {
    return 'Your account is not allowed to add photos here. Please ask the website administrator.'
  }
  return message
}

export const AddManyPhotos = () => {
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()
  const { value, setValue } = useField<unknown[]>({ path: 'photos' })
  const { setDisabled } = useForm()
  const unit = useFormFields(([fields]) => fields.unit?.value)

  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  /*
   * While uploading: the form is locked so Publish / Save cannot be pressed
   * half-way, and leaving the page (closing the tab, or clicking a link in the
   * panel) asks first.
   */
  useEffect(() => {
    if (!busy) return
    setDisabled(true)
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const guardLinks = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest?.('a[href]')
      if (!link) return
      const leave = window.confirm(
        'Your photos are still uploading. If you leave now they will not be added to this item. Leave anyway?',
      )
      if (!leave) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', warn)
    document.addEventListener('click', guardLinks, true)
    return () => {
      setDisabled(false)
      window.removeEventListener('beforeunload', warn)
      document.removeEventListener('click', guardLinks, true)
    }
  }, [busy, setDisabled])

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const upload = useCallback(
    async (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith('image/'))
      // Anything that is not a photo is listed as not added, never dropped silently.
      const skipped: Row[] = files
        .filter((file) => !file.type.startsWith('image/'))
        .map((file, index) => ({
          key: `${Date.now()}-skip-${index}-${file.name}`,
          name: file.name,
          status: 'failed' as const,
          message: 'Only photos can be added here (JPG, PNG, WebP or GIF).',
        }))
      if (images.length === 0) {
        setRows((current) => [...current.filter((row) => row.status !== 'done'), ...skipped])
        if (input.current) input.current.value = ''
        return
      }
      setBusy(true)

      const base = (Array.isArray(value) ? value : []).map(toId).filter((id) => id !== null)
      const added: (number | string | null)[] = images.map(() => null)
      const batch: Row[] = images.map((file, index) => ({
        key: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        status: 'waiting',
      }))
      setRows((current) => [...current.filter((row) => row.status !== 'done'), ...batch, ...skipped])

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

            const data: Record<string, unknown> = {}
            const unitId = toId(unit)
            if (unitId !== null) data.unit = unitId
            const baseName = blob === file ? file.name : jpegName(file.name)

            let id: number | null = null
            for (let attempt = 0; attempt < 3 && id === null; attempt += 1) {
              const form = new FormData()
              form.append('file', blob, attempt === 0 ? baseName : varyName(baseName))
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
              if (res.ok && body.doc) {
                id = body.doc.id
                break
              }
              const first = body.errors?.[0]
              const message =
                first?.data?.errors?.[0]?.message ?? first?.message ?? `Upload failed (${res.status})`
              // Only a name clash is worth another try; anything else is final.
              if (!NAME_CLASH.test(message) || attempt === 2) throw new Error(plainMessage(message))
            }
            if (id === null) throw new Error('Upload failed')
            added[index] = id
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

  const inBatch = rows.filter((row) => row.status !== 'failed' || busy).length
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {busy ? (
        /*
         * Publish is locked while photographs upload, but a locked button looks
         * the same as a working one at the top of a long form. This says why.
         */
        <div
          role="status"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '1.25rem',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'var(--theme-elevation-900)',
            color: 'var(--theme-elevation-0)',
            padding: '0.75rem 1.25rem',
            borderRadius: 999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            fontWeight: 600,
            maxWidth: 'calc(100vw - 2rem)',
            textAlign: 'center',
          }}
        >
          Uploading photos — {done} of {inBatch} done. Please wait; Publish and Save will work again
          when they are all added.
        </div>
      ) : null}
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
          Click here and select all your photos at once (on a computer, hold Ctrl or press
          Ctrl + A in the folder), or drag them all into this box. Nothing else to fill in. Please
          wait until every photo says &ldquo;Added&rdquo; before you press Publish.
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
