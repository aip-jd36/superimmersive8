/**
 * CR-V2-DOC-LIVE-1C-B1 — the fixed-composition evaluation runner. Disabled: the code lock is checked before anything is read, including
 * the environment. Imported only by the operator CLI (`scripts/creator-record-live-evaluation.ts`), and by no route, page or job
 * (test-enforced).
 *
 * FIXED COMPOSITION. `runFixedEvaluation` takes one request and nothing else. It always uses, and a caller cannot replace:
 *   - the operator's own Supabase session token, read from CREATOR_RECORD_LIVE_EVALUATION_OPERATOR_TOKEN and verified by Supabase Auth;
 *   - the reviewed production evaluation, document and prepared-version ports (`./live-examination-production`), loaded only after the
 *     lock, the request and the project identity have passed;
 *   - the registered receipt profile, and only that one;
 *   - the committed synthetic-fixture registry, so a fixture is never examined as a real document;
 *   - the hardened Anthropic adapter, loaded by the entry point itself (no adapter seam is passed).
 * Tests replace modules, never arguments.
 *
 * PROJECT IDENTITY. The project is the one the service-role client is actually connected to: the reference is taken from
 * NEXT_PUBLIC_SUPABASE_URL, must equal CREATOR_RECORD_LIVE_EVALUATION_PROJECT_REF, and must not be the Production project. The database
 * then requires its own evaluation marker and the authorization to name the same reference.
 *
 * WHAT IT RETURNS: metadata only. No observation value, excerpt, prompt or document content leaves this function.
 *
 * No flag, argument or environment setting can enable a model call: that needs the code lock lifted by a reviewed change, an authorization
 * row written by the database operator in an isolated project, the evaluation schema installed there, and the dedicated key.
 */

import { DEFAULT_REPLAY_TABLE } from '@/lib/creator-record/evidence/replay'
import { LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD } from '@/lib/creator-record/live-examination/controls'
import { runAuthorizedEvaluation, type EvaluationResult } from '@/lib/creator-record/live-examination/evaluation'
import { LIVE_PROFILE_REGISTRY } from '@/lib/creator-record/live-examination/examine'

export const OPERATOR_TOKEN_ENV = 'CREATOR_RECORD_LIVE_EVALUATION_OPERATOR_TOKEN'
export const PROJECT_REF_ENV = 'CREATOR_RECORD_LIVE_EVALUATION_PROJECT_REF'
const PRODUCTION_PROJECT_REF = 'lehqgcgnenwdmuzudbrs'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const ID = /^[a-z0-9][a-z0-9._-]{7,63}$/

/** The only profile an evaluation may run. */
const FIXED_PROFILES = LIVE_PROFILE_REGISTRY

/** The project reference of a hosted Supabase URL, `https://<ref>.supabase.co`, exactly. Null for anything else. */
export function projectRefFromUrl(url: string | undefined): string | null {
  const m = typeof url === 'string' ? /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/.exec(url) : null
  return m ? m[1] : null
}

export interface FixedEvaluationRequest {
  evaluation_id: string
  prepared_id: string
  document_id: string
  tool_index: number
}

export function parseFixedEvaluationRequest(raw: unknown): FixedEvaluationRequest | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const keys = Object.keys(r).sort()
  if (keys.join(',') !== 'document_id,evaluation_id,prepared_id,tool_index') return null
  if (typeof r.evaluation_id !== 'string' || !ID.test(r.evaluation_id)) return null
  if (typeof r.prepared_id !== 'string' || !UUID.test(r.prepared_id) || typeof r.document_id !== 'string' || !UUID.test(r.document_id)) return null
  if (typeof r.tool_index !== 'number' || !Number.isInteger(r.tool_index) || r.tool_index < 0) return null
  return { evaluation_id: r.evaluation_id, prepared_id: r.prepared_id, document_id: r.document_id, tool_index: r.tool_index }
}

/** Metadata for the operator's report. Nothing from the document or the model's reading. */
export type FixedEvaluationSummary =
  | { kind: 'refused'; stage: string; code: string }
  | {
      kind: 'completed'
      result: string
      code: string | null
      attempt_id: string | null
      outcome: { status: string; reason: string | null } | null
      observation_count: number | null
      model_called: boolean | null
      reservation_refusal: string | null
      settlement: string
      charged_micro_usd: number | null
    }

export function summarize(r: EvaluationResult): FixedEvaluationSummary {
  if (r.kind === 'refused') return { kind: 'refused', stage: r.stage, code: r.code }
  const x = r.result
  const envelope = x.kind === 'examined' ? x.envelope : null
  return {
    kind: 'completed',
    result: x.kind,
    code: x.kind === 'refused' ? x.code : x.kind === 'failed' || x.kind === 'not_retryable' ? x.reason : x.kind === 'not_read' || x.kind === 'unavailable' || x.kind === 'not_recorded' ? x.reason : null,
    attempt_id: x.kind === 'examined' || x.kind === 'failed' ? x.attempt_id : null,
    outcome: envelope ? { status: envelope.outcome.status, reason: envelope.outcome.reason } : x.kind === 'failed' ? { status: 'could_not_examine', reason: x.reason } : null,
    observation_count: envelope ? envelope.observations.length : null,
    model_called: x.kind === 'examined' ? x.model_called : null,
    reservation_refusal: r.reservation_refusal,
    settlement: r.settlement.status,
    charged_micro_usd: r.settlement.status === 'settled' ? r.settlement.charged_micro_usd : null,
  }
}

export async function runFixedEvaluation(rawRequest: unknown): Promise<FixedEvaluationSummary> {
  if (LIVE_EXAMINATION_PERMITTED_IN_THIS_BUILD !== true) return { kind: 'refused', stage: 'lock', code: 'live_examination_disabled' }
  const request = parseFixedEvaluationRequest(rawRequest)
  if (!request) return { kind: 'refused', stage: 'request', code: 'invalid_request' }
  const credential = process.env[OPERATOR_TOKEN_ENV]
  if (!credential) return { kind: 'refused', stage: 'operator', code: 'operator_credential_missing' }
  const connected = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (!connected || connected === PRODUCTION_PROJECT_REF || process.env[PROJECT_REF_ENV] !== connected) return { kind: 'refused', stage: 'environment', code: 'project_identity_unverified' }

  // Loaded only now: the lock, the request and the project identity have passed, and nothing before here touched a client or a store.
  const ports = await import('@/lib/creator-record-flow/live-examination-production')
  const result = await runAuthorizedEvaluation(
    {
      evaluation: ports.evaluationPorts,
      documents: ports.liveExaminationStorage,
      prepared: ports.livePreparedSource,
      environmentRef: connected,
      profiles: FIXED_PROFILES,
      isKnownSyntheticFixture: (sha256) => DEFAULT_REPLAY_TABLE.has(sha256),
      env: process.env,
      now: () => new Date(),
    },
    { credential, ...request },
  )
  return summarize(result)
}
