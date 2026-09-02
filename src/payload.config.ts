import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { emailAdapter } from './lib/email'

import { Announcements } from './collections/Announcements'
import { AuditLogs } from './collections/AuditLogs'
import { Enquiries } from './collections/Enquiries'
import { Feedback } from './collections/Feedback'
import { Faculty } from './collections/Faculty'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Units } from './collections/Units'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export default buildConfig({
  serverURL,

  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: ' · SIWS Admin',
      description: 'Content management for the SIWS school website.',
    },

    /**
     * Both approved reference designs are light-canvas, and the brand rail is
     * built for a light content area. Pinning the theme means a staff member
     * whose operating system is set to dark mode still gets the design that was
     * signed off, rather than an unreviewed dark variant.
     */
    theme: 'light',

    components: {
      /**
       * Replaces Payload's default collection grid.
       *
       * Component strings resolve through `src/app/(payload)/admin/importMap.js`
       * — if that map is stale, Payload logs an error and silently falls back to
       * the default view, so `generate:importmap` must run after any change here.
       */
      views: {
        dashboard: { Component: '@/components/admin/Dashboard#Dashboard' },
      },
      graphics: {
        Logo: '@/components/admin/Branding#Logo',
        Icon: '@/components/admin/Branding#Icon',
      },
      beforeNavLinks: ['@/components/admin/Branding#NavBrand'],
      // `afterNavLinks` places the card above the logout row; `afterNav` would
      // put it below, where it reads as detached from the menu.
      afterNavLinks: ['@/components/admin/Branding#NavFooterCard'],
      beforeLogin: ['@/components/admin/Branding#LoginIntro'],
    },
  },

  collections: [
    Posts,
    Announcements,
    Pages,
    Faculty,
    Media,
    Enquiries,
    Feedback,
    Units,
    Users,
    AuditLogs,
  ],

  editor: lexicalEditor(),

  /*
   * Undefined unless SMTP_* is set, which leaves Payload on its console
   * transport — see `lib/email.ts` for why that default is the dangerous one
   * and why it is still the default.
   */
  email: emailAdapter(),

  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
    /**
     * Development reconciles the schema on boot; production does not, so a
     * schema change can never surprise the live database.
     *
     * The escape hatch exists because this project has no `src/migrations/`
     * yet, and without it the only way to add a table to the live database is
     * to improvise during a deploy. It is off unless someone sets the variable
     * for a single run, and the deployment guide says to unset it immediately
     * afterwards. Additive changes — a new collection, a new field — are what
     * it is for; anything that drops or narrows a column still wants a
     * reviewed migration.
     */
    push:
      process.env.NODE_ENV !== 'production' ||
      process.env.PAYLOAD_ALLOW_SCHEMA_PUSH === 'true',
  }),

  sharp,

  secret: process.env.PAYLOAD_SECRET || '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  /**
   * The SRS specifies no GraphQL surface. Disabling it removes an entire public
   * endpoint (and its introspection) from the attack surface and cuts build
   * time; the REST and Local APIs cover every requirement in the document.
   */
  graphQL: { disable: true },

  // NFR Security — CSRF. Only our own origin may submit authenticated requests.
  cors: [serverURL],
  csrf: [serverURL],

  /**
   * Phase 2 (multi-language) turns on here with a `localization` block and
   * `localized: true` on the relevant fields — no structural change required
   * (SRS 1.2, Delivery phases).
   */
})
