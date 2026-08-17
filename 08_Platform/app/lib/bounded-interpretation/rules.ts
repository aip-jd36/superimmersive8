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
export function relevantApplicabilityUnresolvedWithContentSummary(
  category: GoalCategory,
  claimStatement: string,
  includesRelatedTopicContent: boolean = false,
): string {
  const relatedClause = includesRelatedTopicContent ? ` ${RELATED_TOPIC_BOUNDARY_CLAUSE}` : ''
  return `${claimStatement}${relatedClause} This is relevant to ${CATEGORY_LABELS[category]}, but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project. ${BRIDGE_SENTENCE}`
}
