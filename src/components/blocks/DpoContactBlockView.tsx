import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import type { DpoContactBlock } from '@/payload-types'

import { Section, SectionHeading, type BlockBackground } from './Section'

export interface PrivacyContactDoc {
  name?: string | null
  role?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  grievanceRoute?: string | null
}

export const getPrivacyContact = async (): Promise<PrivacyContactDoc | null> => {
  try {
    const payload = await getPayload({ config })
    return (await payload.findGlobal({
      slug: 'privacy-contact',
      depth: 0,
      overrideAccess: false,
    })) as unknown as PrivacyContactDoc
  } catch {
    return null
  }
}

/**
 * FR-PRV-06 / FR-CON-04 — who to write to about personal data, and how to
 * complain. While SIWS has not yet nominated anyone, the page says so, and
 * still gives the one route that always works: the data-rights form.
 */
export const DpoContactBlockView = async ({ block }: { block: DpoContactBlock }) => {
  const contact = await getPrivacyContact()
  const named = Boolean(contact?.name?.trim())

  return (
    <Section background={(block.background ?? 'white') as BlockBackground}>
      {block.heading ? (
        <SectionHeading heading={block.heading} accentWord={block.accentWord} level={block.headingLevel} />
      ) : null}

      <div className="mx-auto max-w-3xl rounded-3xl bg-sea-soft p-6 sm:p-8">
        {named ? (
          <dl className="grid gap-3 text-ink">
            <div>
              <dt className="text-sm font-semibold text-brand">{contact?.role || 'Data Protection Officer'}</dt>
              <dd className="text-lg font-bold text-brand">{contact?.name}</dd>
            </div>
            {contact?.email ? (
              <div>
                <dt className="text-sm font-semibold text-brand">Email</dt>
                <dd>
                  <a href={`mailto:${contact.email}`} className="underline underline-offset-4">
                    {contact.email}
                  </a>
                </dd>
              </div>
            ) : null}
            {contact?.phone ? (
              <div>
                <dt className="text-sm font-semibold text-brand">Telephone</dt>
                <dd>
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="underline underline-offset-4">
                    {contact.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {contact?.address ? (
              <div>
                <dt className="text-sm font-semibold text-brand">By post</dt>
                <dd className="whitespace-pre-line">{contact.address}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-ink">
            SIWS is appointing its Data Protection Officer, and their details will be published
            here. Until then, requests about personal data reach the person responsible through
            the form below.
          </p>
        )}

        {contact?.grievanceRoute ? (
          <div className="mt-5 border-t border-line pt-5">
            <p className="mb-1 text-sm font-semibold text-brand">Raising a grievance</p>
            <p className="whitespace-pre-line text-ink">{contact.grievanceRoute}</p>
          </div>
        ) : null}

        <p className="mt-5">
          <Link href="/data-request" className="font-semibold text-brand underline underline-offset-4">
            Ask to see, correct or delete your data
          </Link>
        </p>
      </div>
    </Section>
  )
}
