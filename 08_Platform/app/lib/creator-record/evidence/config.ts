/**
 * CR-V2-EVIDENCE-SLICE-1 — the live-extraction gate.
 *
 * TWO locks, both required for live model examination:
 *   1. CODE LOCK (CR-V2-EVIDENCE-PROD-UAT-1): `LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD`
 *      is `false`. While it is false, NO environment setting, request field or
 *      fallback can enable live examination: the build is fixture-replay only.
 *      Lifting it requires a reviewed code change and a separate PM decision
 *      (paid calls, model-provider data terms, consent wording, spend limit).
 *   2. ENVIRONMENT: `CREATOR_RECORD_LIVE_EXTRACTION` set to exactly `enabled`.
 * The request never chooses the mode.
 */

import type { ExtractionMode } from './document-observations'

export const LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD: boolean = false
export const LIVE_EXTRACTION_ENV = 'CREATOR_RECORD_LIVE_EXTRACTION'
export const LIVE_EXTRACTION_ENABLED_VALUE = 'enabled'

export function liveExtractionEnabled(env: Readonly<Record<string, string | undefined>> = process.env, permitted: boolean = LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD): boolean {
  return permitted === true && env[LIVE_EXTRACTION_ENV] === LIVE_EXTRACTION_ENABLED_VALUE
}

export function extractionMode(env: Readonly<Record<string, string | undefined>> = process.env, permitted: boolean = LIVE_EXTRACTION_PERMITTED_IN_THIS_BUILD): ExtractionMode {
  return liveExtractionEnabled(env, permitted) ? 'live_model' : 'fixture_replay'
}
