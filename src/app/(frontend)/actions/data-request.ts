'use server'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { DATA_REQUEST_NOTICE } from '@/lib/consent-notices'
import { recordConsent } from '@/lib/consent-register'
import { REQUEST_RELATIONSHIPS, REQUEST_TYPES, normaliseEmail } from '@/lib/data-protection'
import { HONEYPOT_FIELD, guardSubmission } from '@/lib/form-guard'
import type { FormState } from '@/lib/form-state'

/**
 * FR-PRV-12 — "a route by which an individual can request access to,
 * correction of, or erasure of their personal data, and can withdraw consent;
 * requests shall be raised to the Data Protection Officer and tracked to
 * closure".
 *
 * The same shape as the feedback action, and for the same reasons: a Server
 * Action so it works without JavaScript, every value re-checked here, spam
 * checks before any database work.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: act on the request. It does not delete or
 * export anything, and it does not reply with what the school holds. Anybody
 * can type anybody's email address into a form; the DPO confirms the request
 * really comes from the person before anything is released or erased.
 */

const text = (data: FormData, key: string): string => {
  const value = data.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

const labelToValue = <T extends readonly { label: string; value: string }[]>(
  list: T,
  label: string,
): T[number]['value'] | null => list.find((entry) => entry.label === label)?.value ?? null

export const submitDataRequest = async (
  _previous: FormState,
  formData: FormData,
): Promise<FormState> => {
  const values: Record<string, string> = {
    name: text(formData, 'name'),
    email: text(formData, 'email'),
    phone: text(formData, 'phone'),
    relationship: text(formData, 'relationship'),
    requestType: text(formData, 'requestType'),
    details: text(formData, 'details'),
  }

  const headerList = await headers()
  const forwarded = headerList.get('x-forwarded-for') ?? ''
  const rateKey = (forwarded.split(',')[0] || headerList.get('x-real-ip') || 'unknown').trim()

  const guard = guardSubmission({
    token: formData.get('formToken'),
    honeypot: formData.get(HONEYPOT_FIELD),
    rateKey,
  })
  if (!guard.ok) return { status: 'error', message: guard.message, values }

  const errors: Record<string, string> = {}

  if (values.name.length < 1 || values.name.length > 80) {
    errors.name = 'Please tell us your name.'
  }

  const email = normaliseEmail(values.email)
  if (!email) {
    // Required: the reply, and the check that the request is really theirs,
    // both go to this address.
    errors.email = 'Please enter an email address we can reply to.'
  }

  if (values.phone.length > 0) {
    const digits = values.phone.replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) {
      errors.phone = 'Please check this phone number, or leave it blank.'
    }
  }

  const requestType = labelToValue(REQUEST_TYPES, values.requestType)
  if (!requestType) errors.requestType = 'Please choose what you would like us to do.'

  const relationship = labelToValue(REQUEST_RELATIONSHIPS, values.relationship) ?? 'self'

  if (values.details.length > 3000) {
    errors.details = 'Please keep this under 3000 characters.'
  }
  if ((requestType === 'correction' || requestType === 'other') && values.details.length < 10) {
    errors.details = 'Please tell us what needs to change, so we can find it.'
  }

  const consentGiven = formData.get('consent') === 'on' || formData.get('consent') === 'true'
  if (!consentGiven) {
    errors.consent = 'Please tick the box to confirm.'
  }

  if (Object.keys(errors).length > 0 || !email || !requestType) {
    return { status: 'error', message: 'Please check the highlighted fields.', errors, values }
  }

  try {
    const payload = await getPayload({ config })
    const referer = headerList.get('referer') ?? ''
    const now = new Date().toISOString()

    const created = await payload.create({
      collection: 'data-requests',
      overrideAccess: true,
      data: {
        name: values.name,
        email,
        phone: values.phone || undefined,
        relationship,
        requestType,
        details: values.details || undefined,
        status: 'received',
        noticeVersion: DATA_REQUEST_NOTICE.version,
        submittedAt: now,
        source: referer.slice(0, 250),
        history: [{ at: now, by: 'Website form', status: 'received', note: 'Request received.' }],
      } as never,
    })

    await recordConsent(payload, {
      subject: email,
      subjectName: values.name,
      purpose: 'data_request',
      noticeVersion: DATA_REQUEST_NOTICE.version,
      source: referer,
      relatedCollection: 'data-requests',
      relatedId: created.id,
    })

    const reference = `DSR-${String(created.id).padStart(4, '0')}`

    /*
     * To the Data Protection Officer — every active account holding the role —
     * and to the administrators if nobody has been nominated yet, so a request
     * never lands in a register nobody is told about.
     */
    const { docs: dpos } = await payload.find({
      collection: 'users',
      where: { and: [{ roles: { contains: 'dpo' } }, { isActive: { not_equals: false } }] },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    })
    let recipients = (dpos as unknown as { email: string }[]).map((user) => user.email)
    if (recipients.length === 0) {
      const { docs: admins } = await payload.find({
        collection: 'users',
        where: { and: [{ roles: { contains: 'admin' } }, { isActive: { not_equals: false } }] },
        limit: 20,
        depth: 0,
        overrideAccess: true,
      })
      recipients = (admins as unknown as { email: string }[]).map((user) => user.email)
    }

    const typeLabel = REQUEST_TYPES.find((entry) => entry.value === requestType)?.label ?? requestType

    if (recipients.length > 0) {
      try {
        await payload.sendEmail({
          to: recipients.join(', '),
          subject: `Data request ${reference} — ${typeLabel}`,
          text: [
            `A data request has been made through the website: ${reference}.`,
            '',
            `Request: ${typeLabel}`,
            `From:    ${values.name}`,
            `Email:   ${email}`,
            ...(values.phone ? [`Phone:   ${values.phone}`] : []),
            '',
            ...(values.details ? ['In their words:', values.details, ''] : []),
            'Please confirm the request comes from this person before releasing or deleting anything.',
            'It is in the admin panel under Data protection → Data requests.',
          ].join('\n'),
        })
      } catch (error) {
        payload.logger.error({ err: error }, `Data request ${reference} saved, but the DPO email failed.`)
      }
    } else {
      payload.logger.warn(`Data request ${reference} saved, but there is no DPO or administrator to notify.`)
    }

    return {
      status: 'success',
      message: `Thank you. Your request reference is ${reference}. Our Data Protection Officer will write to you at ${email} to confirm it is you before acting on it.`,
    }
  } catch (error) {
    console.error('Data request submission failed:', error)
    return {
      status: 'error',
      message:
        'Sorry, something went wrong at our end and your request was not sent. Please try again, or write to the school office.',
      values,
    }
  }
}
