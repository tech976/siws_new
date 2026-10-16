'use client'

import { useEffect } from 'react'

/**
 * The movement on the Sports pages: sections arriving as they scroll into
 * view, and the scoreboard figures counting up to their value.
 *
 * Everything is rendered complete on the server — every element visible,
 * every figure at its final value — and this only adds the motion on top. It
 * arms the page (`.sp-armed`, which is what hides an element until it is
 * shown) only once it is running and only for a visitor who has not asked for
 * reduced motion, so a page without JavaScript, or with motion switched off,
 * is simply the finished page.
 */
export const SportMotion = ({ rootId }: { rootId: string }) => {
  useEffect(() => {
    const root = document.getElementById(rootId)
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!('IntersectionObserver' in window)) return

    root.classList.add('sp-armed')

    const countUp = (el: HTMLElement) => {
      const target = Number(el.dataset.count)
      if (!Number.isFinite(target) || target <= 0) return
      const before = el.dataset.before ?? ''
      const after = el.dataset.after ?? ''
      const start = performance.now()
      const length = Math.min(1600, 600 + target * 6)
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / length)
        const eased = 1 - Math.pow(1 - t, 3)
        el.textContent = `${before}${Math.round(target * eased)}${after}`
        if (t < 1) requestAnimationFrame(step)
      }
      el.textContent = `${before}0${after}`
      requestAnimationFrame(step)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          el.setAttribute('data-shown', '')
          for (const figure of el.matches('[data-count]')
            ? [el]
            : Array.from(el.querySelectorAll<HTMLElement>('[data-count]'))) {
            countUp(figure)
          }
          observer.unobserve(el)
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    )

    root.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))

    /*
     * A safety net: nothing stays hidden for good. Anything the observer has
     * not reached after a few seconds — a tab opened in the background, a
     * printer, a very tall window — is shown as it is.
     */
    const fallback = window.setTimeout(() => {
      root.querySelectorAll('[data-reveal]:not([data-shown])').forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight) el.setAttribute('data-shown', '')
      })
    }, 2500)
    return () => {
      window.clearTimeout(fallback)
      observer.disconnect()
      root.classList.remove('sp-armed')
    }
  }, [rootId])

  return null
}

export default SportMotion
