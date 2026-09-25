/**
 * Governed dependency display vocabulary (CRC-CC-SCOPE-6F, 2026-09-25,
 * following the CRC-CC-SCOPE-6E read-only governance diagnostic and its
 * accepted architecture).
 *
 * Answers exactly one question: may Consultative Realization name a governed
 * `TopicClaim.unresolved_project_dependencies` identity in bounded,
 * user-facing prose, and with what fixed words? Nothing else. Mirrors
 * `applicability-fact-display.ts`'s own governance shape and discipline
 * exactly, applied to a structurally distinct vocabulary (dependency IDs,
 * not `ApplicabilityFact` values) -- see that file's own header for the same
 * "separate governance authority" reasoning, repeated here for this sibling
 * registry.
 *
 * Separate governance authority from, and deliberately never coupled to:
 *   - dependency-askability.ts -- governs whether CRC may proactively ASK
 *     about a dependency, and (for the generic-acquisition path) with what
 *     question wording. A display label and an askability question are
 *     different concepts with different lifecycles: a dependency can be
 *     surfaced in a bounded category sentence without ever being askable
 *     (e.g. a future evidence-only dependency), and a dependency's
 *     askability can change without its label changing. This registry never
 *     reads, writes, or is read by `dependency-askability.ts`.
 *   - applicability-fact-display.ts -- an orthogonal vocabulary keyed on
 *     `ApplicabilityFact` enum values, never dependency-ID strings. The two
 *     registries are kept structurally separate (CRC-CC-SCOPE-6C/6D/6E all
 *     independently confirmed claim descriptors and dependency descriptors
 *     are not one abstraction) -- this file never imports from, or is
 *     imported by, that one.
 *   - `human-contribution-clarification.ts` -- owns the conversational
 *     ACQUISITION question (`HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION`).
 *     Question authority is not declarative display authority (SCOPE-6E
 *     Part 5) -- this registry never reads that module's question text, and
 *     that module never reads this registry.
 *   - TopicClaim / Living Knowledge -- a label here does not become claim
 *     content, is never added to `GOVERNED-CLAIMS.md`'s own per-claim
 *     declarations, and is never claim-specific. One dependency_id, one
 *     label, reused identically by every consuming claim regardless of
 *     topic, jurisdiction, or theory (SCOPE-6E's own multi-consumer safety
 *     finding, §C/§AB of that report).
 *
 * A label is PURELY LEXICAL/DISPLAY: a fixed, human-reviewed noun phrase
 * naming ONLY the missing project-information dimension a dependency
 * represents. A label must NEVER encode:
 *   - the governed legal proposition(s) that consume the dependency;
 *   - whether the proposition applies;
 *   - whether a legal threshold is met;
 *   - whether evidence is sufficient;
 *   - whether the dependency is resolved;
 *   - whether Commercial Assurance would accept the evidence;
 *   - materiality, risk, or "importance";
 *   - a Commercial Assurance action.
 * A label is never generated from the dependency-ID string (no de-snake-
 * casing, no title-casing, no string substitution), never LLM-generated,
 * and never derived from `HUMAN_CONTRIBUTION_CLARIFICATION_QUESTION`'s own
 * wording (question authority ≠ declarative display authority).
 *
 * `human_contribution_description` ACTIVATED (CRC-CC-SCOPE-6F, 2026-09-25)
 * -- the first, and in this milestone the only, entry this registry
 * carries, following explicit human/PM approval of the neutral lexical
 * alias "human contribution to the finished work" and nothing else.
 * `human creative contribution` was explicitly considered and REJECTED
 * (SCOPE-6E §K) -- `creative` is demonstrably, currently used as the
 * substantive legal-threshold word by every one of this dependency's real
 * governed consumers (CLAIM-COPY-001/002/003-v1, and
 * CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1's own "genuine creative
 * input" test); embedding it in a Level-1 label would, via ordinary English
 * presupposition ("your X hasn't been confirmed" presupposes X exists),
 * silently assert that a *creative* contribution occurred -- exactly the
 * fact several of those claims are testing for. `creative` must never be
 * added to this entry's label, or to any future entry, without new,
 * separately-argued evidence overturning that finding.
 *
 * The approved label means only: a neutral category name for factual
 * information about human actions contributing to the finished work. It
 * does NOT assert that such contribution was creative, was legally
 * meaningful, was sufficient for copyrightability, establishes authorship,
 * establishes ownership, was performed by the current user specifically (the
 * surrounding "Your ..." sentence frame is an existing, already-approved
 * template convention shared with every other fact/dependency label -- see
 * results-email-template.ts -- not a claim this label itself makes about
 * who contributed), establishes commercial clearance, or is sufficient
 * evidence for Commercial Assurance. Verified safe across every one of this
 * dependency's four real current governed consumers, spanning two
 * jurisdictions and three distinct legal theories (SCOPE-6E §AB) -- the
 * label never favors one theory over another, since it never states which
 * theory applies.
 *
 * No other dependency ID is activated by this change -- `editorial_
 * designation_confirmed`, `separate_authorization_obtained`,
 * `release_status_confirmed`, `rights_and_clearance_status`, and every other
 * governed dependency ID remain unregistered (fail-closed). Evidence-only
 * dependency sentence semantics were explicitly left as unresolved future
 * governance by SCOPE-6E (§X) and must not be inferred from this entry.
 *
 * Adding any FUTURE real entry remains a governance decision this file does
 * not make on its own authority; it requires the same explicit PM/
 * Architecture review discipline `applicability-fact-display.ts`'s own
 * header describes, applied here to a dependency ID instead of a fact.
 *
 * Absence defaults to no label, never a fallback to the raw dependency-ID
 * string or an improvised description -- see `getDependencyDisplayLabel`'s
 * own fail-closed contract below.
 */

export interface DependencyDisplayDescriptor {
  /**
   * Fixed, human-reviewed lexical/display alias only -- see this module's
   * own header for the full list of what a label must never encode. Never
   * LLM-generated, never de-snake-cased from the dependency ID, never
   * copied from an acquisition question's own wording.
   */
  label: string
}

/**
 * One entry (CRC-CC-SCOPE-6F, 2026-09-25, human/PM-approved). Every other
 * governed dependency ID is deliberately NOT an entry here -- see module
 * header -- and must not be added without its own separate governance
 * sign-off. Do not populate any future entry from informal wording found in
 * governance-review markdown, GOVERNED-CLAIMS.md prose, or an existing
 * clarification question's own text -- none of those are an approved
 * display label on their own.
 */
const DEPENDENCY_DISPLAY: Partial<Record<string, DependencyDisplayDescriptor>> = {
  human_contribution_description: { label: 'human contribution to the finished work' },
}

/**
 * Fail-closed by construction, never a thrown error -- an unregistered
 * dependency ID (including every evidence-only dependency, and any future
 * or malformed ID) returns `undefined`, structurally identical to "no label
 * exists" from every caller's point of view. The sole caller (the shared
 * Realization contract module, CRC-CC-SCOPE-6F's own resolution point)
 * treats `undefined` as a reason to produce no display label for that item,
 * leaving the existing generic unresolved-item fallback as the sole
 * rendered text -- never the raw
 * dependency-ID string, never an improvised description.
 */
export function getDependencyDisplayLabel(dependencyId: string): string | undefined {
  return DEPENDENCY_DISPLAY[dependencyId]?.label
}
