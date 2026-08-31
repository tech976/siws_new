'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { initialEnquiryState, submitEnquiry } from '@/app/(frontend)/actions/enquiry'
import { CAMPUS_LABELS, type Campus } from '@/fields/campus'
import { ADMISSION_ENQUIRY_NOTICE } from '@/lib/consent-notices'
import { HONEYPOT_FIELD } from '@/lib/form-guard'

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
  privacyHref,
}: EnquiryFormProps) => {
  const [state, formAction] = useActionState(submitEnquiry, initialEnquiryState)

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

  const inputClass = (name: string) =>
    [
      /*
       * ROUNDER, ROOMIER, AND SET AT 16px.
       *
       * 12px corners on a 46px box read as a rectangle with the edges filed
       * off — "blocky" was the right word for it. 16px on a 52px box reads as
       * a considered shape.
       *
       * The type size is not cosmetic: iOS Safari zooms the whole page in when
       * a focused input is under 16px, so a parent tapping "Your first name"
       * on a phone was being thrown into a zoomed viewport they then had to
       * pinch back out of. `text-base` is exactly the threshold.
       */
      'w-full rounded-2xl border-2 bg-white px-5 py-3.5 text-base text-ink',
      'placeholder:text-ink-muted focus:outline-none focus:ring-3 focus:ring-brand/20',
      // `border-field`, not `border-line`: an input's boundary is a meaningful
      // UI component and WCAG 2.1 SC 1.4.11 wants it at 3:1. The decorative
      // divider token is far too pale to show where a field actually is.
      fieldError(name) ? 'border-[#b3172b]' : 'border-field focus:border-brand',
    ].join(' ')

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <input type="hidden" name="unitId" value={String(unitId)} />
      <input type="hidden" name="formToken" value={formToken} />

      {/*
        One campus is not a question — the answer cannot vary, so it is stamped
        on the enquiry instead of asked. The server re-checks the value against
        the campuses it knows either way, so a hidden input is no more
        trustworthy here than a visible select.
      */}
      {campusOptions.length === 1 ? (
        <input type="hidden" name="campus" value={campusOptions[0]} />
      ) : null}

      {/*
        Honeypot. Positioned off-screen rather than `display:none` — some bots
        skip hidden inputs, and `aria-hidden` plus `tabIndex={-1}` keeps it away
        from screen readers and keyboard users either way.
      */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Website</label>
        <input
          id={HONEYPOT_FIELD}
          type="text"
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {state.status === 'error' && state.message ? (
        <p
          role="alert"
          className="rounded-2xl bg-[#ffe8ea] px-5 py-3.5 text-[0.95rem] font-medium text-[#b02330]"
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

      {/*
        FR-PRV-08 — the itemised notice sits at the point of collection, not
        behind a link, so the parent reads it before they consent rather than
        after.
      */}
      <details className="rounded-2xl bg-sea-soft px-5 py-3.5 text-[0.9rem]">
        <summary className="cursor-pointer font-semibold text-brand">
          How we will use your details
        </summary>
        <dl className="mt-3 grid gap-2 text-ink-soft">
          <NoticeItem term="What we collect" detail={ADMISSION_ENQUIRY_NOTICE.items.whatWeCollect} />
          <NoticeItem term="Why we need it" detail={ADMISSION_ENQUIRY_NOTICE.items.whyWeCollect} />
          <NoticeItem term="How long we keep it" detail={ADMISSION_ENQUIRY_NOTICE.items.howLongWeKeepIt} />
          <NoticeItem term="Your rights" detail={ADMISSION_ENQUIRY_NOTICE.items.yourRights} />
        </dl>
        {privacyHref ? (
          <p className="mt-3">
            <a href={privacyHref} className="font-semibold text-brand underline underline-offset-4">
              Read our full privacy policy
            </a>
          </p>
        ) : null}
      </details>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
          {/* Never pre-ticked — FR-PRV-07 requires an affirmative action. */}
          <input
            type="checkbox"
            name="consent"
            required
            aria-invalid={fieldError('consent') ? true : undefined}
            aria-describedby={fieldError('consent') ? 'consent-error' : undefined}
            className="mt-0.5 size-5 shrink-0 rounded border-2 border-field accent-brand"
          />
          <span>{ADMISSION_ENQUIRY_NOTICE.checkboxLabel}</span>
        </label>
        <FieldError id="consent-error" message={fieldError('consent')} />
      </div>

      <SubmitButton label="Book your campus tour" />
    </form>
  )
}

const Required = () => (
  <>
    <span aria-hidden="true" className="text-[#b02330]">
      *
    </span>
    <span className="sr-only">(required)</span>
  </>
)

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} className="mt-1.5 text-sm font-medium text-[#b02330]">
      {message}
    </p>
  ) : null

interface FieldProps {
  name: string
  label: string
  type?: string
  required?: boolean
  autoComplete?: string
  inputMode?: 'numeric' | 'tel' | 'email' | 'text'
  min?: number
  max?: number
  error?: string
  defaultValue?: string
  className?: string
}

/**
 * Every input carries a real `<label>` tied by `htmlFor`, rather than a
 * placeholder standing in for one. Placeholder-as-label disappears the moment
 * someone starts typing and is not reliably announced (WCAG 2.1 SC 3.3.2) —
 * the approved design used that pattern, so this is a deliberate departure.
 */
const Field = ({
  name,
  label,
  type = 'text',
  required = false,
  autoComplete,
  inputMode,
  min,
  max,
  error,
  defaultValue,
  className,
}: FieldProps) => (
  <div>
    <label htmlFor={name} className="mb-2 block text-[0.9rem] font-semibold text-brand">
      {label} {required ? <Required /> : null}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      required={required}
      autoComplete={autoComplete}
      inputMode={inputMode}
      min={min}
      max={max}
      defaultValue={defaultValue}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className={className}
    />
    <FieldError id={`${name}-error`} message={error} />
  </div>
)

const NoticeItem = ({ term, detail }: { term: string; detail: string }) => (
  <div>
    <dt className="font-semibold text-brand">{term}</dt>
    <dd>{detail}</dd>
  </div>
)
