/**
 * The id a block's heading is addressable by, so a link can point at one
 * section of a page rather than at its top.
 *
 * Derived from the heading rather than authored separately: an id typed into a
 * second field goes stale the moment somebody edits the heading, and the
 * failure is silent — the link still works, it just lands at the top of the
 * page. Deriving it means the two cannot disagree.
 *
 * The trade is that renaming a heading breaks any link pointing at the old id.
 * That is the better failure: it is the same one every anchor on the web has,
 * and it lands the reader on the right page rather than the wrong section.
 */
export const headingAnchor = (heading: string | null | undefined): string | undefined => {
  if (typeof heading !== 'string') return undefined
  const slug = heading
    .toLowerCase()
    // Accented letters keep their base form, so "Sección" and "Seccion" agree.
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : undefined
}
