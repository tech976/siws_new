/**
 * BR-AUTH-03 — "enforce a minimum password-strength policy".
 *
 * Payload has no built-in policy, so this is applied from a collection hook
 * before the value is hashed.
 *
 * The policy is deliberately minimal: a length floor and nothing else. The
 * earlier version also demanded three character classes and screened against
 * banned words, the user's own name and email, repeated characters and
 * sequential runs. That was rejecting passwords staff and seed scripts
 * reasonably chose — notably anything containing "siws" or the school's name —
 * and got in the way often enough to be worth removing.
 *
 * If BR-AUTH-03 needs to be satisfied more strictly before go-live, this is the
 * single place to tighten: the rules live here and `checkPasswordStrength` has
 * exactly one caller, the `beforeValidate` hook on the Users collection.
 */

const MIN_LENGTH = 6

/** Guards against a very long input being fed to the hash function. */
const MAX_LENGTH = 128

export interface PasswordContext {
  email?: string | null
  name?: string | null
}

export interface PasswordCheckResult {
  valid: boolean
  message?: string
}

/**
 * `context` is unused now that the personal-token screening is gone. It is kept
 * in the signature so the caller — and any future tightening of the rules — has
 * the user's name and email to hand without another change at the call site.
 */
export const checkPasswordStrength = (
  password: unknown,
  _context: PasswordContext = {},
): PasswordCheckResult => {
  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, message: 'A password is required.' }
  }

  if (password.length < MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${MIN_LENGTH} characters long.`,
    }
  }

  if (password.length > MAX_LENGTH) {
    return { valid: false, message: `Password must be ${MAX_LENGTH} characters or fewer.` }
  }

  return { valid: true }
}
