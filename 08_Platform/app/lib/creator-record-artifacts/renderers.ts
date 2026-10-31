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
 */

import type { FulfillmentSubmission } from '@/lib/payments/repository'
import { ARTIFACT_GENERATOR_VERSION } from './config'

export const CREATOR_RECORD_V1_FAMILY = 'creator_record_v1'

export interface CreatorRecordRenderer {
  readonly family: string
  /** Recorded on every row this renderer writes (insert or pending takeover). */
  readonly generator_version: string
  /** Whether a row recorded with `version` belongs to this family, so this renderer may resume it. */
  ownsGeneratorVersion(version: string): boolean
  /** Whether the pre-artifact legacy generator may issue for this family (rollout 'off' or not allowlisted). */
  readonly legacy_path_permitted: boolean
  render(sub: FulfillmentSubmission, recordId: string, issuedAt: Date): Promise<Uint8Array>
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

const REGISTRY: ReadonlyMap<string, CreatorRecordRenderer> = new Map([[V1_RENDERER.family, V1_RENDERER]])

export class UnsupportedProductFamilyError extends Error {
  constructor() {
    super('creator_record_product_family_unsupported')
  }
}

/** The submission's product family, from stored state only. Null when it is not a Creator Record. */
export function productFamilyFor(sub: Pick<FulfillmentSubmission, 'tier'>): string | null {
  // No product-version column exists yet: every stored Creator Record is v1.
  return sub.tier === 'creator_record' ? CREATOR_RECORD_V1_FAMILY : null
}

/** The registered renderer for a family. Throws `UnsupportedProductFamilyError` otherwise; never a default. */
export function rendererForFamily(family: string | null): CreatorRecordRenderer {
  const renderer = family === null ? undefined : REGISTRY.get(family)
  if (!renderer) throw new UnsupportedProductFamilyError()
  return renderer
}

/** The renderer for a stored submission. Throws `UnsupportedProductFamilyError` when there is none. */
export function selectCreatorRecordRenderer(sub: Pick<FulfillmentSubmission, 'tier'>): CreatorRecordRenderer {
  return rendererForFamily(productFamilyFor(sub))
}
