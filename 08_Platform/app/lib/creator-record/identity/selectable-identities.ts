/**
 * CR-V2-EVIDENCE-SLICE-1 — selectable tool and asset-provider identities for
 * the Creator Record questionnaire.
 *
 * Four concerns are kept apart, deliberately:
 *   - IDENTITY: which tools / providers exist and their stable identifiers.
 *     Taken ONLY from the canonical registries (`CANONICAL_TOOL_IDS`,
 *     `ASSET_PROVIDER_IDS`). Nothing here adds, removes or derives an
 *     identity — and nothing is derived from any publication ledger (pilot or
 *     governed), so an option is offered whether or not SI8 holds guidance.
 *   - DISPLAY LABELS: the human-readable name shown in the dropdown. Product
 *     presentation only; they never resolve anything and are typed exhaustive
 *     over the registries, so a newly registered identity fails to compile
 *     until it has a label.
 *   - ALIASES: free-text name resolution stays in
 *     `lib/interview-engine/extraction.ts`, unchanged and not used here.
 *   - GUIDANCE ELIGIBILITY: decided later by the publication ledger at
 *     assembly. The dropdown shows no hint of it.
 *
 * Ambiguous identities are offered as their distinct registered identities
 * (e.g. the two Gemini access surfaces); there is no generic option that
 * would have to be mapped to one of them.
 */

import { CANONICAL_TOOL_IDS, type CanonicalToolId } from '@/lib/tool-identity/registry'
import { ASSET_PROVIDER_IDS, type AssetProviderId } from '@/types/interview-engine'
import { NOT_SURE } from '../contract/question-registry'

/** Option code for "My tool isn't listed". Record-only: it never attaches to an identity. */
export const OTHER_TOOL = 'other_tool'
/** Option code for "My service isn't listed". Record-only. */
export const OTHER_PROVIDER = 'other_provider'

export const TOOL_DISPLAY_LABELS: Readonly<Record<CanonicalToolId, string>> = {
  'runway-gen3': 'Runway',
  kling: 'Kling',
  elevenlabs: 'ElevenLabs',
  'gemini-api': 'Gemini API (developer access)',
  'gemini-consumer-app': 'Gemini app (consumer)',
  pika: 'Pika',
  midjourney: 'Midjourney',
  'google-veo': 'Google Veo',
  'adobe-firefly': 'Adobe Firefly',
  'openai-sora': 'OpenAI Sora',
  synthesia: 'Synthesia',
  luma: 'Luma Dream Machine',
  suno: 'Suno',
  'stability-ai': 'Stability AI',
  higgsfield: 'Higgsfield',
}

export const ASSET_PROVIDER_DISPLAY_LABELS: Readonly<Record<AssetProviderId, string>> = {
  getty: 'Getty Images',
  istock: 'iStock',
  shutterstock: 'Shutterstock',
  'adobe-stock': 'Adobe Stock',
  artlist: 'Artlist',
  storyblocks: 'Storyblocks',
  pond5: 'Pond5',
  'envato-elements': 'Envato Elements',
  'epidemic-sound': 'Epidemic Sound',
}

const byLabel = <K extends string>(ids: readonly K[], labels: Readonly<Record<K, string>>): K[] =>
  [...ids].sort((a, b) => labels[a].localeCompare(labels[b], 'en'))

/** Every registered tool, alphabetical by label, then "not listed" and "not sure". */
export const TOOL_OPTION_CODES: readonly string[] = [...byLabel(CANONICAL_TOOL_IDS, TOOL_DISPLAY_LABELS), OTHER_TOOL, NOT_SURE]
/** Every registered asset provider, alphabetical by label, then "not listed" and "not sure". */
export const ASSET_PROVIDER_OPTION_CODES: readonly string[] = [...byLabel(ASSET_PROVIDER_IDS, ASSET_PROVIDER_DISPLAY_LABELS), OTHER_PROVIDER, NOT_SURE]

export const TOOL_OPTION_LABELS: Readonly<Record<string, string>> = {
  ...TOOL_DISPLAY_LABELS,
  [OTHER_TOOL]: 'My tool isn’t listed',
  [NOT_SURE]: 'Not sure',
}
export const ASSET_PROVIDER_OPTION_LABELS: Readonly<Record<string, string>> = {
  ...ASSET_PROVIDER_DISPLAY_LABELS,
  [OTHER_PROVIDER]: 'My service isn’t listed',
  [NOT_SURE]: 'Not sure',
}

export const CANONICAL_TOOL_ID_LIST: readonly string[] = CANONICAL_TOOL_IDS
export const CANONICAL_ASSET_PROVIDER_ID_LIST: readonly string[] = ASSET_PROVIDER_IDS

/** Display label for a canonical tool or provider id; the id itself when unknown. */
export function identityLabel(id: string): string {
  if (Object.prototype.hasOwnProperty.call(TOOL_DISPLAY_LABELS, id)) return TOOL_DISPLAY_LABELS[id as CanonicalToolId]
  if (Object.prototype.hasOwnProperty.call(ASSET_PROVIDER_DISPLAY_LABELS, id)) return ASSET_PROVIDER_DISPLAY_LABELS[id as AssetProviderId]
  return id
}
