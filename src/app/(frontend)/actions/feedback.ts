'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { FEEDBACK_NOTICE } from '@/lib/consent-notices'
import { HONEYPOT_FIELD, guardSubmission } from '@/lib/form-guard'

/**
 * Receives feedback from a school's Contact page and routes it to that
 * school's general (info) inbox.
 *
 * A Server Action rather than a REST endpoint, for the reason the admission
 * enquiry gives: the form keeps working with JavaScript disabled, which the
 * WCAG 2.1 AA target in Section 7 benefits from.
 *
 * Every value is re-validated here. The browser checks are a convenience for
 * the visitor; they are not a control, because anything can post to this action.
 */

export interface FeedbackState {
  status: 'idle' | 'success' | 'error'
  message?: string
  errors?: Record<string, string>
  /** Echoed back so a failed submission does not wipe what was typed. */
  values?: Record<string, string>
}

export const initialFeedbackState: FeedbackState = { status: 'idle' }

const text = (data: FormData, key: string): string => {
  const value = data.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * What the sender says they are, offered as a short list.
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
 * What the message is about. Also a fixed list, and for the same reason: the
 * subject line is what decides who in the office reads it first.
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

export const submitFeedback = async (
  _previous: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> => {
  const values: Record<string, string> = {
    name: text(formData, 'name'),
    email: text(formData, 'email'),
    phone: text(formData, 'phone'),
    relationship: text(formData, 'relationship'),
    subject: text(formData, 'subject'),
    message: text(formData, 'message'),
  }

  // -- Spam checks first, so a bot costs us no database work ---------------
  const headerList = await headers()
  const forwarded = headerList.get('x-forwarded-for') ?? ''
  const rateKey = (forwarded.split(',')[0] || headerList.get('x-real-ip') || 'unknown').trim()

  const guard = guardSubmission({
    token: formData.get('formToken'),
    honeypot: formData.get(HONEYPOT_FIELD),
    rateKey,
  })

  if (!guard.ok) {
    return { status: 'error', message: guard.message, values }
  }

  // -- Validation ---------------------------------------------------------
  const errors: Record<string, string> = {}

  if (values.name.length < 1 || values.name.length > 80) {
    errors.name = 'Please tell us your name.'
  }

  /*
   * Required, where the admission form treats email as optional. That form
   * asks for a telephone number and the admissions team rings back; feedback
   * is answered in writing, so with no address there is nothing to answer to.
   */
  if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Please enter an email address we can reply to.'
  }

  // Optional, but checked when given — permissive on formatting, strict on
  // digit count, so +91, spaced and hyphenated Indian numbers all pass.
  if (values.phone.length > 0) {
    const digits = values.phone.replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) {
      errors.phone = 'Please check this phone number, or leave it blank.'
    }
  }

  if (values.subject.length === 0) {
    errors.subject = 'Please choose what your message is about.'
  }

  if (values.message.length < 10) {
    errors.message = 'Please tell us a little more — at least a sentence.'
  } else if (values.message.length > 3000) {
    errors.message = 'Please keep your message under 3000 characters.'
  }

  /**
   * FR-PRV-07 — consent must be an unticked, affirmative action. The box is
   * unchecked in the markup and its absence here is a refusal, so there is no
   * path on which a message is stored without one.
   */
  const consentGiven = formData.get('consent') === 'on' || formData.get('consent') === 'true'
  if (!consentGiven) {
    errors.consent = 'Please tick the box so we know we may reply to you.'
  }

  const unitId = text(formData, 'unitId')
  if (unitId.length === 0) {
    // Not a field the visitor controls, so this is our bug, not their mistake.
    return {
      status: 'error',
      message: 'Something went wrong with this form. Please reload the page and try again.',
      values,
    }
  }

  if (Object.keys(errors).length > 0) {
    return { status: 'error', message: 'Please check the highlighted fields.', errors, values }
  }

  /*
   * Matched against the lists rather than trusted. Both arrive from a select,
   * and a select is only a suggestion to whatever is actually posting.
   */
  const subject = (FEEDBACK_SUBJECTS as readonly string[]).includes(values.subject)
    ? values.subject
    : 'Something else'
  const relationship = (FEEDBACK_RELATIONSHIPS as readonly string[]).includes(values.relationship)
    ? values.relationship
    : 'Someone else'

  // -- Store and notify ---------------------------------------------------
  try {
    const payload = await getPayload({ config })

    // Confirm the unit exists and is live before accepting data "for" it.
    const unit = await payload
      .findByID({ collection: 'units', id: unitId, depth: 0, overrideAccess: true })
      .catch(() => null)

    if (!unit || unit.isActive === false) {
      return {
        status: 'error',
        message: 'This form is not available at the moment. Please call us instead.',
        values,
      }
    }

    const referer = headerList.get('referer') ?? ''

    const created = await payload.create({
      collection: 'feedback',
      // `create` access is closed on the collection so nothing can POST past
      // the checks above; this action is the only sanctioned way in.
      overrideAccess: true,
      data: {
        unit: unit.id,
        name: values.name,
        email: values.email,
        phone: values.phone.length > 0 ? values.phone : undefined,
        relationship,
        subject,
        message: values.message,
        status: 'new',
        consentGiven: true,
        consentPurpose: FEEDBACK_NOTICE.purpose,
        consentNoticeVersion: FEEDBACK_NOTICE.version,
        consentAt: new Date().toISOString(),
        // Records where consent was given, without storing anything about the
        // person's device or network.
        consentSource: referer.slice(0, 250),
      } as never,
    })

    /*
     * The general office, not admissions. `feedbackEmail` if the school has
     * set one, then the address the panel calls the contact inbox, then the
     * school's own address — and never `admissionsEmail`, which is the one
     * inbox this must not reach. A complaint about the canteen landing in the
     * admissions queue is how it goes unanswered.
     */
    const inbox = unit as unknown as Record<string, string | null | undefined>
    const recipient = inbox.feedbackEmail || inbox.contactEmail || inbox.email

    if (recipient) {
      try {
        await payload.sendEmail({
          to: recipient,
          // Reaching the sender should be one keystroke, not a copy and paste
          // out of the body — this is a message somebody is waiting on a reply to.
          replyTo: values.email,
          subject: `Website feedback — ${subject} (${unit.name})`,
          text: [
            `Feedback has been sent through the ${unit.name} website.`,
            '',
            `About:   ${subject}`,
            `From:    ${values.name} (${relationship})`,
            `Email:   ${values.email}`,
            ...(values.phone ? [`Phone:   ${values.phone}`] : []),
            '',
            'Message:',
            values.message,
            '',
            'Reply to this email to answer them directly.',
            'It is also in the admin panel under Feedback.',
          ].join('\n'),
        })

        await payload.update({
          collection: 'feedback',
          id: created.id,
          data: { emailDelivered: true, notifiedInbox: recipient } as never,
          overrideAccess: true,
        })
      } catch (error) {
        // The message is safely stored, so a mail failure must not be reported
        // to the sender as a failure — staff would still see it in the panel.
        payload.logger.error(
          { err: error },
          `Feedback ${created.id} was saved but the notification email failed.`,
        )
      }
    } else {
      payload.logger.warn(
        `Feedback ${created.id} saved, but ${unit.name} has no feedback or contact address set under "Where messages go" — nobody was notified.`,
      )
    }

    return {
      status: 'success',
      message: 'Thank you — we have your message, and the school will read it.',
    }
  } catch (error) {
    console.error('Feedback submission failed:', error)
    return {
      status: 'error',
      message:
        'Sorry, something went wrong at our end and your message was not sent. Please try again, or call us.',
      values,
    }
  }
}
