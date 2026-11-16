/**
 * The attributes that make a server-rendered tile open the lightbox held by
 * `LightboxGroup`. Kept out of that file because it is called on the server,
 * and a function exported from a 'use client' module cannot be.
 */
export const lightboxTile = (index: number, total: number, label?: string | null) => ({
  'data-lightbox-index': index,
  role: 'button' as const,
  tabIndex: 0,
  'aria-label': `Open photograph ${index + 1} of ${total}${label ? `: ${label}` : ''}`,
})
