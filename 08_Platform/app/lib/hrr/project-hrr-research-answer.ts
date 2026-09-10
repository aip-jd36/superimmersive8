/**
 * projectHrrResearchAnswer — deterministic HRR consultative composition
 * (CAH-4G.4 Slice 4, 2026-09-10).
 *
 * Turns the trusted structured output of `runHrrResearch()` →
 * `HrrResearchResult` into a useful, consultant-like reviewer answer
 * (`HrrResearchAnswer`) — WITHOUT a second model call, WITHOUT re-evaluating
 * applicability, WITHOUT inventing a factual proposition, and WITHOUT ever
 * expressing a conclusion stronger than Bounded Interpretation already
 * permits.
 *
 * ── WHAT THIS MODULE MAY DO (PRD_CAH_4G_HRR, Slice 4) ─────────────────────
 *   prioritise · group · order · deduplicate · summarise mechanically ·
 *   label · explain fixed semantic relationships · project already-bounded
 *   governed material into answer sections.
 *
 * ── WHAT THIS MODULE MAY NOT DO ──────────────────────────────────────────
 *   invent a new factual proposition · infer a project fact · re-evaluate
 *   applicability · reinterpret provider scope · strengthen Bounded
 *   Interpretation · decide the assessment outcome · determine evidence
 *   sufficiency · answer an approval/clearance question · introduce a legal
 *   conclusion.
 *
 * ── GROUNDING RULE (ADR-002 §I — test-enforced by hrr-projection.test.ts) ─
 * Every substantive string in the output is exactly one of:
 *   (A) a verbatim governed `ReviewerLkClaim.statement`;
 *   (B) a deterministic applicability outcome / permitted structured context,
 *       accurately characterised;
 *   (C) a verbatim `BoundedInterpretation.summary_blocks` entry;
 *   (D) a fixed authority / limitation / navigation template constant
 *       (every such constant is defined in this file);
 *   (E) a mechanical provenance / status enumeration (`claim_id`,
 *       `governed_claims_reference`, requirement `fact` values, status values).
 * The reviewer's own text appears ONLY as `question_text` — a verbatim
 * attributed quotation, never a factual grounding source. A false premise in
 * the question is never echoed as fact.
 *
 * ── MATERIALITY / ORDERING (documented limitation) ───────────────────────
 * There is NO governed materiality signal in `HrrResearchResult` (no per-claim
 * weight, no topic priority). This module therefore does NOT rank: `topics`
 * preserve the authority-gate's deterministic clause order, and within a
 * topic every list preserves its upstream order (BI citation order for
 * `governed_considerations`; `selectReviewerClaims`' `claim_id` sort for
 * `does_not_apply`; requirement-key sort for the deduplicated rollup). If a
 * governed materiality signal is added later, ordering can become
 * signal-driven without changing this contract.
 *
 * ── ESTABLISHED ≠ RESOLVED ───────────────────────────────────────────────
 * For `bi_status === 'relevant_applicability_unresolved'` the composition
 * NEVER renders language equivalent to established / resolved / satisfied /
 * cleared / compliant / sufficient about the requirement or the submission —
 * only that applicability is unresolved and the unresolved input must be
 * established (by the Human Reviewer) before the guidance can be applied.
 *
 * PURE. No I/O, no DB, no audit, no model. Never throws.
 */

import type { InterpretationStatus } from '@/lib/bounded-interpretation/types'
import type { ApplicabilityRequirement } from '@/lib/retrieval-engine/types'
import { reviewerTopicLabel } from '@/lib/reviewer-lk/topic-labels'
import type { ReviewerApplicabilityOutcome, ReviewerLkClaim } from '@/lib/reviewer-lk/types'
import type {
  HrrAnswerTopic,
  HrrApplicabilityRollup,
  HrrGovernedConsideration,
  HrrResearchAnswer,
  HrrResearchResult,
  HrrResearchTopicResult,
  HrrUnresolvedInput,
} from './types'

// ── (D) fixed template constants — the ONLY prose this module authors ─────

/** (A) one fixed orientation sentence per BI status. `<label>` = the fixed governed topic label. */
const ORIENTATION: Record<InterpretationStatus, (label: string) => string> = {
  directly_relevant: (label) =>
    `Governed Living Knowledge speaks to ${label} for this submission. What it says is set out below; it informs the assessment but does not, by itself, resolve it.`,
  relevant_applicability_unresolved: (label) =>
    `Governed Living Knowledge is relevant to ${label}. Whether it applies to this submission is not established, because one or more inputs the guidance depends on are unconfirmed in the submission's structured facts. The governed proposition is shown below in full; HRR is not concluding that it applies here.`,
  outside_current_coverage: (label) =>
    `Governed Living Knowledge does not currently cover ${label}. HRR has no governed proposition to surface on this topic; this is not a finding either way.`,
  determination_declined: (label) =>
    `This asks HRR to make a determination on ${label}. HRR does not issue determinations, clearances, or commercial conclusions — that judgment stays with the Human Reviewer.`,
}

/** (F) one fixed boundary sentence per BI status — what governed knowledge here does NOT establish. */
const BOUNDARY_NOTE: Record<InterpretationStatus, (label: string) => string> = {
  directly_relevant: () =>
    `Governed Living Knowledge here reflects general governed guidance, not a project-specific determination. It does not tell you that any control is satisfied, that evidence is sufficient, or that the submission is commercially cleared — those remain the Human Reviewer's assessment judgments.`,
  relevant_applicability_unresolved: (label) =>
    `Applicability here is unresolved, so this governed material does not, on its own, tell you the assessment answer for ${label}. HRR has not determined that the submission fulfils what the guidance requires; that depends on inputs still to be confirmed, and it is the Human Reviewer's to establish.`,
  outside_current_coverage: (label) =>
    `Absence of governed coverage is not a finding. It means HRR has no governed basis to speak to ${label}; the Human Reviewer assesses it directly from the evidence.`,
  determination_declined: () =>
    `HRR provides governed research only. Approval, clearance, control pass/fail, evidence sufficiency, and the assessment outcome are the Human Reviewer's exclusively.`,
}

const REVIEWER_RESPONSIBILITY_NOTE =
  "HRR surfaces governed Living Knowledge and its deterministic applicability to this submission's structured facts. It does not evaluate evidence, decide controls, determine sufficiency, or reach an assessment outcome — those remain the Human Reviewer's responsibility. Reviewer Resources are reference only, not assessment evidence."

const ASSESSMENT_AUTHORITY_NOTE =
  'You asked HRR to make an assessment decision — approve, reject, commercially clear, pass a control, judge evidence sufficiency, or reach an outcome. HRR does not make assessment decisions; that is the Human Reviewer\'s role. Any governed research below is input to your assessment, not a substitute for it.'

const doesNotApplyNote = (label: string): string =>
  `One or more governed propositions for ${label} are shown below as not applying to this submission: a requirement they carry is confirmed false from the submission's structured facts (for example, an excluded jurisdiction). This is a settled applicability fact, not a negative assessment finding.`

const unresolvedRequirementNote = (identifier: string, label: string): string =>
  `Governed guidance for ${label} depends on the input "${identifier}", which is not established from the submission's structured facts. Until it is confirmed, HRR cannot determine how that guidance applies here — establishing it is part of the Human Reviewer's assessment.`

const unresolvedDependencyNote = (identifier: string, label: string): string =>
  `Governed guidance for ${label} depends on the project fact "${identifier}", which HRR does not model. The Human Reviewer establishes this from the submission evidence.`

/**
 * Fired only when the free-form classifier flagged `multiple_unrelated_topics`
 * (the reviewer named more governed topics than `HRR_MAX_RESOLVED_TOPICS`) AND
 * at least one topic was researched. `researchedLabels` is a mechanical
 * enumeration of the researched topic labels (grounding E).
 */
const scopeNote = (researchedLabels: string[]): string =>
  `Your question named more governed topics than HRR researches in one pass. Researched here: ${researchedLabels.join(', ')}. Ask again for any other topic you need.`

/**
 * The COMPLETE enumerable set of fixed template strings/builders this module
 * is allowed to author (grounding source D). `hrr-projection.test.ts` uses
 * this to prove that every module-authored substantive string in an
 * `HrrResearchAnswer` reconstructs from exactly one of these — i.e. the
 * composer never emits free prose. Adding a template here is a deliberate act.
 */
export const HRR_ANSWER_TEMPLATES = {
  reviewer_responsibility_note: REVIEWER_RESPONSIBILITY_NOTE,
  assessment_authority_note: ASSESSMENT_AUTHORITY_NOTE,
  orientation: ORIENTATION,
  boundary_note: BOUNDARY_NOTE,
  does_not_apply_note: doesNotApplyNote,
  unresolved_requirement_note: unresolvedRequirementNote,
  unresolved_dependency_note: unresolvedDependencyNote,
  scope_note: scopeNote,
} as const

// ── mechanical helpers ───────────────────────────────────────────────────

/**
 * `determination_declined` — respect BI's ceiling: the topic entry carries
 * ONLY the fixed refusal orientation + boundary + navigation (withheld /
 * refs). BI cited nothing, so composition cites nothing — no governed
 * proposition, no applicability rollup, no unresolved-input list, no
 * does-not-apply block, even where the selector produced claims in memory.
 */
const STATUSES_WITH_NO_CONTENT: ReadonlySet<InterpretationStatus> = new Set<InterpretationStatus>([
  'determination_declined',
])

/**
 * Statuses for which `bi_summary_blocks` is omitted because the SHARED
 * `bounded-interpretation/rules.ts` copy for that status is CRC-channel-worded
 * ("CRC doesn't currently have governed guidance…" / "CRC doesn't issue
 * certifications…"). HRR's fixed `orientation` (A) + `boundary_note` (F) carry
 * the channel-appropriate equivalent. `directly_relevant` and
 * `relevant_applicability_unresolved` KEEP their blocks — those carry the
 * verbatim governed proposition + its hedge and must never be dropped.
 */
const STATUSES_WITHOUT_BI_BLOCKS: ReadonlySet<InterpretationStatus> = new Set<InterpretationStatus>([
  'determination_declined',
  'outside_current_coverage',
])

function orientationFor(status: InterpretationStatus, label: string): string {
  return (ORIENTATION[status] ?? ORIENTATION.outside_current_coverage)(label)
}
function boundaryNoteFor(status: InterpretationStatus, label: string): string {
  return (BOUNDARY_NOTE[status] ?? BOUNDARY_NOTE.outside_current_coverage)(label)
}

function requirementKey(req: ApplicabilityRequirement): string {
  return `${req.fact} ${req.tool ?? ''} ${req.operator} ${req.value}`
}

function toConsideration(claim: ReviewerLkClaim): HrrGovernedConsideration {
  return {
    claim_id: claim.claim_id,
    statement_verbatim: claim.statement,
    applicability_established: claim.applicability_established,
    applicability_outcomes: claim.applicability_outcomes,
    unresolved_project_dependencies: claim.unresolved_project_dependencies,
    governed_claims_reference: claim.governed_claims_reference,
  }
}

/** Deduplicated, deterministically-ordered requirement list for one outcome status. */
function collectRequirements(
  claims: ReviewerLkClaim[],
  status: ReviewerApplicabilityOutcome['status'],
): ApplicabilityRequirement[] {
  const seen = new Map<string, ApplicabilityRequirement>()
  for (const claim of claims) {
    for (const outcome of claim.applicability_outcomes) {
      if (outcome.status === status) {
        const key = requirementKey(outcome.requirement)
        if (!seen.has(key)) seen.set(key, outcome.requirement)
      }
    }
  }
  return [...seen.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([, req]) => req)
}

function buildApplicabilityRollup(
  governedClaims: ReviewerLkClaim[],
  doesNotApply: ReviewerLkClaim[],
): HrrApplicabilityRollup {
  return {
    established: collectRequirements(governedClaims, 'met'),
    unresolved: collectRequirements(governedClaims, 'unresolved'),
    not_met: collectRequirements(doesNotApply, 'not_met'),
  }
}

function buildUnresolvedInputs(governedClaims: ReviewerLkClaim[], label: string): HrrUnresolvedInput[] {
  const requirementInputs = new Map<string, HrrUnresolvedInput>()
  const dependencyInputs = new Map<string, HrrUnresolvedInput>()

  for (const claim of governedClaims) {
    for (const outcome of claim.applicability_outcomes) {
      if (outcome.status !== 'unresolved') continue
      const key = requirementKey(outcome.requirement)
      const existing = requirementInputs.get(key)
      if (existing) {
        if (!existing.from_claim_ids.includes(claim.claim_id)) existing.from_claim_ids.push(claim.claim_id)
      } else {
        requirementInputs.set(key, {
          kind: 'applicability_requirement',
          identifier: outcome.requirement.fact,
          requirement: outcome.requirement,
          from_claim_ids: [claim.claim_id],
          note: unresolvedRequirementNote(outcome.requirement.fact, label),
        })
      }
    }
    for (const dependency of claim.unresolved_project_dependencies) {
      const existing = dependencyInputs.get(dependency)
      if (existing) {
        if (!existing.from_claim_ids.includes(claim.claim_id)) existing.from_claim_ids.push(claim.claim_id)
      } else {
        dependencyInputs.set(dependency, {
          kind: 'project_dependency',
          identifier: dependency,
          requirement: null,
          from_claim_ids: [claim.claim_id],
          note: unresolvedDependencyNote(dependency, label),
        })
      }
    }
  }

  return [
    ...[...requirementInputs.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, v]) => v),
    ...[...dependencyInputs.keys()].sort().map((k) => dependencyInputs.get(k) as HrrUnresolvedInput),
  ]
}

function dedupeRefs(...groups: HrrGovernedConsideration[][]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const group of groups) {
    for (const item of group) {
      if (item.governed_claims_reference && !seen.has(item.governed_claims_reference)) {
        seen.add(item.governed_claims_reference)
        out.push(item.governed_claims_reference)
      }
    }
  }
  return out
}

// ── per-topic projection ─────────────────────────────────────────────────

function projectTopic(topic: HrrResearchTopicResult): HrrAnswerTopic {
  const label = reviewerTopicLabel(topic.topic)
  const status = topic.bi_status
  const noContent = STATUSES_WITH_NO_CONTENT.has(status)

  // (F) governed knowledge that exists but is not reviewer-eligible — always
  // shown (reason only, never content); pure navigation/transparency.
  const withheld = topic.withheld

  if (noContent) {
    // `determination_declined` — respect BI's ceiling. Surface only the
    // refusal orientation + boundary + navigation. No governed proposition,
    // no applicability, no unresolved-input list, no does-not-apply block —
    // BI cited nothing, so composition cites nothing.
    return {
      topic: topic.topic,
      topic_label: label,
      intent_origin: topic.intent_origin,
      bi_status: status,
      orientation: orientationFor(status, label),
      bi_summary_blocks: [],
      governed_considerations: [],
      applicability: { established: [], unresolved: [], not_met: [] },
      unresolved_inputs: [],
      does_not_apply: [],
      does_not_apply_note: '',
      boundary_note: boundaryNoteFor(status, label),
      withheld,
      governed_claim_refs: [],
    }
  }

  // (B) only the governed propositions BI actually surfaced, in BI citation
  // order. `supporting_claim_ids` is `[]` for `outside_current_coverage`.
  const surfaced: HrrGovernedConsideration[] = topic.supporting_claim_ids
    .map((id) => topic.governed_claims.find((c) => c.claim_id === id))
    .filter((c): c is ReviewerLkClaim => c !== undefined)
    .map(toConsideration)

  const doesNotApply = topic.does_not_apply.map(toConsideration)

  return {
    topic: topic.topic,
    topic_label: label,
    intent_origin: topic.intent_origin,
    bi_status: status,
    orientation: orientationFor(status, label),
    bi_summary_blocks: STATUSES_WITHOUT_BI_BLOCKS.has(status) ? [] : topic.summary_blocks,
    governed_considerations: surfaced,
    applicability: buildApplicabilityRollup(topic.governed_claims, topic.does_not_apply),
    unresolved_inputs:
      status === 'relevant_applicability_unresolved'
        ? buildUnresolvedInputs(topic.governed_claims, label)
        : [],
    does_not_apply: doesNotApply,
    does_not_apply_note: doesNotApply.length > 0 ? doesNotApplyNote(label) : '',
    boundary_note: boundaryNoteFor(status, label),
    withheld,
    governed_claim_refs: dedupeRefs(surfaced, doesNotApply),
  }
}

// ── entry point ──────────────────────────────────────────────────────────

/**
 * Deterministically project one `runHrrResearch()` result into the
 * consultative `HrrResearchAnswer`. NO model call. See the module header for
 * the full authority contract.
 */
export function projectHrrResearchAnswer(result: HrrResearchResult): HrrResearchAnswer {
  const research_mode: HrrResearchAnswer['research_mode'] =
    result.attributed_question === null ? 'topic_pick' : 'question'

  const assessment_authority_note =
    result.authority_note === 'assessment_judgment_redirected' ? ASSESSMENT_AUTHORITY_NOTE : null

  const topics = result.per_topic.map(projectTopic)

  const scope_note =
    result.unresolved_ambiguity.includes('multiple_unrelated_topics') && topics.length > 0
      ? scopeNote(topics.map((t) => t.topic_label))
      : ''

  return {
    research_mode,
    question_text: result.attributed_question,
    authority_note: result.authority_note,
    assessment_authority_note,
    scope_note,
    topics,
    offered_research_paths: result.offered_research_paths,
    reviewer_responsibility_note: REVIEWER_RESPONSIBILITY_NOTE,
  }
}
