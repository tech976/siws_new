'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@payload-config'

import { CAMPUS_LABELS, CAMPUS_VALUES, type Campus } from '@/fields/campus'
import { ADMISSION_ENQUIRY_NOTICE } from '@/lib/consent-notices'
import { HONEYPOT_FIELD, guardSubmission } from '@/lib/form-guard'

/**
 * FR-ADM-03 — receives an admission enquiry and routes it to the unit's
 * admissions contact.
 *
 * Implemented as a Server Action rather than a REST endpoint so that the form
 * keeps working with JavaScript disabled (Next posts the form natively and
 * re-renders), which the WCAG 2.1 AA target in Section 7 benefits from.
 *
 * Every value is re-validated here. The browser checks are a convenience for
 * the visitor; they are not a control, because anything can post to this action.
 */

export interface EnquiryState {
  status: 'idle' | 'success' | 'error'
  /** Message shown above the form. */
  message?: string
  /** Field-level messages, keyed by input name. */
  errors?: Record<string, string>
  /** Echoed back so a failed submission does not wipe what was typed. */
  values?: Record<string, string>
}

export const initialEnquiryState: EnquiryState = { status: 'idle' }

const text = (data: FormData, key: string): string => {
  const value = data.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Which of the school's inboxes a given card reaches, and the order to fall
 * back through when the first choice is not filled in on the Unit record.
 *
 * THE FORM POSTS A ROLE, NEVER AN ADDRESS. `sendTo` arrives in a hidden input
 * and anything can post to this action, so accepting an address would let a
 * stranger redirect a family's telephone number to a mailbox of their own.
 * What arrives is matched against these two keys and thrown away if it is
 * neither; the address is then read from the unit.
 */
const ROUTES = {
  admissions: {
    label: 'admissions',
    /** Admissions first, then the general office rather than nobody. */
    fields: ['admissionsEmail', 'contactEmail', 'email'] as const,
  },
  general: {
    label: 'general',
    /** The general office first — a campus tour is not an application. */
    fields: ['contactEmail', 'email', 'admissionsEmail'] as const,
  },
} as const

type Route = keyof typeof ROUTES

export const submitEnquiry = async (
  _previous: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> => {
  const values: Record<string, string> = {
    parentFirstName: text(formData, 'parentFirstName'),
    parentLastName: text(formData, 'parentLastName'),
    childName: text(formData, 'childName'),
    childAge: text(formData, 'childAge'),
    phone: text(formData, 'phone'),
    email: text(formData, 'email'),
    gradeApplyingFor: text(formData, 'gradeApplyingFor'),
    campus: text(formData, 'campus'),
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

  if (values.parentFirstName.length < 1 || values.parentFirstName.length > 60) {
    errors.parentFirstName = 'Please enter your first name.'
  }
  if (values.parentLastName.length < 1 || values.parentLastName.length > 60) {
    errors.parentLastName = 'Please enter your last name.'
  }
  if (values.childName.length < 1 || values.childName.length > 80) {
    errors.childName = 'Please enter your child’s name.'
  }

  const age = Number(values.childAge)
  if (values.childAge.length > 0 && (!Number.isFinite(age) || age < 1 || age > 25)) {
    errors.childAge = 'Please enter your child’s age in years.'
  }

  // Permissive on formatting, strict on digit count, so +91, spaced and
  // hyphenated Indian numbers are all accepted.
  const phoneDigits = values.phone.replace(/\D/g, '')
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    errors.phone = 'Please enter a phone number we can reach you on.'
  }

  if (values.email.length > 0 && !EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Please check this email address.'
  }

  if (values.gradeApplyingFor.length === 0 || values.gradeApplyingFor.length > 40) {
    errors.gradeApplyingFor = 'Please choose the class you are asking about.'
  }

  if (values.message.length > 1500) {
    errors.message = 'Please keep your message under 1500 characters.'
  }

  /**
   * Optional — most schools run at one location and send no campus at all — but
   * never merely echoed back. Whether it arrived from a visible select or the
   * hidden input, anything can post to this action, so an unrecognised value is
   * rejected rather than stored as free text against a family's record.
   */
  const campus = values.campus.length > 0 ? values.campus : null
  if (campus && !CAMPUS_VALUES.includes(campus as Campus)) {
    errors.campus = 'Please choose one of the campuses listed.'
  }

  /**
   * FR-PRV-07 — consent must be an unticked, affirmative action. The box is
   * unchecked in the markup and its absence here is a refusal, so there is no
   * path on which a submission is stored without one.
   */
  const consentGiven = formData.get('consent') === 'on' || formData.get('consent') === 'true'
  if (!consentGiven) {
    errors.consent = 'Please tick the box so we know we may contact you.'
  }

  /*
   * Not in `values`, because it is not something the visitor typed and must
   * not be echoed back into the form on a validation failure. An unrecognised
   * value falls back to admissions rather than being rejected: a mistyped
   * `sendTo` is our bug, and losing a real enquiry over it would be the worse
   * of the two outcomes.
   */
  const posted = text(formData, 'sendTo')
  const route: Route = posted === 'general' ? 'general' : 'admissions'

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
    return {
      status: 'error',
      message: 'Please check the highlighted fields.',
      errors,
      values,
    }
  }

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
        message: 'This enquiry form is not available at the moment. Please call us instead.',
        values,
      }
    }

    const referer = headerList.get('referer') ?? ''

    const created = await payload.create({
      collection: 'enquiries',
      // `create` access is closed on the collection so nothing can POST past
      // the checks above; this action is the only sanctioned way in.
      overrideAccess: true,
      data: {
        unit: unit.id,
        campus: campus ?? undefined,
        parentFirstName: values.parentFirstName,
        parentLastName: values.parentLastName,
        childName: values.childName,
        childAge: Number.isFinite(age) && values.childAge.length > 0 ? age : undefined,
        phone: values.phone,
        email: values.email.length > 0 ? values.email : undefined,
        gradeApplyingFor: values.gradeApplyingFor,
        message: values.message.length > 0 ? values.message : undefined,
        status: 'new',
        consentGiven: true,
        consentPurpose: ADMISSION_ENQUIRY_NOTICE.purpose,
        consentNoticeVersion: ADMISSION_ENQUIRY_NOTICE.version,
        consentAt: new Date().toISOString(),
        // Records where consent was given, without storing anything about the
        // person's device or network.
        consentSource: referer.slice(0, 250),
      } as never,
    })

    // FR-ADM-03 — route to the inbox this card is for, falling through the
    // addresses on the unit in the order that role prefers.
    const inbox = unit as unknown as Record<string, string | null | undefined>
    const recipient = ROUTES[route].fields.map((field) => inbox[field]).find(Boolean)

    /*
     * A campus tour request and an admission enquiry are the same eight fields
     * and read identically in an inbox, so the subject says which arrived.
     * Without it the general office cannot tell a question about visiting from
     * an application that has come to the wrong address.
     */
    const heading =
      route === 'general'
        ? `Campus tour / general enquiry — ${values.childName} (${values.gradeApplyingFor})`
        : `New admission enquiry — ${values.childName} (${values.gradeApplyingFor})`

    if (recipient) {
      try {
        await payload.sendEmail({
          to: recipient,
          subject: heading,
          text: [
            route === 'general'
              ? `A campus tour request has been received for ${unit.name}.`
              : `A new admission enquiry has been received for ${unit.name}.`,
            '',
            `Parent:  ${values.parentFirstName} ${values.parentLastName}`,
            `Child:   ${values.childName}${values.childAge ? `, age ${values.childAge}` : ''}`,
            `Class:   ${values.gradeApplyingFor}`,
            // Named in the notification, not only in the panel: a two-campus
            // section routes the follow-up call by this.
            ...(campus ? [`Campus:  ${CAMPUS_LABELS[campus as Campus]}`] : []),
            `Phone:   ${values.phone}`,
            ...(values.email ? [`Email:   ${values.email}`] : []),
            ...(values.message ? ['', 'Message:', values.message] : []),
            '',
            'This message contains a family’s personal details. Please handle it accordingly.',
            'View it in the admin panel under Admission enquiries.',
          ].join('\n'),
        })

        await payload.update({
          collection: 'enquiries',
          id: created.id,
          // The address as well as the fact, so "did admissions get this?" is
          // answered by the record rather than by reading the server log.
          data: { emailDelivered: true, notifiedInbox: recipient } as never,
          overrideAccess: true,
        })
      } catch (error) {
        // The enquiry is safely stored, so a mail failure must not be reported
        // to the parent as a failure — staff would still see it in the panel.
        payload.logger.error(
          { err: error },
          `Enquiry ${created.id} was saved but the notification email failed.`,
        )
      }
    } else {
      payload.logger.warn(
        `Enquiry ${created.id} saved, but ${unit.name} has no ${ROUTES[route].label} address set under "Where messages go" — nobody was notified.`,
      )
    }

    return {
      status: 'success',
      message:
        route === 'general'
          ? 'Thank you — your request has been sent. The school office will contact you to arrange a time.'
          : 'Thank you — your enquiry has been sent. Our admissions team will contact you shortly.',
    }
  } catch (error) {
    console.error('Enquiry submission failed:', error)
    return {
      status: 'error',
      message:
        'Sorry, something went wrong at our end and your enquiry was not sent. Please try again, or call us.',
      values,
    }
  }
}
