import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Removes the "How to send us your feedback" list from each school's Parent
 * Feedback page.
 *
 * The list told a parent to speak to the subject teacher, ask the office for a
 * meeting, or use the enquiry form on the contact page. It was written when the
 * page had no form of its own, so it was the whole answer to "how do I send
 * feedback". Now that the page carries a form, it is three steps standing
 * between a parent and the thing they came to use — the form sat below it, more
 * than two screens down, which is why it read as missing.
 *
 * SIWS asked for the list to go. The form stays and moves up to where the list
 * was.
 *
 * Usage:  npx tsx src/scripts/drop-feedback-advice.ts [--apply]
 * Without --apply it prints what it would remove and writes nothing.
 */

const APPLY = process.argv.includes('--apply')

/** The one block being removed, matched on its heading rather than its position. */
const HEADING = 'How to send us your feedback'

const main = async () => {
  const payload = await getPayload({ config })

  const { docs: pages } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'parent-feedback' } },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  let changed = 0
  let skipped = 0

  for (const page of pages as unknown as {
    id: number
    title: string
    unit?: number | null
    layout?: { blockType?: string; heading?: string }[]
  }[]) {
    const layout = page.layout ?? []

    /*
     * Matched by heading, not by block type or index. There is more than one
     * `featureList` on some of these pages, and a positional match would break
     * the moment somebody reorders the page in the panel.
     */
    const remaining = layout.filter(
      (block) => !(block.blockType === 'featureList' && block.heading?.trim() === HEADING),
    )

    if (remaining.length === layout.length) {
      skipped += 1
      console.log(`  skip (not present): ${page.title} (unit ${page.unit ?? 'portal'})`)
      continue
    }

    if (APPLY) {
      await payload.update({
        collection: 'pages',
        id: page.id,
        data: { layout: remaining } as never,
        overrideAccess: true,
      })
    }

    changed += 1
    console.log(
      `  ${APPLY ? 'removed' : 'would remove'} the advice list from unit ${page.unit ?? 'portal'}` +
        `  (${layout.length} blocks -> ${remaining.length})`,
    )
  }

  console.log('')
  console.log(`${APPLY ? 'Changed' : 'Would change'}: ${changed}    Left alone: ${skipped}`)
  if (!APPLY) console.log('\nNothing was written. Re-run with --apply to do it.')

  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
