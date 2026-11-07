/**
 * CR-V2-DOC-LIVE-1A — the closed contract for a MODEL-READ examination (envelope v3), beside the replay envelope (v2, `../examination/envelope`).
 *
 * Pure (no Node API, no I/O). Nothing in this file calls a model, and no production code runs a v3 examination.
 *
 * Separation, on purpose:
 *   - `parseExaminationEnvelope` (v2) refuses v3, so a v3 envelope cannot reach a projection, a record, a PDF, guidance or
 *     eligibility. Those read v2 only. Connecting v3 to them is a later, separate decision.
 *   - `parseLiveEnvelope` (v3) refuses v2, and refuses the replay limitation, so recorded test data cannot pass as model output.
 *   - The origin is stated at every level and must agree: `execution_origin`, `executor.mode`, each observation's `origin`, the
 *     content class and the limitations. `mock_test` is bound to a test provider, a test model and synthetic fixtures, so mocked
 *     output cannot be mistaken for a real reading; `live_model` cannot name them.
 *
 * Evidence only: an observation is what a document appears to show (`not_verified`). It changes no declaration, establishes no
 * right or clearance, creates no guidance and satisfies no dependency.
 *
 * Identity: `examination_key` is an EXECUTION key over the document, its bytes, the profile and the executor. A model is not
 * deterministic, so unlike the replay key it does not fix the output: `executed_at` and the reading are outside it, and the retry
 * policy (`./examine`) decides what may be stored under it.
 */

import type { EvidenceMediaType } from '../evidence-intake/vocabulary'
import { canonicalJson, sha256Hex } from '../record-core/canonical'
import { OBSERVATION_BASES, OBSERVATION_STATUSES, type ObservationBasis, type ObservationStatus, type ProfileRef, type WorkflowAuthorization } from '../examination/envelope'

export const LIVE_EXAMINATION_ENVELOPE = { id: 'si8/creator-record-v2-examination', version: 3 } as const

export const LIVE_ORIGINS = ['live_model', 'mock_test'] as const
export type LiveOrigin = (typeof LIVE_ORIGINS)[number]

/** What is fixed for each origin. Nothing mixes: every value is checked against the origin the envelope states. */
export const LIVE_ORIGIN_RULES = {
  live_model: { providers: ['anthropic'], content_class: 'customer_document', observation_origin: 'live_model_extracted' },
  mock_test: { providers: ['test_double'], content_class: 'known_synthetic_fixture', observation_origin: 'mock_test_double' },
} as const

/** The one model name a mocked examination may carry. */
export const MOCK_MODEL = 'mock-model-test-only'
/** What marks a name or an id as a test double, wherever it appears. */
const TEST_MARK = /mock|test|fixture|synthetic|double/i
const MOCK_RESPONSE_ID = /^mock-/

export interface LiveExecutorIdentity {
  mode: LiveOrigin
  provider: string
  model: string
}

export const LIVE_LIMITATIONS = [
  'mock_test_data_not_model_output',
  'observations_not_verified',
  'no_location_reference',
  'fields_not_established',
  'single_plan_reading_does_not_exclude_others',
  'multiple_plans_shown',
  'instruction_like_text_present',
  'not_a_billing_document',
  'partially_legible',
  'illegible',
] as const
export type LiveLimitation = (typeof LIVE_LIMITATIONS)[number]

/** Why an examination that ran produced no reading. The engine's own reasons, with its `model_error` told apart. */
export const LIVE_FAILURE_REASONS = ['unsupported_format', 'file_too_large', 'empty_file', 'model_timeout', 'provider_failure', 'structured_output_missing', 'schema_invalid'] as const
export type LiveFailureReason = (typeof LIVE_FAILURE_REASONS)[number]
/** Another attempt could give a different answer. The others depend only on the file. */
export const LIVE_RETRYABLE_REASONS: readonly LiveFailureReason[] = ['model_timeout', 'provider_failure', 'structured_output_missing', 'schema_invalid']

export interface LiveObservation {
  observation_id: string
  field: string
  qualifier: string | null
  basis: ObservationBasis
  status: ObservationStatus
  value: string | null
  excerpt: string | null
  source: { document_sha256: string; location: null }
  verification: 'not_verified'
  origin: (typeof LIVE_ORIGIN_RULES)[LiveOrigin]['observation_origin']
}

export interface LiveEnvelope {
  envelope: typeof LIVE_EXAMINATION_ENVELOPE
  examination_key: string
  identity: 'execution_key'
  execution_origin: LiveOrigin
  /** Server time the attempt finished. Outside the key. */
  executed_at: string
  document: { document_id: string; sha256: string; media_type: EvidenceMediaType; byte_size: number }
  content_class: (typeof LIVE_ORIGIN_RULES)[LiveOrigin]['content_class']
  workflow_authorization: WorkflowAuthorization
  profile: ProfileRef
  executor: LiveExecutorIdentity
  outcome: { status: 'examined'; reason: null } | { status: 'could_not_examine'; reason: LiveFailureReason }
  observations: LiveObservation[]
  limitations: LiveLimitation[]
  provenance: {
    integrity: 'sha256_size_and_type_rechecked'
    /** Requests made for this attempt, including the engine's own one recovery retry. */
    model_calls: number
    prompt_sent: boolean
    input_tokens: number
    output_tokens: number
    /** The provider's id for the last response; null when no response arrived. */
    provider_response_id: string | null
  }
}

export function liveExaminationKey(input: { document_id: string; sha256: string; profile: ProfileRef; executor: LiveExecutorIdentity }): string {
  return sha256Hex(canonicalJson({ envelope: LIVE_EXAMINATION_ENVELOPE, document_id: input.document_id, sha256: input.sha256, profile: input.profile, executor: input.executor }))
}

// ── Strict parser: exact keys, closed vocabularies, one origin throughout. Null on anything else. ──

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const exact = (o: Obj, keys: readonly string[]) => Object.keys(o).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k))
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isNullableStr = (v: unknown): v is string | null => v === null || typeof v === 'string'
const count = (v: unknown, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max
const oneOf = <T extends string>(values: readonly T[], v: unknown): v is T => typeof v === 'string' && (values as readonly string[]).includes(v)
const HEX64 = /^[0-9a-f]{64}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const VERSION_TEXT = /^[a-z0-9][a-z0-9._-]{0,99}$/
const MEDIA: readonly EvidenceMediaType[] = ['application/pdf', 'image/png', 'image/jpeg']

export function parseLiveEnvelope(raw: unknown): LiveEnvelope | null {
  const r = raw
  if (!isObj(r) || !exact(r, ['envelope', 'examination_key', 'identity', 'execution_origin', 'executed_at', 'document', 'content_class', 'workflow_authorization', 'profile', 'executor', 'outcome', 'observations', 'limitations', 'provenance'])) return null
  if (!isObj(r.envelope) || !exact(r.envelope, ['id', 'version']) || r.envelope.id !== LIVE_EXAMINATION_ENVELOPE.id || r.envelope.version !== LIVE_EXAMINATION_ENVELOPE.version) return null
  if (typeof r.examination_key !== 'string' || !HEX64.test(r.examination_key) || r.identity !== 'execution_key') return null
  if (!oneOf(LIVE_ORIGINS, r.execution_origin) || typeof r.executed_at !== 'string' || !ISO_INSTANT.test(r.executed_at) || Number.isNaN(Date.parse(r.executed_at))) return null
  const origin = r.execution_origin
  const rules = LIVE_ORIGIN_RULES[origin]

  const d = r.document
  if (!isObj(d) || !exact(d, ['document_id', 'sha256', 'media_type', 'byte_size']) || typeof d.document_id !== 'string' || !UUID.test(d.document_id) || typeof d.sha256 !== 'string' || !HEX64.test(d.sha256)) return null
  if (!oneOf(MEDIA, d.media_type) || typeof d.byte_size !== 'number' || !Number.isInteger(d.byte_size) || d.byte_size < 1) return null
  if (r.content_class !== rules.content_class || r.workflow_authorization !== 'not_established') return null

  const p = r.profile
  if (!isObj(p) || !exact(p, ['id', 'version', 'schema', 'prompt']) || !isStr(p.id) || typeof p.version !== 'number' || !Number.isInteger(p.version) || p.version < 1 || !isStr(p.schema) || !isStr(p.prompt)) return null

  const e = r.executor
  if (!isObj(e) || !exact(e, ['mode', 'provider', 'model']) || e.mode !== origin || !oneOf<string>(rules.providers, e.provider) || typeof e.model !== 'string' || !VERSION_TEXT.test(e.model)) return null
  if (origin === 'mock_test' ? e.model !== MOCK_MODEL : TEST_MARK.test(e.model)) return null

  const o = r.outcome
  if (!isObj(o) || !exact(o, ['status', 'reason'])) return null
  if (!((o.status === 'examined' && o.reason === null) || (o.status === 'could_not_examine' && oneOf(LIVE_FAILURE_REASONS, o.reason)))) return null
  if (!Array.isArray(r.observations) || !Array.isArray(r.limitations)) return null
  if (o.status === 'could_not_examine' && r.observations.length > 0) return null

  const prefix = r.examination_key.slice(0, 16)
  const ids = new Set<string>()
  for (const x of r.observations) {
    if (!isObj(x) || !exact(x, ['observation_id', 'field', 'qualifier', 'basis', 'status', 'value', 'excerpt', 'source', 'verification', 'origin'])) return null
    if (!isStr(x.observation_id) || !x.observation_id.startsWith(`${prefix}:`) || ids.has(x.observation_id) || !isStr(x.field) || !isNullableStr(x.qualifier)) return null
    ids.add(x.observation_id)
    if (!oneOf(OBSERVATION_BASES, x.basis) || !oneOf(OBSERVATION_STATUSES, x.status) || !isNullableStr(x.value) || !isNullableStr(x.excerpt) || (x.status === 'present') !== (x.value !== null)) return null
    if (!isObj(x.source) || !exact(x.source, ['document_sha256', 'location']) || x.source.document_sha256 !== d.sha256 || x.source.location !== null) return null
    if (x.verification !== 'not_verified' || x.origin !== rules.observation_origin) return null
  }

  if (!r.limitations.every((x) => oneOf(LIVE_LIMITATIONS, x)) || new Set(r.limitations).size !== r.limitations.length || !r.limitations.includes('observations_not_verified')) return null
  if (r.limitations.includes('mock_test_data_not_model_output') !== (origin === 'mock_test')) return null

  const v = r.provenance
  if (!isObj(v) || !exact(v, ['integrity', 'model_calls', 'prompt_sent', 'input_tokens', 'output_tokens', 'provider_response_id'])) return null
  if (v.integrity !== 'sha256_size_and_type_rechecked' || !count(v.model_calls, 2) || typeof v.prompt_sent !== 'boolean' || !count(v.input_tokens, 100_000_000) || !count(v.output_tokens, 100_000_000)) return null
  if (v.prompt_sent !== ((v.model_calls as number) > 0) || !isNullableStr(v.provider_response_id) || v.provider_response_id === '') return null
  // A reading is what a model returned: it needs a request and the provider's id for the response.
  if (o.status === 'examined' && ((v.model_calls as number) < 1 || v.provider_response_id === null)) return null
  if (v.provider_response_id !== null && MOCK_RESPONSE_ID.test(v.provider_response_id) !== (origin === 'mock_test')) return null

  if (liveExaminationKey({ document_id: d.document_id, sha256: d.sha256, profile: p as unknown as ProfileRef, executor: e as unknown as LiveExecutorIdentity }) !== r.examination_key) return null
  return r as unknown as LiveEnvelope
}
