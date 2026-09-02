/**
 * Consent notices shown at the point of collection.
 *
 * FR-PRV-08 requires an itemised notice stating what data is sought, why, how
 * long it is kept and what rights the person has. FR-PRV-09 additionally
 * requires that the *version of the notice presented* is recorded against every
 * consent, so that a past consent can be evidenced against the exact wording
 * the person actually agreed to.
 *
 * That is why the text and its version live together here: bumping the wording
 * without bumping `version` would silently invalidate every historical record.
 * When SIWS supplies its final legal text (SRS 2.6) this module is where it
 * lands, and the version moves with it.
 *
 * Note the SRS also requires these notices to become editable in the admin
 * panel with previous versions retained (BR-DPA-07). This file is the interim
 * source of truth; the register that replaces it must import these versions so
 * existing records stay resolvable.
 */

export interface ConsentNotice {
  /** Bumped whenever any wording below changes. Recorded against each consent. */
  version: string
  /** Why the data is collected — the purpose consent is bound to. */
  purpose: string
  /** Short label shown beside the tick box. */
  checkboxLabel: string
  /** Itemised detail shown at the point of collection. */
  items: {
    whatWeCollect: string
    whyWeCollect: string
    howLongWeKeepIt: string
    yourRights: string
  }
}

export const ADMISSION_ENQUIRY_NOTICE: ConsentNotice = {
  version: '2026-07-v1',
  purpose: 'admission_enquiry',
  checkboxLabel:
    'I agree to SIWS using these details to contact me about admission for my child.',
  items: {
    whatWeCollect:
      'Your name, your child’s name and age, your phone number and email address, and the class you are asking about.',
    whyWeCollect:
      'So that the admissions team can answer your enquiry and arrange a campus visit. We will not use it for anything else.',
    howLongWeKeepIt:
      'For the current admission year and one year afterwards, then it is deleted.',
    yourRights:
      'You can ask to see, correct or delete your details, or withdraw this consent, at any time by contacting our Data Protection Officer.',
  },
}

/**
 * Feedback sent from a school's Contact page.
 *
 * A SEPARATE NOTICE, not a reuse of the one above, and the difference is the
 * whole point of recording a version against a consent. The admission notice
 * says the details are used to answer an enquiry about a place and are kept
 * for the admission year; somebody writing to say the school bus is late has
 * agreed to neither of those things. Binding their message to
 * `admission_enquiry` would evidence a consent they were never shown.
 *
 * It asks for less, too. There is no child's name and no age here — feedback
 * is from the person writing it, and FR-PRV-16 allows collecting only what the
 * stated purpose needs.
 */
export const FEEDBACK_NOTICE: ConsentNotice = {
  version: '2026-09-v1',
  purpose: 'feedback',
  checkboxLabel: 'I agree to SIWS using these details to reply to my message.',
  items: {
    whatWeCollect: 'Your name, your email address, an optional phone number, and your message.',
    whyWeCollect:
      'So that the school can read your feedback and reply to you about it. We will not use it for anything else, and we will not add you to a mailing list.',
    howLongWeKeepIt: 'For up to one year after your message is dealt with, then it is deleted.',
    yourRights:
      'You can ask to see, correct or delete your details, or withdraw this consent, at any time by contacting our Data Protection Officer.',
  },
}

/** Every notice, keyed by purpose — used by the consent register. */
export const CONSENT_NOTICES = {
  [ADMISSION_ENQUIRY_NOTICE.purpose]: ADMISSION_ENQUIRY_NOTICE,
  [FEEDBACK_NOTICE.purpose]: FEEDBACK_NOTICE,
} as const

export type ConsentPurpose = keyof typeof CONSENT_NOTICES
