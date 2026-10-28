/**
 * CR-ARTIFACT-1 — explicit legacy / private-artifact precedence for Creator
 * Record fulfilment. Wired into payment fulfilment through its two existing
 * dependencies (`hasCreatorRecordPdf`, `generateCreatorRecordPdf`), so the
 * fulfilment runner itself is unchanged.
 *
 * Precedence, in order:
 *   1. An artifact row exists → the private path decides: complete only when
 *      `issued`; a pending artifact is always resumed on the private path,
 *      whatever the rollout mode (including 'off').
 *   2. A legacy PDF exists (rights_packages.document_url) → complete; never
 *      issued again on either path.
 *   3. Rollout eligibility (CR-ARTIFACT-1C, three states):
 *        'allowlisted'     → issue a private artifact;
 *        'not_allowlisted' → the existing legacy generator, unchanged;
 *        'unknown'         → FAIL CLOSED: throw, so the step stays incomplete
 *                            and is retried; no PDF is issued on either path.
 *
 * `document_url IS NOT NULL` is used ONLY as legacy completion evidence for
 * submissions with no artifact row; it never proves a private artifact. Any
 * error while reading artifact state is thrown (never read as "no artifact").
 */

import type { IssueResult } from './issue'
import type { GateDecision } from './store'

export interface PrecedencePorts {
  /** The artifact row's status, or null when there is definitely none. Throws when unknown. */
  artifactStatus(submissionId: string): Promise<'pending' | 'issued' | null>
  legacyHasPdf(submissionId: string): Promise<boolean>
  gate(submissionId: string): Promise<GateDecision>
  issue(submissionId: string): Promise<IssueResult>
  legacyGenerate(): Promise<void>
}

export type IssuancePath = 'artifact' | 'legacy_complete' | 'legacy'

export class EligibilityUnknownError extends Error {
  constructor() {
    super('creator_record_artifact_eligibility_unknown')
  }
}

export class ArtifactIntegrityError extends Error {
  constructor(readonly artifactId: string) {
    super('creator_record_artifact_integrity_conflict')
  }
}

export async function creatorRecordPdfComplete(submissionId: string, ports: Pick<PrecedencePorts, 'artifactStatus' | 'legacyHasPdf'>): Promise<boolean> {
  const status = await ports.artifactStatus(submissionId)
  if (status !== null) return status === 'issued'
  return ports.legacyHasPdf(submissionId)
}

/** Which path a submission takes now (fulfilment and the admin retry route). Throws EligibilityUnknownError when undecidable. */
export async function issuancePath(submissionId: string, ports: Pick<PrecedencePorts, 'artifactStatus' | 'legacyHasPdf' | 'gate'>): Promise<IssuancePath> {
  if ((await ports.artifactStatus(submissionId)) !== null) return 'artifact'
  if (await ports.legacyHasPdf(submissionId)) return 'legacy_complete'
  const decision = await ports.gate(submissionId)
  if (decision === 'allowlisted') return 'artifact'
  if (decision === 'not_allowlisted') return 'legacy'
  throw new EligibilityUnknownError()
}

/** Fulfilment's "generate" step. Throws to leave the step incomplete (retried / manual queue). */
export async function issueCreatorRecordPdf(submissionId: string, ports: PrecedencePorts): Promise<void> {
  const path = await issuancePath(submissionId, ports)
  if (path === 'legacy_complete') return
  if (path === 'legacy') return ports.legacyGenerate()
  const result = await ports.issue(submissionId)
  if (result.outcome === 'integrity_conflict') throw new ArtifactIntegrityError(result.artifactId)
  // issued / already_issued / contended: the runner re-reads completion; contended stays incomplete until settled.
}
