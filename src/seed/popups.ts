import fs from 'fs'
import os from 'os'
import path from 'path'

import sharp from 'sharp'

import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')
const { richText } = await import('./lexical')

/**
 * One placeholder popup per website — the main SIWS site and each school — so
 * the popup works out of the box and the school only has to swap in its own
 * picture and words (Admin → Content → Popups).
 *
 * Safe to re-run: a website that already has a popup (published or draft) is
 * left alone, so this never overwrites what the school has written. Deleting a
 * website's popup and re-running this brings the placeholder back.
 *
 * Run with:  npm run seed:popups
 */

const payload = await getPayload({ config })

const placeholderImage = async (siteName: string, slug: string): Promise<string> => {
  const file = path.join(os.tmpdir(), `popup-placeholder-${slug}.png`)
  // 4:3, with everything inside the area that survives both crops the popup
  // makes: square-ish beside the text on desktop, 16:9 above it on phones.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <rect width="1200" height="900" fill="#dbecff"/>
      <rect x="180" y="140" width="840" height="620" rx="28" fill="none" stroke="#2e3192"
            stroke-width="4" stroke-dasharray="18 14"/>
      <circle cx="600" cy="330" r="54" fill="#ffaf2a"/>
      <path d="M572 352 l18-24 14 16 10-12 16 20z" fill="#2e3192"/>
      <circle cx="584" cy="312" r="8" fill="#2e3192"/>
      <g fill="#2e3192" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
        <text x="600" y="460" font-size="56" font-weight="700">Popup image</text>
        <text x="600" y="520" font-size="34">${siteName}</text>
        <text x="600" y="600" font-size="24" fill="#5c5c68">Replace in Admin → Content → Popups</text>
        <text x="600" y="636" font-size="24" fill="#5c5c68">Recommended size 1200 × 900</text>
      </g>
    </svg>`
  await sharp(Buffer.from(svg)).png().toFile(file)
  return file
}

const { docs: units } = await payload.find({
  collection: 'units',
  depth: 0,
  limit: 20,
  sort: 'id',
  overrideAccess: true,
})

const sites: { name: string; slug: string; unitId: number | null; link: string }[] = [
  { name: 'SIWS main website', slug: 'siws', unitId: null, link: '/' },
  ...units.map((unit) => ({
    name: String(unit.shortName || unit.name),
    slug: String(unit.slug),
    unitId: unit.id as number,
    link: `/${unit.slug}`,
  })),
]

for (const site of sites) {
  const existing = await payload.find({
    collection: 'popups',
    where: site.unitId === null ? { unit: { exists: false } } : { unit: { equals: site.unitId } },
    draft: true,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  if (existing.totalDocs > 0) {
    console.log(`- ${site.name}: already has a popup, left as it is.`)
    continue
  }

  const filePath = await placeholderImage(site.name, site.slug)
  const image = await payload.create({
    collection: 'media',
    data: {
      alt: `Placeholder popup image for ${site.name}`,
      ...(site.unitId ? { unit: site.unitId } : {}),
      showInGallery: false,
      depictsChildren: false,
    } as never,
    filePath,
    overrideAccess: true,
  })
  fs.rmSync(filePath, { force: true })

  await payload.create({
    collection: 'popups',
    data: {
      title: `Placeholder – ${site.name}`,
      unit: site.unitId ?? undefined,
      showOn: 'home',
      delaySeconds: 3,
      frequency: 'always',
      image: image.id,
      heading: `${site.name} — popup heading`,
      content: richText([
        'This is placeholder text for the popup. Replace this message and the image above from the admin panel: Content → Popups.',
      ]),
      button: { label: 'Button text', url: site.link },
      _status: 'published',
    } as never,
    overrideAccess: true,
  })
  console.log(`+ ${site.name}: placeholder popup created and published.`)
}

process.exit(0)
