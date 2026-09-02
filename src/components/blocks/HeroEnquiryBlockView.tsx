import { Check, GraduationCap } from 'lucide-react'

import { Media } from '@/components/Media'
import { EnquiryForm } from '@/components/forms/EnquiryForm'
import type { Campus } from '@/fields/campus'
import { createFormToken } from '@/lib/form-guard'
import type { HeroEnquiryBlock, Unit } from '@/payload-types'

/**
 * The Kindergarten hero, matching the approved landing page.
 *
 * The form token is minted here, at render time, so the elapsed-time spam check
 * measures how long the page was actually on screen. Because this is a Server
 * Component the secret never reaches the browser — only the signed value does.
 */
export const HeroEnquiryBlockView = ({
  block,
  unit,
}: {
  block: HeroEnquiryBlock
  unit: Unit | null
}) => {
  const benefits = (block.benefits ?? [])
    .map((entry) => entry.text)
    .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)

  const trustPoints = (block.form?.trustPoints ?? [])
    .map((entry) => entry.text)
    .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)

  const classOptions = (block.form?.classOptions ?? [])
    .map((entry) => entry.label)
    .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)

  const campusOptions = (block.form?.campusOptions ?? [])
    .map((entry) => entry.campus)
    .filter((entry): entry is Campus => Boolean(entry))

  const badgeTitle = block.badge?.title

  return (
    <section className="relative isolate overflow-hidden bg-brand" id="enquire">
      {block.backgroundImage ? (
        <>
          <Media
            resource={block.backgroundImage}
            sizes="100vw"
            priority
            fill
            className="absolute inset-0 -z-20 object-cover"
          />
          {/*
            The overlay is what guarantees contrast. Without it, text legibility
            would depend on whichever photograph a content manager uploaded —
            which is not something the design can leave to chance.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-br from-brand/95 via-brand/90 to-brand-deep/95"
          />
        </>
      ) : null}

      {/*
        `items-start`: the pitch begins level with the form beside it.

        This was `items-center`, to stop a short pitch leaving a quarter of the
        band empty beneath it — 375px of brand blue under the Junior College
        badge. Junior College no longer carries this block at all, and the
        three sections that do have four benefits each, so the columns are
        within a card's height of one another and there is no hole to avoid.
        The reason to change it is that centring was costing more than it
        saved: the form has always carried `self-start`, so it began at the top
        while the pitch floated in the middle of the row, and two columns that
        start at different heights read as one of them having come loose.

        If a section ever enters a much shorter pitch, the fix is to give that
        column something at its foot — a badge, a line of contact detail — not
        to push the whole thing back into the middle.
      */}
      <div className="siws-container grid items-start gap-10 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:py-20">
        {/* --- Left: the pitch ------------------------------------------- */}
        <div className="text-white">
          {/*
            WHITE, IN THE BODY FACE — not orange Anton.
            
            Anton is a poster face: at 46px, in full accent orange, across a
            whole school name, it shouted and left the line beneath it with
            nothing to be. The rest of the site already stepped its headings
            off Anton for the same reason. White carries the title, and the
            accent is spent on the one line below it, so the two read in order
            instead of competing.
          */}
          <h1 className="t-h1 font-bold text-white">
            {block.title}
          </h1>

          {block.subtitle ? (
            <p className="mt-4 text-lg font-semibold text-accent sm:text-xl">
              {block.subtitle}
            </p>
          ) : null}

          {benefits.length > 0 ? (
            <>
              {block.benefitsIntro ? (
                <p className="mt-8 font-semibold text-white">{block.benefitsIntro}</p>
              ) : null}

              <ul className="mt-4 grid gap-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white text-brand"
                    >
                      <Check size={15} strokeWidth={3} />
                    </span>
                    <span className="text-white/95">{benefit}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {badgeTitle ? (
            <div className="mt-9 inline-flex items-center gap-4 rounded-2xl bg-white/12 p-4 pr-6 ring-1 ring-white/20">
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-brand"
              >
                <GraduationCap size={24} strokeWidth={2} />
              </span>
              <span>
                <strong className="block text-white">{badgeTitle}</strong>
                {block.badge?.subtitle ? (
                  <span className="text-sm text-white/80">{block.badge.subtitle}</span>
                ) : null}
              </span>
            </div>
          ) : null}
        </div>

        {/* --- Right: the enquiry card ----------------------------------- */}
        {/*
          More padding than the shared card gives, and a deeper corner.
          `.siws-card` is sized for a card in a grid of three; this one is a
          panel a parent fills in, and 28px of padding around a seven-field
          form had the inputs almost touching its edge.
        */}
        <div className="siws-card self-start rounded-3xl p-7 sm:p-9">
          <h2 className="card-title text-brand">
            {block.form?.title ?? 'Book a Free Campus Tour'}
          </h2>

          {/*
            Plain type. This line sat in `--font-chalk`, whose stack falls
            through to Comic Sans on any machine without the webfont — on the
            one form where a parent hands over a child's name and telephone
            number. A form asking for personal details has to look like it
            means it.
          */}
          {block.form?.subtitle ? (
            <p className="mt-1.5 mb-5 t-small leading-relaxed text-ink-soft">
              {block.form.subtitle}
            </p>
          ) : null}

          {unit ? (
            <EnquiryForm
              unitId={unit.id}
              classOptions={classOptions.length > 0 ? classOptions : ['Jr KG', 'Sr KG']}
              campusOptions={campusOptions}
              formToken={createFormToken()}
            />
          ) : (
            /* The form is bound to a unit's admissions inbox, so on the
               institution-wide portal there is nowhere to route it. */
            <p className="text-sm text-ink-muted">
              Please choose a school to send an admission enquiry.
            </p>
          )}

          {trustPoints.length > 0 ? (
            <ul className="mt-6 grid gap-2.5 border-t border-line pt-5">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-sea text-brand"
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  )
}
