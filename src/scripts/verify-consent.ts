import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Integration checks for the child-image consent controls
 * (FR-SW-03, FR-SW-05, FR-PRV-11).
 *
 * These are worth testing precisely because the failure is silent: a broken
 * guard does not error, it just quietly publishes a child's photograph that
 * nobody had permission to publish.
 *
 * Run with:  npm run verify:consent
 */

let passed = 0
let failed = 0

const check = async (name: string, run: () => Promise<void>): Promise<void> => {
  try {
    await run()
    passed += 1
    console.log(`  PASS  ${name}`)
  } catch (error) {
    failed += 1
    console.log(`  FAIL  ${name}`)
    console.log(`        ${error instanceof Error ? error.message : String(error)}`)
  }
}

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message)
}

const expectRejection = async (operation: () => Promise<unknown>, because: string) => {
  try {
    await operation()
  } catch {
    return
  }
  throw new Error(`Expected refusal: ${because}`)
}

const main = async () => {
  const payload = await getPayload({ config })
  const pageIds: number[] = []
  const mediaIds: number[] = []

  console.log('\nChild-image consent — FR-SW-03 / FR-SW-05 / FR-PRV-11\n')

  try {
    const { docs: units } = await payload.find({
      collection: 'units',
      where: { slug: { equals: 'kindergarten' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const kg = units[0]
    assert(Boolean(kg), 'Kindergarten unit missing — run `npm run seed` first.')

    /** An image of a child with NO consent recorded. */
    const unconsented = await payload.create({
      collection: 'media',
      overrideAccess: true,
      filePath: 'public/brand/logo.png',
      data: {
        alt: 'Consent verification fixture — not a real photograph.',
        unit: kg!.id,
        depictsChildren: true,
      } as never,
    })
    mediaIds.push(unconsented.id as number)

    const stamp = Date.now()

    const pageWith = (mediaId: number) =>
      ({
        title: `Consent check ${stamp}`,
        slug: `consent-check-${stamp}`,
        unit: kg!.id,
        layout: [
          {
            blockType: 'gallery',
            layout: 'grid',
            background: 'white',
            images: [{ image: mediaId }],
          },
        ],
      }) as never

    // -- 1. Draft is allowed --------------------------------------------
    let draftId: number | null = null
    await check('A DRAFT may use an image awaiting its permission record', async () => {
      const page = await payload.create({
        collection: 'pages',
        overrideAccess: true,
        data: { ...(pageWith(unconsented.id as number) as object), _status: 'draft' } as never,
      })
      draftId = page.id as number
      pageIds.push(page.id as number)
    })

    // -- 2. Publishing is blocked ---------------------------------------
    await check('Publishing is BLOCKED while no permission is recorded', () =>
      expectRejection(
        () =>
          payload.update({
            collection: 'pages',
            id: draftId as number,
            overrideAccess: true,
            data: { _status: 'published' } as never,
          }),
        'a page showing an identifiable student must not publish without a recorded consent',
      ),
    )

    // -- 3. Recording consent unblocks it -------------------------------
    await check('Recording permission allows the page to publish', async () => {
      await payload.update({
        collection: 'media',
        id: unconsented.id,
        overrideAccess: true,
        data: {
          parentalConsent: {
            obtained: true,
            method: 'permission_slip',
            obtainedOn: new Date().toISOString(),
            reference: 'Verification fixture',
          },
        } as never,
      })

      await payload.update({
        collection: 'pages',
        id: draftId as number,
        overrideAccess: true,
        data: { _status: 'published' } as never,
      })
    })

    // -- 4. The record is evidenced -------------------------------------
    await check('The consent record captures who recorded it and when', async () => {
      const media = await payload.findByID({
        collection: 'media',
        id: unconsented.id,
        overrideAccess: true,
        depth: 0,
      })
      const consent = media.parentalConsent

      assert(consent?.obtained === true, 'The consent flag was not stored.')
      assert(typeof consent?.recordedAt === 'string', 'No timestamp was stamped on the record.')
      assert(
        typeof consent?.method === 'string' && consent.method.length > 0,
        'The method of obtaining consent was not stored.',
      )
    })

    // -- 5. Withdrawal blocks re-publication (FR-SW-05) -----------------
    await check('Withdrawing an image blocks the page from being published again', async () => {
      await payload.update({
        collection: 'media',
        id: unconsented.id,
        overrideAccess: true,
        data: {
          withdrawn: { isWithdrawn: true, reason: 'Verification fixture' },
        } as never,
      })

      // Return to draft first, so the transition back into published is tested.
      await payload.update({
        collection: 'pages',
        id: draftId as number,
        overrideAccess: true,
        data: { _status: 'draft' } as never,
      })

      await expectRejection(
        () =>
          payload.update({
            collection: 'pages',
            id: draftId as number,
            overrideAccess: true,
            data: { _status: 'published' } as never,
          }),
        'a withdrawn photograph must not be restored to the public site',
      )
    })

    await check('The withdrawal is timestamped', async () => {
      const media = await payload.findByID({
        collection: 'media',
        id: unconsented.id,
        overrideAccess: true,
        depth: 0,
      })
      const withdrawn = media.withdrawn
      assert(withdrawn?.isWithdrawn === true, 'The withdrawal flag was not stored.')
      assert(typeof withdrawn?.withdrawnAt === 'string', 'The withdrawal was not timestamped.')
    })

    // -- 6. Images without children are unaffected ----------------------
    await check('A picture with no students in it publishes freely', async () => {
      const plain = await payload.create({
        collection: 'media',
        overrideAccess: true,
        filePath: 'public/brand/logo.png',
        data: {
          alt: 'Consent verification fixture — building exterior, no students.',
          unit: kg!.id,
          depictsChildren: false,
        } as never,
      })
      mediaIds.push(plain.id as number)

      const page = await payload.create({
        collection: 'pages',
        overrideAccess: true,
        data: {
          title: `Consent check plain ${stamp}`,
          slug: `consent-check-plain-${stamp}`,
          unit: kg!.id,
          _status: 'published',
          layout: [
            {
              blockType: 'gallery',
              layout: 'grid',
              background: 'white',
              images: [{ image: plain.id }],
            },
          ],
        } as never,
      })
      pageIds.push(page.id as number)
    })

    // -- 7. The real Kindergarten photographs are cleared ---------------
    await check('Every live child photograph has a permission record', async () => {
      const { docs } = await payload.find({
        collection: 'media',
        where: { depictsChildren: { equals: true } },
        sort: 'id',
        limit: 200,
        depth: 0,
        overrideAccess: true,
      })

      const gaps = docs
        .filter((doc) => {
          // The fixture above is withdrawn on purpose.
          if (doc.withdrawn?.isWithdrawn === true) return false
          return doc.parentalConsent?.obtained !== true
        })
        .map((doc) => String(doc.filename))

      assert(
        gaps.length === 0,
        `${gaps.length} child photograph(s) still have no permission recorded: ${gaps.join(', ')}`,
      )
    })
  } finally {
    for (const id of pageIds) {
      await payload.delete({ collection: 'pages', id, overrideAccess: true }).catch(() => undefined)
    }
    for (const id of mediaIds) {
      await payload
        .delete({ collection: 'media', id, overrideAccess: true, context: { forceMediaDelete: true } })
        .catch(() => undefined)
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error: unknown) => {
  console.error('Verification could not run:', error)
  process.exit(1)
})
