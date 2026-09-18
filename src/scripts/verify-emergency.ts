import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Integration check for SRS 5.18 — emergency notices.
 *
 * Exercises the Local API with `overrideAccess: false` and real users, which is
 * the path the admin panel and the public banner take. Fixtures are named
 * `verify-emg` and swept at both ends, so a killed run cannot leave a test
 * notice live on the website.
 *
 * Run with:  npx tsx src/scripts/verify-emergency.ts
 */

const PASSWORD = 'Verify-Notice-7'
const TAG = '[verify-emg]'

let passed = 0
let failed = 0

const check = async (name: string, run: () => Promise<void>) => {
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

  const sweep = async () => {
    const notices = await payload.find({
      collection: 'emergency-notices',
      where: { message: { like: TAG } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    for (const doc of notices.docs) {
      await payload.delete({ collection: 'emergency-notices', id: doc.id, overrideAccess: true })
    }
    const users = await payload.find({
      collection: 'users',
      where: { email: { like: 'verify.emg.' } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })
    for (const doc of users.docs) {
      await payload.delete({ collection: 'users', id: doc.id, overrideAccess: true })
    }
    const logs = await payload.find({
      collection: 'audit-logs',
      where: { targetTitle: { like: TAG } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    for (const doc of logs.docs) {
      await payload.delete({ collection: 'audit-logs', id: doc.id, overrideAccess: true })
    }
  }

  await sweep()

  /*
   * A real notice already up on the site would collide with the fixtures below
   * (FR-EMG-11) and make every "raise" case fail for the wrong reason. This
   * suite is not allowed to take a genuine notice down, so it stops instead.
   */
  const alreadyLive = await payload.find({
    collection: 'emergency-notices',
    where: { status: { equals: 'live' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (alreadyLive.totalDocs > 0) {
    console.log('  SKIPPED — a real notice is live on this database; not touching it.')
    process.exit(0)
  }

  try {
    const { docs: units } = await payload.find({
      collection: 'units',
      limit: 10,
      depth: 0,
      overrideAccess: true,
    })
    const kg = units.find((unit) => unit.slug === 'kindergarten')!
    const primary = units.find((unit) => unit.slug === 'primary')!

    const makeUser = async (suffix: string, data: Record<string, unknown>) =>
      payload.create({
        collection: 'users',
        data: {
          name: `Verify ${suffix}`,
          email: `verify.emg.${suffix}.${Date.now()}@siws.test`,
          password: PASSWORD,
          ...data,
        } as never,
        overrideAccess: true,
      })

    const admin = await makeUser('admin', { roles: ['admin'] })
    const head = await makeUser('head', {
      roles: ['unitHead'],
      units: [kg.id],
      canRaiseEmergencyNotice: true,
    })
    const headNotNominated = await makeUser('head2', { roles: ['unitHead'], units: [kg.id] })
    const hod = await makeUser('hod', { roles: ['hod'], units: [kg.id] })

    const create = (user: unknown, data: Record<string, unknown>) =>
      payload.create({
        collection: 'emergency-notices',
        data: data as never,
        user: user as never,
        overrideAccess: false,
      })

    const publicSees = async (id: number | string) => {
      const { docs } = await payload.find({
        collection: 'emergency-notices',
        where: { id: { equals: id } },
        depth: 0,
        overrideAccess: false,
      })
      return docs.length === 1
    }

    console.log('\nEmergency notices — SRS 5.18')

    let first: { id: number | string } | null = null

    await check('An administrator can raise an institution-wide notice (FR-EMG-02)', async () => {
      first = await create(admin, { message: `${TAG} closed today`, severity: 'critical' })
      const doc = first as unknown as { scope: string; status: string }
      assert(doc.scope === 'institution', `scope defaulted to ${doc.scope}`)
      assert(doc.status === 'live', 'not live on save')
    })

    await check('A live notice is visible to the public (FR-EMG-01)', async () => {
      assert(Boolean(first) && (await publicSees(first!.id)), 'public cannot read it')
    })

    await check('Raising a second notice for the same place is refused without a choice (FR-EMG-11)', async () => {
      await expectRejection(
        () => create(admin, { message: `${TAG} second`, severity: 'warning' }),
        'a second institution notice went live silently',
      )
    })

    let stacked: { id: number | string } | null = null
    await check('…and is allowed when explicitly stacked', async () => {
      stacked = await create(admin, {
        message: `${TAG} stacked`,
        severity: 'information',
        onConflict: 'stack',
      })
      assert(await publicSees(first!.id), 'stacking took the first notice down')
      assert(await publicSees(stacked!.id), 'stacked notice not visible')
    })

    await check('Replacing withdraws the notices already live', async () => {
      const replacement = await create(admin, {
        message: `${TAG} replacement`,
        severity: 'warning',
        onConflict: 'replace',
      })
      assert(!(await publicSees(first!.id)), 'first notice still live after replace')
      assert(!(await publicSees(stacked!.id)), 'stacked notice still live after replace')
      assert(await publicSees(replacement.id), 'replacement not live')
      const withdrawn = (await payload.findByID({
        collection: 'emergency-notices',
        id: first!.id,
        depth: 0,
        overrideAccess: true,
      })) as unknown as { status: string; withdrawnAt?: string }
      assert(withdrawn.status === 'withdrawn' && Boolean(withdrawn.withdrawnAt), 'not marked withdrawn')
      await payload.update({
        collection: 'emergency-notices',
        id: replacement.id,
        data: { status: 'withdrawn' } as never,
        user: admin as never,
        overrideAccess: false,
      })
    })

    await check('A past expiry time is refused on save', async () => {
      await expectRejection(
        () =>
          create(admin, {
            message: `${TAG} past expiry`,
            expiresAt: new Date(Date.now() - 60_000).toISOString(),
            onConflict: 'stack',
          }),
        'a notice was saved already expired',
      )
    })

    await check('A notice disappears at its expiry, with no job having run (FR-EMG-06)', async () => {
      // Real time passing, which is the case that matters: nothing writes to
      // the notice between "live" and "gone".
      const past = await payload.create({
        collection: 'emergency-notices',
        data: {
          message: `${TAG} expiring`,
          scope: 'institution',
          status: 'live',
          severity: 'warning',
          expiresAt: new Date(Date.now() + 2_000).toISOString(),
        } as never,
        overrideAccess: true,
      })
      assert(await publicSees(past.id), 'not visible before its expiry')
      await new Promise((resolve) => setTimeout(resolve, 2_500))
      assert(!(await publicSees(past.id)), 'an expired notice is still public')
      const read = (await payload.findByID({
        collection: 'emergency-notices',
        id: past.id,
        depth: 0,
        overrideAccess: true,
      })) as unknown as { state?: string }
      assert(read.state === 'Expired', `admin state reads "${read.state}"`)
    })

    await check('A nominated Unit Head can raise a notice; it is pinned to their school', async () => {
      const doc = (await create(head, {
        message: `${TAG} kg only`,
        severity: 'warning',
      })) as unknown as { scope: string; units: (number | { id: number })[] }
      const ids = doc.units.map((u) => (typeof u === 'object' ? u.id : u))
      assert(doc.scope === 'units', `scope is ${doc.scope}`)
      assert(ids.length === 1 && ids[0] === kg.id, `units are ${ids.join(',')}`)
    })

    await check('A Unit Head cannot post an institution-wide notice through the API', async () => {
      const doc = (await create(head, {
        message: `${TAG} sneaky institution`,
        scope: 'institution',
        onConflict: 'stack',
      })) as unknown as { scope: string }
      assert(doc.scope === 'units', 'the scope was not forced back to their own school')
    })

    await check('A Unit Head cannot raise a notice for another school', async () => {
      await expectRejection(
        () => create(head, { message: `${TAG} primary`, units: [primary.id] }),
        'a Kindergarten head raised a Primary notice',
      )
    })

    await check('A Unit Head who is not nominated cannot raise one (BR-USER-03)', async () => {
      await expectRejection(
        () => create(headNotNominated, { message: `${TAG} not nominated` }),
        'an un-nominated head raised a notice',
      )
    })

    await check('An HOD cannot raise one (SRS 8.2)', async () => {
      await expectRejection(() => create(hod, { message: `${TAG} hod` }), 'an HOD raised a notice')
    })

    await check('Only an administrator can delete a notice', async () => {
      const { docs } = await payload.find({
        collection: 'emergency-notices',
        where: { message: { like: `${TAG} kg only` } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      await expectRejection(
        () =>
          payload.delete({
            collection: 'emergency-notices',
            id: docs[0]!.id,
            user: head as never,
            overrideAccess: false,
          }),
        'a Unit Head deleted a notice',
      )
    })

    await check('Every live save is logged as an emergency publish (FR-EMG-10)', async () => {
      const { docs } = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { targetCollection: { equals: 'emergency-notices' } },
            { action: { equals: 'emergency_publish' } },
            { targetTitle: { like: TAG } },
          ],
        },
        limit: 50,
        depth: 0,
        overrideAccess: true,
      })
      assert(docs.length >= 4, `only ${docs.length} emergency-publish entries`)
      const withdrawals = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { targetCollection: { equals: 'emergency-notices' } },
            { action: { equals: 'unpublished' } },
            { targetTitle: { like: TAG } },
          ],
        },
        limit: 50,
        depth: 0,
        overrideAccess: true,
      })
      assert(withdrawals.docs.length >= 3, `only ${withdrawals.docs.length} withdrawal entries`)
    })
  } finally {
    await sweep()
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
