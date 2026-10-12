'use client'

import type { DefaultCellComponentProps } from 'payload'

import { MainHomepageToggle } from './MainHomepageToggle'

/**
 * The "On the main SIWS homepage" column in a list: the tick-and-cross for
 * that row. See `MainHomepageToggle`.
 *
 * PUBLISHED ITEMS ONLY. Every row had the button at first, and SIWS asked for
 * it on published items alone (2026-10-12): a draft is not on any page, so
 * "Not showing" beside it invited a press that could do nothing, and
 * "Showing" beside one would have been untrue.
 *
 * The list is of each item's latest version, so one that is live but has an
 * unpublished edit waiting reads as a draft here and has no button either.
 * The dashboard panel lists what is actually on the homepage, and takes
 * things off it whatever state their latest edit is in.
 */
export const MainHomepageCell = ({ cellData, rowData, collectionSlug }: DefaultCellComponentProps) => {
  const row = rowData as { id?: number | string; _status?: string } | undefined
  const id = row?.id
  if (id === undefined || id === null) return null

  if (row?._status !== 'published') {
    return (
      <span
        title="Only a published item can run on the main SIWS homepage."
        style={{ color: 'var(--theme-elevation-450)' }}
      >
        Not published
      </span>
    )
  }

  return <MainHomepageToggle collection={collectionSlug} id={id} shown={cellData === true} />
}

export default MainHomepageCell
