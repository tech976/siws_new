/**
 * SEO brief (October 2026): search titles and missing descriptions for the
 * pages parents search for most, plus one link fix.
 *
 * Written through Payload, so every change is a normal saved version that can
 * be seen and reverted in the page's history, and edited later under the
 * page's "Search engines" tab.
 *
 * - A search title is set only where none exists yet, except the main home
 *   page, whose title was a plain name with no "school in Wadala" signal.
 * - A description is filled only where the page has none. Existing ones were
 *   written from the school's own facts and are kept.
 * - Every claim is one the site already makes (classes, board, streams).
 *   Nothing about fees, dates or results is added here.
 *
 * Run on the server, from the app folder:
 *   NODE_ENV=production npx tsx src/scripts/seo-titles.ts          (dry run)
 *   NODE_ENV=production npx tsx src/scripts/seo-titles.ts --apply
 */
import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

const apply = process.argv.includes('--apply')

type Entry = { title: string; description?: string; replaceTitle?: boolean }

// `null` = the main SIWS website.
const PLAN: Record<string, Record<string, Entry>> = {
  main: {
    home: {
      title: 'SIWS School Wadala, Mumbai | KG to Junior College since 1934',
      replaceTitle: true,
    },
    about: { title: "About SIWS | South Indians' Welfare Society, Wadala, Mumbai" },
    history: { title: "Our History since 1934 | South Indians' Welfare Society" },
    admissions: {
      title: 'SIWS School Admissions in Wadala, Mumbai',
      description:
        'Admissions at SIWS, Wadala, Mumbai: the admission process for each SIWS school section, how to enquire, and who to contact at the admissions office.',
    },
    'admissions-faq': {
      title: 'SIWS Admissions FAQ | School & Junior College, Wadala',
      description:
        'Answers to common questions about admission to SIWS in Wadala, Mumbai: which classes, the Maharashtra State Board, how to apply and who to contact.',
    },
    contact: { title: 'Contact SIWS School, Wadala | Address, Phone & Email' },
    facilities: {
      title: 'Facilities & Campus | SIWS School, Wadala, Mumbai',
      description:
        'The SIWS campus in Wadala, Mumbai: classrooms, laboratories, sports and activity spaces across the Kindergarten, Primary, Secondary and Junior College.',
    },
    scholarships: { title: "Scholarships for Students | South Indians' Welfare Society" },
  },
  kindergarten: {
    home: { title: 'SIWS Kindergarten Wadala | Jr KG & Sr KG, Mumbai' },
    admissions: { title: 'Jr KG & Sr KG Admission in Wadala | SIWS Kindergarten' },
    'admissions-faq': { title: 'KG Admission FAQ: Age, Documents, Fees | SIWS Kindergarten' },
    about: { title: 'About SIWS Kindergarten, Wadala | Since 1934' },
    academics: { title: 'Jr KG & Sr KG Curriculum | SIWS Kindergarten, Wadala' },
    contact: { title: 'Contact SIWS Kindergarten, Wadala | Book a Campus Tour' },
  },
  primary: {
    home: { title: 'SIWS Primary School Wadala | Maharashtra State Board, Grades 1–4' },
    about: { title: 'About SIWS Primary School, Wadala | State Board, NEP 2020' },
    academics: { title: 'Primary Curriculum, Grades 1–4 | SIWS Primary School, Wadala' },
    contact: { title: 'Contact SIWS Primary School, Wadala | Admission Enquiries' },
  },
  secondary: {
    // SIWS asked (2026-09-01) that the Secondary Section not advertise admissions.
    home: { title: 'SIWS High School Wadala | SSC State Board School, Std V–X' },
    about: { title: 'About SIWS High School, Wadala | Maharashtra State Board' },
    academics: { title: 'Std V–X Curriculum | SIWS High School, Wadala (SSC Board)' },
    contact: { title: 'Contact SIWS High School, Wadala | Address & Phone' },
  },
  'junior-college': {
    home: {
      title: 'SIWS Junior College Wadala | Science & Commerce, XI–XII',
      description:
        'SIWS Junior College, Wadala, Mumbai: Science and Commerce for Standards XI and XII on the Maharashtra State Board (HSC) syllabus. Part of SIWS since 1934.',
    },
    admissions: { title: 'XI Admission, Science & Commerce | SIWS Junior College Wadala' },
    'admissions-faq': { title: 'Junior College Admission FAQ | SIWS Junior College, Wadala' },
    about: { title: 'About SIWS Junior College, Wadala | Science & Commerce' },
    academics: { title: 'Science & Commerce Subjects, XI–XII | SIWS Junior College' },
    contact: { title: 'Contact SIWS Junior College, Wadala | Admissions & Address' },
  },
}

const payload = await getPayload({ config })

const { docs: units } = await payload.find({ collection: 'units', limit: 20, depth: 0, overrideAccess: true })
const unitIdBySlug = new Map(units.map((unit) => [String(unit.slug), unit.id]))

let changed = 0
let skipped = 0
let failed = 0

for (const [site, pages] of Object.entries(PLAN)) {
  const unitId = site === 'main' ? null : unitIdBySlug.get(site)
  if (site !== 'main' && unitId === undefined) {
    console.log(`! ${site}: no such school, skipped`)
    continue
  }

  for (const [slug, entry] of Object.entries(pages)) {
    if (entry.title.length > 70) throw new Error(`Title over 70 characters: ${entry.title}`)
    if (entry.description && entry.description.length > 200)
      throw new Error(`Description over 200 characters: ${entry.description}`)

    const { docs } = await payload.find({
      collection: 'pages',
      where: {
        and: [
          { slug: { equals: slug } },
          unitId === null ? { unit: { exists: false } } : { unit: { equals: unitId } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const page = docs[0] as { id: number; metaTitle?: string | null; metaDescription?: string | null } | undefined
    const where = `${site === 'main' ? '' : `/${site}`}/${slug === 'home' ? '' : slug}`
    if (!page) {
      console.log(`- ${where}: no such page, skipped`)
      skipped++
      continue
    }

    const data: Record<string, string> = {}
    if (!page.metaTitle?.trim() || entry.replaceTitle) {
      if (page.metaTitle?.trim() !== entry.title) data.metaTitle = entry.title
    }
    if (entry.description && !page.metaDescription?.trim()) data.metaDescription = entry.description

    if (Object.keys(data).length === 0) {
      console.log(`= ${where}: already set, left alone`)
      skipped++
      continue
    }

    console.log(`${apply ? '+' : '~'} ${where}: ${Object.entries(data).map(([k, v]) => `${k} = "${v}"`).join('; ')}`)
    if (!apply) continue

    try {
      await payload.update({ collection: 'pages', id: page.id, data: data as never, overrideAccess: true })
      changed++
    } catch (error) {
      failed++
      console.log(`  ! could not save: ${(error as Error).message}`)
    }
  }
}

/*
 * One label, one destination. The Junior College header button "Enquire about
 * admission" goes to the enquiry form on Contact; the same words on the home
 * banner went to Admissions, which then sent people on to Contact. Pointed at
 * Contact, like the header.
 */
const jcId = unitIdBySlug.get('junior-college')
if (jcId !== undefined) {
  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ slug: { equals: 'home' } }, { unit: { equals: jcId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const home = docs[0] as { id: number; layout?: unknown } | undefined
  let fixes = 0
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    const label = typeof record.label === 'string' ? record.label.trim().toLowerCase() : ''
    if (label === 'enquire about admission') {
      for (const key of ['url', 'href']) {
        if (typeof record[key] === 'string' && /\/junior-college\/admissions\/?$/.test(record[key] as string)) {
          record[key] = '/junior-college/contact'
          fixes++
        }
      }
    }
    Object.values(record).forEach(walk)
  }
  if (home) {
    walk(home.layout)
    if (fixes === 0) console.log('= /junior-college: banner link already consistent')
    else {
      console.log(`${apply ? '+' : '~'} /junior-college: ${fixes} "Enquire about admission" link(s) → /junior-college/contact`)
      if (apply) {
        try {
          await payload.update({ collection: 'pages', id: home.id, data: { layout: home.layout } as never, overrideAccess: true })
          changed++
        } catch (error) {
          failed++
          console.log(`  ! could not save: ${(error as Error).message}`)
        }
      }
    }
  }
}

console.log(`\n${apply ? 'Saved' : 'Dry run —'} ${apply ? changed : 'nothing saved'}; ${skipped} left alone; ${failed} failed.`)
process.exit(failed > 0 ? 1 : 0)
