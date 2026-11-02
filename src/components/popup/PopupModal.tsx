'use client'

import { ArrowRight, Megaphone, X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const SEEN_PREFIX = 'siws_popup_seen:'

const alreadySeen = (key: string): boolean => {
  try {
    return window.sessionStorage.getItem(SEEN_PREFIX + key) === '1'
  } catch {
    return false
  }
}

const markSeen = (key: string) => {
  try {
    window.sessionStorage.setItem(SEEN_PREFIX + key, '1')
  } catch {
    // Private mode or blocked storage: the popup may show again, which is fine.
  }
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Opens `delaySeconds` after the page loads and stays open until the visitor
 * closes it — with the close button, or Escape for keyboard users. Clicking
 * the backdrop does nothing, so it cannot be dismissed by accident.
 */
export const PopupModal = ({
  popupKey,
  delaySeconds,
  oncePerVisit,
  label,
  eyebrow,
  image,
  button,
  children,
}: {
  popupKey: string
  delaySeconds: number
  oncePerVisit: boolean
  label: string
  eyebrow: string
  image: ReactNode
  button: { label: string; url: string } | null
  children: ReactNode
}) => {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    returnFocus.current?.focus?.()
  }, [])

  // Open once, `delaySeconds` after the page has loaded.
  useEffect(() => {
    if (oncePerVisit && alreadySeen(popupKey)) return
    const id = setTimeout(
      () => {
        returnFocus.current = document.activeElement as HTMLElement | null
        setOpen(true)
        if (oncePerVisit) markSeen(popupKey)
      },
      Math.max(0, delaySeconds) * 1000,
    )
    return () => clearTimeout(id)
  }, [popupKey, delaySeconds, oncePerVisit])

  // While open: focus the close button, keep Tab inside, Escape closes,
  // and the page behind does not scroll.
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus({ preventScroll: true })

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]!
      const last = items[items.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, close])

  if (!open) return null

  return (
    <div className="siws-popup">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`siws-popup__dialog${image ? ' siws-popup__dialog--media' : ''}`}
      >
        <button
          ref={closeRef}
          type="button"
          className="siws-popup__close"
          onClick={close}
          aria-label="Close"
        >
          <X size={20} strokeWidth={2.5} aria-hidden="true" />
        </button>

        {image ? <div className="siws-popup__media">{image}</div> : null}

        <div className="siws-popup__body">
          <p className="siws-popup__eyebrow">
            <Megaphone aria-hidden="true" size={14} strokeWidth={2.4} />
            {eyebrow}
          </p>

          {children}

          {button ? (
            <div className="siws-popup__actions">
              <Link href={button.url} className="btn-primary" onClick={close}>
                {button.label}
                <ArrowRight aria-hidden="true" size={18} strokeWidth={2.4} />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
