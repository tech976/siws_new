'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { submitFeedback } from '@/app/(frontend)/actions/feedback'
import { FEEDBACK_NOTICE } from '@/lib/consent-notices'
import {
  FEEDBACK_RELATIONSHIPS,
  FEEDBACK_SUBJECTS,
  initialFeedbackState,
} from '@/lib/feedback-options'
import { HONEYPOT_FIELD } from '@/lib/form-guard'

import {
  ConsentCheckbox,
  ConsentNoticeDetails,
  Field,
  FieldError,
  Honeypot,
  Required,
  SelectField,
  inputClass,
} from './fields'

/**
 * The feedback form on a school's Contact page.
 *
 * Posted through a Server Action via a plain `<form action>`, so it still
 * submits if JavaScript fails to load — the enhancement here is inline errors
 * and a pending state, not the ability to submit at all.
 */

interface FeedbackFormProps {
  unitId: number | string
  /** Signed on the server when the page rendered — see `form-guard`. */
  formToken: string
  privacyHref?: string | null
}

const SubmitButton = () => {
  // `useFormStatus` must be read from a child of the form, not the form itself.
  const { pending } = useFormStatus()

  return (
    <button type="submit" className="btn-primary justify-center sm:w-auto" disabled={pending}>
      {pending ? 'Sending…' : 'Send feedback'}
    </button>
  )
}

export const FeedbackForm = ({ unitId, formToken, privacyHref }: FeedbackFormProps) => {
  const [state, formAction] = useActionState(submitFeedback, initialFeedbackState)

  const fieldError = (name: string) => state.errors?.[name]
  const previous = (name: string) => state.values?.[name] ?? ''
  const classFor = (name: string) => inputClass(Boolean(fieldError(name)))

  if (state.status === 'success') {
    return (
      <div
        className="rounded-2xl border border-line bg-sea-soft p-6 text-center"
        // `alert` announces immediately, which is right for a confirmation the
        // visitor is waiting on.
        role="alert"
      >
        <p className="text-lg font-semibold text-brand">Thank you</p>
        <p className="mt-2 text-sm text-ink-soft">{state.message}</p>
      </div>
    )
  }

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <input type="hidden" name="unitId" value={String(unitId)} />
      <input type="hidden" name="formToken" value={formToken} />

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
          name="name"
          label="Your name"
          required
          autoComplete="name"
          error={fieldError('name')}
          defaultValue={previous('name')}
          className={classFor('name')}
        />
        {/*
          Required here, where the admission form treats it as optional. That
          form asks for a telephone number and the admissions team rings back;
          feedback is answered in writing, so with no address there is nothing
          to answer to — only a complaint sitting on file.
        */}
        <Field
          name="email"
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
          label="Phone number (optional)"
          type="tel"
          autoComplete="tel"
          error={fieldError('phone')}
          defaultValue={previous('phone')}
          className={classFor('phone')}
        />
        <SelectField
          name="relationship"
          label="You are a"
          options={FEEDBACK_RELATIONSHIPS}
          error={fieldError('relationship')}
          defaultValue={previous('relationship')}
        />
      </div>

      <SelectField
        name="subject"
        label="What is your message about"
        options={FEEDBACK_SUBJECTS}
        required
        error={fieldError('subject')}
        defaultValue={previous('subject')}
      />

      <div>
        <label htmlFor="message" className="mb-2 block t-small font-semibold text-brand">
          Your message <Required />
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          defaultValue={previous('message')}
          aria-invalid={fieldError('message') ? true : undefined}
          aria-describedby={fieldError('message') ? 'message-error' : undefined}
          className={classFor('message')}
        />
        <FieldError id="message-error" message={fieldError('message')} />
      </div>

      <ConsentNoticeDetails
        notice={FEEDBACK_NOTICE}
        privacyHref={privacyHref}
        summary="How we will use what you send"
      />

      <ConsentCheckbox label={FEEDBACK_NOTICE.checkboxLabel} error={fieldError('consent')} />

      <SubmitButton />
    </form>
  )
}
