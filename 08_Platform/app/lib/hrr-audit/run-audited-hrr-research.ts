/**
 * runAuditedHrrResearch — the HRR audit-before-content orchestration boundary
 * (CAH-4G.5 Slice 5).
 *
 * The ONE impure composition of the pure HRR pipeline
 * (`lib/hrr/**` — `runHrrResearch` / `projectHrrResearchAnswer` /
 * `projectHrrAuditRecord`, all pure, no I/O) with the append-only reviewer-LK
 * access audit (`recordReviewerLkAccess`, CAH-4E). It exists so the fail-closed
 * invariant lives in exactly one place:
 *
 *   NO GOVERNED HRR CONTENT IS RETURNED BEFORE THE REQUIRED AUDIT SUCCEEDS.
 *   (governed propositions · applicability detail · BI summary · does_not_apply
 *    content · governed claim references · the consultative answer)
 *
 * This is NOT a route and is NOT exposed through any API surface yet — the
 * Slice-6 route will wrap it. The caller resolves the authorized reviewer
 * identity + submission retrieval context first (`checkReviewerContextAccess`
 * / `buildReviewerLkContext`) exactly as the deployed CAH-4E topic route does;
 * `actorUserId` is the server-resolved reviewer id, NEVER client-supplied.
 *
 * ── AUDIT SEMANTICS (CAH-4G.5 Option A) ──────────────────────────────────
 * The existing `lk_research` contract is reused UNCHANGED: the row is
 * `access_kind='lk_research'` + actor + submission + `created_at`. No topic, no
 * claim ids, no research mode, no BI status, no raw question, no answer prose.
 * See `projectHrrAuditRecord` for why that is honest for HRR.
 *
 * Append-only: one row per research action; a legitimate repeated research
 * access writes another row (no dedup, no idempotency key — the same contract
 * the CAH-4E route already enforces: "three lookups → three audit calls").
 *
 * This module writes NO assessment / workbook / evidence / finding / outcome /
 * sign-off state, reads NO Linked CRC content, creates NO CRC `UserGoal`, and
 * re-runs NO classification / applicability / Bounded Interpretation. Enforced
 * by `__tests__/hrr/audited-hrr-research-firewall.test.ts`.
 */

import { runHrrResearch, type RunHrrResearchInput } from '@/lib/hrr/run-hrr-research'
import { projectHrrResearchAnswer } from '@/lib/hrr/project-hrr-research-answer'
import { projectHrrAuditRecord } from '@/lib/hrr/project-hrr-audit-record'
import type { HrrResearchAnswer } from '@/lib/hrr/types'
import { recordReviewerLkAccess } from '@/lib/reviewer-lk/repository'

/**
 * Thrown when the required `lk_research` access audit could not be persisted.
 * The caller returns its existing safe error contract (the CAH-4E topic route
 * answers a 503 with a fixed message and zero governed content) — it must NOT
 * return the answer with "audit failed" attached, and must NOT log the answer.
 */
export class HrrAuditNotRecordedError extends Error {
  readonly reviewerFacingMessage = 'Living Knowledge research unavailable — access could not be recorded.'
  constructor(cause?: unknown) {
    super('HRR research access could not be audited; governed content withheld.')
    this.name = 'HrrAuditNotRecordedError'
    if (cause !== undefined) this.cause = cause
  }
}

export interface AuditedHrrResearchInput extends RunHrrResearchInput {
  /** The authorized reviewer's server-resolved id (`checkReviewerContextAccess`). NEVER client-supplied. */
  actorUserId: string
  /** The submission the research is scoped to (the `/api/admin/submissions/[id]` path segment). */
  submissionId: string
}

/**
 * Run the full deterministic HRR pipeline, persist the required access audit,
 * then return the consultative answer — in that order. On audit-write failure
 * this throws `HrrAuditNotRecordedError` and returns NOTHING governed.
 *
 * Ordering (audit-before-content):
 *   1. `runHrrResearch`            — pure, in memory
 *   2. `projectHrrResearchAnswer`  — pure, in memory (NOT returned yet)
 *   3. `projectHrrAuditRecord`     — pure; `null` ⇒ no governed research ⇒ no event
 *   4. `recordReviewerLkAccess`    — the durable write; throws on failure
 *   5. return the answer           — only now
 *
 * A pipeline failure (1) or composition failure (2) throws before step 4, so a
 * failed research action never produces a successful audit row.
 */
export async function runAuditedHrrResearch(input: AuditedHrrResearchInput): Promise<HrrResearchAnswer> {
  const result = runHrrResearch(input)
  const answer = projectHrrResearchAnswer(result)

  const auditRecord = projectHrrAuditRecord(
    { actorUserId: input.actorUserId, submissionId: input.submissionId },
    result,
  )

  if (auditRecord !== null) {
    try {
      await recordReviewerLkAccess(auditRecord)
    } catch (cause) {
      throw new HrrAuditNotRecordedError(cause)
    }
  }

  return answer
}
