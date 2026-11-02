import path from 'path'
import { fileURLToPath } from 'url'

import { withPayload } from '@payloadcms/next/withPayload'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * Pinned explicitly. An unrelated `package-lock.json` in the user profile
   * directory made Turbopack infer a workspace root above this project, which
   * would change how modules and assets resolve.
   */
  turbopack: { root: dirname },

  images: {
    // BR-MED-03 / NFR-Performance: modern formats, sized for the breakpoints we
    // actually render at rather than Next's default ladder.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 200, 256, 384],
  },

  async headers() {
    return [
      {
        // NFR-Security. CSP is deliberately omitted here: it is issued per-request
        // from middleware with a nonce, because a static CSP cannot carry one.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            // 2.5 / 5.25: no ambient access to sensors or location, and
            // interest-cohort style profiling is refused outright.
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
      {
        /*
         * The banner film and the reels are several megabytes each and change
         * rarely. They were served with max-age=0, so every visit asked for
         * them again (SEO audit, 2026-10-21). A week, then re-checked; a file
         * replaced under the same name is picked up within that week.
         */
        source: '/:dir(hero|reels)/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      {
        // BR-MED-06 / FR-CAR-07: restricted media must never be cached by a
        // shared cache, and must never be indexed.
        source: '/api/protected-media/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
