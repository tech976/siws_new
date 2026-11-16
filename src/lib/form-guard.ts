import { createHmac, timingSafeEqual } from 'crypto'

/**
 * FR-ADM-05 / FR-SUB-09 / FR-PF-07 — spam protection for public forms.
 *
 * The SRS suggests a CAPTCHA. This deliberately does not use Google reCAPTCHA
 * or hCaptcha, because those are themselves third-party trackers: FR-PRV-02
 * forbids any non-essential third-party script executing before consent, so a
 * reCAPTCHA-protected form would be unusable until a visitor accepted cookies —
 * and 2.5 additionally rules out behavioural tracking on a site used by
 * children. Three self-hosted layers are used instead:
 *
 *  1. A honeypot field, hidden from people but present in the DOM.
 *  2. A signed timestamp, so the server knows how long the form was on screen.
 *     Bots submit in milliseconds; a parent takes far longer.
 *  3. A per-address rate limit.
 *
 * Together these stop the automated submissions schools actually receive,
 * without sending a single visitor's data to a third party. If SIWS later
 * requires a formal CAPTCHA, a privacy-respecting one (e.g. a self-hosted
 * proof-of-work challenge) can be added as a fourth layer without changing the
 * call sites.
 */

/** The honeypot's field name — innocuous enough that bots will fill it in. */
export const HONEYPOT_FIELD = 'website_url'

/** A form completed faster than this was almost certainly not typed by a human. */
const MIN_FILL_MS = 2_500

/** Tokens expire so a single harvested token cannot be replayed indefinitely. */
const MAX_TOKEN_AGE_MS = 3 * 60 * 60 * 1000

const secret = (): string => {
  const value = process.env.PAYLOAD_SECRET
  if (!value) throw new Error('PAYLOAD_SECRET is required to sign form tokens.')
  return value
}

const sign = (payload: string): string =>
  createHmac('sha256', secret()).update(payload).digest('base64url')

/**
 * Issues a signed "form was rendered at" token.
 *
 * Signed rather than a plain timestamp so the elapsed-time check cannot simply
 * be defeated by posting an older number.
 */
export const createFormToken = (issuedAt: number = Date.now()): string => {
  const payload = String(issuedAt)
  return `${payload}.${sign(payload)}`
}

export type GuardFailure =
  | 'honeypot'
  | 'too_fast'
  | 'bad_token'
  | 'expired_token'
  | 'rate_limited'

export interface GuardResult {
  ok: boolean
  failure?: GuardFailure
  /** Message safe to show the visitor. Deliberately vague — see below. */
  message?: string
}

const constantTimeEquals = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // `timingSafeEqual` throws on length mismatch, which would itself leak length.
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

const verifyToken = (token: unknown): GuardResult => {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, failure: 'bad_token', message: GENERIC_MESSAGE }
  }

  const separator = token.lastIndexOf('.')
  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)

  if (!constantTimeEquals(signature, sign(payload))) {
    return { ok: false, failure: 'bad_token', message: GENERIC_MESSAGE }
  }

  const issuedAt = Number(payload)
  if (!Number.isFinite(issuedAt)) {
    return { ok: false, failure: 'bad_token', message: GENERIC_MESSAGE }
  }

  const elapsed = Date.now() - issuedAt

  if (elapsed > MAX_TOKEN_AGE_MS) {
    return {
      ok: false,
      failure: 'expired_token',
      // Worth being specific here: this one is a genuine, recoverable mistake
      // a real person can hit by leaving a tab open.
      message: 'This form has been open too long. Please reload the page and try again.',
    }
  }

  if (elapsed < MIN_FILL_MS) {
    return { ok: false, failure: 'too_fast', message: GENERIC_MESSAGE }
  }

  return { ok: true }
}

/**
 * Deliberately uninformative. Telling a bot operator *which* check failed is
 * telling them exactly what to change.
 */
const GENERIC_MESSAGE =
  'We could not send this form. Please wait a moment and press Send again.'

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

interface Bucket {
  hits: number[]
}

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
/** Stops the Map growing without bound on a long-running server. */
const MAX_TRACKED_KEYS = 5_000

/**
 * Best-effort, per-process rate limit.
 *
 * DEPLOYMENT NOTE: this lives in memory, so it is per-instance. Behind more
 * than one Node process — or a serverless platform — the effective limit
 * multiplies by the instance count. It is a speed bump for casual abuse, not a
 * hard control; if SIWS's hosting runs multiple instances this must move to a
 * shared store (Redis) or the edge/CDN layer.
 */
export const checkRateLimit = (key: string, record = true): GuardResult => {
  const now = Date.now()

  if (buckets.size > MAX_TRACKED_KEYS) {
    // Cheap eviction: drop everything rather than walk the whole map. The
    // window is short, so the cost of a reset is a brief loss of history.
    buckets.clear()
  }

  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((at) => now - at < WINDOW_MS)

  if (bucket.hits.length >= MAX_PER_WINDOW) {
    buckets.set(key, bucket)
    return {
      ok: false,
      failure: 'rate_limited',
      message:
        'You have sent several enquiries already. Please wait a few minutes before sending another, or call us instead.',
    }
  }

  if (record) bucket.hits.push(now)
  buckets.set(key, bucket)
  return { ok: true }
}

/**
 * Counts a submission that passed every check and is about to be stored.
 *
 * The limit used to count every POST, mistakes included, so a parent who got
 * five fields wrong in a row was locked out of every form on the site for ten
 * minutes (found in testing, 2026-11-16). Only messages that actually reach
 * the school count now; `guardSubmission` still refuses once the limit is hit.
 */
export const recordSubmission = (key: string): void => {
  checkRateLimit(key, true)
}

/**
 * The visitor's address, for rate limiting and the sign-in log.
 *
 * `X-Real-IP` first: nginx sets it to the connecting address and overwrites
 * whatever the browser sent. The LEFTMOST `X-Forwarded-For` value, used
 * before, is whatever the client chose to put there, so changing that header
 * walked straight past the limit. Failing `X-Real-IP`, the rightmost
 * forwarded value is the one our own proxy appended.
 */
export const clientAddress = (headers: { get: (name: string) => string | null } | undefined): string => {
  const real = headers?.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = (headers?.get('x-forwarded-for') ?? '').split(',').map((part) => part.trim()).filter(Boolean)
  return forwarded[forwarded.length - 1] ?? 'unknown'
}

// ---------------------------------------------------------------------------
// Combined check
// ---------------------------------------------------------------------------

interface GuardInput {
  token: unknown
  honeypot: unknown
  /**
   * Coarse identifier for rate limiting — normally the client IP.
   *
   * Used transiently and NEVER written to the database: an IP address is
   * personal data, and FR-PRV-16 limits us to collecting only what the stated
   * purpose requires. Abuse prevention justifies inspecting it in memory; it
   * does not justify retaining it.
   */
  rateKey: string
}

export const guardSubmission = ({ token, honeypot, rateKey }: GuardInput): GuardResult => {
  // A filled honeypot is checked first and costs nothing.
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return { ok: false, failure: 'honeypot', message: GENERIC_MESSAGE }
  }

  const tokenResult = verifyToken(token)
  if (!tokenResult.ok) return tokenResult

  // Refuses once the limit is reached, but does not count this attempt: see
  // `recordSubmission`, which each form calls once its fields are valid.
  return checkRateLimit(rateKey, false)
}
