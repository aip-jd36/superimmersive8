/**
 * Reviewer CRC Context — READ-ONLY service (CAH-4B §§3–4, §7–9).
 *
 * The single read path from a Commercial Assurance submission to the CRC
 * context the reviewer may see:
 *
 *   submission_id
 *     -> listActiveAssociationsForSubmission()          (authoritative association)
 *     -> association.crc_session_id                      (server-derived, never client-supplied)
 *     -> getCrcSessionForAssociation()                   (persisted StructuredUnderstanding)
 *     -> buildCrcProjectContext()                        (neutral, non-interpreting projection)
 *      + association provenance                          (permission fact, never ownership)
 *      + compareCrcStateIdentity()                       (neutral: unchanged / changed / comparison_unavailable)
 *
 * AUTHORITY FIREWALL (structurally enforced, not by comment —
 * `__tests__/reviewer-context/authority-firewall.test.ts`):
 *   - imports NOTHING from `@/lib/assessments`, `@/app/admin/submissions`, or
 *     `@/app/api/admin/submissions`;
 *   - exports READ operations only — no create/update/delete of any kind;
 *   - performs NO database write (every call it makes — the two handoff
 *     repository reads — is a `SELECT`);
 *   - returns a `ReviewerCrcContext` value; it never assembles `workbook_data`,
 *     an evidence record, a control judgment, a gap, a finding, an outcome, a
 *     confidence, a sign-off, or a report conclusion, and there is no helper
 *     here that converts a goal / assertion into any of those.
 *
 * Fail closed: an unparseable `StructuredUnderstanding` yields `project: null`
 * (never a fabricated projection); any state-identity read error yields
 * `state_comparison: 'comparison_unavailable'` (never a false `'unchanged'`).
 */

import { deserializeStructuredUnderstanding } from '@/lib/interview-engine/serialization'
import { buildCrcProjectContext } from '@/lib/crc-project-context/projection'
import {
  listActiveAssociationsForSubmission,
  compareCrcStateIdentity,
  computeCrcStateIdentity,
} from '@/lib/crc-assurance-handoff'
import { getCrcSessionForAssociation } from '@/lib/crc-assurance-handoff/repository'
import type { CrcProjectContext } from '@/lib/crc-project-context/types'
import type { ReviewerCrcContext, ReviewerCrcContextItem, CrcStateComparison } from './types'

function projectOrNull(rawStructuredUnderstanding: unknown): CrcProjectContext | null {
  try {
    const su = deserializeStructuredUnderstanding(JSON.stringify(rawStructuredUnderstanding))
    return buildCrcProjectContext(su)
  } catch {
    return null
  }
}

function stateComparisonFor(
  rawStructuredUnderstanding: unknown,
  boundFingerprint: string,
  boundCanonVersion: string,
): CrcStateComparison {
  try {
    const current = computeCrcStateIdentity(rawStructuredUnderstanding)
    return compareCrcStateIdentity(
      { fingerprint: boundFingerprint, canonicalization_version: boundCanonVersion },
      current,
    )
  } catch {
    return 'comparison_unavailable'
  }
}

/**
 * The authoritative reviewer CRC-context read. Handles the real repository
 * cardinality: zero active associations -> `{ linked: false }` (no CRC content
 * exposed); one or more -> one bounded item each, in the repository's own
 * `associated_at DESC` order. A reviewer/admin can never influence which CRC
 * session is read — `crcSessionId` is always resolved from the active
 * association for `submissionId`.
 */
export async function getReviewerCrcContext(submissionId: string): Promise<ReviewerCrcContext> {
  const associations = await listActiveAssociationsForSubmission(submissionId)
  if (associations.length === 0) return { linked: false }

  const items: ReviewerCrcContextItem[] = []
  for (const a of associations) {
    const session = await getCrcSessionForAssociation(a.crc_session_id)
    items.push({
      provenance: {
        association_id: a.id,
        authorization_basis: a.authorization_basis,
        associated_at: a.associated_at,
        status: 'active',
        crc_session_id: a.crc_session_id,
      },
      project: session ? projectOrNull(session.structured_understanding) : null,
      state_comparison: session
        ? stateComparisonFor(session.structured_understanding, a.crc_state_fingerprint, a.crc_state_canon_version)
        : 'comparison_unavailable',
    })
  }
  return { linked: true, associations: items }
}
