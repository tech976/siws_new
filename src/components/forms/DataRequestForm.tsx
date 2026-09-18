'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { submitDataRequest } from '@/app/(frontend)/actions/data-request'
import { DATA_REQUEST_NOTICE } from '@/lib/consent-notices'
import { REQUEST_RELATIONSHIPS, REQUEST_TYPES } from '@/lib/data-protection'
import { HONEYPOT_FIELD } from '@/lib/form-guard'
import { idleFormState } from '@/lib/form-state'

import {
  ConsentCheckbox,
  ConsentNoticeDetails,
  Field,
  FieldError,
  Honeypot,
  SelectField,
  inputClass,
} from './fields'

/**
 * FR-PRV-12 — the data-rights request form. Same construction as the feedback
 * form: a plain `<form action>` on a Server Action, so it submits without
 * JavaScript, with inline errors as the enhancement.
 */

const TYPE_LABELS = REQUEST_TYPES.map((entry) => entry.label)
const RELATIONSHIP_LABELS = REQUEST_RELATIONSHIPS.map((entry) => entry.label)

const SubmitButton = () => {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn-primary justify-center sm:w-auto" disabled={pending}>
      {pending ? 'Sending…' : 'Send my request'}
    </button>
  )
}

export const DataRequestForm = ({ formToken }: { formToken: string }) => {
  const [state, formAction] = useActionState(submitDataRequest, idleFormState)

  const fieldError = (name: string) => state.errors?.[name]
  const previous = (name: string) => state.values?.[name] ?? ''
  const classFor = (name: string) => inputClass(Boolean(fieldError(name)))

  if (state.status === 'success') {
    return (
      <div className="rounded-2xl border border-line bg-sea-soft p-6" role="alert">
        <p className="text-lg font-semibold text-brand">Request received</p>
        <p className="mt-2 text-sm text-ink-soft">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <input type="hidden" name="formToken" value={formToken} />
      <Honeypot name={HONEYPOT_FIELD} idPrefix="dsr-" />

      {state.status === 'error' && state.message ? (
        <p role="alert" className="rounded-2xl bg-[#ffe8ea] px-5 py-3.5 t-small font-medium text-[#b02330]">
          {state.message}
        </p>
      ) : null}

      <SelectField
        name="requestType"
        id="dsr-requestType"
        label="What would you like us to do"
        options={TYPE_LABELS}
        required
        error={fieldError('requestType')}
        defaultValue={previous('requestType')}
      />

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <Field
          name="name"
          id="dsr-name"
          label="Your name"
          required
          autoComplete="name"
          error={fieldError('name')}
          defaultValue={previous('name')}
          className={classFor('name')}
        />
        <Field
          name="email"
          id="dsr-email"
          label="Email address"
          type="email"
          required
          autoComplete="email"
          error={fieldError('email')}
          defaultValue={previous('email')}
          className={classFor('email')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <Field
          name="phone"
          id="dsr-phone"
          label="Phone number (optional)"
          type="tel"
          autoComplete="tel"
          error={fieldError('phone')}
          defaultValue={previous('phone')}
          className={classFor('phone')}
        />
        <SelectField
          name="relationship"
          id="dsr-relationship"
          label="Whose information is it"
          options={RELATIONSHIP_LABELS}
          error={fieldError('relationship')}
          defaultValue={previous('relationship')}
        />
      </div>

      <div>
        <label htmlFor="dsr-details" className="mb-2 block t-small font-semibold text-brand">
          Anything that will help us find it
        </label>
        <p id="dsr-details-hint" className="mb-2 text-xs text-ink-soft">
          For example your child’s name and school, the form you filled in, or what needs
          correcting. Please do not include anything we do not need.
        </p>
        <textarea
          id="dsr-details"
          name="details"
          rows={5}
          defaultValue={previous('details')}
          aria-invalid={fieldError('details') ? true : undefined}
          aria-describedby={`dsr-details-hint${fieldError('details') ? ' dsr-details-error' : ''}`}
          className={classFor('details')}
        />
        <FieldError id="dsr-details-error" message={fieldError('details')} />
      </div>

      <ConsentNoticeDetails
        notice={DATA_REQUEST_NOTICE}
        privacyHref="/privacy"
        summary="How we will use the details on this form"
      />

      <ConsentCheckbox
        label={DATA_REQUEST_NOTICE.checkboxLabel}
        error={fieldError('consent')}
        idPrefix="dsr-"
      />

      <SubmitButton />
    </form>
  )
}
