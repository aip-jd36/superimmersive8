/**
 * CR-OPTION-C-OC2A — the Creator Record renderer registry.
 *
 * Every issuance entry point (payment fulfilment, the hourly recovery sweep and
 * admin reconciliation, which all run `runPaymentFulfillment`, and the admin
 * generation retry route) selects the renderer here, from the stored
 * submission only. The selection is server-authoritative: nothing a request
 * sends can name a renderer, a family or a generator version.
 *
 * Contract:
 *   - A renderer declares its product family, the generator version it records
 *     on new rows, which recorded generator versions belong to its family, and
 *     whether the pre-artifact legacy generator may issue for its family.
 *   - The family is resolved from the stored submission. There is no product-
 *     version column yet, so every stored Creator Record resolves to v1.
 *   - An unknown or unregistered family FAILS CLOSED
 *     (`UnsupportedProductFamilyError`): nothing is rendered, stored or issued,
 *     on either path. There is no default and no fallback to v1.
 *   - A pending row is resumed only by the renderer of its own family; a row
 *     recorded by another family is refused (see `./issue`).
 *
 * Only the v1 renderer is registered. Adding a family is a reviewed code change.
 *
 * CR-V2-MVP-M2: a submission marked as Creator Record v2 resolves to the v2 family, which is refused
 * here while v2 issuance is stopped (`CREATOR_RECORD_V2_ISSUANCE`, the default).
 *
 * CR-V2-MVP-M3: the marker is persisted (`submissions.creator_record_product`, set only by the database
 * bind function) and the v2 renderer is registered. It is reachable only when issuance is 'enabled'. It
 * never permits the legacy generator, records its own generator version, and resumes only rows of that
 * version (a v1 row is never completed by it, nor a v2 row by the v1 renderer). Its body re-verifies the
 * bound record and governance eligibility before rendering (the customer-flow purchase module, via
 * `@/lib/creator-record-flow/production`; this module never imports the creator-record module directly).
 */

import type { FulfillmentSubmission } from '@/lib/payments/repository'
import { ARTIFACT_GENERATOR_VERSION, CREATOR_RECORD_V2_ISSUANCE, type V2IssuanceMode } from './config'

export const CREATOR_RECORD_V1_FAMILY = 'creator_record_v1'
export const CREATOR_RECORD_V2_FAMILY = 'creator_record_v2'

export interface CreatorRecordRenderer {
  readonly family: string
  /** Recorded on every row this renderer writes (insert or pending takeover). */
  readonly generator_version: string
  /** Whether a row recorded with `version` belongs to this family, so this renderer may resume it. */
  ownsGeneratorVersion(version: string): boolean
  /** Whether the pre-artifact legacy generator may issue for this family (rollout 'off' or not allowlisted). */
  readonly legacy_path_permitted: boolean
  render(sub: FulfillmentSubmission, recordId: string, issuedAt: Date): Promise<Uint8Array>
  /** CR-V2-MVP-ELIGIBILITY-1: when present, throws unless this submission may be issued now. Run on every path, including a resumed attempt. */
  authorize?(sub: FulfillmentSubmission, issuedAt: Date): Promise<void>
  /** CR-V2-MVP-CUTOVER-PREP-1: a missing-object pending row is re-rendered only by the generator that recorded it (see `./issue`). */
  readonly rerenderOnlySameGenerator?: boolean
}

/** Every version the v1 renderer has recorded: legacy-creator-record-pdf-v1, -v2 and -v3 (current). */
const V1_GENERATOR_VERSION = /^legacy-creator-record-pdf-v[1-9][0-9]*$/

const V1_RENDERER: CreatorRecordRenderer = Object.freeze({
  family: CREATOR_RECORD_V1_FAMILY,
  generator_version: ARTIFACT_GENERATOR_VERSION,
  ownsGeneratorVersion: (version: string) => V1_GENERATOR_VERSION.test(version),
  legacy_path_permitted: true,
  // Loaded on first render only, so that selecting a renderer never loads the PDF library.
  render: async (sub: FulfillmentSubmission, recordId: string, issuedAt: Date) => (await import('./render')).renderCreatorRecordPdf(sub, recordId, issuedAt),
})

/** CR-V2-MVP-M3: recorded on every v2 artifact row. */
/** CR-V2-ISSUER-DISPLAY-1: v2 = the customer PDF no longer prints a reading's issuer. Artifacts issued as v1 are unchanged. */
export const CREATOR_RECORD_V2_GENERATOR_VERSION = 'creator-record-v2-pdf-v2'
const V2_GENERATOR_VERSION = /^creator-record-v2-pdf-v[1-9][0-9]*$/

const V2_RENDERER: CreatorRecordRenderer = Object.freeze({
  family: CREATOR_RECORD_V2_FAMILY,
  generator_version: CREATOR_RECORD_V2_GENERATOR_VERSION,
  ownsGeneratorVersion: (version: string) => V2_GENERATOR_VERSION.test(version),
  legacy_path_permitted: false,
  // CR-V2-MVP-CUTOVER-PREP-1: across a template cutover (with a generator bump) a pending row is never silently re-rendered under the new
  // templates; it is refused and left for reconciliation. The v1 family keeps its existing re-render-on-takeover behaviour.
  rerenderOnlySameGenerator: true,
  // Loaded on first render only. Throws (nothing rendered or stored) unless the bound record verifies and is eligible.
  render: async (sub: FulfillmentSubmission, recordId: string, issuedAt: Date) =>
    (await import('@/lib/creator-record-flow/production')).renderCreatorRecordV2Pdf(
      { id: sub.id, user_id: sub.user_id, tier: sub.tier, creator_record_product: sub.creator_record_product ?? null }, recordId, issuedAt),
  authorize: async (sub: FulfillmentSubmission, issuedAt: Date) =>
    (await import('@/lib/creator-record-flow/production')).authorizeCreatorRecordV2Issuance(
      { id: sub.id, user_id: sub.user_id, tier: sub.tier, creator_record_product: sub.creator_record_product ?? null }, issuedAt),
})

const REGISTRY: ReadonlyMap<string, CreatorRecordRenderer> = new Map([[V1_RENDERER.family, V1_RENDERER], [V2_RENDERER.family, V2_RENDERER]])

export class UnsupportedProductFamilyError extends Error {
  constructor() {
    super('creator_record_product_family_unsupported')
  }
}

/** CR-V2-MVP-M2: v2 issuance is stopped. A kind of unsupported family, so every existing fail-closed path applies. */
export class CreatorRecordIssuanceStoppedError extends UnsupportedProductFamilyError {
  constructor() {
    super()
    this.message = 'creator_record_v2_issuance_stopped'
  }
}

/** The submission's product family, from stored state only. Null when it is not a Creator Record. */
export function productFamilyFor(sub: Pick<FulfillmentSubmission, 'tier' | 'creator_record_product'>): string | null {
  if (sub.tier !== 'creator_record') return null
  const product = sub.creator_record_product
  // No marker (every existing and V1 submission) is v1. A marker other than 'v2' is unknown and fails closed.
  if (product === undefined || product === null) return CREATOR_RECORD_V1_FAMILY
  return product === 'v2' ? CREATOR_RECORD_V2_FAMILY : null
}

/** The registered renderer for a family. Throws `UnsupportedProductFamilyError` otherwise; never a default. */
export function rendererForFamily(family: string | null, v2Issuance: V2IssuanceMode = CREATOR_RECORD_V2_ISSUANCE): CreatorRecordRenderer {
  if (family === CREATOR_RECORD_V2_FAMILY && v2Issuance !== 'enabled') throw new CreatorRecordIssuanceStoppedError()
  const renderer = family === null ? undefined : REGISTRY.get(family)
  if (!renderer) throw new UnsupportedProductFamilyError()
  return renderer
}

/** The renderer for a stored submission. Throws `UnsupportedProductFamilyError` when there is none. */
export function selectCreatorRecordRenderer(sub: Pick<FulfillmentSubmission, 'tier' | 'creator_record_product'>): CreatorRecordRenderer {
  return rendererForFamily(productFamilyFor(sub))
}
