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
 * No other dependency ID was activated BY THIS CHANGE (SCOPE-6F itself) --
 * `editorial_designation_confirmed`, `separate_authorization_obtained`,
 * `release_status_confirmed`, and `rights_and_clearance_status` were later
 * separately approved by CRC-CC-DEPENDENCY-LABELS-1 (2026-10-08, following
 * CRC-CC-DEPENDENCY-LABEL-GOVERNANCE-1's own triage) -- see that entry's own
 * table below for current status; they do not remain unregistered. Every
 * other governed dependency ID not listed in that later table's own 19
 * approved entries remains unregistered (fail-closed). Evidence-only
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
 *
 * CRC-CC-DISPLAY-VOCABULARY-2 (2026-10-08, following the read-only
 * CRC-CC-DISPLAY-VOCABULARY-1 contract diagnostic). Dependency IDs are open
 * strings, not a closed union -- TypeScript exhaustiveness (the mechanism
 * used for `applicability-fact-display.ts`'s sibling registry) cannot
 * apply here, and this milestone does NOT invent a closed dependency enum
 * solely to force one. Coverage is instead made explicit and enforced at
 * TEST time: every dependency ID TOPIC_CLAIMS_FIXTURE actually references
 * via `unresolved_project_dependencies` now has its own entry below, either
 * an approved label or the literal `null` ("explicitly reviewed, no label
 * yet") -- `__tests__/crc-engine/dependency-fact-display.test.ts` asserts
 * this against the live fixture, so a FUTURE governed claim introducing a
 * new, undecided dependency ID fails that test rather than silently
 * reaching Production anonymous. `null` is distinguishable from "never
 * decided" via `hasExplicitDependencyDisplayDecision` below (present-with-
 * `null` vs. absent-from-the-table are different JS values,
 * `null`/`undefined` respectively, at the SAME key) -- `getDependencyDisplayLabel`'s
 * own public behavior is UNCHANGED either way (`null?.label` and
 * `undefined?.label` both evaluate to `undefined`). `human_contribution_description`'s
 * approved label is reproduced here byte-for-byte unchanged. No label is
 * authored by this milestone for any other dependency ID -- every other
 * entry below is an EXPLICIT `null`, not a new governance decision, only
 * the prior, already-fail-closed absence made structurally visible and
 * test-enforced.
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
 * 19 approved entries: `human_contribution_description` (CRC-CC-SCOPE-6F,
 * 2026-09-25), plus 18 more (CRC-CC-DEPENDENCY-LABELS-1, 2026-10-08,
 * following the CRC-CC-DEPENDENCY-LABEL-GOVERNANCE-1 read-only triage --
 * the exact, human/PM-approved Category-A set from that governance review).
 * Every other key below is an EXPLICIT `null` -- a recorded "no label
 * decided yet" (CRC-CC-DEPENDENCY-LABEL-GOVERNANCE-1's own Category-B --
 * governance-sensitive pending further review) for every remaining
 * dependency ID currently referenced anywhere in `TOPIC_CLAIMS_FIXTURE`'s
 * own `unresolved_project_dependencies` arrays (enumerated by direct
 * inspection, 2026-10-08; re-verify against the live fixture before
 * trusting this list, since it is a snapshot, not an invariant -- the
 * coverage test below is the actual, durable guarantee, not this comment).
 * None must be added or changed without its own separate governance
 * sign-off. Do not populate any future entry from informal wording found in
 * governance-review markdown, GOVERNED-CLAIMS.md prose, or an existing
 * clarification question's own text -- none of those are an approved
 * display label on their own.
 */
const DEPENDENCY_DISPLAY: Record<string, DependencyDisplayDescriptor | null> = {
  human_contribution_description: { label: 'human contribution to the finished work' },
  actual_knowledge_confirmed: null,
  advertisement_purpose_confirmed: null,
  advertiser_or_duty_holder_status_confirmed: null,
  artistic_creative_satirical_fictional_analogous_work: null,
  artlist_license_type_confirmed: { label: 'Artlist license type' },
  artlist_licensee_employer_size_confirmed: { label: 'Artlist licensee organization size' },
  artlist_licensee_employer_type_confirmed: { label: 'Artlist licensee organization type' },
  artlist_subscription_active_at_publication_confirmed: { label: 'Artlist subscription status at publication' },
  asset_confirmed_getty: null,
  asset_confirmed_istock: null,
  asset_confirmed_shutterstock: null,
  confusion_as_to_affiliation_or_sponsorship: null,
  content_constitutes_deep_fake: null,
  deployer_status_confirmed: null,
  editorial_designation_confirmed: { label: 'provider content designation' },
  epidemic_license_tier_confirmed: { label: 'Epidemic Sound license tier' },
  expressive_work_exemption_applies: null,
  music_subscription_active_at_publication_confirmed: { label: 'music subscription status at publication' },
  provider_status_confirmed: null,
  release_status_confirmed: { label: 'model or property release status' },
  rights_and_clearance_status: { label: 'provider rights-and-clearance status' },
  separate_authorization_obtained: { label: 'separate provider authorization' },
  stabilityai_commercial_registration_completed: { label: 'Stability AI commercial registration status' },
  stabilityai_organization_revenue_threshold_status: { label: 'Stability AI organization revenue status' },
  stabilityai_product_is_core_model_under_community_license: { label: 'Stability AI product category' },
  storyblocks_license_tier_confirmed: { label: 'Storyblocks license tier' },
  synthesia_stock_avatar_used_confirmed: { label: 'Synthesia avatar type' },
  synthesia_written_consent_obtained: { label: 'Synthesia written-consent status' },
  synthetic_performer_content_present: null,
  synthetic_performer_present_confirmed: null,
  union_establishment_or_output_use: null,
  which_music_provider: { label: 'music provider' },
  which_provider: { label: 'stock or footage provider' },
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

/**
 * CRC-CC-DISPLAY-VOCABULARY-2. Test-time coverage check ONLY -- never
 * imported by any renderer, Composition, or Realization logic, and never a
 * substitute for `getDependencyDisplayLabel`'s own public, fail-closed
 * contract (display decisions must never gate runtime substantive
 * behavior; see this module's own header). True when `dependencyId` has an
 * explicit entry in the table above, whether an approved label OR an
 * explicit `null` ("reviewed, no label yet") -- false only when the ID has
 * never been decided at all. This is the one place "decided: no label" is
 * distinguishable from "never decided" -- `getDependencyDisplayLabel` alone
 * cannot tell the two apart (both return `undefined`), which is correct for
 * runtime (both must render identically) but insufficient for the coverage
 * test, which needs exactly this distinction.
 */
export function hasExplicitDependencyDisplayDecision(dependencyId: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEPENDENCY_DISPLAY, dependencyId)
}
