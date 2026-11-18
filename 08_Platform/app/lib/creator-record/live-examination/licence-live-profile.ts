/**
 * CR-DOC-READER-EXT-2 — the model-read side of the licence/permission profile. DEFINED, INACTIVE.
 *
 * Not in `LIVE_PROFILE_REGISTRY`, so the customer live path refuses it (`profile_not_registered`) even if asked. No real model
 * caller exists for it: the real executor's Anthropic caller and its request check are bound to the receipt instructions, so a live
 * licence reading would need its own caller (a separate, approval-gated step with paid evaluation). Tests use it with a mock
 * executor only. Its limitations are a subset of the live vocabulary.
 */
import { licenceLimitations, licenceObservations, LICENCE_PROFILE_ID, LICENCE_PROFILE_VERSION, LICENCE_READING_CONTRACT } from '../examination/licence-profile'
import { LICENCE_PROMPT_VERSION } from '../licence-examination/prompt'
import { LICENCE_EXTRACTION_SCHEMA_VERSION } from '../licence-examination/schema'
import { examineWithContract } from '../receipt-examination/examine'
import type { LiveLimitation } from './envelope'
import type { LiveExaminationProfile } from './examine'

export const LICENCE_LIVE_PROFILE_INACTIVE: LiveExaminationProfile = {
  ref: { id: LICENCE_PROFILE_ID, version: LICENCE_PROFILE_VERSION, schema: LICENCE_EXTRACTION_SCHEMA_VERSION, prompt: LICENCE_PROMPT_VERSION },
  media_types: ['application/pdf', 'image/png', 'image/jpeg'],
  async read(bytes, callModel) {
    const outcome = await examineWithContract(bytes, { callModel, contract: LICENCE_READING_CONTRACT })
    if (outcome.status !== 'examined') return { status: 'could_not_examine', reason: outcome.reason, usage: outcome.usage }
    return { status: 'examined', observations: licenceObservations(outcome.extraction), limitations: licenceLimitations(outcome.extraction) as LiveLimitation[], usage: outcome.usage }
  },
}
