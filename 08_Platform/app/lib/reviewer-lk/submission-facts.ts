/**
 * Submission → reviewer-LK retrieval context (CAH-4E §6/§7).
 *
 * Turns the AUTHORITATIVE submission facts a reviewer is already looking at
 * into the bounded retrieval context used to narrow governed-knowledge
 * lookup: canonical tool identity, canonical asset-provider identity (V1: not
 * modelled), and assessment-jurisdiction membership.
 *
 * These remain SUBMISSION FACTS. They never become Living Knowledge. The
 * Living Knowledge results they narrow never become submission evidence. No
 * derived applicability interpretation is written back to the submission or
 * the workbook.
 *
 * Pure. Reuses the existing generic `normalizeCandidate` structured-fact
 * primitive for tool canonicalization — never a new alias table, never an
 * LLM call. An unresolvable / ambiguous tool name is simply dropped
 * (fail-closed: unresolved identity contributes no narrowing).
 */

import { normalizeCandidate } from '@/lib/interview-engine/extraction'
import type { AssessmentJurisdictionFacts, ApplicabilityFacts } from '@/lib/retrieval-engine/lookup-topic-claims'
import type { ReviewerLkRetrievalContext } from './types'

/** The subset of the `submissions` row this module reads. */
export interface ReviewerLkSubmissionFactsInput {
  tools_used: unknown
  territory_preferences: unknown
}

function parseJsonMaybe(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/** Canonical tool ids resolved from `submissions.tools_used` via `normalizeCandidate`. Order-preserving, de-duplicated. */
export function resolveSubmissionToolIds(toolsUsed: unknown): string[] {
  const arr = parseJsonMaybe(toolsUsed)
  if (!Array.isArray(arr)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of arr) {
    const rawName =
      entry && typeof entry === 'object'
        ? (entry as Record<string, unknown>).tool_name ?? (entry as Record<string, unknown>).toolName ?? (entry as Record<string, unknown>).tool
        : entry
    if (typeof rawName !== 'string' || rawName.trim().length === 0) continue
    const result = normalizeCandidate({
      kind: 'tool_mention',
      raw_tool_name: rawName,
      raw_text: rawName,
      proposal_id: 'reviewer-lk',
      turn: 0,
    })
    // fail closed: only a fully resolved canonical identity narrows retrieval.
    if (result.status === 'resolved' && !seen.has(result.canonical_identifier)) {
      seen.add(result.canonical_identifier)
      out.push(result.canonical_identifier)
    }
  }
  return out
}

/**
 * Assessment-jurisdiction membership from `submissions.territory_preferences`.
 *
 * KNOWN CATEGORY-ERROR CONSUMER (CA-METH-3B, deferred, documented not fixed):
 * this reads G1 (distribution/exhibition territory, creator-supplied at
 * intake) and returns it typed as `AssessmentJurisdictionFacts` -- the SAME
 * shape the Commercial Assurance workbook's own reviewer-established G2
 * (`workbook_data.section_1.jurisdiction_context`, CA-METH-3B) represents.
 * These are NOT the same fact. This function does not read, and is not
 * corrected by, the workbook's G2 field -- they are on entirely separate
 * data paths (this reads the `submissions` row directly; G2 lives in
 * `workbook_data` JSONB) feeding entirely separate consumers (this feeds
 * Reviewer-LK/HRR governed retrieval; G2 feeds only Commercial Assurance
 * signoff/report). Left deferred rather than repaired here because: (a) its
 * common-case failure direction is UNDER- not OVER-triggering (a broad G1
 * value like "United States" will not literally equal a narrower governed
 * `jurisdiction` requirement like "New York", so it fails to match rather
 * than fabricating a false positive); (b) fixing it correctly would require
 * re-plumbing Reviewer-LK/HRR to accept a workbook-sourced fact instead of a
 * submissions-row fact, which CA-METH-3B's own scope explicitly excludes
 * ("do not opportunistically rewire Reviewer Resources or Living
 * Knowledge"). Future correction: once a CA<->Living-Knowledge bridge exists
 * (CA-HRQ-2 territory), re-source this from the reviewer-established
 * `jurisdiction_context.details` (when concrete) rather than
 * `territory_preferences`.
 */
export function resolveSubmissionJurisdiction(territoryPreferences: unknown): AssessmentJurisdictionFacts {
  if (typeof territoryPreferences === 'string' && territoryPreferences.trim().length > 0) {
    return { included: [territoryPreferences.trim()], excluded: [] }
  }
  return { included: [], excluded: [] }
}

export interface ReviewerLkContextBundle {
  context: ReviewerLkRetrievalContext
  /** `ApplicabilityFacts` for the generic `evaluateApplicabilityDetailed` primitive. V1 supplies no `toolMentions` — plan-tier / account-status are not modelled from submission structured data, so those requirements evaluate `'unresolved'` (correct). */
  applicabilityFacts: ApplicabilityFacts
  /** Canonical tool ids for `toolScopeMatches`. */
  activeToolIds: string[]
  /** Canonical asset-provider ids for `providerScopeMatches`. V1: always `[]`. */
  assetProviderIds: string[]
}

export function buildReviewerLkContext(input: ReviewerLkSubmissionFactsInput): ReviewerLkContextBundle {
  const activeToolIds = resolveSubmissionToolIds(input.tools_used)
  const jurisdiction = resolveSubmissionJurisdiction(input.territory_preferences)
  const assetProviderIds: string[] = [] // V1: no structured asset-provider field on `submissions`.

  return {
    context: {
      resolved_tool_ids: activeToolIds,
      resolved_asset_provider_ids: assetProviderIds,
      jurisdiction_included: jurisdiction.included,
    },
    applicabilityFacts: { jurisdiction, toolMentions: [] },
    activeToolIds,
    assetProviderIds,
  }
}
