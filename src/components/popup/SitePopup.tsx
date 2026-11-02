import config from '@payload-config'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import { publishedWhere } from '@/access'
import { Media } from '@/components/Media'
import { RichText } from '@/components/RichText'
import { richTextHasText } from '@/lib/rich-text-has-text'
import type { Popup } from '@/payload-types'

import { PopupModal } from './PopupModal'

/**
 * The popup for one website: the main SIWS site (`unitId` null) or a school.
 * Shows the most recently saved published popup for that website, if any.
 */
export const SitePopup = async ({
  unitId,
  isHome,
}: {
  unitId: number | null
  isHome: boolean
}) => {
  let popup: Popup | undefined

  try {
    const payload = await getPayload({ config })

    const site: Where = unitId === null ? { unit: { exists: false } } : { unit: { equals: unitId } }
    const where: Where = {
      and: [publishedWhere(), site, ...(isHome ? [] : [{ showOn: { equals: 'all' } }])],
    }

    const { docs } = await payload.find({
      collection: 'popups',
      where,
      depth: 1,
      limit: 1,
      sort: '-updatedAt',
      overrideAccess: false,
    })
    popup = docs[0]
  } catch (error) {
    // A popup must never stop the page from rendering.
    console.error('Popup could not be loaded:', error)
    return null
  }

  if (!popup) return null

  const hasImage =
    typeof popup.image === 'object' && popup.image !== null && typeof popup.image.url === 'string'
  const hasMessage = richTextHasText(popup.content)
  // Nothing to show without an image or a message — not even the button.
  if (!hasImage && !hasMessage) return null

  const heading = popup.heading?.trim()
  const buttonLabel = popup.button?.label?.trim()
  const buttonUrl = popup.button?.url?.trim()
  const siteName =
    typeof popup.unit === 'object' && popup.unit !== null
      ? popup.unit.name
      : "South Indians' Welfare Society"

  return (
    <PopupModal
      popupKey={`${popup.id}:${popup.updatedAt}`}
      delaySeconds={popup.delaySeconds ?? 3}
      oncePerVisit={popup.frequency === 'session'}
      label={heading || popup.title}
      eyebrow={siteName}
      button={buttonLabel && buttonUrl ? { label: buttonLabel, url: buttonUrl } : null}
      image={
        hasImage ? (
          <Media
            resource={popup.image}
            sizes="(max-width: 767px) 100vw, 420px"
            className="siws-popup__img"
            fill
          />
        ) : null
      }
    >
      {heading ? (
        <h2 id="siws-popup-heading" className="siws-popup__heading">
          {heading}
        </h2>
      ) : null}
      {hasMessage ? (
        <RichText data={popup.content as never} className="siws-popup__text" />
      ) : null}
    </PopupModal>
  )
}
