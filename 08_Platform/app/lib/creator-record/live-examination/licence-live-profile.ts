/**
 * CR-DOC-READER-EXT-2 — the model-read side of the licence/permission profile. INACTIVE BY DEFAULT.
 *
 * Never in `LIVE_PROFILE_REGISTRY` (the fixed evaluation runner's registry). CR-DOC-READER-EXT-5A: the customer live path adds it
 * (`customerLiveProfileRegistry`) only while licence reading is enabled; otherwise a licence request is refused
 * (`profile_not_registered`). The real executor reads it with the licence reading contract (CR-DOC-READER-EXT-3 caller); the paid
 * evaluation of that caller has NOT been run. Its limitations are a subset of the live vocabulary.
 */
import { licenceLimitations, licenceObservations, LICENCE_PROFILE_ID, LICENCE_PROFILE_VERSION, LICENCE_READING_CONTRACT } from '../examination/licence-profile'
import { LICENCE_PROMPT_VERSION } from '../licence-examination/prompt'
import { LICENCE_EXTRACTION_SCHEMA_VERSION } from '../licence-examination/schema'
import { examineWithContract } from '../receipt-examination/examine'
import type { LiveLimitation } from './envelope'
import { profileKey } from '../examination/profile'
import { LIVE_PROFILE_REGISTRY, type LiveExaminationProfile } from './examine'

export const LICENCE_LIVE_PROFILE_INACTIVE: LiveExaminationProfile = {
  ref: { id: LICENCE_PROFILE_ID, version: LICENCE_PROFILE_VERSION, schema: LICENCE_EXTRACTION_SCHEMA_VERSION, prompt: LICENCE_PROMPT_VERSION },
  media_types: ['application/pdf', 'image/png', 'image/jpeg'],
  async read(bytes, callModel) {
    const outcome = await examineWithContract(bytes, { callModel, contract: LICENCE_READING_CONTRACT })
    if (outcome.status !== 'examined') return { status: 'could_not_examine', reason: outcome.reason, usage: outcome.usage }
    return { status: 'examined', observations: licenceObservations(outcome.extraction), limitations: licenceLimitations(outcome.extraction) as LiveLimitation[], usage: outcome.usage }
  },
}

/**
 * CR-DOC-READER-EXT-5A: the profiles a CUSTOMER live examination may run. `LIVE_PROFILE_REGISTRY` (receipt alone) unless licence
 * reading is enabled (`licenceReadingEnabled`), when the licence profile is added. The fixed evaluation runner keeps
 * `LIVE_PROFILE_REGISTRY` itself. The real executor reads each profile with that profile's own reading contract.
 */
export function customerLiveProfileRegistry(licenceEnabled: boolean): ReadonlyMap<string, LiveExaminationProfile> {
  if (!licenceEnabled) return LIVE_PROFILE_REGISTRY
  return new Map([...LIVE_PROFILE_REGISTRY, [profileKey(LICENCE_LIVE_PROFILE_INACTIVE.ref), LICENCE_LIVE_PROFILE_INACTIVE]])
}
