/**
 * Dependency askability registry (originally Copyright UAT Correction
 * Milestone, 2026-08-19, PM-approved H1; generalized in the Track B —
 * Generic Living-Knowledge Readiness/Askability milestone, 2026-08-20).
 * Small, Interview-Engine/CRC-Engine-owned lookup mapping a governed
 * `TopicClaim.unresolved_project_dependencies` string (see
 * lib/retrieval-engine/types.ts's own header comment on that field) to
 * whether CRC may proactively ask a deterministic conversational question
 * about it, and -- new in this milestone -- HOW the generic readiness
 * mechanism (lib/crc-engine/knowledge-readiness.ts) may acquire it, for
 * dependencies not already owned by a dedicated bespoke module.
 *
 * Deliberately NOT added to TopicClaim's own schema, and deliberately NOT
 * a generic InformationNeed framework living inside governance -- see the
 * completed Human Creative-Contribution Acquisition Architecture
 * Diagnostic (2026-08-19) and the CRC 503/Living Knowledge Architecture
 * Diagnostic (2026-08-20). This is product/acquisition-side metadata, not
 * governed claim content; keeping it in a separate, small, Interview-
 * Engine-owned file preserves the existing ownership boundary --
 * Retrieval/governance owns claim content (`unresolved_project_dependencies`
 * itself, authored in GOVERNED-CLAIMS.md and mirrored in
 * topic-claims-fixture.ts); this module owns what CRC is allowed to
 * proactively ask about, and (for generic-path entries) exactly how.
 *
 * `treatment: 'askable_in_crc'` means: CRC may propose a bounded,
 * self-report conversational question about it. `'evidence_only'` -- or
 * simply absent from this registry -- means CRC must never proactively ask
 * about it in conversation; that fact can only come from documentary
 * evidence reviewed by Commercial Assurance. Absence defaults to
 * non-askable, never the reverse -- a dependency is never askable unless
 * explicitly, deliberately listed here. An unrecognized dependency ID never
 * throws and never blocks completion forever -- it is simply invisible to
 * every askability-aware code path, structurally identical to "no
 * dependency at all" from the interview's point of view.
 *
 * `generic_acquisition` (new in this milestone) is present ONLY for
 * entries the GENERIC readiness path (knowledge-readiness.ts) should
 * itself acquire via a deterministic candidate question. It is
 * deliberately ABSENT for `human_contribution_description`: that
 * dependency is handled entirely by the pre-existing, dedicated
 * human-contribution-clarification.ts module (unchanged, unmigrated, still
 * first in run-turn.ts's precedence chain) -- the generic path must never
 * independently process it, so its entry here carries no acquisition
 * strategy at all, only the treatment flag the dedicated module already
 * reads via `isDependencyAskableInCrc` (preserved, byte-compatible).
 *
 * Load-bearing naming-mismatch finding (Track B architecture diagnostic,
 * 2026-08-20): the real governed stock dependencies today
 * (`asset_confirmed_getty`/`asset_confirmed_istock`/`asset_confirmed_
 * shutterstock`, `editorial_designation_confirmed`, `which_provider`,
 * `separate_authorization_obtained`, `release_status_confirmed`,
 * `rights_and_clearance_status` -- see topic-claims-fixture.ts) do NOT
 * correspond to a "license tier" or "usage" concept at all --
 * `editorial_designation_confirmed` asks whether the SPECIFIC images used
 * are marked "Editorial use only" by the provider, a narrower and
 * different legal question than "which license/subscription tier do you
 * have," which the earlier production UAT's own ad hoc question
 * ("standard, extended, or editorial license?") conflated. None of the
 * real stock dependency strings are registered `askable_in_crc` here --
 * doing so would require a PM/legal decision on safe question wording for
 * a genuinely new acquisition case, which this architecture milestone does
 * not make on its own authority (see the milestone's own final report,
 * item 47/48, for the full accounting). This registry's SHAPE is proven
 * generic via synthetic test-only entries (see
 * __tests__/crc-engine/knowledge-readiness.test.ts), not via a real stock
 * entry.
 *
 * One real, live entry exists today -- `human_contribution_description`.
 * That is expected, not a placeholder awaiting more content: this
 * registry's SHAPE is now proven generic (this milestone), but real new
 * entries should still only be added when a genuine, PM-approved
 * acquisition milestone needs one -- never speculatively.
 */

export type DependencyTreatment = 'askable_in_crc' | 'evidence_only'

/**
 * Where the generic readiness path writes a confirmed answer. Deliberately
 * a small, closed union -- a new target kind is added only when a genuinely
 * new structured fact SHAPE is needed (see knowledge-readiness.ts's own
 * header for why this is a one-time, per-fact-shape cost, not a per-domain
 * one). `project_fact` targets one of the singular ProjectFacts fields
 * (currently only `human_contribution_description` exists as an
 * AttestedFact<string>, but that one is excluded from the generic path --
 * see this file's own header -- so this variant is reachable only by a
 * FUTURE project-fact-shaped dependency, kept here for shape-completeness,
 * not dead code: the generic function's own logic is written against this
 * union regardless of which arm currently has real registry entries).
 * `asset_provider_field` targets one of the two fields added to
 * AssetProviderMention this milestone (usage, license), scoped per-provider
 * by the acquiring code, never globally.
 */
export type ReadinessTarget = { kind: 'project_fact'; field: 'human_contribution_description' } | { kind: 'asset_provider_field'; field: 'usage' | 'license' }

export interface GenericAcquisitionStrategy {
  target: ReadinessTarget
  /** Fixed, deterministic, never LLM-generated -- same discipline as JURISDICTION_CLARIFICATION_QUESTION/HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION. */
  question_text: string
  /** Bounded attempt budget for this dependency, per acquisition target (see knowledge-readiness.ts's own compound cap key). Defaults to 1 if omitted. */
  max_attempts?: number
}

export interface AskabilityEntry {
  treatment: DependencyTreatment
  /** Present only for entries the generic path should itself acquire -- see this file's own header. */
  generic_acquisition?: GenericAcquisitionStrategy
}

const DEPENDENCY_TREATMENTS: Record<string, AskabilityEntry> = {
  human_contribution_description: { treatment: 'askable_in_crc' },
}

/** Preserved, byte-compatible with the pre-generalization signature -- human-contribution-clarification.ts's own import/call site is unchanged. */
export function isDependencyAskableInCrc(dependency: string): boolean {
  return DEPENDENCY_TREATMENTS[dependency]?.treatment === 'askable_in_crc'
}

/** New in this milestone: the full entry, for the generic readiness path. Returns undefined for an unregistered dependency ID -- fail-closed by construction, never a thrown error. */
export function getAskabilityEntry(dependency: string): AskabilityEntry | undefined {
  return DEPENDENCY_TREATMENTS[dependency]
}
