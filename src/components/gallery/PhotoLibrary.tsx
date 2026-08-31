'use client'

import { useCallback, useMemo, useState } from 'react'

import { BentoGridContainer } from './BentoGridContainer'
import { GalleryHeader } from './GalleryHeader'
import { LightboxModal } from './LightboxModal'
import type { GalleryPhoto } from './types'

/**
 * Holds the two pieces of state the gallery has — which tab is in force, and
 * which photograph is open — and nothing else.
 *
 * The heading and intro are rendered on the SERVER and handed in as children,
 * so the rich text converter and its content never enter the client bundle.
 * Only the interactive parts are shipped.
 */
export const PhotoLibrary = ({
  photos,
  categories,
  allLabel,
  children,
}: {
  photos: GalleryPhoto[]
  categories: string[]
  allLabel: string
  children?: React.ReactNode
}) => {
  const [active, setActive] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const counts = useMemo(() => {
    const tally: Record<string, number> = {}
    for (const photo of photos) tally[photo.category] = (tally[photo.category] ?? 0) + 1
    return tally
  }, [photos])

  const shown = useMemo(
    () => (active === null ? photos : photos.filter((photo) => photo.category === active)),
    [photos, active],
  )

  /*
   * The lightbox steps through what is CURRENTLY on screen, not the whole
   * library. Someone who has filtered to "Celebrations" and pressed the right
   * arrow expects the next celebration, not whatever happens to be next in the
   * unfiltered order.
   */
  const index = shown.findIndex((photo) => photo.id === openId)
  const open = index >= 0 ? shown[index]! : null

  const step = useCallback(
    (by: number) => {
      if (shown.length === 0) return
      setOpenId((current) => {
        const at = shown.findIndex((photo) => photo.id === current)
        if (at < 0) return current
        return shown[(at + by + shown.length) % shown.length]!.id
      })
    },
    [shown],
  )

  const changeCategory = useCallback((category: string | null) => {
    setActive(category)
    // A filter change while the lightbox is open would leave it showing a
    // photograph that is no longer on the wall behind it.
    setOpenId(null)
  }, [])

  return (
    <>
      <GalleryHeader
        categories={categories}
        active={active}
        onChange={changeCategory}
        counts={counts}
        allLabel={allLabel}
      >
        {children}
      </GalleryHeader>

      <BentoGridContainer photos={shown} onOpen={(photo) => setOpenId(photo.id)} />

      <LightboxModal
        photo={open}
        onClose={() => setOpenId(null)}
        onPrevious={() => step(-1)}
        onNext={() => step(1)}
        position={index + 1}
        total={shown.length}
      />
    </>
  )
}
