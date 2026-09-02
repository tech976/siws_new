import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'

import { PostView } from '@/components/blocks/PostView'
import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { NewsTicker, type TickerItem } from '@/components/layout/NewsTicker'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import {
  getAnnouncements,
  getNavItems,
  getQuickLinks,
  getUnits,
  resolveRoute,
} from '@/lib/site'
import type { Announcement, Media, Page, Unit } from '@/payload-types'

/**
 * Turns announcement documents into the plain rows the ticker renders.
 *
 * Done on the server because working out an address needs the unit slug, and
 * because a client component cannot be handed a function to call — the first
 * attempt passed one and crashed every page with "Functions cannot be passed
 * directly to Client Components".
 */
const toTickerItems = (items: Announcement[], units: Unit[]): TickerItem[] =>
  items.map((item) => {
    const link = item.link
    let href: string | null = null

    if (link && typeof link === 'object' && 'value' in link) {
      const target = link.value
      if (target && typeof target === 'object') {
        const slug = 'slug' in target && typeof target.slug === 'string' ? target.slug : null
        if (slug) {
          const unitRef = 'unit' in target ? target.unit : null
          const unitSlug =
            typeof unitRef === 'object' && unitRef !== null && 'slug' in unitRef
              ? (unitRef.slug as string)
              : (units.find((u) => u.id === unitRef)?.slug ?? null)
          href = unitSlug ? `/${unitSlug}/${slug}` : `/${slug}`
        }
      }
    }

    return {
      id: String(item.id),
      message: item.message,
      tone: item.tone ?? 'news',
      href,
    }
  })

interface RouteProps {
  params: Promise<{ segments: string[] }>
}

/**
 * The single public route.
 *
 * One catch-all handles `/{unit}`, `/{unit}/{page}` and `/{page}` rather than
 * three overlapping route files. Next resolves overlapping dynamic segments by
 * specificity rules that are easy to get subtly wrong; with one entry point the
 * precedence between "unit" and "institution page" is explicit in
 * `resolveRoute` and testable on its own.
 */
const DynamicRoute = async ({ params }: RouteProps) => {
  const { segments } = await params
  const { isEnabled: draft } = await draftMode()

  const resolved = await resolveRoute(segments, draft)
  if (!resolved) notFound()

  const { unit, page, post, kind } = resolved
  const units = await getUnits()
  const navItems = await getNavItems(unit?.id ?? null, unit?.slug ?? null)
  const quickLinks = await getQuickLinks(unit?.id ?? null, unit?.slug ?? null)

  const footerUnits = units.map(({ id, slug, shortName }) => ({ id, slug, shortName }))
  const announcements = await getAnnouncements(unit?.id ?? null)

  return (
    <>
      <SiteHeader
        unit={unit}
        units={units}
        navItems={navItems}
        quickLinks={quickLinks}
        // The tagline now sits in the identity band, so repeating it in the
        // strip immediately beneath would say the same thing twice.
        infoText={null}
        /*
         * The enquiry page, not the unit home page.
         *
         * This pointed at `/${unit.slug}` — so on every unit site the header
         * button read "Enquire about admission" and reloaded the page the
         * visitor was already on. Worse on the home page itself, where it did
         * nothing visible at all.
         *
         * Taken from `quickLinks`, which is already loaded for the header and
         * only ever holds pages that exist and are published — so this cannot
         * point at a 404, and it costs no extra query. If a unit has no
         * contact page yet, it falls back to the old behaviour rather than
         * rendering a dead button.
         */
        /*
         * THE LABEL IS PER-SECTION, because one section does not offer this.
         *
         * SIWS asked on 2026-09-01 that the Secondary Section carry no
         * admission button anywhere. This button is in the header of every
         * page of every unit site, so it was the most persistent one on that
         * section by a distance — the hero button and the Admissions tab were
         * on one page each.
         *
         * The button itself STAYS on Secondary and only its wording changes.
         * It is the header's one route to Contact, and a section whose header
         * silently loses the affordance the other three have is a navigation
         * bug rather than a content decision. What SIWS objected to was the
         * section advertising an admissions process; "Contact us" does not,
         * and it goes to the same page the old label went to.
         */
        cta={
          unit
            ? {
                label: unit.slug === 'secondary' ? 'Contact us' : 'Enquire about admission',
                href:
                  quickLinks.find((l) => l.href === `/${unit.slug}/contact`)?.href ??
                  `/${unit.slug}`,
              }
            : null
        }
      />

      <NewsTicker items={toTickerItems(announcements, units)} />

      <main id="main-content">
        {/* A department write-up, laid out by the template its author chose. */}
        {kind === 'post' && post ? <PostView post={post} /> : null}

        {/* Only shown when a unit has no landing page published yet. */}
        {kind === 'unit-home' && unit && !page ? <UnitPlaceholder unit={unit} /> : null}

        {page ? (
          <>
            {/*
              A hero block carries its own H1, so rendering the page title above
              it too would put two H1s on the page and break the heading outline.
            */}
            {hasOwnHeading(page.layout, page.title) ? null : (
              <header className="siws-container pt-12 pb-2">
                <h1>{page.title}</h1>
                {page.intro ? (
                  <p className="mt-4 max-w-3xl text-lg text-ink-muted">{page.intro}</p>
                ) : null}
              </header>
            )}
            <RenderBlocks blocks={page.layout} unit={unit} units={units} />
          </>
        ) : null}
      </main>

      <SiteFooter unit={unit} quickLinks={navItems} units={footerUnits} />
    </>
  )
}

/**
 * Shown when a unit exists but has no landing page yet.
 *
 * Deliberately not a 404: the unit is real and its other pages work, so the
 * honest state is "nothing published here yet" rather than "does not exist".
 */
const UnitPlaceholder = ({ unit }: { unit: Unit }) => (
  <section className="siws-container py-16">
    <h1>{unit.name}</h1>
    {unit.description ? (
      <p className="mt-5 max-w-2xl text-lg text-ink-muted">{unit.description}</p>
    ) : null}
    <p className="mt-6 text-ink-muted">
      This school&rsquo;s home page has not been published yet.
    </p>
  </section>
)

/*
 * HOW OFTEN THIS PAGE GOES BACK TO THE DATABASE.
 *
 * Every page outside the home page is rendered here, and until this was set
 * there was nothing to re-render them: the content is read through Payload's
 * LOCAL API — a direct database call, not `fetch` — so Next has no request to
 * attach a cache lifetime to and treats the result as static for the life of
 * the build.
 *
 * The symptom was not a page that never updated, which somebody would have
 * questioned immediately. It was a page that updated when it was hard-reloaded
 * and reverted on the way back to it, because a soft navigation is served from
 * the router cache while a reload is not. That reads as "the changes keep
 * coming back", and it sent us looking at the database and the seeds — neither
 * of which was wrong.
 *
 * Sixty seconds, matching the home page. Content here is edited in a CMS and
 * read by parents; a minute is far below the threshold at which anybody
 * notices a stale page, and it keeps the database out of the path of every
 * request.
 */
export const revalidate = 60

export const generateMetadata = async ({ params }: RouteProps): Promise<Metadata> => {
  const { segments } = await params
  const resolved = await resolveRoute(segments)

  if (!resolved) return { title: 'Page not found' }

  const { unit, page, post, kind } = resolved

  /*
   * A write-up carries no `page`, so without this it would fall through to the
   * branch below and inherit the unit's title and description — every news item
   * in the school appearing in search results as "Primary School".
   */
  if (kind === 'post' && post) {
    return {
      title: post.title,
      description: post.summary ?? undefined,
      alternates: {
        canonical: unit?.slug ? `/${unit.slug}/${post.slug}` : `/${post.slug}`,
      },
      openGraph: {
        title: post.title,
        description: post.summary ?? undefined,
        type: 'article',
        publishedTime: post.date ?? undefined,
      },
    }
  }

  if (!page) {
    return {
      title: unit?.name ?? undefined,
      description: unit?.description ?? undefined,
      alternates: { canonical: unit?.slug ? `/${unit.slug}` : '/' },
    }
  }

  /**
   * A unit's landing page is served at `/{unit}`, so that — not
   * `/{unit}/home` — is its canonical address (BR-SEO-04).
   */
  const canonical =
    kind === 'unit-home' && unit?.slug
      ? `/${unit.slug}`
      : unit?.slug
        ? `/${unit.slug}/${page.slug}`
        : `/${page.slug}`
  const description = page.metaDescription || page.intro || unit?.description || undefined
  const shareImage = resolveShareImage(page, unit)

  return {
    title: page.metaTitle || page.title,
    description,
    // BR-SEO-04 — canonical URLs, and per-page indexing directives.
    alternates: { canonical },
    robots: page.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: page.metaTitle || page.title,
      description,
      url: canonical,
      type: 'article',
      ...(shareImage ? { images: [{ url: shareImage }] } : {}),
    },
  }
}

/**
 * True when the first section already renders the page's H1.
 *
 * Checked against the first block only: a hero further down the page would not
 * be acting as the page heading, so the title header still belongs above it.
 */
const hasOwnHeading = (layout: Page['layout'], title?: string): boolean => {
  const first = Array.isArray(layout) ? layout[0] : undefined
  if (!first) return false

  /*
   * A banner always carries the page's heading itself.
   *
   * `heroMarquee` was missing from this list, and the moment the section home
   * pages moved onto it the route began printing the page title above the
   * banner — "SIWS Primary School" in plain type, immediately above a banner
   * already saying it. The block renders its own h1 exactly as `hero` does.
   */
  if (
    first.blockType === 'heroEnquiry' ||
    first.blockType === 'hero' ||
    first.blockType === 'heroMarquee'
  )
    return true

  /*
   * A first section whose heading is the page title is also the page's
   * heading, whatever kind of block it is.
   *
   * Without this the route printed the title above a section that already said
   * the same thing — "Our History" immediately above "Our History". The check
   * is on the heading rather than on a list of block types, so it holds for
   * any block an editor happens to start a page with.
   */
  const heading = (first as { heading?: unknown }).heading
  if (typeof heading !== 'string' || typeof title !== 'string') return false
  return heading.trim().toLowerCase() === title.trim().toLowerCase()
}

/** Page share image, falling back to the unit hero (BR-SEO-05). */
const resolveShareImage = (page: Page, unit: Unit | null): string | null => {
  const candidates: unknown[] = [page.ogImage, unit?.heroImage, unit?.logo]

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const media = candidate as Media
      // Prefer the 1200×630 derivative generated for social platforms.
      const og = media.sizes?.og?.url
      if (typeof og === 'string' && og.length > 0) return og
      if (typeof media.url === 'string' && media.url.length > 0) return media.url
    }
  }

  return null
}

export default DynamicRoute
