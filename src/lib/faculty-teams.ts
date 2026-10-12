/**
 * A school's roster as lists, each led by its head teacher.
 *
 * THE RULE, and it is the whole of it: walk the roster in its own order; a
 * head teacher opens a new list and leads everybody who follows her, up to the
 * next head teacher.
 *
 * WHY THE ORDER AND NOT THE CAMPUS
 * --------------------------------
 * The Primary Section has two head teachers and SIWS supplies its staff as two
 * lists, one under each. The lists used to be told apart by the `campus` tag —
 * and the tag went out of use when the school stopped being published as two
 * campuses, which pooled both lists into one column under both heads.
 *
 * The tag is hidden from every form now, so nobody adding a teacher could say
 * which list she joins. The order number is on every teacher's screen, and it
 * already decides who appears first; here it also decides whose list somebody
 * is in. Nothing that renders needs to know there was ever a second campus.
 *
 * A school with one head teacher, or none by that title, comes out as a single
 * list exactly as before.
 */

export interface Team<Person> {
  /** Usually one. Two only where they are listed together with nobody between. */
  heads: Person[]
  rest: Person[]
}

export const isHeadTeacher = (person: { designation?: string | null }) =>
  /head teacher/i.test(person.designation ?? '')

export const intoTeams = <Person extends { designation?: string | null }>(
  roster: Person[],
): Team<Person>[] => {
  const teams: Team<Person>[] = []

  for (const person of roster) {
    const current = teams[teams.length - 1]

    if (!isHeadTeacher(person)) {
      // Anybody listed ahead of the first head teacher still has to appear.
      if (current) current.rest.push(person)
      else teams.push({ heads: [], rest: [person] })
      continue
    }

    /*
     * Two heads in a row share one list — a head and her deputy at 1 and 2,
     * say. Splitting there would give the first a list of nobody.
     */
    if (current && current.heads.length > 0 && current.rest.length === 0) current.heads.push(person)
    else teams.push({ heads: [person], rest: [] })
  }

  return teams
}
