'use client'

import type { DefaultCellComponentProps } from 'payload'

import { MainHomepageToggle } from './MainHomepageToggle'

/**
 * The "On the main SIWS homepage" column in a list: the tick-and-cross for
 * that row. See `MainHomepageToggle`.
 */
export const MainHomepageCell = ({ cellData, rowData, collectionSlug }: DefaultCellComponentProps) => {
  const id = (rowData as { id?: number | string } | undefined)?.id
  if (id === undefined || id === null) return null

  return <MainHomepageToggle collection={collectionSlug} id={id} shown={cellData === true} />
}

export default MainHomepageCell
