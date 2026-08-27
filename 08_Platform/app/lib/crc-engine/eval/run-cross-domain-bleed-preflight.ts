/**
 * CLI runner for the Cross-Domain Bleed Preflight
 * (lib/crc-engine/cross-domain-bleed-preflight.ts). Evaluates a candidate
 * asset-provider ID + aliases against the REAL, committed
 * `TOPIC_CLAIMS_FIXTURE` -- run this BEFORE registering any provider in
 * `ASSET_PROVIDER_IDS`/`KNOWN_ASSET_PROVIDERS`. Read-only: never mutates
 * the fixture, the governed ledger, or any registry.
 *
 * Usage:
 *   npx tsx lib/crc-engine/eval/run-cross-domain-bleed-preflight.ts <provider-id> [alias1,alias2,...]
 *
 * Example (illustrative only -- not an instruction to register anything):
 *   npx tsx lib/crc-engine/eval/run-cross-domain-bleed-preflight.ts envato-elements envato,envato-elements
 */

import * as path from 'path'
import { runCrossDomainBleedPreflight, renderPreflightReport } from '../cross-domain-bleed-preflight'
import { TOPIC_CLAIMS_FIXTURE } from '@/lib/retrieval-engine/topic-claims-fixture'

function main(): void {
  const [providerId, aliasArg] = process.argv.slice(2)
  if (!providerId) {
    console.error('Usage: run-cross-domain-bleed-preflight.ts <provider-id> [alias1,alias2,...]')
    process.exitCode = 1
    return
  }
  const aliases = aliasArg ? aliasArg.split(',').map((a) => a.trim()).filter(Boolean) : []
  const appRoot = path.resolve(__dirname, '..', '..', '..')
  const report = runCrossDomainBleedPreflight(providerId, aliases, TOPIC_CLAIMS_FIXTURE, appRoot)
  console.log(renderPreflightReport(report))
  if (!report.complete) process.exitCode = 2
}

main()
