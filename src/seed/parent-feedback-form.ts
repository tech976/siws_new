import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Puts the feedback FORM on each school's Parent Feedback page.
 *
 * FR-PF-01 requires every unit to provide a form capturing the parent's name,
 * contact details, the ward's class, a category and a message. The page existed
 * on all four sites and told a parent to speak to the subject teacher, ask the
 * office for a meeting, or use the enquiry form on the contact page — good
 * advice, and not a form. Nothing on the page collected anything, so nothing
 * reached the panel and FR-PF-03's "viewable and exportable by authorised staff
 * for that unit" had nothing to view.
 *
 * The block and the collection were both already built and simply never placed.
 * This adds the block; the routing needs no configuration, because the form
 * sends to the address on each school's own Unit record — Primary's feedback
 * goes to Primary's inbox without anything here naming it.
 *
 * THE ADVICE STAYS. It is kept above the form rather than replaced: a parent
 * whose question is about their own child's work genuinely is answered faster
 * by the teacher who teaches them, and a form that invites every such question
 * into a queue serves them worse. The form is what to do when that route has
 * not worked, so it goes underneath.
 *
 * Run with:  npm run seed:feedback-form
 *
 * SAFE TO RUN TWICE — a page that already has a feedback block is left alone.
 */

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: pages } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'parent-feedback' } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  let added = 0
  let skipped = 0

  for (const page of pages as unknown as {
    id: number
    title: string
    unit?: number | null
    layout?: { blockType?: string }[]
  }[]) {
    /*
     * The portal's own page is institution-wide and carries a text block rather
     * than a school's form. Feedback belongs to a school — it routes to that
     * school's inbox and is read by that school's staff — so a form with no
     * unit would have nowhere to go and nobody scoped to read it.
     */
    if (!page.unit) {
      skipped += 1
      console.log(`  skip (institution-wide): ${page.title}`)
      continue
    }

    const layout = page.layout ?? []

    if (layout.some((block) => block.blockType === 'feedback')) {
      skipped += 1
      console.log(`  skip (already has the form): unit ${page.unit}`)
      continue
    }

    const block = {
      blockType: 'feedback',
      heading: 'Send us your feedback',
      intro:
        'Fill this in and it reaches the school office directly. Please give us a way to reply if you would like an answer.',
      showEmailAlternative: true,
      background: 'white',
    }

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { layout: [...layout, block] } as never,
      overrideAccess: true,
    })

    added += 1
    console.log(`  added the feedback form to unit ${page.unit}`)
  }

  console.log('')
  console.log(`Added: ${added}    Left alone: ${skipped}`)
  console.log('Submissions appear in the admin panel under "Feedback", scoped to each school.')

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
