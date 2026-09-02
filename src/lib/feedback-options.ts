/**
 * The two fixed lists the feedback form offers.
 *
 * A PLAIN MODULE, NOT THE ACTION FILE, and that is not a matter of taste. A
 * file marked `'use server'` may only export async functions: everything else
 * is rewritten into a callable reference to the server so the client can reach
 * it. Declaring these arrays beside `submitFeedback` therefore compiled, ran,
 * and failed at render with "options.map is not a function" — the component
 * had imported a function where it expected a list.
 *
 * Both files import from here, which is also what keeps the `<select>` a
 * visitor sees and the list the action validates against from drifting apart.
 */

/**
 * What the sender says they are.
 *
 * Free text would be more welcoming and is not worth it: this is the field the
 * office sorts by, and "parent"/"Parent"/"a parent"/"mother" are four rows to
 * a computer and one thing to a person. Anything not on this list is stored as
 * "Someone else" rather than rejected — nobody should be turned away from a
 * feedback box over a dropdown.
 */
export const FEEDBACK_RELATIONSHIPS = [
  'Parent',
  'Student',
  'Staff member',
  'Alumnus',
  'Someone else',
] as const

/**
 * What the message is about. Also a fixed list, and for the same reason: this
 * is what decides who in the office reads it first.
 */
export const FEEDBACK_SUBJECTS = [
  'Compliment',
  'Suggestion',
  'Concern or complaint',
  'Facilities',
  'Teaching and learning',
  'Transport',
  'Something else',
] as const
