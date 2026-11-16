'use client'

import { useCallback, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'

import type { Media as MediaDoc } from '@/payload-types'

import { LightboxModal } from './LightboxModal'
import type { GalleryPhoto } from './types'

/**
 * Opens the full-screen view for photographs rendered by the SERVER.
 *
 * The news-item album and the photo walls on the Kindergarten and Primary
 * gallery pages were plain images: clicking one did nothing, so a parent could
 * not see a photograph larger or step through an album (found in testing,
 * 2026-11-16). Their tiles stay server-rendered; each carries
 * `data-lightbox-index`, and one click handler here, on the wrapper, opens the
 * same lightbox the other galleries use.
 *
 * Delegated rather than wrapping each tile in a button, because the tiles are
 * `<li>` elements in a list and a button around a list item is invalid HTML.
 * The tiles get `role="button"` and `tabIndex={0}` instead, so they can be
 * reached and opened from the keyboard.
 */
export interface LightboxItem {
  media: MediaDoc
  caption?: string | null
}

const indexOf = (target: EventTarget | null): number | null => {
  const tile = (target as HTMLElement | null)?.closest?.('[data-lightbox-index]')
  if (!tile) return null
  const value = Number((tile as HTMLElement).dataset.lightboxIndex)
  return Number.isFinite(value) ? value : null
}

export const LightboxGroup = ({ items, children }: { items: LightboxItem[]; children: ReactNode }) => {
  const [open, setOpen] = useState<number | null>(null)

  const step = useCallback(
    (by: number) =>
      setOpen((current) => (current === null ? null : (current + by + items.length) % items.length)),
    [items.length],
  )

  const onClick = (event: MouseEvent) => {
    const index = indexOf(event.target)
    if (index === null || !items[index]) return
    event.preventDefault()
    setOpen(index)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    // Only when the tile itself has focus, not a link inside it.
    if (!(event.target as HTMLElement).hasAttribute?.('data-lightbox-index')) return
    const index = indexOf(event.target)
    if (index === null || !items[index]) return
    event.preventDefault()
    setOpen(index)
  }

  const item = open === null ? null : items[open]
  const photo: GalleryPhoto | null = item
    ? {
        id: `lightbox-${open}`,
        media: item.media,
        caption: item.caption ?? undefined,
        category: '',
        feature: false,
      }
    : null

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- delegated; the tiles are the controls
    <div onClick={onClick} onKeyDown={onKeyDown}>
      {children}
      <LightboxModal
        photo={photo}
        onClose={() => setOpen(null)}
        onPrevious={() => step(-1)}
        onNext={() => step(1)}
        position={(open ?? 0) + 1}
        total={items.length}
      />
    </div>
  )
}

