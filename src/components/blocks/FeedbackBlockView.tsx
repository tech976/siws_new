import { FeedbackForm } from '@/components/forms/FeedbackForm'
import { createFormToken } from '@/lib/form-guard'
import type { FeedbackBlock, Unit } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

/**
 * The anchor the "Give feedback" button on the enquiry card jumps to.
 *
 * Exported rather than written twice: the button lives in
 * `HeroEnquiryBlockView` and the target lives here, and a fragment that
 * matches no id fails silently — the page simply does not move, which reads to
 * a visitor as a broken button rather than as a missing section.
 */
export const FEEDBACK_ANCHOR = 'feedback'

/**
 * A school's feedback box.
 *
 * The form is bound to a unit, because that is what decides which inbox the
 * message reaches. On the institution-wide portal there is no unit and
 * therefore nowhere to route it, so the block renders its heading and points
 * the visitor at the four schools rather than showing a form that would have
 * to guess.
 */
export const FeedbackBlockView = ({
  block,
  unit,
}: {
  block: FeedbackBlock
  unit: Unit | null
}) => {
  const intro = block.intro?.trim()

  /*
   * The address the form itself will use, so the two cannot disagree. The
   * server action falls through `feedbackEmail → contactEmail → email`, and
   * printing a different one here would tell a visitor their message goes
   * somewhere it does not.
   */
  const inbox = unit as unknown as Record<string, string | null | undefined> | null
  const address = inbox ? inbox.feedbackEmail || inbox.contactEmail || inbox.email : null

  return (
    <Section
      background={(block.background ?? 'tint') as BlockBackground}
      id={FEEDBACK_ANCHOR}
      /*
       * Room above the heading for the sticky site header, so a jump from the
       * button lands on the heading rather than under it. `scroll-mt` rather
       * than a spacer element: it moves only where the browser stops, and
       * leaves the section's own spacing alone.
       */
      className="scroll-mt-28"
    >
      <SectionHeading
        heading={block.heading}
        accentWord={block.accentWord}
        level={block.headingLevel}
        className={intro ? 'mb-4' : 'mb-10'}
      />

      {intro ? (
        <p className="mx-auto mb-8 max-w-2xl text-center text-ink-soft">{intro}</p>
      ) : null}

      <div className="mx-auto max-w-2xl">
        {unit ? (
          <>
            <div className="siws-card rounded-3xl p-7 sm:p-9">
              <FeedbackForm unitId={unit.id} formToken={createFormToken()} />
            </div>

            {block.showEmailAlternative && address ? (
              <p className="mt-5 text-center t-small text-ink-soft">
                Prefer your own email?{' '}
                <a
                  href={`mailto:${address}?subject=${encodeURIComponent('Website feedback')}`}
                  className="font-semibold text-brand underline underline-offset-4"
                >
                  {address}
                </a>
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-center text-ink-soft">
            Please choose a school above — feedback goes to that school’s own office.
          </p>
        )}
      </div>
    </Section>
  )
}
