/**
 * Dependency askability registry (Copyright UAT Correction Milestone,
 * 2026-08-19, PM-approved H1). Small, Interview-Engine/CRC-Engine-owned
 * lookup mapping a governed `TopicClaim.unresolved_project_dependencies`
 * string (see lib/retrieval-engine/types.ts's own header comment on that
 * field) to whether CRC may proactively ask a deterministic conversational
 * question about it.
 *
 * Deliberately NOT added to TopicClaim's own schema, and deliberately NOT a
 * generic InformationNeed framework -- see the completed Human
 * Creative-Contribution Acquisition Architecture Diagnostic (2026-08-19,
 * "Should this live in unresolved_project_dependencies?"). This is
 * product/acquisition-side metadata, not governed claim content; keeping it
 * in a separate, small, Interview-Engine-owned file preserves the existing
 * ownership boundary -- Retrieval/governance owns claim content
 * (`unresolved_project_dependencies` itself, authored in GOVERNED-CLAIMS.md
 * and mirrored in topic-claims-fixture.ts); this module owns what CRC is
 * allowed to proactively ask about.
 *
 * A dependency string mapped to 'askable_in_crc' means: CRC may propose a
 * bounded, self-report conversational question about it (e.g. a deterministic
 * catalog question, mirroring jurisdiction-clarification.ts's own pattern).
 * A dependency string mapped to 'evidence_only' -- or simply absent from this
 * registry -- means CRC must never proactively ask about it in conversation;
 * that fact can only come from documentary evidence reviewed by Commercial
 * Assurance. Absence defaults to non-askable, never the reverse -- a
 * dependency is never askable unless explicitly, deliberately listed here.
 *
 * One entry exists today. That is expected, not a placeholder awaiting
 * more content -- the diagnostic's own T3 finding was that two concrete
 * Class-A cases (this one, and jurisdiction, which predates this registry
 * and does not use it) is not yet enough evidence to justify a generic
 * framework. Add entries here only when a real, PM-approved acquisition
 * milestone needs one -- never speculatively.
 */

export type DependencyTreatment = 'askable_in_crc' | 'evidence_only'

const DEPENDENCY_TREATMENTS: Record<string, DependencyTreatment> = {
  human_contribution_description: 'askable_in_crc',
}

export function isDependencyAskableInCrc(dependency: string): boolean {
  return DEPENDENCY_TREATMENTS[dependency] === 'askable_in_crc'
}
