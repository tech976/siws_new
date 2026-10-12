/**
 * One list out of two: the stories typed into a news block, and what staff
 * publish in News & Events — newest at the top, older and older beneath.
 *
 * WHY THIS NEEDED WRITING
 * -----------------------
 * The block used to show its own stories first and everything published in the
 * panel after them. That was meant as caution — nothing already on the page
 * would move — and it put a prize won last week underneath a story from July,
 * at the bottom of the list, which is the one place nobody looks for news.
 *
 * WHAT IT DOES. What is published arrives newest first and stays in that
 * order. Each item is placed above the first typed story that is older than
 * it, or that carries no date at all.
 *
 * WHAT IT DOES NOT DO is reorder the typed stories among themselves. Their
 * dates are free text — "August 2024", "2025", often nothing — and whoever
 * arranged them chose the order with more than a date in mind. So a page with
 * nothing published through the panel reads exactly as it did.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * When a typed story happened, from a date written by hand, or null if it
 * does not say. "26 July 2026", "July 2026" and "2026" all read; a month or a
 * year alone counts from its first day.
 */
export const storyTime = (written?: string | null): number | null => {
  if (!written) return null

  const year = written.match(/\b(?:19|20)\d{2}\b/)
  if (!year) return null

  const month = MONTHS.findIndex((name) => new RegExp(`\\b${name}`, 'i').test(written))
  // Only looked for beside a month: a bare "25" in "2024–25" is not a day.
  const day = month >= 0 ? written.match(/\b([0-3]?\d)(?:st|nd|rd|th)?\b/) : null

  return Date.UTC(Number(year[0]), Math.max(month, 0), day ? Number(day[1]) || 1 : 1)
}

export const newestFirst = <Story extends { date?: string | null }, Post extends { at: number }>(
  typed: Story[],
  /** Already newest first. */
  published: Post[],
): (Story | Post)[] => {
  const list: (Story | Post)[] = []
  let next = 0

  for (const story of typed) {
    const at = storyTime(story.date)
    while (next < published.length && (at === null || published[next]!.at > at)) {
      list.push(published[next++]!)
    }
    list.push(story)
  }

  return [...list, ...published.slice(next)]
}
