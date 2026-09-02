/**
 * The feedback box every section's Contact page carries.
 *
 * ONE DEFINITION, FOUR PAGES. Kindergarten, Primary, Secondary and the Junior
 * College are seeded by four different files, and this section is the same
 * section on all four: same heading, same promise about who reads it, same
 * routing. Four copies would have drifted the first time somebody reworded one
 * of them, and a school whose feedback box says something different from its
 * neighbour's reads as four websites rather than one group.
 *
 * WHERE IT SENDS IS NOT SET HERE, and cannot be. The form reads the address off
 * the school's own Unit record at the moment it is submitted — `feedbackEmail`
 * if the school has set one, then the contact inbox, then the school's own
 * address. Naming an address in this file would put it in four page layouts
 * that only a developer re-running a seed could change.
 *
 * The heading is deliberately plain. "Tell us what you think" is what the
 * section is; anything more inviting would be the website talking about itself
 * on the one part of the page that exists to let somebody else talk.
 */
export const feedbackSection = ({
  /** How the section refers to itself, e.g. "the Primary Section". */
  school,
  background = 'tint',
}: {
  school: string
  background?: 'white' | 'sea' | 'tint'
}) => ({
  blockType: 'feedback',
  heading: 'Tell us what you think',
  accentWord: 'what you think',
  headingLevel: 'h2',
  background,
  /*
   * Names the three things people actually write in, so a parent with a
   * complaint can see that this is the right box for it. A feedback form that
   * only invites compliments collects only compliments, and the school hears
   * about the gate light from somebody else.
   */
  intro: `Compliments, suggestions and concerns all reach ${school} office, and we read every one. If you would like an answer, leave an email address and you will get one.`,
  showEmailAlternative: true,
})
