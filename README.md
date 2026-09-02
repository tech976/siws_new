# SIWS School Website

The main SIWS portal, four independently-managed unit websites (Kindergarten,
Primary, Secondary, Junior College) and the CMS the school's own staff use to
edit them.

Built to `SIWS_School_Website_SRS_v2.pdf` and the approved landing-page design.

- **Payload CMS 3.86** embedded in **Next.js 16** (App Router, RSC)
- **PostgreSQL 18**
- **Tailwind CSS v4** on the public site, SCSS for the admin theme

---

## Running it locally

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URI and PAYLOAD_SECRET
```

Create the database and its least-privilege role. The script asks for the
password rather than storing one — use the same value as in `DATABASE_URI`:

```bash
psql -U postgres -h 127.0.0.1 -p 5433 -f scripts/setup-database.sql
```

Then load the site and run it:

```bash
gunzip -c db/siws-content.sql.gz | psql "$DATABASE_URI"   # the whole website
npm run dev                                               # http://localhost:3001
```

That one restore is what makes a fresh clone look like everybody else's. Read
the next section before reaching for the seed scripts instead.

When you have *changed* a seed and need the database rebuilt from it, there is
one command for that and it is not the individual scripts:

```bash
npm run seed:refresh     # every seed, in the order they have to run
```

The order is the point. `seed:nav` has to run last or the menu comes out with
child pages promoted to the top row, and `seed:galleries` has to run after the
unit seeds or the gallery page is overwritten by the curated one that shares
its slug. Running them by hand in the wrong order is how both of those have
been broken before.

## Why the database is committed, and the seeds are not the way in

**The pages are not in the repository.** The code renders a page; the page
itself — 102 of them, plus 51 media records, the four unit sites and the whole
menu tree — is rows in PostgreSQL. Clone this repo, run `npm run dev` against
an empty database, and you get a working application with no website in it.

`db/siws-content.sql.gz` is that database, dumped. It carries the schema and
the content together, which also means a fresh clone needs no migrations: the
tables arrive already built.

It deliberately does **not** carry `users`, `enquiries`, `audit_logs` or
saved admin preferences — the table structures come across, the rows do not.
Nobody's password hash and no parent's enquiry belongs in a git repository.
Create your own administrator on first run:

```bash
npm run dev     # then open http://localhost:3001/admin and register
```

**The photographs travel with the code.** `/media` is committed — the
web-sized derivatives the site actually renders — so the restored database
finds every image it references. `/assets/images` holds the sources the media
seed uploads from. Neither needs a separate step.

**The seed scripts still exist and still work**, but they are how the content
was *built*, not how it is *distributed*. They ran in a long historical order,
several of them reshaping what earlier ones had written, and a few are one-off
transformations that are not meaningful to re-run out of sequence. Use them to
change content — `npm run seed:primary` after editing `src/seed/primary.ts` —
and re-dump afterwards. Do not use them to build a site from nothing.

One rule if you do run them: **`npm run seed:nav` runs last, always.** The page
seeds write their own nav flags, so whichever script runs last wins, and a page
seed running after the nav seed pulls child pages out of their drop-downs and
into the top row of the menu.

### After you change content

```bash
npm run seed:primary        # or whichever seed you edited
npm run seed:nav            # always last
npm run db:dump             # refresh db/siws-content.sql.gz
git add db/siws-content.sql.gz && git commit
```

Without that last step your teammates keep the old layout.

The admin panel is at `/admin`.

---

## After every `git pull` — run `npm run seed:refresh`

**This is the step people miss, and missing it does not look like a mistake.**

The site renders from Postgres, not from this repository. Git carries the
*recipe* — the seed scripts and the image files — and each of us bakes our own
copy locally. A teammate who changes what the home page shows is changing a seed
script; pulling it brings the script onto your disk and changes nothing on
screen until you run it against your database.

```bash
git pull            # the post-merge hook says if this changed what the site shows
npm run seed:refresh
```

The hook in `.githooks/post-merge` is installed automatically by `npm install`
(via the `prepare` script, which points `core.hooksPath` at it). It warns rather
than re-seeding on its own, because a re-seed takes a couple of minutes and one
interrupted half-way leaves the site part-updated — the exact failure it exists
to prevent. Set `SIWS_AUTO_SEED=1` in your shell profile if you would rather it
just ran.

It runs every content seed in dependency order, stops at the first failure and
tells you how to carry on:

```bash
npm run seed:refresh -- --dry-run          # print the order, run nothing
npm run seed:refresh -- --from=seed:kg     # resume after fixing a failure
```

### Why skipping it shows you the WRONG photographs, not none

This is the part worth understanding, because the failure is silent in a
browser and obvious on a terminal:

- **A photograph a page names but cannot find is not left as a gap.** The
  "Life at SIWS" wall fills the slot from whatever else is in the library, so
  the page looks finished while showing pictures nobody chose. That reads as
  "somebody changed the images", not as "a seed did not run".
- **A seed that fails halfway leaves the rows it never reached alone**, so the
  previous content survives and looks deliberate.
- **Consent records live only in the database and never travel in a commit**,
  so the publish gate fails on your machine and never on the author's.
  `seed:refresh` checks for this before it starts and names the fix.

Read the warnings the seeds print. A seed that cannot find a photograph still
*succeeds* — it says so on the terminal and fills the gap.

### Is my database actually right?

```bash
npm run seed:verify
```

Read-only, writes nothing, answers in one command. It checks the faults that do
not announce themselves in a browser:

- **Stale** — it records which commit the database was built from and compares
  that to your checkout, naming the seed scripts that have changed since.
- **Dangling references** — a page pointing at a photograph that no longer
  exists. Found by walking the foreign keys, so a block added next year is
  covered without anyone remembering to update the check.
- **Library rows with no file on disk**, so a page can point at a picture that
  cannot be served.
- **Duplicate uploads**, which is how two machines end up showing different
  photographs.
- **Photographs of identifiable students with no permission recorded**, which
  will fail the next seed run part-way.

It exits non-zero when something needs attention, so it can gate a deploy as
easily as it can answer a question.

### If the same photograph appears twice

`npm run media:dedupe` reports photographs uploaded more than once, and
`npm run media:dedupe -- --delete` removes the copies. It matches on byte size
and pixel dimensions, never on names alone: `photos:import` numbers photographs
after their folder, so `...-cultural-and-festivals-1.jpg` through `-33.jpg` are
thirty-three different pictures, not thirty-three copies of one.

> **Port note.** Dev runs on **3001**, and PostgreSQL on **5433** — this machine
> has PG16 and PG18 both installed and originally both on 5432, so the app's
> credentials could reach whichever cluster won the race. Adjust to suit your
> own setup.

## Checks

```bash
npm run verify       # 58 checks across five suites
npm run typecheck
npm run build
```

The suites cover admin UI contrast and tokens, access control and the
publishing workflow (SRS 8.2 / BR-PUB), public form spam and personal-data
handling, child-image consent (FR-PRV-11) and the audit trail (BR-LOG-01/02).

Several exist because they caught a real bug: draft pages once returned 200 to
anonymous visitors because Payload's Local API defaults to
`overrideAccess: true`, and the teachers page once rendered with no teachers
because a collection was missing the fields its own access rule filtered on.
Both are now regression-guarded.

---

## How the content is organised

**Units are tenants.** A page with no unit is institution-wide (the main
portal). Every query on the public site runs with `overrideAccess: false`.

**Campus is a field, not a unit.** The Primary Section runs at Wadala and
Matunga; the K.G. Section likewise. The SRS fixes four units and the portal's
navigation is built from them, so a fifth "Primary Matunga" unit would list a
second Primary School as though it were a separate school. Faculty, enquiries
and the roster block all carry a campus instead. See `src/fields/campus.ts`.

**Nothing is invented.** Where a school's requirement document left a heading
blank, no page fills it — each seed reports its own gaps when it runs. Content
that was written as design copy rather than supplied by the school has been
removed as the real content arrived.

## Personal data

The SRS's DPDPA 2023 requirements are enforced in code, not by convention:

- Child photographs need a recorded parental consent before a page using them
  can be published (`src/hooks/child-consent.ts`).
- Enquiry personal data is never publicly readable; `create` is closed on the
  collection so the Server Action is the only way in.
- Every change, personal-data read and CSV export is written to an append-only
  audit log — `create`, `update` and `delete` are refused for every role,
  including administrators.

**`src/seed/secondary.ts` holds seven students' names behind
`CHILD_NAMES_CONSENTED`, currently `false`.** They are children, and their
names are personal data. The achievement is published in full without them.
Set the flag once the school confirms parental consent and re-run the seed.

## What is not in this repository

`.env` is git-ignored. **`media/` is not** — the web-sized derivatives the site
renders are committed, so a fresh clone shows every photograph without needing
the camera originals or a re-import. See the note in `.gitignore`.

What stays out: `/protected-media` (consent-restricted files), `/photos-inbox`
and `/SIWS Content` (1.1 GB of camera originals and video, past GitHub's
per-file limit). The photographs enter the site through `photos:import`, which
writes derivatives into `media/`; the originals stay on the machine that
received them.

**Parental consent records are database-only.** They are not in this repository
and never travel in a commit, which is why a page that publishes for the person
who added a photograph can refuse to publish for everyone else. Record them with
`npm run photos:consent` — see the note in `src/scripts/record-photo-consent.ts`
for why that is a deliberate, human-run command.
