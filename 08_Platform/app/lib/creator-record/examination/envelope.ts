/**
 * CR-V2-DOC-2B — the generic, closed, versioned DOCUMENT EXAMINATION ENVELOPE.
 *
 * Pure (no Node API, no I/O). What one examination of one stored document produced, independent of the
 * document type. A profile (`./profile.ts`) supplies the type-specific reading; nothing here knows what a
 * receipt is.
 *
 * Authority (DOC-2B):
 *   - An observation is what a document APPEARS to show, as reported by an examination. It is never a
 *     project fact, a declaration, a governed proposition or a human-verified finding:
 *     `verification` is always `not_verified`. Nothing here reaches retrieval, applicability, Bounded
 *     Interpretation, composition, a record or a PDF (no importer outside this folder; test-enforced).
 *   - Only fixture replay exists. `executor.mode` has one value, `fixture_replay`, and `origin` one value,
 *     `fixture_replay_recorded`: replay returns SI8's recorded ground truth for its own synthetic test
 *     documents and says nothing about extraction quality. A live model is not representable here.
 *   - CONTENT, NOT AUTHORITY (CR-V2-DOC-2B-IDENTITY-1). `content_class: 'known_synthetic_fixture'` says only
 *     that the document's bytes are byte-identical to one of SI8's committed synthetic fixtures. The fixture
 *     generator and its parameters are public, so anyone can produce those bytes: recognising them proves
 *     nothing about who uploaded them or why. `workflow_authorization` is therefore always
 *     `not_established`. No envelope can say that a document, its uploader or its use is an authorised
 *     synthetic-test record, a customer record or anything else; that authority would have to come from a
 *     separately approved source, which does not exist yet. Content that is not a known fixture is refused
 *     before examination, so no envelope describes any other content.
 *   - Identity: `examination_key` is a DETERMINISTIC REPLAY KEY over every input that can change the
 *     envelope: the envelope version (core assembly), the document id and bytes, the profile identity
 *     (adapter and mapping version, engine schema and prompt versions) and the executor identity (mode,
 *     replay set and the SHA-256 of the exact recorded output used). Nothing is persisted, so no durable
 *     exactly-once execution is claimed (`identity: 'deterministic_replay_key'`).
 *   - A preflight refusal (request, profile, executor, document, ownership, integrity, content) is a
 *     `PreflightRefusal`, never an envelope: an envelope exists only when an examination actually ran.
 *     Its `outcome` is then `examined`, or `could_not_examine` with the engine's own fixed reason.
 *
 * Versions: v1 (DOC-2B, d412d3ad) → v2 (IDENTITY-1): `executor.recording_sha256` added; the v1 authority
 * field replaced by `content_class` + `workflow_authorization`. No v1 envelope was ever persisted or consumed
 * (no persistence, no importer), so v1 is not accepted and no migration exists.
 */

import type { EvidenceMediaType } from '../evidence-intake/vocabulary'

export const EXAMINATION_ENVELOPE = { id: 'si8/creator-record-v2-examination', version: 2 } as const

/** What the document's bytes are recognised as. Content only — never authority. */
export const CONTENT_CLASSES = ['known_synthetic_fixture'] as const
export type ContentClass = (typeof CONTENT_CLASSES)[number]

/** Whether any workflow authority (synthetic-test, customer, submission) is established. In DOC-2B: never. */
export const WORKFLOW_AUTHORIZATIONS = ['not_established'] as const
export type WorkflowAuthorization = (typeof WORKFLOW_AUTHORIZATIONS)[number]

export const EXECUTOR_MODES = ['fixture_replay'] as const
export type ExecutorMode = (typeof EXECUTOR_MODES)[number]

export interface ExecutorIdentity {
  mode: ExecutorMode
  /** The recorded replay set (fixture spec version). A label: it does not fix the data on its own. */
  replay_set: string
  /** SHA-256 of the canonical JSON of the exact recorded output replayed for this document. Computed by the core. */
  recording_sha256: string
}

/**
 * A profile's identity. `version` is the ADAPTER AND MAPPING version: it must be raised, as an explicit
 * change, whenever the profile's readings can differ for the same recorded output (engine behaviour, mapping
 * or limitations). The pinned output fingerprint (`./profile.ts`) is corpus-limited regression protection
 * only; it does not replace the rule.
 */
export interface ProfileRef {
  id: string
  version: number
  /** The engine's own output schema version. */
  schema: string
  /** The engine's own prompt version. In replay the prompt is never sent (`provenance.prompt_sent: false`). */
  prompt: string
}

/**
 * `printed_text`: a value the examination reports as printed on the document, with its verbatim excerpt.
 * `examiner_classification`: the examination's own characterisation of the document as a whole (its type,
 * legibility, flags). Never text the document states; never a creator declaration.
 */
export const OBSERVATION_BASES = ['printed_text', 'examiner_classification'] as const
export type ObservationBasis = (typeof OBSERVATION_BASES)[number]

/** Same four states as every existing extraction field; a missing or uncertain value is never invented. */
export const OBSERVATION_STATUSES = ['present', 'not_shown', 'unreadable', 'ambiguous'] as const
export type ObservationStatus = (typeof OBSERVATION_STATUSES)[number]

export interface ExaminationObservation {
  /** `<first 16 hex of examination_key>:<field>:<index>` — stable for a given examination. */
  observation_id: string
  /** Profile-defined, closed per profile. */
  field: string
  /** Profile-defined qualifier (e.g. where on the document a name was printed), or null. */
  qualifier: string | null
  basis: ObservationBasis
  status: ObservationStatus
  /** Non-null iff `status` is `present`. */
  value: string | null
  /** Verbatim as reported; never rewritten or normalised. */
  excerpt: string | null
  /** The exact file the observation is about. No page or region: no current profile reports one. */
  source: { document_sha256: string; location: null }
  verification: 'not_verified'
  origin: 'fixture_replay_recorded'
}

/** Closed limitation codes. Every envelope carries the first two. */
export const EXAMINATION_LIMITATIONS = [
  'recorded_test_data_not_model_output',
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
export type ExaminationLimitation = (typeof EXAMINATION_LIMITATIONS)[number]

/** The engine's own fixed failure reasons (identical to the receipt engine's `CouldNotExamineReason`). */
export const EXAMINATION_FAILURE_REASONS = ['unsupported_format', 'file_too_large', 'empty_file', 'model_error', 'structured_output_missing', 'schema_invalid'] as const
export type ExaminationFailureReason = (typeof EXAMINATION_FAILURE_REASONS)[number]

export type ExaminationOutcome = { status: 'examined'; reason: null } | { status: 'could_not_examine'; reason: ExaminationFailureReason }

export interface ExaminationEnvelope {
  envelope: typeof EXAMINATION_ENVELOPE
  examination_key: string
  identity: 'deterministic_replay_key'
  document: { document_id: string; sha256: string; media_type: EvidenceMediaType; byte_size: number }
  content_class: ContentClass
  workflow_authorization: WorkflowAuthorization
  profile: ProfileRef
  executor: ExecutorIdentity
  outcome: ExaminationOutcome
  observations: ExaminationObservation[]
  limitations: ExaminationLimitation[]
  provenance: {
    /** The stored bytes were re-hashed and matched the document's fingerprint, size and type before examination. */
    integrity: 'sha256_size_and_type_rechecked'
    replay_fixture_id: string
    /** Engine invocations made with the recorded output (the engine's own retry rule applies). */
    engine_attempts: number
    model_calls: 0
    prompt_sent: false
  }
}

/** Preflight refusals: no examination ran, so no envelope exists. */
export const PREFLIGHT_STAGES = ['request', 'profile', 'executor', 'document', 'ownership', 'integrity', 'content'] as const
export type PreflightStage = (typeof PREFLIGHT_STAGES)[number]

export const PREFLIGHT_REFUSAL_CODES = [
  'invalid_request',
  'profile_not_registered',
  'executor_not_permitted',
  'document_not_found',
  'not_owner',
  'document_not_stored',
  'object_unavailable',
  'integrity_mismatch',
  'media_type_not_supported',
  'not_a_known_synthetic_fixture',
  'no_replay_recording',
  'invalid_replay_recording',
] as const
export type PreflightRefusalCode = (typeof PREFLIGHT_REFUSAL_CODES)[number]

export interface PreflightRefusal {
  kind: 'refused'
  stage: PreflightStage
  code: PreflightRefusalCode
}

export type ExaminationResult = { kind: 'envelope'; envelope: ExaminationEnvelope } | PreflightRefusal

// ── Strict parser: the envelope is closed (exact keys, closed vocabularies). Null on anything else. ──────

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const exact = (o: Obj, keys: readonly string[]) => Object.keys(o).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k))
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isNullableStr = (v: unknown): v is string | null => v === null || typeof v === 'string'
const oneOf = <T extends string>(values: readonly T[], v: unknown): v is T => typeof v === 'string' && (values as readonly string[]).includes(v)
const HEX64 = /^[0-9a-f]{64}$/
const MEDIA: readonly EvidenceMediaType[] = ['application/pdf', 'image/png', 'image/jpeg']

function parseObservation(v: unknown, sha: string, keyPrefix: string): ExaminationObservation | null {
  if (!isObj(v) || !exact(v, ['observation_id', 'field', 'qualifier', 'basis', 'status', 'value', 'excerpt', 'source', 'verification', 'origin'])) return null
  if (!isStr(v.observation_id) || !v.observation_id.startsWith(`${keyPrefix}:`) || !isStr(v.field) || !isNullableStr(v.qualifier)) return null
  if (!oneOf(OBSERVATION_BASES, v.basis) || !oneOf(OBSERVATION_STATUSES, v.status)) return null
  if (!isNullableStr(v.value) || !isNullableStr(v.excerpt) || (v.status === 'present') !== (v.value !== null)) return null
  if (!isObj(v.source) || !exact(v.source, ['document_sha256', 'location']) || v.source.document_sha256 !== sha || v.source.location !== null) return null
  if (v.verification !== 'not_verified' || v.origin !== 'fixture_replay_recorded') return null
  return v as unknown as ExaminationObservation
}

export function parseExaminationEnvelope(raw: unknown): ExaminationEnvelope | null {
  const r = raw
  if (!isObj(r) || !exact(r, ['envelope', 'examination_key', 'identity', 'document', 'content_class', 'workflow_authorization', 'profile', 'executor', 'outcome', 'observations', 'limitations', 'provenance'])) return null
  if (!isObj(r.envelope) || !exact(r.envelope, ['id', 'version']) || r.envelope.id !== EXAMINATION_ENVELOPE.id || r.envelope.version !== EXAMINATION_ENVELOPE.version) return null
  if (typeof r.examination_key !== 'string' || !HEX64.test(r.examination_key) || r.identity !== 'deterministic_replay_key') return null
  const d = r.document
  if (!isObj(d) || !exact(d, ['document_id', 'sha256', 'media_type', 'byte_size']) || !isStr(d.document_id) || typeof d.sha256 !== 'string' || !HEX64.test(d.sha256)) return null
  if (!oneOf(MEDIA, d.media_type) || typeof d.byte_size !== 'number' || !Number.isInteger(d.byte_size) || d.byte_size < 1) return null
  if (!oneOf(CONTENT_CLASSES, r.content_class) || !oneOf(WORKFLOW_AUTHORIZATIONS, r.workflow_authorization)) return null
  const p = r.profile
  if (!isObj(p) || !exact(p, ['id', 'version', 'schema', 'prompt']) || !isStr(p.id) || typeof p.version !== 'number' || !Number.isInteger(p.version) || p.version < 1 || !isStr(p.schema) || !isStr(p.prompt)) return null
  const e = r.executor
  if (!isObj(e) || !exact(e, ['mode', 'replay_set', 'recording_sha256']) || !oneOf(EXECUTOR_MODES, e.mode) || !isStr(e.replay_set) || typeof e.recording_sha256 !== 'string' || !HEX64.test(e.recording_sha256)) return null
  const o = r.outcome
  if (!isObj(o) || !exact(o, ['status', 'reason'])) return null
  if (!((o.status === 'examined' && o.reason === null) || (o.status === 'could_not_examine' && oneOf(EXAMINATION_FAILURE_REASONS, o.reason)))) return null
  if (!Array.isArray(r.observations) || !Array.isArray(r.limitations)) return null
  if (o.status === 'could_not_examine' && r.observations.length > 0) return null
  const prefix = r.examination_key.slice(0, 16)
  if (!r.observations.every((x) => parseObservation(x, d.sha256 as string, prefix) !== null)) return null
  if (!r.limitations.every((x) => oneOf(EXAMINATION_LIMITATIONS, x)) || new Set(r.limitations).size !== r.limitations.length) return null
  if (!r.limitations.includes('recorded_test_data_not_model_output') || !r.limitations.includes('observations_not_verified')) return null
  const v = r.provenance
  if (!isObj(v) || !exact(v, ['integrity', 'replay_fixture_id', 'engine_attempts', 'model_calls', 'prompt_sent'])) return null
  if (v.integrity !== 'sha256_size_and_type_rechecked' || !isStr(v.replay_fixture_id) || typeof v.engine_attempts !== 'number' || !Number.isInteger(v.engine_attempts) || v.engine_attempts < 0) return null
  if (v.model_calls !== 0 || v.prompt_sent !== false) return null
  return r as unknown as ExaminationEnvelope
}
