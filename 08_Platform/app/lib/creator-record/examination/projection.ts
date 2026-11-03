/**
 * CR-V2-EXAM-INTEGRATION-X0 — the bounded EXAMINATION PROJECTION: the only form in which an examination may
 * appear in a Creator Record (and, later, its PDF).
 *
 * Pure (no I/O). Contract:
 *   - SOURCE: a projection is made only from a PERSISTED run that passes `verifyRunRow` (authority stamp,
 *     envelope digest, strict envelope parse, canonical form, recomputed examination key, owner and document).
 *     Nothing else (a browser value, an unpersisted envelope, a run of another owner or document) can become one.
 *   - CONTENT: the envelope is carried VERBATIM, so every observation, excerpt, limitation and provenance field
 *     is exactly what the examination produced. The projection adds only the run id, the envelope digest and the
 *     execution boundary the database stamped. It is self-verifying: `parseExaminationProjection` re-parses the
 *     envelope strictly, recomputes its key and checks its SHA-256 against `envelope_sha256`.
 *   - TWO DIFFERENT WORDS: `run_integrity` says the stored run was re-checked byte-for-byte (technical integrity).
 *     `verification` is always `not_verified`: no observation is a verified fact, a declaration, a finding, a
 *     certification or a commercial clearance. The projection never establishes any of these.
 *   - BOUNDARY: a projection is an observation record only. It never reaches declarations, facts, retrieval,
 *     applicability, Bounded Interpretation, composition or guidance (test-enforced).
 */

import { canonicalJson, sha256Hex } from '../record-core/canonical'
import { parseExaminationEnvelope, type ExaminationEnvelope } from './envelope'
import { examinationKey } from './examine-document'
import { EXECUTION_BOUNDARIES, verifyRunRow, type ExecutionBoundary, type PersistedRunRow } from './persistence'

export const EXAMINATION_PROJECTION = { id: 'si8/creator-record-v2-examination-projection', version: 1 } as const

export interface ExaminationProjection {
  projection: typeof EXAMINATION_PROJECTION
  /** The persisted run this projection was made from. */
  run_id: string
  /** SHA-256 of the run's canonical envelope text, exactly as stored. */
  envelope_sha256: string
  /** The boundary the database stamped on the run. */
  execution_boundary: ExecutionBoundary
  /** Technical integrity only: the stored run was re-checked (digest, parse, key, owner, document). */
  run_integrity: 'persisted_run_rechecked'
  /** Never anything else: the examination's observations are not verified facts. */
  verification: 'not_verified'
  /** The examination envelope, verbatim. */
  envelope: ExaminationEnvelope
}

export type ProjectionResult = { ok: true; projection: ExaminationProjection } | { ok: false; reason: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const HEX64 = /^[0-9a-f]{64}$/
const PROJECTION_KEYS = ['projection', 'run_id', 'envelope_sha256', 'execution_boundary', 'run_integrity', 'verification', 'envelope'] as const

/** Projects one persisted run of `ownerUserId`'s document `documentId`. Refuses unless the run passes every stored-run check. */
export function projectVerifiedRun(row: PersistedRunRow, ownerUserId: string, documentId: string): ProjectionResult {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !UUID.test(row.id)) return { ok: false, reason: 'run_id' }
  const failed = verifyRunRow(row, ownerUserId, documentId)
  if (failed) return { ok: false, reason: failed }
  const envelope = parseExaminationEnvelope(JSON.parse(row.envelope_canonical))
  if (!envelope) return { ok: false, reason: 'envelope_parser' }
  return {
    ok: true,
    projection: {
      projection: EXAMINATION_PROJECTION,
      run_id: row.id,
      envelope_sha256: row.envelope_sha256,
      execution_boundary: row.execution_boundary as ExecutionBoundary,
      run_integrity: 'persisted_run_rechecked',
      verification: 'not_verified',
      envelope,
    },
  }
}

/** Strict, non-repairing parse of a stored projection. Null on any unknown, missing or inconsistent field. */
export function parseExaminationProjection(raw: unknown): ExaminationProjection | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  if (Object.keys(r).length !== PROJECTION_KEYS.length || !PROJECTION_KEYS.every((k) => Object.prototype.hasOwnProperty.call(r, k))) return null
  const p = r.projection as Record<string, unknown> | null
  if (!p || typeof p !== 'object' || Object.keys(p).length !== 2 || p.id !== EXAMINATION_PROJECTION.id || p.version !== EXAMINATION_PROJECTION.version) return null
  if (typeof r.run_id !== 'string' || !UUID.test(r.run_id)) return null
  if (typeof r.envelope_sha256 !== 'string' || !HEX64.test(r.envelope_sha256)) return null
  if (typeof r.execution_boundary !== 'string' || !(EXECUTION_BOUNDARIES as readonly string[]).includes(r.execution_boundary)) return null
  if (r.run_integrity !== 'persisted_run_rechecked' || r.verification !== 'not_verified') return null
  const envelope = parseExaminationEnvelope(r.envelope)
  if (!envelope) return null
  let text: string
  try {
    text = canonicalJson(envelope)
  } catch {
    return null
  }
  if (sha256Hex(text) !== r.envelope_sha256) return null
  if (examinationKey({ document_id: envelope.document.document_id, sha256: envelope.document.sha256, profile: envelope.profile, executor: envelope.executor }) !== envelope.examination_key) return null
  return r as unknown as ExaminationProjection
}

/** What a record keeps to re-check a referenced run at payment and issuance. */
export interface ExaminationRunReference {
  run_id: string
  document_id: string
  envelope_sha256: string
}

export type RunReferenceIntegrity = { ok: true } | { ok: false; reason: 'unavailable' | 'run_missing' | 'run_integrity' | 'run_mismatch' }

/**
 * Every referenced run still exists, still passes every stored-run check for `ownerUserId` and its document, and
 * still has exactly the envelope digest the record captured. Fail closed: a lookup failure is `unavailable`.
 */
export async function verifyReferencedRuns(
  getRun: (runId: string) => Promise<PersistedRunRow | null>,
  ownerUserId: string,
  refs: readonly ExaminationRunReference[],
): Promise<RunReferenceIntegrity> {
  for (const ref of refs) {
    let row: PersistedRunRow | null
    try {
      row = await getRun(ref.run_id)
    } catch {
      return { ok: false, reason: 'unavailable' }
    }
    if (!row) return { ok: false, reason: 'run_missing' }
    if (row.id !== ref.run_id || row.document_id !== ref.document_id || row.envelope_sha256 !== ref.envelope_sha256) return { ok: false, reason: 'run_mismatch' }
    if (verifyRunRow(row, ownerUserId, ref.document_id) !== null) return { ok: false, reason: 'run_integrity' }
  }
  return { ok: true }
}
