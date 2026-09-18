import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload, createLocalReq } = await import('payload')
const { default: config } = await import('@payload-config')
const { recordConsent, withdrawConsents } = await import('@/lib/consent-register')
const { dataRequestEndpoints, findPersonalRecords } = await import('@/endpoints/data-requests')
const { RETENTION_CATEGORIES, overdueWhere } = await import('@/lib/retention')
const { getConsentNotice } = await import('@/lib/consent-notices-server')

/**
 * Integration check for SRS 6.9 — the consent register, data-subject requests
 * and retention.
 *
 * Fixtures use `verify.dpa.` addresses (and one near-miss, `sverify.dpa.`, that
 * must NEVER be matched) and are swept at both ends. Nothing here runs the
 * retention deletion itself — that would act on real data — only the query that
 * decides what it would act on.
 *
 * Run with:  npm run verify:data-protection
 */

const PASSWORD = 'Verify-Dpa-7'

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
  const stamp = Date.now()
  const email = `verify.dpa.${stamp}@siws.test`
  const nearMiss = `sverify.dpa.${stamp}@siws.test`

  const sweep = async () => {
    for (const collection of ['enquiries', 'feedback', 'data-requests'] as const) {
      const { docs } = await payload.find({
        collection,
        where: { email: { like: 'verify.dpa.' } },
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })
      for (const doc of docs) {
        await payload.delete({ collection, id: doc.id, overrideAccess: true })
      }
    }
    const consents = await payload.find({
      collection: 'consent-records',
      where: { or: [{ subject: { like: 'verify.dpa.' } }, { subject: { like: 'ck-verify-dpa' } }] },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    for (const doc of consents.docs) {
      await payload.delete({ collection: 'consent-records', id: doc.id, overrideAccess: true })
    }
    const logs = await payload.find({
      collection: 'audit-logs',
      where: { actorEmail: { like: 'verify.dpa.user' } },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })
    for (const doc of logs.docs) {
      await payload.delete({ collection: 'audit-logs', id: doc.id, overrideAccess: true })
    }
    const users = await payload.find({
      collection: 'users',
      where: { email: { like: 'verify.dpa.user' } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    })
    for (const doc of users.docs) {
      await payload.delete({ collection: 'users', id: doc.id, overrideAccess: true })
    }
  }

  await sweep()

  try {
    const { docs: units } = await payload.find({
      collection: 'units',
      limit: 10,
      depth: 0,
      overrideAccess: true,
    })
    const kg = units.find((unit) => unit.slug === 'kindergarten')!

    const makeUser = (suffix: string, data: Record<string, unknown>) =>
      payload.create({
        collection: 'users',
        data: {
          name: `Verify ${suffix}`,
          email: `verify.dpa.user.${suffix}.${stamp}@siws.test`,
          password: PASSWORD,
          ...data,
        } as never,
        overrideAccess: true,
      })

    const admin = await makeUser('admin', { roles: ['admin'] })
    const dpo = await makeUser('dpo', { roles: ['dpo'] })
    const head = await makeUser('head', { roles: ['unitHead'], units: [kg.id] })

    // ---- Fixtures: one person's data across the site, and a near-miss ----
    const enquiry = await payload.create({
      collection: 'enquiries',
      overrideAccess: true,
      data: {
        unit: kg.id,
        parentFirstName: 'Verify',
        parentLastName: 'Parent',
        childName: 'Verify Child',
        phone: '+91 98765 43210',
        email: email.toUpperCase(),
        gradeApplyingFor: 'Jr. KG',
        status: 'new',
        consentGiven: true,
        consentPurpose: 'admission_enquiry',
        consentNoticeVersion: 'test',
        consentAt: new Date().toISOString(),
      } as never,
    })
    const strangersEnquiry = await payload.create({
      collection: 'enquiries',
      overrideAccess: true,
      data: {
        unit: kg.id,
        parentFirstName: 'Someone',
        parentLastName: 'Else',
        childName: 'Another Child',
        phone: '9000000001',
        email: nearMiss,
        gradeApplyingFor: 'Sr. KG',
        status: 'new',
        consentGiven: true,
        consentPurpose: 'admission_enquiry',
        consentNoticeVersion: 'test',
        consentAt: new Date().toISOString(),
      } as never,
    })
    const feedback = await payload.create({
      collection: 'feedback',
      overrideAccess: true,
      data: {
        unit: kg.id,
        name: 'Verify Parent',
        email,
        relationship: 'Parent',
        subject: 'Something else',
        message: 'Verification message for the data protection suite.',
        status: 'new',
        consentGiven: true,
        consentPurpose: 'feedback',
        consentNoticeVersion: 'test',
        consentAt: new Date().toISOString(),
      } as never,
    })
    await recordConsent(payload, {
      subject: email,
      subjectName: 'Verify Parent',
      purpose: 'feedback',
      noticeVersion: 'test',
      relatedCollection: 'feedback',
      relatedId: feedback.id,
    })
    const request = await payload.create({
      collection: 'data-requests',
      overrideAccess: true,
      data: {
        name: 'Verify Parent',
        email,
        phone: '098765-43210',
        requestType: 'erasure',
        status: 'received',
        history: [{ at: new Date().toISOString(), by: 'Website form', status: 'received' }],
      } as never,
    })

    console.log('\nConsent register — BR-DPA-01')

    await check('The public cannot read the consent register', async () => {
      await expectRejection(
        () => payload.find({ collection: 'consent-records', overrideAccess: false }),
        'an anonymous caller read consent records',
      )
    })

    await check('A Unit Head cannot read it (SRS 8.2)', async () => {
      await expectRejection(
        () => payload.find({ collection: 'consent-records', overrideAccess: false, user: head as never }),
        'a Unit Head read consent records',
      )
    })

    await check('The DPO can read it', async () => {
      const { docs } = await payload.find({
        collection: 'consent-records',
        where: { subject: { equals: email } },
        overrideAccess: false,
        user: dpo as never,
      })
      assert(docs.length === 1, `DPO saw ${docs.length} records`)
    })

    await check('Nobody can write to it through the API, not even an administrator', async () => {
      await expectRejection(
        () =>
          payload.create({
            collection: 'consent-records',
            data: { subject: 'forged', purpose: 'feedback', noticeVersion: 'x', status: 'given', givenAt: new Date().toISOString() } as never,
            overrideAccess: false,
            user: admin as never,
          }),
        'an administrator forged a consent record',
      )
    })

    await check('A new cookie choice supersedes the old one under the same reference', async () => {
      const ref = `ck-verify-dpa-${stamp}`
      await recordConsent(payload, { subject: ref, purpose: 'cookies', noticeVersion: 'v', categories: ['necessary'] })
      await recordConsent(payload, { subject: ref, purpose: 'cookies', noticeVersion: 'v', categories: ['necessary', 'embeds'] })
      const { docs } = await payload.find({
        collection: 'consent-records',
        where: { subject: { equals: ref } },
        depth: 0,
        overrideAccess: true,
      })
      const statuses = docs.map((doc) => (doc as unknown as { status: string }).status).sort()
      assert(JSON.stringify(statuses) === JSON.stringify(['given', 'superseded']), `statuses: ${statuses}`)
      const withdrawn = await withdrawConsents(payload, ref, 'cookies')
      assert(withdrawn === 1, `withdrew ${withdrawn}`)
    })

    console.log('\nData-subject requests — BR-DPA-03 / 04 / 05')

    await check('A Unit Head cannot read data requests', async () => {
      await expectRejection(
        () => payload.find({ collection: 'data-requests', overrideAccess: false, user: head as never }),
        'a Unit Head read data requests',
      )
    })

    await check('A status change is appended to the history, with who made it', async () => {
      const updated = (await payload.update({
        collection: 'data-requests',
        id: request.id,
        data: { status: 'in_progress', addNote: 'Identity checked by phone.' } as never,
        overrideAccess: false,
        user: dpo as never,
      })) as unknown as { history: { by: string; status?: string; note?: string }[]; addNote?: string | null }
      const last = updated.history[updated.history.length - 1]!
      assert(updated.history.length === 2, `history has ${updated.history.length} entries`)
      assert(last.status === 'in_progress' && last.note === 'Identity checked by phone.', 'entry wrong')
      assert(last.by.startsWith('Verify'), `recorded by "${last.by}"`)
      assert(!updated.addNote, 'the note box was not emptied')
    })

    await check('The history cannot be rewritten through the API', async () => {
      const updated = (await payload.update({
        collection: 'data-requests',
        id: request.id,
        data: { history: [{ at: new Date().toISOString(), by: 'forger', note: 'nothing happened' }] } as never,
        overrideAccess: false,
        user: admin as never,
      })) as unknown as { history: { by: string }[] }
      assert(updated.history.length === 2, `history now has ${updated.history.length} entries`)
      assert(!updated.history.some((entry) => entry.by === 'forger'), 'a forged entry was kept')
    })

    const reqAs = async (user: unknown, body?: unknown) => {
      const req = await createLocalReq({ user: user as never }, payload)
      req.routeParams = { id: String(request.id) }
      ;(req as unknown as { json: () => Promise<unknown> }).json = async () => body ?? {}
      return req
    }

    await check('Finding records matches the person exactly, across collections and formats', async () => {
      const req = await reqAs(dpo)
      const found = await findPersonalRecords(req, { email, phone: '9876543210' })
      const byCollection = Object.fromEntries(found.map((g) => [g.collection, g.docs.map((d) => d.id)]))
      assert(byCollection.enquiries?.includes(enquiry.id) === true, 'the upper-case enquiry was missed')
      assert(!byCollection.enquiries?.includes(strangersEnquiry.id), 'a near-miss address was matched')
      assert(byCollection.feedback?.includes(feedback.id) === true, 'feedback was missed')
      assert((byCollection['consent-records']?.length ?? 0) === 1, 'consent record not found')
      assert(byCollection['data-requests']?.includes(request.id) === true, 'the request itself was not found')
    })

    const [recordsEndpoint, exportEndpoint, eraseEndpoint, withdrawEndpoint, breachEndpoint] =
      dataRequestEndpoints

    await check('The records tool refuses a Unit Head', async () => {
      const response = await recordsEndpoint!.handler(await reqAs(head))
      assert(response.status === 403, `status ${response.status}`)
    })

    await check('The export returns every record, with a handling notice, and is logged', async () => {
      const response = await exportEndpoint!.handler(await reqAs(dpo))
      assert(response.status === 200, `status ${response.status}`)
      const body = (await response.json()) as { notice: string; records: Record<string, unknown[]> }
      assert(body.notice.startsWith('CONFIDENTIAL'), 'no handling notice')
      assert((body.records['Admission enquiries']?.length ?? 0) === 1, 'enquiry missing from export')
      const { totalDocs } = await payload.count({
        collection: 'audit-logs',
        where: {
          and: [
            { action: { equals: 'exported_personal_data' } },
            { targetCollection: { equals: 'data-requests' } },
            { targetId: { equals: String(request.id) } },
          ],
        },
        overrideAccess: true,
      })
      assert(totalDocs >= 1, 'the export was not logged')
    })

    await check('Consent is only withdrawn in answer to a withdraw-consent request', async () => {
      const response = await withdrawEndpoint!.handler(await reqAs(dpo))
      assert(response.status === 400, `an erasure request withdrew consent (status ${response.status})`)
    })

    await check('Withdrawing marks every standing consent withdrawn, and notes it on the request', async () => {
      const withdrawal = await payload.create({
        collection: 'data-requests',
        overrideAccess: true,
        data: {
          name: 'Verify Parent',
          email,
          requestType: 'withdraw_consent',
          status: 'received',
          history: [{ at: new Date().toISOString(), by: 'Website form', status: 'received' }],
        } as never,
      })
      const req = await reqAs(dpo)
      req.routeParams = { id: String(withdrawal.id) }
      const response = await withdrawEndpoint!.handler(req)
      assert(response.status === 200, `status ${response.status}`)
      const { docs } = await payload.find({
        collection: 'consent-records',
        where: { subject: { equals: email } },
        depth: 0,
        overrideAccess: true,
      })
      assert(docs.length > 0, 'no consent record to check')
      assert(
        docs.every((doc) => (doc as unknown as { status: string }).status === 'withdrawn'),
        'a consent is still standing',
      )
      const after = (await payload.findByID({
        collection: 'data-requests',
        id: withdrawal.id,
        depth: 0,
        overrideAccess: true,
      })) as unknown as { history: { note?: string }[] }
      assert(after.history.some((entry) => entry.note?.startsWith('Withdrew')), 'nothing noted on the request')
      await payload.delete({ collection: 'data-requests', id: withdrawal.id, overrideAccess: true })
    })

    await check('The breach export refuses a Unit Head, and lists the register for the DPO', async () => {
      const refused = await breachEndpoint!.handler(await reqAs(head))
      assert(refused.status === 403, `a Unit Head got status ${refused.status}`)
      const undated = await breachEndpoint!.handler(await reqAs(dpo))
      assert(undated.status === 400, `no date range gave status ${undated.status}`)
      const req = await reqAs(dpo)
      ;(req as unknown as { url: string }).url =
        `http://local/api/data-requests/breach-report?from=${new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)}`
      const response = await breachEndpoint!.handler(req)
      assert(response.status === 200, `status ${response.status}`)
      const body = await response.text()
      assert(body.includes(email), 'today’s affected person is missing from the report')
    })

    await check('Erasure needs the typed confirmation', async () => {
      const response = await eraseEndpoint!.handler(await reqAs(dpo, { confirm: 'yes' }))
      assert(response.status === 400, `status ${response.status}`)
    })

    await check('Erasure removes the person’s records, keeps the request, and spares the near-miss', async () => {
      const response = await eraseEndpoint!.handler(await reqAs(dpo, { confirm: 'ERASE' }))
      assert(response.status === 200, `status ${response.status}: ${await response.clone().text()}`)
      const gone = async (collection: 'enquiries' | 'feedback', id: number | string) =>
        (await payload.find({ collection, where: { id: { equals: id } }, overrideAccess: true })).docs.length === 0
      assert(await gone('enquiries', enquiry.id), 'enquiry survived')
      assert(await gone('feedback', feedback.id), 'feedback survived')
      assert(!(await gone('enquiries', strangersEnquiry.id)), 'the near-miss enquiry was erased')
      const consents = await payload.count({
        collection: 'consent-records',
        where: { subject: { equals: email } },
        overrideAccess: true,
      })
      assert(consents.totalDocs === 0, 'consent record survived')
      const kept = (await payload.findByID({
        collection: 'data-requests',
        id: request.id,
        depth: 0,
        overrideAccess: true,
      })) as unknown as { history: { note?: string }[] }
      assert(kept.history.some((entry) => entry.note?.startsWith('Erased')), 'erasure not in history')
      const { totalDocs } = await payload.count({
        collection: 'audit-logs',
        where: {
          and: [
            { action: { equals: 'deleted_personal_data' } },
            { targetId: { equals: String(request.id) } },
          ],
        },
        overrideAccess: true,
      })
      assert(totalDocs >= 1, 'the erasure was not logged')
    })

    console.log('\nRetention — BR-DPA-02')

    await check('A record older than its period is found by the retention query', async () => {
      const old = await payload.create({
        collection: 'enquiries',
        overrideAccess: true,
        data: {
          unit: kg.id,
          parentFirstName: 'Old',
          parentLastName: 'Enquiry',
          childName: 'Old Child',
          phone: '9000000002',
          email: `verify.dpa.old.${stamp}@siws.test`,
          gradeApplyingFor: 'Jr. KG',
          status: 'new',
          consentGiven: true,
          consentPurpose: 'admission_enquiry',
          consentNoticeVersion: 'test',
          consentAt: new Date().toISOString(),
        } as never,
      })
      // Age it directly in the database: timestamps are not writable through the API.
      await payload.db.updateOne({
        collection: 'enquiries',
        where: { id: { equals: old.id } },
        data: { createdAt: new Date('2020-01-01').toISOString() },
      })
      const category = RETENTION_CATEGORIES.find((entry) => entry.key === 'enquiries')!
      const { docs } = await payload.find({
        collection: 'enquiries',
        where: { and: [overdueWhere(category, 24), { id: { equals: old.id } }] },
        overrideAccess: true,
      })
      assert(docs.length === 1, 'the aged enquiry was not flagged')
      const fresh = await payload.find({
        collection: 'enquiries',
        where: { and: [overdueWhere(category, 24), { id: { equals: strangersEnquiry.id } }] },
        overrideAccess: true,
      })
      assert(fresh.docs.length === 0, 'a new enquiry was flagged as overdue')
    })

    await check('An open data request is never overdue, however old', async () => {
      await payload.db.updateOne({
        collection: 'data-requests',
        where: { id: { equals: request.id } },
        data: { updatedAt: new Date('2019-01-01').toISOString(), status: 'in_progress' },
      })
      const category = RETENTION_CATEGORIES.find((entry) => entry.key === 'dataRequests')!
      const { docs } = await payload.find({
        collection: 'data-requests',
        where: { and: [overdueWhere(category, 36), { id: { equals: request.id } }] },
        overrideAccess: true,
      })
      assert(docs.length === 0, 'an open request was flagged for deletion')
    })

    await check('Retention settings are closed to a Unit Head', async () => {
      await expectRejection(
        () => payload.findGlobal({ slug: 'data-protection', overrideAccess: false, user: head as never }),
        'a Unit Head read the retention settings',
      )
    })

    console.log('\nConsent notices — BR-DPA-07')

    const { docs: noticeDocs } = await payload.find({
      collection: 'consent-notices',
      where: { purpose: { equals: 'feedback' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const original = noticeDocs[0] as unknown as Record<string, unknown> & { id: number; version: string }
    const editStartedAt = new Date().toISOString()

    if (!original) {
      await check('The consent notices have been seeded', async () => {
        assert(false, 'no feedback notice in the panel — run npm run seed:consent-notices')
      })
    } else {
      try {
        await check('A Unit Head cannot edit a consent notice', async () => {
          await expectRejection(
            () =>
              payload.update({
                collection: 'consent-notices',
                id: original.id,
                data: { yourRights: 'changed by a unit head' } as never,
                overrideAccess: false,
                user: head as never,
              }),
            'a Unit Head changed the wording',
          )
        })

        await check('Saving without changing the wording keeps the version', async () => {
          const saved = (await payload.update({
            collection: 'consent-notices',
            id: original.id,
            data: { title: original.title } as never,
            overrideAccess: false,
            user: dpo as never,
          })) as unknown as { version: string }
          assert(saved.version === original.version, `version moved to ${saved.version}`)
        })

        await check('Changing the wording starts a new version, and nobody can set it by hand', async () => {
          const saved = (await payload.update({
            collection: 'consent-notices',
            id: original.id,
            data: {
              yourRights: `${original.yourRights} (verify ${stamp})`,
              version: 'typed-by-hand',
              purpose: 'admission_enquiry',
            } as never,
            overrideAccess: false,
            user: dpo as never,
          })) as unknown as { version: string; purpose: string; effectiveFrom: string }
          assert(saved.version !== original.version, 'the version did not change')
          assert(saved.version !== 'typed-by-hand', 'a hand-typed version was kept')
          assert(/^\d{4}-\d{2}-v\d+$/.test(saved.version), `odd version ${saved.version}`)
          assert(saved.purpose === 'feedback', 'the purpose was changed')
          assert(saved.effectiveFrom >= editStartedAt, 'the effective date was not stamped')
        })

        await check('The form shows, and records against, the wording now in the panel', async () => {
          const live = await getConsentNotice('feedback')
          assert(live.items.yourRights.endsWith(`(verify ${stamp})`), 'the form still shows the old wording')
          assert(live.version !== original.version, 'the form would record the old version')
        })

        await check('The earlier wording is kept in the version history', async () => {
          const { docs } = await payload.findVersions({
            collection: 'consent-notices',
            where: { parent: { equals: original.id } },
            sort: '-createdAt',
            limit: 10,
            overrideAccess: true,
          })
          const versions = docs.map((doc) => (doc.version as { version?: string }).version)
          assert(versions.includes(original.version), 'the earlier version is not in the history')
        })

        await check('Nobody can delete a consent notice, not even an administrator', async () => {
          await expectRejection(
            () =>
              payload.delete({
                collection: 'consent-notices',
                id: original.id,
                overrideAccess: false,
                user: admin as never,
              }),
            'an administrator deleted a notice',
          )
        })
      } finally {
        // Put the notice back exactly, without starting another version.
        await payload.db.updateOne({
          collection: 'consent-notices',
          id: original.id,
          data: {
            yourRights: original.yourRights,
            version: original.version,
            effectiveFrom: original.effectiveFrom,
          },
        })
        await payload.db.deleteVersions({
          collection: 'consent-notices',
          where: {
            and: [{ parent: { equals: original.id } }, { createdAt: { greater_than: editStartedAt } }],
          },
        })
      }
    }
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
