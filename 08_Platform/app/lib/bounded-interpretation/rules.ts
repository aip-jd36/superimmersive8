/**
 * Fixed, deterministic template copy for Bounded Interpretation (CRC
 * Milestone 2, 2026-08-15). Every string here is `[PRINCIPLE]` fixed v1
 * copy, mirroring assemble-projection-output.ts's own opening_line/
 * closing_cta discipline — no LLM generation, no per-conversation
 * variation beyond substituting a category label or a verbatim, already-
 * governed candidate_statement. Nothing in this file authors new legal
 * doctrine, a risk conclusion, or a clearance/certification determination
 * — see build-bounded-interpretation.ts for the (also deterministic)
 * decision of WHICH template applies.
 *
 * Every template obeys PM revision 3/10 (2026-08-15 review): a
 * `directly_relevant` result is framed strictly as "relevant to," never
 * "answers" or "therefore cleared" — CRC may not have evaluated copyright,
 * likeness, trademark, or jurisdiction even when a commercial-use tier
 * claim matched. The shared Commercial Assurance CTA
 * (assemble-projection-output.ts's own closing_cta) is untouched by this
 * module and remains unconditional; the `outside_current_coverage` and
 * `determination_declined` templates below add their OWN short,
 * self-contained bridge sentence (PM revision 3's explicit allowance for
 * context-sensitive copy on an unresolved/withheld/uncovered goal) rather
 * than modifying the shared CTA.
 */

import type { GoalCategory } from '@/types/interview-engine'

const BRIDGE_SENTENCE = 'A human-reviewed Commercial Assurance Assessment can address this directly.'

/**
 * Generic epistemic-boundary clause for related-topic content (Governed
 * Topic Relationships milestone, 2026-08-16, PM decision explicitly
 * overriding the design report's original topic-interpolated proposal --
 * "This includes information about a related consideration (${targetTopic
 * Label})..."). Fixed, generic, non-domain-specific copy: no topic-label
 * interpolation, no relationship rationale, no relationship_id, no internal
 * topic identifiers -- appended verbatim, once, whenever a goal's combined
 * statement includes ANY related_topic-sourced content (mixed exact+related
 * appends this once, not once per related claim). CRC must never expose
 * internal ontology language or dynamically generate substantive
 * relationship explanations from topic labels; this sentence says only that
 * something relevant-but-non-determinative was included, never what it is
 * or why it's related.
 */
const RELATED_TOPIC_BOUNDARY_CLAUSE = 'This information is relevant to what you asked, but does not by itself determine the answer.'

export const DETERMINATION_DECLINED_TEMPLATE =
  `CRC doesn't issue certifications, clearances, or commercial determinations — it shares governed platform information and surfaces relevant considerations from what you described. ${BRIDGE_SENTENCE}`

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  commercial_use: 'whether this can be used commercially',
  copyright_ownership: 'who owns the copyright',
  copyrightability: 'whether this kind of output can be copyrighted at all',
  likeness: 'likeness, voice, or consent',
  third_party_source_rights: 'whether you have the rights to use third-party source material',
  unknown: 'what you asked',
}

/**
 * `copyright_ownership` and `copyrightability` (2026-08-16 correction, PM
 * boundary review): deliberately NEUTRAL, pattern-A "no coverage" language
 * only -- "CRC's current governed knowledge doesn't establish an answer to
 * <neutral topic label>." An earlier version of this file asserted
 * substantive legal characterization ("unsettled, fact-specific legal
 * question") that was never derived from any governed Matrix/LK claim --
 * this module has zero governed coverage for either category today, so it
 * has no basis to say anything about the STATE of the law, only that CRC
 * itself doesn't have an answer. The two entries are kept textually
 * distinct from each other (satisfying PM revision 1's "worded distinctly"
 * requirement) by plugging in CATEGORY_LABELS' own already-neutral topic
 * description -- not by adding doctrine to either one.
 */
const OUTSIDE_COVERAGE_BY_CATEGORY: Record<GoalCategory, string> = {
  commercial_use:
    `CRC doesn't currently have governed guidance covering this specific question for the tools you mentioned. ${BRIDGE_SENTENCE}`,
  copyright_ownership:
    `CRC's current governed knowledge doesn't establish an answer to ${CATEGORY_LABELS.copyright_ownership}. ${BRIDGE_SENTENCE}`,
  copyrightability:
    `CRC's current governed knowledge doesn't establish an answer to ${CATEGORY_LABELS.copyrightability}. ${BRIDGE_SENTENCE}`,
  likeness:
    `CRC doesn't currently have governed guidance covering likeness, voice, or consent questions. ${BRIDGE_SENTENCE}`,
  /**
   * `third_party_source_rights` (Living Knowledge — Third-Party Source
   * Rights, M1+M2, 2026-08-18): the goal category exists so CRC can
   * recognize the question at all -- no governed claim is reachable under it
   * yet (provider-scoped retrieval, M3, is a separate, not-yet-authorized
   * milestone; see THIRD_PARTY_SOURCE_RIGHTS_PATH_A_PROVIDER_NARROWING.md
   * §17, §19). Every such goal renders this same neutral "no coverage yet"
   * template today, regardless of which provider (if any) was also
   * recognized -- CATEGORY_LABELS' own already-neutral phrasing, same
   * pattern as every other entry in this map.
   */
  third_party_source_rights:
    `CRC doesn't currently have governed guidance covering ${CATEGORY_LABELS.third_party_source_rights}. ${BRIDGE_SENTENCE}`,
  unknown:
    `CRC's current governed knowledge doesn't cover this specific question yet. ${BRIDGE_SENTENCE}`,
}

export function outsideCoverageSummary(category: GoalCategory): string {
  return OUTSIDE_COVERAGE_BY_CATEGORY[category]
}

/**
 * Source-aware boundary clause (LK Phase 1 governance refinement,
 * 2026-08-16, PM decision item 7): the ORIGINAL single closing sentence
 * ("though it reflects the platform's own terms...") is only true when
 * every matched result came from a tool/platform Matrix claim -- it is
 * factually wrong when applied to a Topic/LK governed-knowledge claim
 * (US copyright law is not "the platform's own terms"), a gap surfaced
 * during the LK Phase 1 human-governance review before any Topic claim
 * went live. Two clauses, chosen by a single boolean the caller already
 * has for free (every matched RetrievalResult's own `source_fact.kind`),
 * not a new fact, new LLM call, or new doctrine:
 *   - allToolSourced === true: EXACT original wording, byte-for-byte --
 *     tool behavior is unchanged, per the explicit hard requirement.
 *   - allToolSourced === false (topic-only OR mixed tool+topic): neutral
 *     wording that makes no claim about "platform terms" at all. Chosen
 *     deliberately over a third, mixed-specific clause -- splitting a
 *     combined, already-joined claimStatement back out by source per
 *     sentence would be a bigger structural change than this bug needs,
 *     and the neutral clause is not FALSE for a tool-sourced statement,
 *     only less specific than the tool-only wording -- so using it
 *     whenever even one topic-sourced result is present keeps every
 *     word of the output true, which is the actual requirement.
 */
function boundaryClause(allToolSourced: boolean): string {
  return allToolSourced
    ? "though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness."
    : "though it doesn't by itself determine the answer for your specific project."
}

/**
 * `claimStatement` is the already-governed, already-eligible
 * `RetrievalResult.candidate_statement`, quoted verbatim — never
 * paraphrased, matching every other consumer of this field in this
 * codebase (ProjectionKnowledgeItem, the results-email renderer). The
 * closing sentence is the load-bearing boundary line: it must always be
 * present, never trimmed for brevity, since it is what keeps a matched,
 * relevant claim from reading as a full answer to the user's broader
 * question. `allToolSourced` -- see boundaryClause above -- defaults to
 * `true` so every pre-existing call site (all of which only ever passed
 * tool-sourced matches before Topic Retrieval existed) is unaffected if
 * it isn't updated; build-bounded-interpretation.ts's own call site always
 * passes the real computed value explicitly.
 */
export function directlyRelevantSummary(
  category: GoalCategory,
  claimStatement: string,
  allToolSourced: boolean = true,
  includesRelatedTopicContent: boolean = false,
): string {
  const relatedClause = includesRelatedTopicContent ? ` ${RELATED_TOPIC_BOUNDARY_CLAUSE}` : ''
  return `${claimStatement}${relatedClause} This is relevant to ${CATEGORY_LABELS[category]}, ${boundaryClause(allToolSourced)}`
}

/**
 * `relevant_applicability_unresolved` templates (Living Knowledge
 * governance review, 2026-08-16, "relevant applicability" refinement,
 * PM-approved design). See INTERPRETATION_STATUSES's own doc comment
 * (bounded-interpretation/types.ts) for the full Case 3A/3B distinction --
 * summarized here only as it bears on these two templates' wording:
 *
 *   - Case 3A (no content available -- a formal applicability gate, e.g.
 *     jurisdiction, is unmet): CONTENT-FREE. Never names which specific
 *     fact is missing (Retrieval's diagnostic only says a category-level
 *     gate failed, not which one, and this module must not guess) and
 *     never quotes any claim text, since the whole reason this branch
 *     exists is that quoting a gated claim's substance without a
 *     confirmed applicable jurisdiction/tier could misrepresent which
 *     law/terms actually apply.
 *   - Case 3B (content available -- every formal gate passed, but the
 *     claim's own governance metadata says real-world application still
 *     depends on unmodeled project facts): quotes the already-governed
 *     claimStatement(s) verbatim, identically to directlyRelevantSummary's
 *     own quoting discipline, differing only in the closing sentence.
 *
 * Neither template invents a missing fact, asserts a legal conclusion, or
 * says which principle (if either) actually governs the user's specific
 * project -- both explicitly say the opposite: that CRC cannot determine
 * this from what it currently knows.
 */
export function relevantApplicabilityUnresolvedNoContentSummary(category: GoalCategory): string {
  return `SI8 has governed knowledge relevant to ${CATEGORY_LABELS[category]}, but it depends on project-specific information that hasn't been confirmed in this conversation. ${BRIDGE_SENTENCE}`
}

/**
 * Mixed-Resolution Consultative Guidance (2026-08-24, following the CRC
 * Mixed-Resolution Consultative Composition diagnostic of the same date).
 * Appended AFTER an already-resolved `directly_relevant` or Case-3B summary,
 * as an ADDITIONAL trailing block, whenever `BoundedInterpretation.
 * unresolved_relevant_claims` is non-empty -- never in place of the existing
 * resolved content, never reordering it. This is the mixed-state sibling of
 * `relevantApplicabilityUnresolvedNoContentSummary` above (Case 3A's own
 * content-free precedent): same content-free discipline, applied to a
 * DIFFERENT state (some governed guidance already resolved, plus additional
 * relevant guidance that remains unresolved) rather than Case 3A's "nothing
 * resolved yet."
 *
 * Deliberately takes NO parameters and reads no claim/fact/tool/provider
 * data -- the only fact this sentence is permitted to depend on is that
 * `unresolved_relevant_claims.length > 0`, never which claim(s), how many,
 * which applicability fact, or what the withheld proposition says. Never
 * states or implies the unresolved guidance applies, probably applies, is
 * inapplicable, is legally determinative, or that the resolved guidance
 * above is commercially sufficient -- and deliberately does not reference
 * Commercial Assurance (that CTA is Projection's own unconditional
 * `closing_cta`, appended separately to every conversation regardless of
 * this sentence's presence; duplicating or reshaping that reference here is
 * explicitly out of this milestone's scope).
 */
export function mixedResolutionUnresolvedGuidanceSentence(): string {
  return "There's additional governed guidance relevant to this topic that hasn't been confirmed as applicable based on what's been described here — it may or may not apply, and CRC can't determine that from this conversation."
}

/**
 * H5 -- minimal echo-only relevance composition (Copyright UAT Correction
 * Milestone, 2026-08-19, PM-approved narrow scope). This is NOT full
 * Project-Fact-Aware Bounded Composition (PRD_LIVING_KNOWLEDGE_SOURCE_
 * INPUTS_v0.1.md §27, still deferred, still not authorized by this
 * milestone) -- it does not rank contribution, select claims differently
 * based on it, mark any dependency resolved, or infer copyrightability/
 * ownership. It only (a) echoes the user's own self-reported description
 * back via a fixed, bounded prefix -- never interpolated in a way that
 * could read as CRC endorsing or characterizing its content -- and (b)
 * states, in language grounded specifically in COPY-002-v1/COPY-003-v1's
 * own actual governed statements ("selecting, arranging, or editing...
 * additional human creative involvement... is generally what supports a
 * copyright claim"), that this general category of contribution is
 * relevant, followed immediately by the same never-omitted "CRC can't
 * determine... legal threshold" boundary every other Bounded Interpretation
 * template already carries in some form. Deliberately generic across which
 * specific COPY claim(s) actually matched this turn -- this function has no
 * visibility into that (build-bounded-interpretation.ts decides whether to
 * call it at all), so the wording names the general grounded category
 * (selecting/arranging/editing) rather than any one claim's exact text.
 */
export function humanContributionRelevanceSentence(description: string): string {
  // Avoid a double-punctuation artifact ("...prompts..") when the user's own
  // free-text description already ends in terminal punctuation -- the
  // description is quoted verbatim otherwise, never semantically altered.
  const trimmed = description.trim()
  const quoted = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
  return `You described your own contribution as: "${quoted}" Selecting, arranging, or editing AI-generated material is the kind of additional human creative involvement current guidance treats as relevant to whether a copyright claim can be supported -- but CRC can't determine from this conversation whether your described contribution meets that legal threshold.`
}

/**
 * `claimStatement` -- one or more already-governed `candidate_statement`s,
 * already joined by the caller exactly as directlyRelevantSummary's own
 * caller joins multiple matches (same "never drop an eligible, retrieved
 * claim silently" discipline). Quoted verbatim, never paraphrased.
 *
 * Singular/plural (governance-review fix, 2026-08-16, PM item 5): uses
 * "This is relevant to... how it applies," a singular collective
 * reference, regardless of whether one or several claims were joined into
 * `claimStatement` -- mirrors directlyRelevantSummary's own established
 * "This is relevant to" pattern exactly, which already handles its own
 * multi-claim joins (e.g. two commercial_use tool claims) the same way
 * and has never needed a plural variant. Deliberately not "These are...
 * which apply" (grammatically correct for 2+ claims but awkward/wrong for
 * exactly 1) -- "This" reads naturally as referring to the whole quoted
 * passage collectively either way, so one template covers both cases
 * without a count parameter or branching.
 */
/**
 * `noDependencyStatement`/`noDependencyAllToolSourced` (CC-1 — Claim-Level
 * Bounded Grouping, 2026-08-21): additive, default `null`/`true` -- every
 * pre-existing call site (including every pre-CC-1 test) continues to
 * compile and render byte-identical output without passing them. When the
 * caller DOES pass a non-null `noDependencyStatement` (build-bounded-
 * interpretation.ts, only when the Case 3B `matches[]` for a goal contains
 * BOTH at least one claim with `unresolved_project_dependencies.length > 0`
 * and at least one with `length === 0`), it is rendered as its OWN leading
 * clause, reusing `boundaryClause` -- the exact same fixed, already-approved
 * sentence `directlyRelevantSummary` already uses for a claim with no
 * governed project dependency at all. This is not new prose: it is the
 * identical wording this codebase already produces whenever every matched
 * claim for a goal is dependency-free (the `directly_relevant` branch in
 * build-bounded-interpretation.ts). Reusing it here means a dependency-free
 * claim is described identically regardless of whether it happens to share
 * a goal with a dependency-bearing claim -- no new conclusion, no
 * "resolved"/"cleared"/"safe" language, ever. The closing hedge/bridge
 * sentence below is untouched and still appears exactly once, scoped to the
 * (still full, still verbatim) dependency-bearing `claimStatement` --
 * doubling the "This is relevant to..." lead-in is the accepted, minimal
 * cost of keeping the closing hedge/bridge byte-identical rather than
 * redesigning it (PM instruction: preserve it literally or stop and
 * report -- it remains literally preservable, so it is preserved).
 */
/**
 * CC-2 -- Semantics-Preserving Rhetorical Composition (2026-08-21,
 * PM/Architecture-authorized, narrowly scoped). Addresses exactly one
 * observed defect (flagged as CC-2 evidence by the CC-1 bounded UAT): in
 * the mixed-group case, "This is relevant to `<category>`," was asserted
 * TWICE in one answer, verbatim, identical label both times -- once via
 * `noDependencyClause` below (unchanged by this milestone), once as the
 * lead-in to this closing sentence.
 *
 * This is pure repetition, not two distinct propositions: EVERY matched
 * claim in EITHER group -- dependency-free or dependency-bearing -- is
 * relevant to the SAME goal `category` by construction, guaranteed before
 * either group is ever assembled (build-bounded-interpretation.ts's own
 * `matches = results.filter(r => r.matched_goal_category === goal.category)`
 * filter, unchanged by CC-1 or CC-2). Restating the identical label a
 * second time adds no new proposition; it only re-asserts something already
 * said. Removing it here removes ONLY that repeated lead-in -- every
 * substantive word of the hedge itself ("there isn't enough
 * project-specific information...") and the bridge sentence are
 * byte-identical to before, and `boundaryClause`'s own returned text
 * (attached to `noDependencyClause` above, never touched here) is
 * completely unaffected, preserving its own tool/topic source-accuracy
 * property exactly as LK Phase 1 established it.
 *
 * Conditioned strictly on whether `noDependencyStatement` is present: when
 * it is (mixed-group case), the category label was already stated moments
 * earlier in `noDependencyClause`, so this sentence opens with "But based
 * on..." instead. When it is absent (the pre-CC-1, single-group case --
 * every matched claim is dependency-bearing), the category label has not
 * been stated anywhere yet in this summary, so the full original lead-in
 * is preserved byte-for-byte, unchanged -- every pre-CC-2 caller/test for
 * this case renders identically.
 */
/**
 * CRC Email/UI Structural Readability -- Phase 1 (2026-08-23, PM/
 * Architecture-authorized). Shared internal builder for both the legacy
 * flat-string entry point (`relevantApplicabilityUnresolvedWithContentSummary`,
 * unchanged behavior) and the new additive block-list entry point
 * (`relevantApplicabilityUnresolvedWithContentBlocks`). Produces the exact
 * same two candidate segments CC-1/CC-2 already compute -- the
 * dependency-free clause (if any) and the dependency-bearing clause plus
 * its unchanged hedge/bridge -- as an ordered array instead of a
 * pre-joined string. No new text, no new clause, no reordering: this is
 * the identical composition CC-1/CC-2 already authored, expressed as
 * `string[]` instead of `string`. `blocks.join(' ')` reconstructs the
 * legacy string byte-for-byte (see the sibling function below and its own
 * test coverage) -- the trailing space CC-1 originally baked into
 * `noDependencyClause` is deliberately omitted here and supplied by the
 * join instead, so the two representations stay provably equivalent
 * rather than independently maintained.
 */
function buildRelevantApplicabilityUnresolvedContentBlocks(
  category: GoalCategory,
  claimStatement: string,
  includesRelatedTopicContent: boolean,
  humanContributionSentence: string | null,
  noDependencyStatement: string | null,
  noDependencyAllToolSourced: boolean,
): string[] {
  const relatedClause = includesRelatedTopicContent ? ` ${RELATED_TOPIC_BOUNDARY_CLAUSE}` : ''
  // H5 -- minimal echo-only relevance composition (Copyright UAT Correction
  // Milestone, 2026-08-19): inserted BEFORE the closing uncertainty hedge
  // below, additively -- the hedge itself is never removed or replaced.
  const contributionClause = humanContributionSentence ? ` ${humanContributionSentence}` : ''
  const blocks: string[] = []
  if (noDependencyStatement) {
    blocks.push(`${noDependencyStatement} This is relevant to ${CATEGORY_LABELS[category]}, ${boundaryClause(noDependencyAllToolSourced)}`)
  }
  const closingSentence = noDependencyStatement
    ? `But based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project.`
    : `This is relevant to ${CATEGORY_LABELS[category]}, but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project.`
  blocks.push(`${claimStatement}${relatedClause}${contributionClause} ${closingSentence} ${BRIDGE_SENTENCE}`)
  return blocks
}

export function relevantApplicabilityUnresolvedWithContentSummary(
  category: GoalCategory,
  claimStatement: string,
  includesRelatedTopicContent: boolean = false,
  humanContributionSentence: string | null = null,
  noDependencyStatement: string | null = null,
  noDependencyAllToolSourced: boolean = true,
): string {
  return buildRelevantApplicabilityUnresolvedContentBlocks(
    category,
    claimStatement,
    includesRelatedTopicContent,
    humanContributionSentence,
    noDependencyStatement,
    noDependencyAllToolSourced,
  ).join(' ')
}

/**
 * Additive, Phase-1-only entry point: same inputs, same composition
 * authority, same words, same order as
 * `relevantApplicabilityUnresolvedWithContentSummary` above -- returns the
 * ordered presentation blocks instead of one joined string, so a renderer
 * can display the dependency-free clause and the dependency-bearing/hedge
 * clause as separate, visually equivalent paragraphs without either layer
 * inferring where the boundary is. Exactly one block when no
 * dependency-free clause exists (the pre-CC-1 single-group shape) --
 * never artificially split.
 */
export function relevantApplicabilityUnresolvedWithContentBlocks(
  category: GoalCategory,
  claimStatement: string,
  includesRelatedTopicContent: boolean = false,
  humanContributionSentence: string | null = null,
  noDependencyStatement: string | null = null,
  noDependencyAllToolSourced: boolean = true,
): string[] {
  return buildRelevantApplicabilityUnresolvedContentBlocks(
    category,
    claimStatement,
    includesRelatedTopicContent,
    humanContributionSentence,
    noDependencyStatement,
    noDependencyAllToolSourced,
  )
}
