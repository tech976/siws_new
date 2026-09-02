/**
 * Units whose home page is written in full by their own seed, and must not be
 * rebuilt by the shared composition steps.
 *
 * WHY THIS EXISTS
 * ---------------
 * Three steps in `seed:refresh` re-cut a unit's home page into the portal's
 * shared shape — `seed:unit-home` (18), `seed:unit-composition` (19) and
 * `seed:kg-home` (20). Each one REPLACES the page's whole `layout` array.
 *
 * That is right for a section whose home page has never been designed: it gets
 * a banner, an About band, a photograph wall and a set of cards without anyone
 * having to author them. It is wrong for a section that HAS been designed,
 * because the rebuild throws that design away.
 *
 * The Kindergarten is the case in point. `kindergarten.ts` writes its home page
 * as twelve authored bands — a hero reading "Wadala's Most Trusted Kindergarten
 * Since 1934", four feature lists, prose, an accordion and a closing call to
 * action. Step 9 wrote it correctly. Steps 18 to 20 then turned the feature
 * lists into a bento grid and three card grids, the prose into media bands, and
 * the headline into the unit's name.
 *
 * THE SYMPTOM THIS CAUSED, because it is worth recognising again
 * --------------------------------------------------------------
 * The page was correct in the database for nine steps of every run and wrong by
 * the time the run finished. So the seed file was right, `seed:verify` reported
 * the database as matching the code, and re-seeding to fix it re-broke it in
 * the same pass. It reads as content reverting on its own, and it sent us
 * through the dump, the router cache and the type scale before the pipeline.
 *
 * PRIMARY IS HERE FOR A SOFTER REASON THAN THE KINDERGARTEN.
 *
 * The Kindergarten's page was being gutted — four feature lists replaced by a
 * bento grid and three card grids. Primary's was not: the shared steps left
 * its own bands standing and appended a photograph wall and a media band.
 * Additive, and defensible on its own terms.
 *
 * It is still not what `primary.ts` says the page is. The section's seed is
 * the description of that page, and a step that adds two bands to it means
 * the page on screen is nobody's decision in particular — it is the seed plus
 * whatever the composition felt was missing. Both sections now render what
 * their own seed says, which is the only version anyone can point at and
 * check.
 *
 * ADDING TO THIS LIST
 * -------------------
 * Put a unit here once its home page is authored in its own seed. Leave it out
 * while the shared composition is doing the work — a page listed here with no
 * authored layout gets whatever its seed leaves behind, which for an unwritten
 * page is nothing.
 */
export const AUTHORED_HOME_UNITS = new Set(['kindergarten', 'primary'])

/** Whether this unit's home page is authored, and so off-limits to a rebuild. */
export const hasAuthoredHome = (slug: string | null | undefined): boolean =>
  typeof slug === 'string' && AUTHORED_HOME_UNITS.has(slug)
