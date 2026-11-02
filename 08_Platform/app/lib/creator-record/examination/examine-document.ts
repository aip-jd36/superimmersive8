/**
 * CR-V2-DOC-2B — the generic examination CORE: one stored document, one registered profile, replay only.
 *
 * No I/O of its own: document lookup, bytes, the synthetic-document registry, the executor and the profiles
 * are all injected. No storage adapter exists in DOC-2B (reading a stored object for examination needs an
 * audited access role that the DOC-1 access log does not have; deferred with persistence).
 *
 * Order (every refusal happens before the profile's engine runs, and none produces an envelope):
 *   1. request   — exact keys; actor and document ids are UUIDs; profile `{ id, version }`. Nothing else is
 *                  read from the caller: no authority, content class, mode, fingerprint or recorded output.
 *   2. profile   — the exact profile identity must be registered.
 *   3. executor  — must be the replay executor (`fixture_replay`); anything else is refused.
 *   4. document  — must exist and be `stored`.
 *   5. ownership — the actor must own it.
 *   6. integrity — the bytes are read and re-hashed: SHA-256, size and byte-sniffed type must all match
 *                  the stored record.
 *   7. profile   — the profile must support the document's media type.
 *   8. content   — the re-computed SHA-256 must be a known synthetic fixture in the trusted committed
 *                  registry; any other content is refused (`not_a_known_synthetic_fixture`). This is a
 *                  CONTENT check only: recognising fixture bytes establishes no workflow, customer or
 *                  synthetic-test authority (`workflow_authorization: 'not_established'`, see envelope.ts).
 *   9. executor  — a recorded reading must exist for those exact bytes, and must be canonical JSON; its
 *                  SHA-256 is computed HERE (never taken from the executor) and bound into the key, and the
 *                  profile consumes the value re-materialised from that hashed text (`fixRecording`).
 * Then the profile reads the recorded output through its own engine, and the envelope is built.
 */

import { canonicalJson, sha256Hex } from '../record-core/canonical'
import { sha256Bytes, sniffMediaType } from '../evidence-intake/contract'
import type { EvidenceMediaType } from '../evidence-intake/vocabulary'
import {
  EXAMINATION_ENVELOPE,
  EXAMINATION_LIMITATIONS,
  type ExaminationEnvelope,
  type ExaminationLimitation,
  type ExaminationResult,
  type ExecutorIdentity,
  type PreflightRefusal,
  type PreflightRefusalCode,
  type PreflightStage,
} from './envelope'
import { profileKey, type ProfileRegistry } from './profile'

/** The stored document as the source reports it (DOC-1 row shape, the fields the core needs). */
export interface ExaminationDocumentRecord {
  id: string
  user_id: string
  sha256: string
  media_type: EvidenceMediaType
  byte_size: number
  state: 'pending' | 'stored' | 'deleted'
}

export interface ExaminationDocumentSource {
  get(documentId: string): Promise<ExaminationDocumentRecord | null>
  /** The stored object's bytes, or null when unavailable. */
  readBytes(record: ExaminationDocumentRecord): Promise<Uint8Array | null>
}

/**
 * Trusted metadata: SI8's committed synthetic fixture set. Never the caller. It answers a CONTENT question
 * (are these bytes a known fixture?) and nothing else: it is not, and must not be used as, an authority
 * registry of test accounts, test documents or customers.
 */
export interface KnownFixtureRegistry {
  isKnownSyntheticFixture(sha256: string): boolean
}

export interface ReplayRecording {
  fixture_id: string
  parsed_output: unknown
}

/** The executor's static identity. The per-examination `recording_sha256` is computed by the core, never supplied. */
export type ReplayExecutorIdentity = Pick<ExecutorIdentity, 'mode' | 'replay_set'>

export interface ReplayExecutor {
  readonly identity: ReplayExecutorIdentity
  recordingFor(sha256: string): ReplayRecording | null
}

export interface ExaminationDeps {
  documents: ExaminationDocumentSource
  fixtures: KnownFixtureRegistry
  executor: ReplayExecutor
  profiles: ProfileRegistry
}

export interface ExaminationRequest {
  actor_user_id: string
  document_id: string
  profile: { id: string; version: number }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const exact = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k))

/** Strict: exactly `{ actor_user_id, document_id, profile: { id, version } }`. Null on anything else. */
export function parseExaminationRequest(raw: unknown): ExaminationRequest | null {
  if (!isObj(raw) || !exact(raw, ['actor_user_id', 'document_id', 'profile'])) return null
  const { actor_user_id, document_id, profile } = raw
  if (typeof actor_user_id !== 'string' || !UUID.test(actor_user_id) || typeof document_id !== 'string' || !UUID.test(document_id)) return null
  if (!isObj(profile) || !exact(profile, ['id', 'version']) || typeof profile.id !== 'string' || profile.id === '' || typeof profile.version !== 'number' || !Number.isInteger(profile.version)) return null
  return { actor_user_id, document_id, profile: { id: profile.id, version: profile.version } }
}

const refuse = (stage: PreflightStage, code: PreflightRefusalCode): PreflightRefusal => ({ kind: 'refused', stage, code })

/**
 * Deterministic replay key over every input that can change the envelope: the envelope version (core
 * assembly), the document id and bytes, the profile identity (adapter/mapping version, engine schema and
 * prompt) and the executor identity (mode, replay set, SHA-256 of the exact recorded output). No clock, no
 * randomness.
 */
export function examinationKey(input: { document_id: string; sha256: string; profile: ExaminationEnvelope['profile']; executor: ExecutorIdentity }): string {
  return sha256Hex(canonicalJson({ envelope: EXAMINATION_ENVELOPE, document_id: input.document_id, sha256: input.sha256, profile: input.profile, executor: input.executor }))
}

const deepFreeze = <T>(v: T): T => {
  if (v !== null && typeof v === 'object') {
    for (const x of Object.values(v as object)) deepFreeze(x)
    Object.freeze(v)
  }
  return v
}

/**
 * The recorded output, fixed: canonicalised ONCE, hashed, and re-materialised from that exact text as a
 * deep-frozen value. The profile consumes `value`, so what is hashed is exactly what is examined (no getter,
 * shared reference or later mutation can make them differ). Null when it is not canonical JSON (fail closed).
 */
export function fixRecording(recordedOutput: unknown): { sha256: string; value: unknown } | null {
  let text: string
  try {
    text = canonicalJson(recordedOutput)
  } catch {
    return null
  }
  return { sha256: sha256Hex(text), value: deepFreeze(JSON.parse(text) as unknown) }
}

/** SHA-256 of the canonical JSON of a recorded output, or null when it is not canonical JSON (fail closed). */
export function recordingDigest(recordedOutput: unknown): string | null {
  return fixRecording(recordedOutput)?.sha256 ?? null
}

const ORDER = new Map(EXAMINATION_LIMITATIONS.map((l, i) => [l, i]))
const orderedLimitations = (extra: readonly ExaminationLimitation[]): ExaminationLimitation[] =>
  Array.from(new Set<ExaminationLimitation>(['recorded_test_data_not_model_output', 'observations_not_verified', ...extra])).sort((a, b) => ORDER.get(a)! - ORDER.get(b)!)

export async function examineDocument(deps: ExaminationDeps, rawRequest: unknown): Promise<ExaminationResult> {
  const request = parseExaminationRequest(rawRequest)
  if (!request) return refuse('request', 'invalid_request')

  const profile = deps.profiles.get(profileKey(request.profile))
  if (!profile) return refuse('profile', 'profile_not_registered')

  // Replay only. Re-checked at run time, whatever the injected executor claims to be.
  const executor: ReplayExecutorIdentity = deps.executor.identity
  if (!isObj(executor) || !exact(executor, ['mode', 'replay_set']) || executor.mode !== 'fixture_replay' || typeof executor.replay_set !== 'string' || executor.replay_set === '') return refuse('executor', 'executor_not_permitted')

  const record = await deps.documents.get(request.document_id)
  if (!record || record.id !== request.document_id) return refuse('document', 'document_not_found')
  if (record.state !== 'stored') return refuse('document', 'document_not_stored')
  if (record.user_id !== request.actor_user_id) return refuse('ownership', 'not_owner')

  const bytes = await deps.documents.readBytes(record)
  if (!bytes) return refuse('integrity', 'object_unavailable')
  const sha256 = sha256Bytes(bytes)
  if (sha256 !== record.sha256 || bytes.length !== record.byte_size || sniffMediaType(bytes) !== record.media_type) return refuse('integrity', 'integrity_mismatch')

  if (!profile.media_types.includes(record.media_type)) return refuse('profile', 'media_type_not_supported')
  if (!deps.fixtures.isKnownSyntheticFixture(sha256)) return refuse('content', 'not_a_known_synthetic_fixture')

  const recording = deps.executor.recordingFor(sha256)
  if (!recording) return refuse('executor', 'no_replay_recording')
  const fixed = fixRecording(recording.parsed_output)
  if (!fixed) return refuse('executor', 'invalid_replay_recording')
  const recording_sha256 = fixed.sha256

  // The profile reads exactly the hashed value (re-materialised from the hashed text, deep-frozen).
  const reading = await profile.readRecorded(bytes, fixed.value)

  const identity = { executor: { mode: executor.mode, replay_set: executor.replay_set, recording_sha256 } as ExecutorIdentity, profile: { ...profile.ref } }
  const examination_key = examinationKey({ document_id: record.id, sha256, profile: identity.profile, executor: identity.executor })
  const prefix = examination_key.slice(0, 16)
  const counters = new Map<string, number>()
  const observations =
    reading.status === 'examined'
      ? reading.observations.map((o) => {
          const i = counters.get(o.field) ?? 0
          counters.set(o.field, i + 1)
          return { observation_id: `${prefix}:${o.field}:${i}`, ...o, source: { document_sha256: sha256, location: null }, verification: 'not_verified' as const, origin: 'fixture_replay_recorded' as const }
        })
      : []

  const envelope: ExaminationEnvelope = {
    envelope: { ...EXAMINATION_ENVELOPE },
    examination_key,
    identity: 'deterministic_replay_key',
    document: { document_id: record.id, sha256, media_type: record.media_type, byte_size: record.byte_size },
    content_class: 'known_synthetic_fixture',
    workflow_authorization: 'not_established',
    profile: identity.profile,
    executor: identity.executor,
    outcome: reading.status === 'examined' ? { status: 'examined', reason: null } : { status: 'could_not_examine', reason: reading.reason },
    observations,
    limitations: orderedLimitations(reading.status === 'examined' ? reading.limitations : []),
    provenance: { integrity: 'sha256_size_and_type_rechecked', replay_fixture_id: recording.fixture_id, engine_attempts: reading.engine_attempts, model_calls: 0, prompt_sent: false },
  }
  return { kind: 'envelope', envelope }
}
