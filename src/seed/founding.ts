/**
 * How long the Society has been teaching, worked out rather than typed.
 *
 * WHY THIS EXISTS. The figure was written by hand in eight places across five
 * seeds. Four of them said "90+" and four said "92+", so the same fact
 * contradicted itself between the home page and the section a visitor clicked
 * into — the school looked either careless or wrong, depending on which page
 * you read first. Every one of them would have gone stale again in January.
 *
 * WHAT "DYNAMIC" MEANS HERE, AND WHAT IT DOES NOT. Seeds write a string into
 * the database, so this is computed when the content is built, not when a page
 * is served. That is enough: the figure is right for every deploy and cannot
 * drift between pages within one, which is the fault this fixes. It still
 * needs a re-seed to tick over into a new year — put a note in the January
 * calendar rather than trusting a number nobody is watching.
 */
export const FOUNDED = 1934

/** "92+", for a statistics tile whose label supplies the word "Years". */
export const yearsOfService = (): string => `${new Date().getFullYear() - FOUNDED}+`
