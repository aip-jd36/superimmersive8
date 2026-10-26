/**
 * CR-IMPL-1 / CR-IMPL-1b — SYNTHETIC, TEST-ONLY fixtures.
 *
 * Nothing here is a governed claim, an approved Register entry, an approved
 * ledger entry or an approved objective. Claim ids are prefixed CLAIM-SYN-,
 * entries SYN-, so none can be mistaken for real governance. Synthetic
 * claims use real canonical tool/provider identifiers only so that the real
 * normalizer and selector can be exercised. The boundaries test asserts no
 * non-test file imports this module.
 */

import type { BoundedInterpretation, InterpretationStatus } from '@/lib/bounded-interpretation/types'
import type { TopicClaim } from '@/lib/retrieval-engine/types'
import type { SelectedClaim } from '../compose'
import type { LocationVocabulary } from '../location'
import type { ClaimDescriptor, PublicationLedgerEntry } from '../publication-ledger'
import type { ObservationMapEntry, QuestionEntry, RegistryInput } from '../question-registry'
import type { GovernanceApproval } from '../types'

export const APPROVED: GovernanceApproval = { status: 'approved', approver: 'SYN-APPROVER', decision_date: '2026-10-01', review_ref: 'SYN-REVIEW-1' }
export const PENDING: GovernanceApproval = { status: 'pending', approver: null, decision_date: null, review_ref: null }

export const SYN_VOCABULARY: LocationVocabulary = { version: 'SYN-LOC-1', region_codes: ['SYN-GROUP'] }

const q = (over: Partial<QuestionEntry> & Pick<QuestionEntry, 'q_id'>): QuestionEntry => ({
  version: 1,
  question_kind: 'factual_value',
  wording_ref: `SYN-WORDING-${over.q_id}`,
  options: ['yes', 'no', 'not_sure'],
  display_condition: { kind: 'always' },
  approval: APPROVED,
  ...over,
})

const o = (over: Partial<ObservationMapEntry> & Pick<ObservationMapEntry, 'o_id' | 'q_id' | 'target'>): ObservationMapEntry => ({
  version: 1,
  q_version: 1,
  applies_to: { kind: 'any_answer' },
  observation_kind: 'declared_value',
  value_mapping_version: 'SYN-MAP-1',
  approval: APPROVED,
  ...over,
})

const LOCATION_OPTIONS = ['AA', 'BB-01', 'CC', 'SYN-GROUP', 'US', 'US-CA', 'online_worldwide', 'other', 'not_sure']

export function synRegistryInput(): RegistryInput {
  return {
    questions: [
      q({ q_id: 'SYN-TOOL-PLAN', options: ['syn_free', 'syn_paid', 'not_sure'] }),
      q({ q_id: 'SYN-PRESENCE', question_kind: 'factual_presence' }),
      q({ q_id: 'SYN-DOC-EXISTS', question_kind: 'document_existence', display_condition: { kind: 'answer_includes', q_id: 'SYN-PRESENCE', any_of: ['yes'] } }),
      q({ q_id: 'SYN-PENDING-Q', approval: PENDING }),
      q({ q_id: 'SYN-BASED', options: LOCATION_OPTIONS }),
      q({ q_id: 'SYN-SHOWN', options: LOCATION_OPTIONS }),
      q({ q_id: 'SYN-DESCRIBE', question_kind: 'description', options: 'free_text' }),
      // Integration: per-tool block (answers carry an `instance`).
      q({ q_id: 'SYN-TOOL', options: 'free_text' }),
      q({ q_id: 'SYN-PLAN', options: 'free_text' }),
      q({ q_id: 'SYN-ACCOUNT', options: 'free_text' }),
      q({ q_id: 'SYN-PROVIDER', options: 'free_text' }),
    ],
    observation_map: [
      o({ o_id: 'SYN-O-PLAN', q_id: 'SYN-TOOL-PLAN', target: { kind: 'applicability_fact', fact: 'tool_plan_tier', tool: 'syn-tool' } }),
      o({ o_id: 'SYN-O-PRESENCE', q_id: 'SYN-PRESENCE', applies_to: { kind: 'option', value: 'yes' }, observation_kind: 'declared_presence', target: { kind: 'dependency', dependency_id: 'syn_presence_dep' } }),
      // Existence answer attached to an evidence-only-style dependency: display only, never resolves.
      o({ o_id: 'SYN-O-DOC', q_id: 'SYN-DOC-EXISTS', applies_to: { kind: 'option', value: 'yes' }, observation_kind: 'declared_document_existence', target: { kind: 'dependency', dependency_id: 'syn_evidence_only_dep' } }),
      o({ o_id: 'SYN-O-PENDING-MAP', q_id: 'SYN-PRESENCE', applies_to: { kind: 'option', value: 'no' }, observation_kind: 'declared_presence', target: { kind: 'dependency', dependency_id: 'syn_presence_dep' }, approval: PENDING }),
      o({ o_id: 'SYN-O-BASED', q_id: 'SYN-BASED', target: { kind: 'location', role: 'creator_base' } }),
      o({ o_id: 'SYN-O-SHOWN', q_id: 'SYN-SHOWN', target: { kind: 'location', role: 'distribution_market' } }),
      o({ o_id: 'SYN-O-DESCRIBE', q_id: 'SYN-DESCRIBE', observation_kind: 'declared_description', target: { kind: 'dependency', dependency_id: 'syn_description_dep' } }),
      o({ o_id: 'SYN-O-TOOL', q_id: 'SYN-TOOL', target: { kind: 'tool_identity' } }),
      o({ o_id: 'SYN-O-PLAN-BOUND', q_id: 'SYN-PLAN', target: { kind: 'applicability_fact', fact: 'tool_plan_tier' } }),
      o({ o_id: 'SYN-O-ACCOUNT', q_id: 'SYN-ACCOUNT', target: { kind: 'applicability_fact', fact: 'tool_account_status' } }),
      o({ o_id: 'SYN-O-PROVIDER', q_id: 'SYN-PROVIDER', target: { kind: 'asset_provider_identity' } }),
    ],
    prohibited_dependency_targets: ['syn_legal_determination_dep'],
  }
}

export function synClaim(over: Partial<ClaimDescriptor> & Pick<ClaimDescriptor, 'claim_id'>): ClaimDescriptor {
  return { applicability_requirements: [], unresolved_project_dependencies: [], last_verified: '2026-09-01', superseded_by: null, ...over }
}

/** A full synthetic TopicClaim for the real selector. Reviewer-eligible by default; NOT Creator-Record-authorized unless a ledger entry says so. */
export function synTopicClaim(over: Partial<TopicClaim> & Pick<TopicClaim, 'claim_id' | 'topic'>): TopicClaim {
  return {
    claim_character: 'established',
    jurisdiction: 'Global',
    lifecycle: 'Adopted',
    crc_eligible: 'No',
    crc_publication_scope: null,
    crc_candidate_statement: `SYN governed statement for ${over.claim_id}`,
    publication_scope: 'Reviewer/Commercial Assurance',
    applicability_requirements: [],
    unresolved_project_dependencies: [],
    provider_scope: null,
    tool_scope: null,
    last_verified: '2026-09-01',
    superseded_by: null,
    ...over,
  }
}

export function synSelected(claim: ClaimDescriptor, applicability_status: 'met' | 'unresolved' = 'met'): SelectedClaim {
  return { claim, applicability_status, applicability_material_unresolved: [] }
}

export function synLedgerEntry(over: Partial<PublicationLedgerEntry> & Pick<PublicationLedgerEntry, 'claim_id'>): PublicationLedgerEntry {
  return {
    entry_id: `SYN-LEDGER-${over.claim_id}`,
    version: 1,
    claim_last_verified: '2026-09-01',
    creator_record_eligible: 'Yes',
    explanation: `SYN explanation for ${over.claim_id}`,
    applicability_policy: 'met_or_unresolved',
    evidence_notes: {},
    required_caveats: ['SYN-CAVEAT-1'],
    approver: 'SYN-APPROVER',
    decision_date: '2026-10-01',
    refresh_by: '2027-01-01',
    superseded_by: null,
    ...over,
  }
}

export function synBi(status: InterpretationStatus, supporting: string[], unresolved: string[] = [], goalId = `SYN-GOAL-${status}`): BoundedInterpretation {
  return {
    goal_id: goalId,
    goal_text: 'SYN goal',
    category: 'commercial_use',
    status,
    summary: 'SYN BI summary — must never be rendered by Creator Record',
    summary_blocks: ['SYN BI summary — must never be rendered by Creator Record'],
    supporting_claim_ids: supporting,
    unresolved_relevant_claims: unresolved.map((claim_id) => ({ claim_id, fact: null, tool: null, unresolved_reason: null })),
  }
}

export const SYN_LABELS: Readonly<Record<string, string>> = { syn_evidence_only_dep: 'SYN evidence-only dimension' }
export const synLabel = (id: string): string | undefined => SYN_LABELS[id]
