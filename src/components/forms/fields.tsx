import type { ConsentNotice } from '@/lib/consent-notices'

/**
 * The parts every public form on this site is built from.
 *
 * These lived inside `EnquiryForm` while it was the only form there was. They
 * are here now because the feedback box needs the same ones, and a second copy
 * would be a second set of accessibility decisions to keep in step — the
 * `aria-describedby` wiring, the 16px input size that stops iOS zooming, the
 * 3:1 border. Those are not styling preferences; they are the reasons the form
 * passes WCAG 2.1 AA, and they have to be true of both forms or of neither.
 */

/** The asterisk, plus the word a screen reader actually needs. */
export const Required = () => (
  <>
    <span aria-hidden="true" className="text-[#b02330]">
      *
    </span>
    <span className="sr-only">(required)</span>
  </>
)

export const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} className="mt-1.5 text-sm font-medium text-[#b02330]">
      {message}
    </p>
  ) : null

/**
 * The shape of an input, given whether it is currently in error.
 *
 * ROUNDER, ROOMIER, AND SET AT 16px.
 *
 * 12px corners on a 46px box read as a rectangle with the edges filed off.
 * 16px on a 52px box reads as a considered shape.
 *
 * The type size is not cosmetic: iOS Safari zooms the whole page in when a
 * focused input is under 16px, so somebody tapping a field on a phone was
 * being thrown into a zoomed viewport they then had to pinch back out of.
 * `text-base` is exactly the threshold.
 */
export const inputClass = (hasError: boolean) =>
  [
    'w-full rounded-2xl border-2 bg-white px-5 py-3.5 text-base text-ink',
    'placeholder:text-ink-muted focus:outline-none focus:ring-3 focus:ring-brand/20',
    // `border-field`, not `border-line`: an input's boundary is a meaningful
    // UI component and WCAG 2.1 SC 1.4.11 wants it at 3:1. The decorative
    // divider token is far too pale to show where a field actually is.
    hasError ? 'border-[#b3172b]' : 'border-field focus:border-brand',
  ].join(' ')

export interface FieldProps {
  name: string
  /**
   * The DOM id, when it must differ from the field's name.
   *
   * A Contact page now carries TWO forms — the enquiry card and the feedback
   * box — and both ask for an email address and a phone number. Deriving the
   * id from the name alone put `id="email"` on the page twice, which is
   * invalid HTML and, worse, makes `<label for="email">` ambiguous: a screen
   * reader resolves both labels to the first input, so the second form's
   * fields are announced with the first form's names.
   */
  id?: string
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
export const Field = ({
  name,
  id,
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
}: FieldProps) => {
  const fieldId = id ?? name

  return (
  <div>
    <label htmlFor={fieldId} className="mb-2 block t-small font-semibold text-brand">
      {label} {required ? <Required /> : null}
    </label>
    <input
      id={fieldId}
      name={name}
      type={type}
      required={required}
      autoComplete={autoComplete}
      inputMode={inputMode}
      min={min}
      max={max}
      defaultValue={defaultValue}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${fieldId}-error` : undefined}
      className={className}
    />
    <FieldError id={`${fieldId}-error`} message={error} />
  </div>
  )
}

/** A `<select>` with the same label, error and focus behaviour as `Field`. */
export const SelectField = ({
  name,
  id,
  label,
  options,
  required = false,
  error,
  defaultValue,
  placeholder = 'Please choose…',
}: {
  name: string
  /** See the note on `FieldProps.id` — two forms share a page. */
  id?: string
  label: string
  options: readonly string[]
  required?: boolean
  error?: string
  defaultValue?: string
  placeholder?: string
}) => {
  const fieldId = id ?? name

  return (
  <div>
    <label htmlFor={fieldId} className="mb-2 block t-small font-semibold text-brand">
      {label} {required ? <Required /> : null}
    </label>
    <select
      id={fieldId}
      name={name}
      required={required}
      defaultValue={defaultValue}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${fieldId}-error` : undefined}
      className={inputClass(Boolean(error))}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    <FieldError id={`${fieldId}-error`} message={error} />
  </div>
  )
}

const NoticeItem = ({ term, detail }: { term: string; detail: string }) => (
  <div>
    <dt className="font-semibold text-brand">{term}</dt>
    <dd>{detail}</dd>
  </div>
)

/**
 * FR-PRV-08 — the itemised notice sits at the point of collection, not behind
 * a link, so the person reads it before they consent rather than after.
 *
 * It takes the notice as an argument rather than naming one. Two forms collect
 * different things for different reasons and are bound to different notices;
 * printing the admission wording over a feedback box would show somebody a
 * promise about their child's admission year that has nothing to do with the
 * message they are sending.
 */
export const ConsentNoticeDetails = ({
  notice,
  privacyHref,
  summary = 'How we will use your details',
}: {
  notice: ConsentNotice
  privacyHref?: string | null
  summary?: string
}) => (
  <details className="rounded-2xl bg-sea-soft px-5 py-3.5 t-small">
    <summary className="cursor-pointer font-semibold text-brand">{summary}</summary>
    <dl className="mt-3 grid gap-2 text-ink-soft">
      <NoticeItem term="What we collect" detail={notice.items.whatWeCollect} />
      <NoticeItem term="Why we need it" detail={notice.items.whyWeCollect} />
      <NoticeItem term="How long we keep it" detail={notice.items.howLongWeKeepIt} />
      <NoticeItem term="Your rights" detail={notice.items.yourRights} />
    </dl>
    {privacyHref ? (
      <p className="mt-3">
        <a href={privacyHref} className="font-semibold text-brand underline underline-offset-4">
          Read our full privacy policy
        </a>
      </p>
    ) : null}
  </details>
)

/**
 * The consent tick.
 *
 * Never pre-ticked, and there is no prop that could make it so — FR-PRV-07
 * requires an affirmative action, and a `defaultChecked` here would be one
 * line away from breaking that on every form at once.
 */
export const ConsentCheckbox = ({
  label,
  error,
  /** Namespaces the error id — see the note on `FieldProps.id`. */
  idPrefix = '',
}: {
  label: string
  error?: string
  idPrefix?: string
}) => {
  const errorId = `${idPrefix}consent-error`

  return (
    <div>
      {/* The input is wrapped by its label, so it needs no id of its own. */}
      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="consent"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-5 shrink-0 rounded border-2 border-field accent-brand"
        />
        <span>{label}</span>
      </label>
      <FieldError id={errorId} message={error} />
    </div>
  )
}

/**
 * The honeypot. Positioned off-screen rather than `display:none` — some bots
 * skip hidden inputs, and `aria-hidden` plus `tabIndex={-1}` keeps it away from
 * screen readers and keyboard users either way.
 */
export const Honeypot = ({ name, idPrefix = '' }: { name: string; idPrefix?: string }) => {
  // Namespaced for the same reason every other field is: two forms, one page.
  const fieldId = `${idPrefix}${name}`

  return (
    <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
      <label htmlFor={fieldId}>Website</label>
      <input
        id={fieldId}
        type="text"
        name={name}
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  )
}
