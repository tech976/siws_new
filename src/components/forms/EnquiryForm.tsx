'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { submitEnquiry } from '@/app/(frontend)/actions/enquiry'
import { CAMPUS_LABELS, type Campus } from '@/fields/campus'
import { ADMISSION_ENQUIRY_NOTICE } from '@/lib/consent-notices'
import { idleFormState } from '@/lib/form-state'
import { HONEYPOT_FIELD } from '@/lib/form-guard'

import {
  ConsentCheckbox,
  ConsentNoticeDetails,
  Field,
  FieldError,
  Honeypot,
  Required,
  inputClass as fieldClass,
} from './fields'

/**
 * The admission enquiry form (FR-ADM-03, FR-ADM-05, FR-ADM-06).
 *
 * Posted through a Server Action via a plain `<form action>`, so it still
 * submits if JavaScript fails to load — the enhancement here is inline errors
 * and a pending state, not the ability to submit at all.
 */

interface EnquiryFormProps {
  unitId: number | string
  /** Class options offered by this unit, e.g. Jr KG / Sr KG. */
  classOptions: string[]
  /**
   * Campuses this form covers. Empty for a single-location school, one to stamp
   * every enquiry with that campus, two or more to let the parent choose.
   */
  campusOptions?: Campus[]
  /** Signed on the server when the page rendered — see `form-guard`. */
  formToken: string
  /**
   * Which of the school's inboxes this card reaches — the same eight fields
   * are an admission enquiry on one page and a campus tour request on another.
   * A ROLE, not an address: the action looks the address up on the unit, so
   * nothing posted from a browser can choose who receives the submission.
   */
  sendTo?: 'admissions' | 'general'
  privacyHref?: string | null
}

const SubmitButton = ({ label }: { label: string }) => {
  // `useFormStatus` must be read from a child of the form, not the form itself.
  const { pending } = useFormStatus()

  return (
    <button type="submit" className="btn-primary w-full justify-center" disabled={pending}>
      {pending ? 'Sending…' : label}
    </button>
  )
}

export const EnquiryForm = ({
  unitId,
  classOptions,
  campusOptions = [],
  formToken,
  sendTo = 'admissions',
  privacyHref,
}: EnquiryFormProps) => {
  const [state, formAction] = useActionState(submitEnquiry, idleFormState)

  const fieldError = (name: string) => state.errors?.[name]
  const previous = (name: string) => state.values?.[name] ?? ''

  if (state.status === 'success') {
    return (
      <div
        className="rounded-2xl border border-line bg-sea-soft p-6 text-center"
        // `alert` announces immediately, which is right for a confirmation the
        // visitor is waiting on.
        role="alert"
      >
        <p className="text-lg font-semibold text-brand">Enquiry sent</p>
        <p className="mt-2 text-sm text-ink-soft">{state.message}</p>
      </div>
    )
  }

  const inputClass = (name: string) => fieldClass(Boolean(fieldError(name)))

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <input type="hidden" name="unitId" value={String(unitId)} />
      <input type="hidden" name="formToken" value={formToken} />
      <input type="hidden" name="sendTo" value={sendTo} />

      {/*
        One campus is not a question — the answer cannot vary, so it is stamped
        on the enquiry instead of asked. The server re-checks the value against
        the campuses it knows either way, so a hidden input is no more
        trustworthy here than a visible select.
      */}
      {campusOptions.length === 1 ? (
        <input type="hidden" name="campus" value={campusOptions[0]} />
      ) : null}

      <Honeypot name={HONEYPOT_FIELD} />

      {state.status === 'error' && state.message ? (
        <p
          role="alert"
          className="rounded-2xl bg-[#ffe8ea] px-5 py-3.5 t-small font-medium text-[#b02330]"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <Field
          name="parentFirstName"
          label="Your first name"
          required
          autoComplete="given-name"
          error={fieldError('parentFirstName')}
          defaultValue={previous('parentFirstName')}
          className={inputClass('parentFirstName')}
        />
        <Field
          name="parentLastName"
          label="Your last name"
          required
          autoComplete="family-name"
          error={fieldError('parentLastName')}
          defaultValue={previous('parentLastName')}
          className={inputClass('parentLastName')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <Field
          name="childName"
          label="Child’s name"
          required
          error={fieldError('childName')}
          defaultValue={previous('childName')}
          className={inputClass('childName')}
        />
        <Field
          name="childAge"
          label="Child’s age"
          type="number"
          inputMode="numeric"
          min={1}
          max={25}
          error={fieldError('childAge')}
          defaultValue={previous('childAge')}
          className={inputClass('childAge')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <Field
          name="phone"
          label="Phone number"
          type="tel"
          required
          autoComplete="tel"
          error={fieldError('phone')}
          defaultValue={previous('phone')}
          className={inputClass('phone')}
        />
        <Field
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          error={fieldError('email')}
          defaultValue={previous('email')}
          className={inputClass('email')}
        />
      </div>

      {campusOptions.length > 1 ? (
        <div>
          <label htmlFor="campus" className="mb-1.5 block text-sm font-semibold text-brand">
            Which campus <Required />
          </label>
          <select
            id="campus"
            name="campus"
            required
            defaultValue={previous('campus')}
            aria-invalid={fieldError('campus') ? true : undefined}
            aria-describedby={fieldError('campus') ? 'campus-error' : undefined}
            className={inputClass('campus')}
          >
            <option value="">Please choose…</option>
            {campusOptions.map((option) => (
              <option key={option} value={option}>
                {CAMPUS_LABELS[option]}
              </option>
            ))}
          </select>
          <FieldError id="campus-error" message={fieldError('campus')} />
        </div>
      ) : null}

      <div>
        <label htmlFor="gradeApplyingFor" className="mb-1.5 block text-sm font-semibold text-brand">
          Class you are asking about <Required />
        </label>
        <select
          id="gradeApplyingFor"
          name="gradeApplyingFor"
          required
          defaultValue={previous('gradeApplyingFor')}
          aria-invalid={fieldError('gradeApplyingFor') ? true : undefined}
          aria-describedby={fieldError('gradeApplyingFor') ? 'gradeApplyingFor-error' : undefined}
          className={inputClass('gradeApplyingFor')}
        >
          <option value="">Please choose…</option>
          {classOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <FieldError id="gradeApplyingFor-error" message={fieldError('gradeApplyingFor')} />
      </div>

      <ConsentNoticeDetails notice={ADMISSION_ENQUIRY_NOTICE} privacyHref={privacyHref} />

      <ConsentCheckbox
        label={ADMISSION_ENQUIRY_NOTICE.checkboxLabel}
        error={fieldError('consent')}
      />

      {/*
        The same eight fields are two different requests, and the button is
        where a visitor finds out which. On a Contact page this card is headed
        "Book a Free Campus Tour" and goes to the general office; on an
        Admissions page it is an application enquiry going to admissions.
        "Book your campus tour" over the second one promised a visit that
        nobody had asked for.
      */}
      <SubmitButton
        label={sendTo === 'general' ? 'Book your campus tour' : 'Send my enquiry'}
      />
    </form>
  )
}
