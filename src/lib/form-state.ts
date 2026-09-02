/**
 * What a public form hands back to the page it was submitted from.
 *
 * A PLAIN MODULE, AND IT HAS TO BE ONE. Next rejects any non-function export
 * from a file marked `'use server'`:
 *
 *   A "use server" file can only export async functions, found object.
 *
 * `initialEnquiryState` was declared in `actions/enquiry.ts`, which is such a
 * file. That compiled, typechecked and rendered — the page came up, the fields
 * worked, the button looked right — and threw the moment anybody pressed it.
 * A form that fails only on submit is the worst place for this to hide: it
 * looks finished to everyone who does not send a test enquiry, and the parent
 * who does send one gets an error page instead of a reply.
 *
 * One shape rather than one per form, because there is one shape: a status, a
 * message above the form, messages against individual fields, and the values
 * echoed back so a validation failure does not empty what somebody typed.
 */
export interface FormState {
  status: 'idle' | 'success' | 'error'
  /** Message shown above the form. */
  message?: string
  /** Field-level messages, keyed by input name. */
  errors?: Record<string, string>
  /** Echoed back so a failed submission does not wipe what was typed. */
  values?: Record<string, string>
}

/** The state a form starts in, before anything has been submitted. */
export const idleFormState: FormState = { status: 'idle' }
