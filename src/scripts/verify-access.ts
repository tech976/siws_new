import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

/**
 * Integration check for the access-control and workflow rules.
 *
 * These are the rules where a silent failure is most costly — a Content Manager
 * able to self-publish, or one unit able to write into another's site, would
 * not surface as an error anywhere. Each case exercises the Local API with
 * `overrideAccess: false` and a real user, which is the same path the admin
 * panel and REST API take.
 *
 * Everything created here is torn down in the `finally` block, so the script is
 * safe to run repeatedly against a development database.
 *
 * Run with:  npm run verify:access
 */

const PASSWORD = 'Tr4nquil-Harbour-92!'

interface Case {
  name: string
  run: () => Promise<void>
}

let passed = 0
let failed = 0

const check = async ({ name, run }: Case): Promise<void> => {
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

/** Asserts that an operation is refused. A success here is the failure. */
const expectRejection = async (operation: () => Promise<unknown>, because: string) => {
  try {
    await operation()
  } catch {
    return
  }
  throw new Error(`Expected the operation to be refused: ${because}`)
}

const main = async () => {
  const payload = await getPayload({ config })

  const createdUsers: number[] = []
  const createdPages: number[] = []

  /**
   * Sweep anything a previous run left behind, BEFORE creating this run's
   * fixtures.
   *
   * The `finally` block below cleans up, but it only runs if the process gets
   * that far. A run killed part-way — a failed schema push, a Ctrl-C, a broken
   * pipe from `| head` — leaves its fixtures in place. One of those fixtures is
   * a page the suite deliberately PUBLISHES to prove a Unit Head can publish,
   * and a published page is served to the public: a stray `verify-draft-…` page
   * was found live on the Kindergarten site, returning 200.
   *
   * So cleanup runs at both ends. Deleting by the same patterns the fixtures
   * are named with means this is self-healing rather than something a person
   * has to remember.
   */
  const sweep = async (reason: string) => {
    const { docs: pages } = await payload.find({
      collection: 'pages',
      where: { slug: { like: 'verify-' } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    const { docs: users } = await payload.find({
      collection: 'users',
      where: { email: { like: 'verify.' } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })

    for (const doc of pages) {
      await payload.delete({ collection: 'pages', id: doc.id, overrideAccess: true }).catch(() => undefined)
    }
    for (const doc of users) {
      await payload.delete({ collection: 'users', id: doc.id, overrideAccess: true }).catch(() => undefined)
    }

    if (pages.length + users.length > 0) {
      console.log(
        `  swept ${pages.length} page(s) and ${users.length} user(s) left by a previous run (${reason})`,
      )
    }
  }

  await sweep('before')

  try {
    const { docs: units } = await payload.find({
      collection: 'units',
      sort: 'order',
      limit: 4,
      depth: 0,
      overrideAccess: true,
    })

    const kg = units.find((unit) => unit.slug === 'kindergarten')
    const primary = units.find((unit) => unit.slug === 'primary')

    if (!kg || !primary) {
      throw new Error('Seed the units first: npm run seed')
    }

    // ---- Fixtures -------------------------------------------------------
    const makeUser = async (
      suffix: string,
      roles: string[],
      extra: Record<string, unknown> = {},
    ) => {
      const user = await payload.create({
        collection: 'users',
        data: {
          name: `Test ${suffix}`,
          email: `verify.${suffix}.${Date.now()}@siws.test`,
          password: PASSWORD,
          roles,
          ...extra,
        } as never,
        overrideAccess: true,
      })
      createdUsers.push(user.id as number)
      return user
    }

    const contentManager = await makeUser('cm', ['contentManager'], { units: [kg.id] })
    const unitHead = await makeUser('head', ['unitHead'], { units: [kg.id] })
    const galleryEditor = await makeUser('editor', ['editor'], {
      units: [kg.id],
      editableSections: ['gallery'],
    })
    const suspended = await makeUser('suspended', ['contentManager'], {
      units: [kg.id],
      isActive: false,
    })

    const stamp = Date.now()
    console.log('\nAccess control — SRS 8.2 / BR-PUB\n')

    // ---- 1. Content Manager may author within their own unit ------------
    let draftId: number | null = null

    await check({
      name: 'Content Manager can create a draft in their own unit',
      run: async () => {
        const page = await payload.create({
          collection: 'pages',
          data: {
            title: 'Verify draft page',
            slug: `verify-draft-${stamp}`,
            unit: kg.id,
            layout: [],
          } as never,
          user: contentManager,
          overrideAccess: false,
        })
        draftId = page.id as number
        createdPages.push(page.id as number)
      },
    })

    // ---- 2. BR-PUB-02 — publishing is an approver's act -----------------
    await check({
      name: 'Content Manager CANNOT publish (BR-PUB-02)',
      run: () =>
        expectRejection(
          () =>
            payload.update({
              collection: 'pages',
              id: draftId as number,
              data: { _status: 'published' } as never,
              user: contentManager,
              overrideAccess: false,
            }),
          'a Content Manager must not be able to self-publish',
        ),
    })

    await check({
      name: 'Unit Head CAN publish their unit’s content',
      run: async () => {
        await payload.update({
          collection: 'pages',
          id: draftId as number,
          data: { _status: 'published' } as never,
          user: unitHead,
          overrideAccess: false,
        })
      },
    })

    // ---- 3. Unit isolation ----------------------------------------------
    await check({
      name: 'Content Manager CANNOT create content in another unit',
      run: () =>
        expectRejection(
          () =>
            payload.create({
              collection: 'pages',
              data: {
                title: 'Cross unit attempt',
                slug: `cross-unit-${stamp}`,
                unit: primary.id,
                layout: [],
              } as never,
              user: contentManager,
              overrideAccess: false,
            }),
          'a Kindergarten manager must not write into Primary',
        ),
    })

    await check({
      name: 'Content Manager CANNOT create institution-wide content (SRS 3.4)',
      run: async () => {
        /*
         * A page saved with no unit is either refused or filed under the
         * manager's own unit (`constrainUnitToScope` defaults a single-unit
         * author to it). What it must never become is a page belonging to no
         * unit — the portal's, which is an Administrator's.
         *
         * This used to expect a refusal, and got one only because the default
         * wrote the unit id as a string and the relationship rejected it: the
         * test passed on a bug that also refused every legitimate blank-unit
         * save by a single-unit author.
         */
        let page: { id: number | string; unit?: unknown } | null = null
        try {
          page = (await payload.create({
            collection: 'pages',
            data: {
              title: 'Institution attempt',
              slug: `verify-institution-attempt-${stamp}`,
              layout: [],
            } as never,
            user: contentManager,
            overrideAccess: false,
          })) as unknown as { id: number | string; unit?: unknown }
        } catch {
          return
        }
        createdPages.push(page.id as number)
        const unit = page.unit as number | { id: number } | null | undefined
        const unitId = unit && typeof unit === 'object' ? unit.id : unit
        if (String(unitId) !== String(kg.id)) {
          throw new Error(`The page was saved under ${unitId ?? 'no unit — institution-wide'}.`)
        }
      },
    })

    // ---- 4. Editor section limits (SRS 8.1) ------------------------------
    await check({
      name: 'Editor limited to Gallery CANNOT create a page',
      run: () =>
        expectRejection(
          () =>
            payload.create({
              collection: 'pages',
              data: {
                title: 'Editor attempt',
                slug: `editor-attempt-${stamp}`,
                unit: kg.id,
                layout: [],
              } as never,
              user: galleryEditor,
              overrideAccess: false,
            }),
          'an Editor assigned only to Gallery must not touch Pages',
        ),
    })

    // ---- 5. BR-USER-04 — deactivation revokes access ---------------------
    await check({
      name: 'Deactivated user CANNOT create content (BR-USER-04)',
      run: () =>
        expectRejection(
          () =>
            payload.create({
              collection: 'pages',
              data: {
                title: 'Suspended attempt',
                slug: `suspended-attempt-${stamp}`,
                unit: kg.id,
                layout: [],
              } as never,
              user: suspended,
              overrideAccess: false,
            }),
          'a deactivated account must not retain write access',
        ),
    })

    // ---- 6. Slug namespacing --------------------------------------------
    await check({
      name: 'Duplicate slug within the same unit is refused',
      run: () =>
        expectRejection(
          () =>
            payload.create({
              collection: 'pages',
              data: {
                title: 'Duplicate',
                slug: `verify-draft-${stamp}`,
                unit: kg.id,
                layout: [],
              } as never,
              user: contentManager,
              overrideAccess: false,
            }),
          'two pages in one unit must not share a slug',
        ),
    })

    await check({
      name: 'The same slug IS allowed in a different unit',
      run: async () => {
        const page = await payload.create({
          collection: 'pages',
          data: {
            title: 'Same slug, other unit',
            slug: `verify-draft-${stamp}`,
            unit: primary.id,
            layout: [],
          } as never,
          overrideAccess: true,
        })
        createdPages.push(page.id as number)
      },
    })

    // ---- 7. Public visibility -------------------------------------------
    const hiddenPage = await payload.create({
      collection: 'pages',
      data: {
        title: 'Unpublished page',
        slug: `verify-hidden-${stamp}`,
        unit: kg.id,
        layout: [],
        _status: 'draft',
      } as never,
      overrideAccess: true,
    })
    createdPages.push(hiddenPage.id as number)

    await check({
      name: 'An anonymous visitor cannot read a draft page',
      run: async () => {
        const { docs } = await payload.find({
          collection: 'pages',
          where: { slug: { equals: `verify-hidden-${stamp}` } },
          overrideAccess: false,
        })
        if (docs.length !== 0) throw new Error('A draft page was returned to the public.')
      },
    })

    await check({
      name: 'An anonymous visitor can read a published page',
      run: async () => {
        const { docs } = await payload.find({
          collection: 'pages',
          where: { slug: { equals: `verify-draft-${stamp}` } },
          overrideAccess: false,
        })
        if (docs.length === 0) throw new Error('A published page was hidden from the public.')
      },
    })

    // ---- 8. FR-CMS-06 — scheduling is enforced at read time --------------
    const futurePage = await payload.create({
      collection: 'pages',
      data: {
        title: 'Scheduled page',
        slug: `verify-scheduled-${stamp}`,
        unit: kg.id,
        layout: [],
        _status: 'published',
        publishAt: new Date(Date.now() + 86_400_000).toISOString(),
      } as never,
      overrideAccess: true,
    })
    createdPages.push(futurePage.id as number)

    await check({
      name: 'A page scheduled for tomorrow is not yet public (FR-CMS-06)',
      run: async () => {
        const { docs } = await payload.find({
          collection: 'pages',
          where: { slug: { equals: `verify-scheduled-${stamp}` } },
          overrideAccess: false,
        })
        if (docs.length !== 0) {
          throw new Error('A page with a future publish date was served to the public.')
        }
      },
    })

    const expiredPage = await payload.create({
      collection: 'pages',
      data: {
        title: 'Expired page',
        slug: `verify-expired-${stamp}`,
        unit: kg.id,
        layout: [],
        _status: 'published',
        unpublishAt: new Date(Date.now() - 3_600_000).toISOString(),
      } as never,
      overrideAccess: true,
    })
    createdPages.push(expiredPage.id as number)

    await check({
      name: 'A page past its unpublish date is withdrawn (FR-CMS-06)',
      run: async () => {
        const { docs } = await payload.find({
          collection: 'pages',
          where: { slug: { equals: `verify-expired-${stamp}` } },
          overrideAccess: false,
        })
        if (docs.length !== 0) {
          throw new Error('An expired page was still being served.')
        }
      },
    })

    // ---- 9. FR-CMS-07 — version history ---------------------------------
    await check({
      name: 'Edits accumulate a version history that can be reverted to',
      run: async () => {
        await payload.update({
          collection: 'pages',
          id: draftId as number,
          data: { title: 'Verify draft page (edited)' } as never,
          overrideAccess: true,
        })

        const { docs } = await payload.findVersions({
          collection: 'pages',
          where: { parent: { equals: draftId } },
          limit: 10,
          overrideAccess: true,
        })

        if (docs.length < 2) {
          throw new Error(`Expected at least 2 versions, found ${docs.length}.`)
        }
      },
    })

    // ---- 9b. Every public collection actually answers --------------------
    /**
     * `readPublishedOrScoped` filters on `publishAt` / `unpublishAt`. A
     * collection that uses it without declaring those fields produces a query
     * against columns that do not exist, and the request fails outright.
     *
     * That is invisible from the page: the caller catches the error, renders an
     * empty section, and the page still returns 200. Faculty shipped exactly
     * that way — a teachers page with no teachers on it. So each publicly
     * readable collection is asked, as an anonymous visitor, to actually return.
     */
    for (const collection of ['pages', 'faculty', 'media', 'units'] as const) {
      await check({
        name: `An anonymous visitor can query "${collection}" without error`,
        run: async () => {
          await payload.find({ collection, overrideAccess: false, limit: 1, depth: 0 })
        },
      })
    }

    // ---- 9c. No rich-text object stored in a plain text field ------------
    /**
     * A `textarea` field stores whatever it is given. Hand it a Lexical
     * document — as a seed does the moment someone copies `intro: richText([…])`
     * from a block that does take rich text — and Postgres keeps the
     * stringified object, which the page then prints to the visitor as
     * `{"root":{"type":"root"…}`.
     *
     * Nothing fails: not the seed, not the type checker, not the build. It is
     * visible only by looking at the page, and it reached the Primary, Secondary,
     * Kindergarten and Scholarships heroes before anyone did.
     *
     * A stored Lexical document is an OBJECT. A string that merely contains
     * `{"root":` is therefore always this mistake, whatever field it is in.
     */
    await check({
      name: 'No page prints raw rich-text JSON in a plain text field',
      run: async () => {
        const { docs } = await payload.find({
          collection: 'pages',
          limit: 200,
          depth: 0,
          overrideAccess: true,
        })

        const offenders: string[] = []

        const walk = (value: unknown, path: string) => {
          if (typeof value === 'string') {
            if (value.includes('{"root":')) offenders.push(path)
            return
          }
          if (Array.isArray(value)) {
            value.forEach((entry, index) => walk(entry, `${path}[${index}]`))
            return
          }
          if (value && typeof value === 'object') {
            for (const [key, entry] of Object.entries(value)) walk(entry, `${path}.${key}`)
          }
        }

        for (const doc of docs) walk(doc.layout, `${doc.slug}.layout`)

        assert(
          offenders.length === 0,
          `Rich-text JSON stored as text at: ${offenders.slice(0, 5).join(', ')}${
            offenders.length > 5 ? ` (+${offenders.length - 5} more)` : ''
          }`,
        )
      },
    })

    // ---- 10. Privilege escalation ---------------------------------------
    await check({
      name: 'A Unit Head cannot grant themselves the Administrator role',
      run: async () => {
        await payload.update({
          collection: 'users',
          id: unitHead.id,
          data: { roles: ['unitHead', 'admin'] } as never,
          user: unitHead,
          overrideAccess: false,
        })

        const after = await payload.findByID({
          collection: 'users',
          id: unitHead.id,
          overrideAccess: true,
          depth: 0,
        })

        // Payload silently drops fields the user may not write, so the check is
        // on the stored result rather than on whether the call threw.
        if (after.roles?.includes('admin')) {
          throw new Error('A Unit Head escalated themselves to Administrator.')
        }
      },
    })

    // ---- Head of Department --------------------------------------------
    //
    // The trustees' requirement in one line: "Primary School HOD can only
    // upload content in the Primary section." Everything below is that
    // sentence, tested from both directions.
    const hod = await makeUser('hod', ['hod'], { units: [primary.id] })
    const createdPosts: number[] = []
    const createdAnnouncements: number[] = []

    await check({
      name: 'An HOD can publish a news item in their own unit',
      run: async () => {
        const post = await payload.create({
          collection: 'posts',
          data: {
            title: `Verify HOD post ${stamp}`,
            date: new Date().toISOString(),
            template: 'story',
            unit: primary.id,
          } as never,
          overrideAccess: false,
          user: hod,
        })
        createdPosts.push(post.id as number)
      },
    })

    await check({
      name: 'An HOD CANNOT publish into another unit',
      run: () =>
        expectRejection(
          () =>
            payload.create({
              collection: 'posts',
              data: {
                title: `Verify cross-unit ${stamp}`,
                date: new Date().toISOString(),
                template: 'story',
                unit: kg.id,
              } as never,
              overrideAccess: false,
              user: hod,
            }),
          'an HOD wrote a news item into a unit they do not belong to',
        ),
    })

    await check({
      name: 'An HOD can raise a ticker announcement for their own unit',
      run: async () => {
        const item = await payload.create({
          collection: 'announcements',
          data: {
            message: `Verify announcement ${stamp}`,
            tone: 'news',
            unit: primary.id,
          } as never,
          overrideAccess: false,
          user: hod,
        })
        createdAnnouncements.push(item.id as number)
      },
    })

    await check({
      name: 'An HOD CANNOT create a page — layout is not their job',
      run: () =>
        expectRejection(
          () =>
            payload.create({
              collection: 'pages',
              data: {
                title: `Verify HOD page ${stamp}`,
                slug: `verify-hod-page-${stamp}`,
                unit: primary.id,
                layout: [],
              } as never,
              overrideAccess: false,
              user: hod,
            }),
          'an HOD built a page, which the design brief reserves to templates',
        ),
    })

    await check({
      name: 'An HOD CANNOT edit faculty records',
      run: () =>
        expectRejection(
          () =>
            payload.create({
              collection: 'faculty',
              data: {
                name: `Verify HOD faculty ${stamp}`,
                unit: primary.id,
              } as never,
              overrideAccess: false,
              user: hod,
            }),
          'an HOD reached a collection outside their four sections',
        ),
    })

    await check({
      name: 'A deactivated HOD immediately loses the ability to publish',
      run: async () => {
        await payload.update({
          collection: 'users',
          id: hod.id,
          data: { isActive: false } as never,
          overrideAccess: true,
        })

        const frozen = await payload.findByID({
          collection: 'users',
          id: hod.id,
          overrideAccess: true,
          depth: 0,
        })

        await expectRejection(
          () =>
            payload.create({
              collection: 'announcements',
              data: {
                message: `Verify suspended ${stamp}`,
                tone: 'news',
                unit: primary.id,
              } as never,
              overrideAccess: false,
              user: frozen,
            }),
          'a deactivated HOD could still publish (BR-USER-04)',
        )
      },
    })

    await check({
      name: 'An HOD can delete their own announcement, but not a page',
      run: async () => {
        const doomed = await payload.create({
          collection: 'announcements',
          data: {
            message: `Verify deletable ${stamp}`,
            tone: 'news',
            unit: primary.id,
          } as never,
          overrideAccess: false,
          user: hod,
        })

        await payload.delete({
          collection: 'announcements',
          id: doomed.id,
          overrideAccess: false,
          user: hod,
        })

        // The same right must not reach a page — deletion is still scoped by
        // section, and `pages` is not one of an HOD's.
        const page = await payload.create({
          collection: 'pages',
          data: {
            title: `Verify hod-delete ${stamp}`,
            slug: `verify-hod-delete-${stamp}`,
            unit: primary.id,
            layout: [],
          } as never,
          overrideAccess: true,
        })
        createdPages.push(page.id as number)

        await expectRejection(
          () =>
            payload.delete({
              collection: 'pages',
              id: page.id,
              overrideAccess: false,
              user: hod,
            }),
          'an HOD deleted a page',
        )
      },
    })

    // ---- HOD and the media library ---------------------------------------
    //
    // An HOD publishes news, events, achievements and the gallery — all of
    // them pictures. The role was once missing from the media library's
    // create rule, so an HOD could see photographs but never add one.
    const { default: sharp } = await import('sharp')
    const png = await sharp({
      create: { width: 12, height: 12, channels: 3, background: '#2d3a8c' },
    })
      .png()
      .toBuffer()
    const picture = (name: string) => ({
      data: png,
      mimetype: 'image/png',
      name: `verify-${name}-${stamp}.png`,
      size: png.length,
    })
    const createdMedia: (number | string)[] = []

    try {
      await check({
        name: 'An HOD can upload a picture, and it is filed under their own school',
        run: async () => {
          const item = await payload.create({
            collection: 'media',
            data: { alt: 'Verify HOD upload' } as never,
            file: picture('hod-upload'),
            overrideAccess: false,
            user: hod,
          })
          createdMedia.push(item.id)
          const unit = (item as unknown as { unit?: number | { id: number } | null }).unit
          const unitId = unit && typeof unit === 'object' ? unit.id : unit
          if (String(unitId) !== String(primary.id)) {
            throw new Error(`The upload was filed under ${unitId ?? 'every school'}, not the HOD's own.`)
          }
        },
      })

      await check({
        name: 'An HOD cannot upload a picture for another school',
        run: () =>
          expectRejection(
            async () => {
              const item = await payload.create({
                collection: 'media',
                data: { alt: 'Verify HOD elsewhere', unit: kg.id } as never,
                file: picture('hod-elsewhere'),
                overrideAccess: false,
                user: hod,
              })
              createdMedia.push(item.id)
            },
            'an HOD uploaded a picture to another school',
          ),
      })

      await check({
        name: 'An HOD edits their own school’s pictures — not another school’s or shared ones',
        run: async () => {
          const own = await payload.create({
            collection: 'media',
            data: { alt: 'Verify primary picture', unit: primary.id } as never,
            file: picture('primary'),
            overrideAccess: true,
          })
          const other = await payload.create({
            collection: 'media',
            data: { alt: 'Verify kindergarten picture', unit: kg.id } as never,
            file: picture('kg'),
            overrideAccess: true,
          })
          const shared = await payload.create({
            collection: 'media',
            data: { alt: 'Verify shared picture' } as never,
            file: picture('shared'),
            overrideAccess: true,
          })
          createdMedia.push(own.id, other.id, shared.id)

          const edited = await payload.update({
            collection: 'media',
            id: own.id,
            data: { alt: 'Verify primary picture, edited', unit: null } as never,
            overrideAccess: false,
            user: hod,
          })
          const unit = (edited as unknown as { unit?: number | { id: number } | null }).unit
          const unitId = unit && typeof unit === 'object' ? unit.id : unit
          if (String(unitId) !== String(primary.id)) {
            throw new Error('Clearing "Belongs to" made the HOD’s picture shared with every school.')
          }

          for (const [doc, what] of [
            [other, 'another school’s'],
            [shared, 'a shared'],
          ] as const) {
            await expectRejection(
              () =>
                payload.update({
                  collection: 'media',
                  id: doc.id,
                  data: { alt: 'Verify edited by HOD' } as never,
                  overrideAccess: false,
                  user: hod,
                }),
              `an HOD edited ${what} picture`,
            )
          }
        },
      })
    } finally {
      for (const id of createdMedia) {
        await payload.delete({ collection: 'media', id, overrideAccess: true }).catch(() => undefined)
      }
    }

    await check({
      name: 'Every staff role can actually open the admin panel',
      run: async () => {
        /*
         * Payload gates the panel with its own `access.admin`, which is checked
         * nowhere else. An HOD once passed every permission test here and was
         * still met with "this user does not have access to the admin panel"
         * on login, because the role had been added to the model and not to
         * that list. Reading the config directly is the only way to catch it.
         */
        const { Users } = await import('@/collections/Users')
        const gate = Users.access?.admin
        if (typeof gate !== 'function') throw new Error('Users has no admin-panel gate.')

        const staffRoles = ['admin', 'unitHead', 'contentManager', 'hod', 'editor', 'dpo']

        for (const role of staffRoles) {
          const allowed = await gate({
            req: { user: { id: 1, roles: [role], isActive: true } },
          } as never)
          if (!allowed) {
            throw new Error(`Role "${role}" can sign in but cannot open the admin panel.`)
          }
        }

        // And the gate still refuses someone who has been deactivated.
        const deactivated = await gate({
          req: { user: { id: 1, roles: ['hod'], isActive: false } },
        } as never)
        if (deactivated) throw new Error('A deactivated user could open the admin panel.')
      },
    })

    for (const id of createdPosts) {
      await payload.delete({ collection: 'posts', id, overrideAccess: true }).catch(() => undefined)
    }
    for (const id of createdAnnouncements) {
      await payload
        .delete({ collection: 'announcements', id, overrideAccess: true })
        .catch(() => undefined)
    }
  } finally {
    for (const id of createdPages) {
      await payload
        .delete({ collection: 'pages', id, overrideAccess: true })
        .catch(() => undefined)
    }
    for (const id of createdUsers) {
      await payload
        .delete({ collection: 'users', id, overrideAccess: true })
        .catch(() => undefined)
    }

    // Belt and braces: catches anything created outside the two id lists —
    // a fixture added later, or one whose create succeeded but whose id was
    // never recorded because the call threw after the write.
    await sweep('after').catch(() => undefined)
  }

  console.log(`\n${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error: unknown) => {
  console.error('Verification could not run:', error)
  process.exit(1)
})
