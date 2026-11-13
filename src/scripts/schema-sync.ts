/**
 * Brings the live database's tables up to date with the collections, before a
 * deploy builds the new code. Run by `scripts/deploy.sh`.
 *
 * Starting Payload with schema push switched on adds any new tables and
 * columns. If the change would DELETE data (a removed field, a renamed
 * column), Payload asks for confirmation; with no one to answer it exits
 * without changing anything, "SCHEMA-SYNC-OK" is never printed, and the deploy
 * stops before the build, so the site keeps running the previous version.
 */
import { loadEnv } from '@/utilities/load-env'

loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('@payload-config')

await getPayload({ config })
console.log('SCHEMA-SYNC-OK')
process.exit(0)
