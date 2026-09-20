Title: Formal Governance Review #22 — U.S. Copyright, 17 U.S.C. §106 + §501(a) Third-Party Material in Output

Reviewed object:
- `CAND-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001` (drafted in `US-COPYRIGHT-106-501-THIRD-PARTY-OUTPUT-FGR-PACKAGE.md`, a prior milestone this same week; its dependency conclusion was subsequently revised D1 → D0 by a separate "Dependency Semantics Challenge" bounded review, recorded in that package's own §8-REVISED)

Review date: 2026-09-18

Artifact type: Formal Governance Review (adoption stage) — the first Copyright-domain FGR addressing third-party material appearing in a user's own output (distinct from the existing `copyrightability`/`copyright_ownership` claims, which concern only the user's own authorship/ownership). Reviews the candidate on its own evidence, per this milestone's own explicit instruction not to treat the preceding architecture/research diagnostics or the candidate package's own "READY FOR FGR" recommendation as pre-approval of the actual claim wording or of its revised dependency decision.

--- BEGIN VERBATIM FORMAL GOVERNANCE REVIEW ---

# U.S. Copyright — 17 U.S.C. §106 + §501(a) Third-Party Material in Output — Formal Governance Review

## 1. Authoritative source fidelity

Re-verified independently, not accepted on the package's own say-so: ran `pdftotext -layout` directly against both captured PDFs (`evidence-captures/us-copyright-third-party/uscode-2023-title17-sec106_20260918T075020Z_56f13a52.pdf`, `.../uscode-2023-title17-sec501_20260918T075020Z_06c69f9e.pdf`) and located the operative statutory text blocks in the raw extraction output. §106's block reads: "Subject to sections 107 through 122, the owner of copyright under this title has the exclusive rights to do and to authorize any of the following: (1) to reproduce the copyrighted work in copies or phonorecords; (2) to prepare derivative works based upon the copyrighted work; (3) to distribute copies or phonorecords..." — word-for-word identical to the package's §2 quotation. §501(a)'s block reads: "(a) Anyone who violates any of the exclusive rights of the copyright owner as provided by sections 106 through 122 or of the author as provided in section 106A(a), or who imports copies or phonorecords into the United States in violation of section 602, is an infringer of the copyright or right of the author, as the case may be." — also word-for-word identical. Independently computed SHA-256 checksums of both PDFs on disk (`56f13a52...9a79e` for §106, `06c69f9e...4fb3` for §501) and confirmed both match the manifest exactly. The package's own disclosed scope decision (omitting §106 clauses (3)-(6): distribution, performance, display, digital-audio-transmission) is independently re-confirmed as sound — reproduction and derivative-works preparation are the two rights most directly implicated by an AI system generating video content that resembles a pre-existing third-party work; the other four concern distinct activities outside this candidate's target fact pattern. No instance of the proposition stated more strongly than the source was found.

**Disposition: PASS.**

## 2. GoalCategory semantic (taxonomy — independently re-run, not inherited)

Re-tested T1–T4 against current production `GOAL_CATEGORIES` (confirmed directly, `08_Platform/app/types/interview-engine.ts` line 798: `['commercial_use', 'copyright_ownership', 'copyrightability', 'likeness', 'third_party_source_rights', 'trademark', 'unknown']` — `third_party_copyright` is genuinely absent, consistent with the package's own "not yet implemented" disclosure) and against three fresh example intents this review independently constructed rather than reusing the package's own three: *"There's a painting visible in the background of my AI-generated commercial — does that matter?"*; *"My video's plot closely follows a novel I didn't license — is that a problem?"*; *"I used an AI tool to recreate a scene from a movie I don't own — what should I know?"* All three are direct, explicit asks about a third party's rights implicated by the user's own output, none reducible to `copyright_ownership`'s "do I hold rights in my own work" or `copyrightability`'s "can this kind of output be copyrighted at all." **T2 (fold into `copyright_ownership`/`copyrightability`)** independently re-tested against `GOVERNED-CLAIMS.md`'s own current claim text for `CLAIM-COPY-001/002/003-v1` (copyrightability of AI-assisted output, keyed to human creative contribution) and `CLAIM-COPY-004-v1` (ownership vs. ToS-permission) — confirmed none of the three fresh intents above is answerable by any of these four claims without distortion; folding would make an ownership-vs-permission claim a false retrieval co-candidate for a question about someone else's rights, the same asymmetric over-retrieval risk the package identified. **T3 (relationship-routed `KnowledgeTopic`, the Article-50/`ai_content_transparency` shape)** independently re-tested against that shape's own justification (a topic a user never directly asks about, discovered only as interpretive context for a different explicit goal) — all three fresh intents above are direct asks in their own right, not incidental context for `commercial_use` or any other goal, so this shape does not fit; same conclusion `FGR_021` reached for Trademark, independently re-derived here rather than assumed to transfer. **T4 (another existing generic representation)** independently re-checked against `third_party_source_rights`'s own governed claims (`CLAIM-STOCK-*`, all keyed to a named, licensed stock-media provider relationship with dependencies like `which_provider`/`editorial_designation_confirmed`) — none of the three fresh intents names or presupposes a stock provider; semantically inapplicable. **Decision: T1 — NEW `GoalCategory`.** The proposed value `third_party_copyright` follows the corpus's own established single-word, subject-matter-labeling convention (`likeness`, `trademark`, not `third_party_copyright_question`) — consistent, not novel in form. The governed semantic text (package §5) frames "what copyright issue should I understand," never a promise to resolve infringement/ownership/authorization — this review specifically checked for, and did not find, any wording that could be read as CRC committing to answer the stronger question. The exact production identifier is not being finally fixed by this review (per this milestone's own instruction) — `third_party_copyright` is recorded as the reviewed proposal, subject to confirmation at production-representation stage.

**Disposition: PASS.**

## 3. KnowledgeTopic semantic

Independently re-derived, not copied: confirmed directly against `08_Platform/app/lib/retrieval-engine/types.ts` that `KnowledgeTopic = GoalCategory | KNOWLEDGE_ONLY_TOPICS` remains a union. A new `GOAL_CATEGORIES` entry is automatically a valid `TopicClaim.topic` value with no `KNOWLEDGE_ONLY_TOPICS` addition required. This review specifically tested whether the `ai_content_transparency` shape (the one existing `KNOWLEDGE_ONLY_TOPICS` member, confirmed present and non-empty in current source) should instead be mechanically copied here — found no: that shape exists because EU AI Act disclosure is never a direct user ask, whereas §2 above independently confirms this domain genuinely is. No `TopicRelationship` is required or proposed.

**Disposition: PASS.**

## 4. Jurisdiction / applicability semantics

Re-read `AssessmentJurisdictionMention`'s own doc comment directly (`types/interview-engine.ts`) — confirmed it represents only "the jurisdiction the user asked CRC to consider," never a territorial/commerce-clause applicability finding, and confirmed no repository mechanism infers legal attachment from a user's jurisdiction selection. `applicability_requirements: [{fact:'jurisdiction', operator:'equals', value:'United States'}]` is structurally identical in shape to `CLAIM-COPY-001-v1`'s own already-adopted, already-published gate — no new `ApplicabilityFact`, no new evaluator branch, no `applicability_any_of` required or proposed. Because this candidate is reached via an explicit goal (§2/§3 above), never a relationship, it has no Article-50/NY-style unrestricted-global-reach exposure to solve — independently re-confirmed, not assumed from the package's own claim.

**Disposition: APPLICABILITY APPROVED.**

## 5. Dependency semantic — independent re-derivation of D0 (critical gate)

Independently re-opened and re-read current production source directly, rather than accepting the candidate package's §8-REVISED or any prior session's Final Report summary of it: `08_Platform/app/lib/bounded-interpretation/build-bounded-interpretation.ts` line 78-80 confirms `hasGovernedProjectDependencies(match)` is exactly `match.unresolved_project_dependencies.length > 0` — a pure length check on an array, no other logic. `08_Platform/app/lib/retrieval-engine/assemble-result.ts` lines 93/135/165 confirm `unresolved_project_dependencies: claim.unresolved_project_dependencies` is copied verbatim from the static `TopicClaim` declaration at every result-assembly call site, with no intervening transform. No code path in `build-bounded-interpretation.ts`, `assemble-result.ts`, or anywhere else in `lib/retrieval-engine/`/`lib/bounded-interpretation/` reads a `ProjectFacts` value, an evidence-review outcome, or a Commercial Assurance determination to add, remove, or otherwise mutate an entry in this array at runtime. The sole exception, `shouldIncludeHumanContributionSentence` (build-bounded-interpretation.ts), is hardcoded to the literal string `human_contribution_description` and to the `copyright_ownership`/`copyrightability` categories only — confirmed it does not remove the dependency from the array and does not change `BoundedInterpretation.status`; it only appends one additional sentence while the claim remains in Case 3B. No equivalent mechanism exists for, or is proposed by, this candidate. **Independently confirmed: dependency "resolution" (true or false) is not a reachable runtime state for any evidence-only dependency in this corpus, including this candidate's superseded composite and Trademark's own already-adopted dependency** — cross-checked against `CPR_027`'s own text, which states the Trademark dependency is "unresolved (always, under the current governed evidence model)... only feeds the Case 3B hedge content." Since neither a resolved-true nor a resolved-false state is ever reached, no dependency could ever unlock a BI-permitted conclusion that a zero-dependency design lacks — the fixed, domain-blind `rules.ts` templates already prohibit infringement/copying/similarity/derivative-status conclusions regardless of dependency count. Independently re-read `directlyRelevantSummary` (rules.ts lines 158-166) and confirmed its fixed boundary clause ("though it doesn't by itself determine the answer for your specific project") already discharges substantively the same epistemic-honesty function the superseded Case-3B dependency would have added — empirically consistent with the already-adopted, zero-dependency `CLAIM-ADOBESTOCK-AI-STUDIO-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001-v1` precedent (a more complex, branching proposition than this candidate's, canary-confirmed safe at `directly_relevant`). This review also independently confirms the package's own honest disclosure that the superseded composite dependency (`unauthorized_reproduction_or_derivative_use_of_third_party_work`) bundled at least four categorically distinct judgment types (identity of work, protected status, copying-in-fact, derivative-work characterization, authorization) into one string — a weaker representation than Trademark's own single-statutory-clause mirror, reinforcing rather than undermining the D0 conclusion. **D0 is independently re-confirmed correct on this review's own re-derivation, not merely inherited.**

**Disposition: D0 — ZERO DEPENDENCIES APPROVED.**

## 6. `directly_relevant` semantics — critical gate, explicitly tested for overstatement risk

This review specifically tested whether current architecture would allow `directly_relevant` to be read, or to be strengthened by any downstream layer into being read, as: infringement established; §106/§501 proven to govern this project's facts; reproduction established; derivative-work status established; lack of authorization established; or the project commercially uncleared. Traced the full rendering path: `buildBoundedInterpretations` → `directlyRelevantSummary` → the fixed template `"${claimStatement} This is relevant to ${label}, ${boundaryClause}"`, where `claimStatement` is the already-governed candidate statement quoted verbatim (never paraphrased) and `boundaryClause` is one of two fixed, pre-written strings, never generated per-conversation. No parameter, code path, or Composition/Projection layer downstream of this function (confirmed: `rules.ts`'s own module header states every template is "`[PRINCIPLE]` fixed v1 copy... no LLM generation, no per-conversation variation beyond substituting a category label or a verbatim, already-governed candidate_statement") can substitute, append, or infer a project-specific characterization into this rendering. `directly_relevant` here can only mean: the governed §106/§501 proposition is directly relevant to the matched `third_party_copyright` goal under a satisfied U.S.-jurisdiction applicability gate — never that the statute has been proven to apply to this project's facts. **No HOLD-triggering condition found; the universal project-specific boundary remains authoritative, and no Composition patch is needed or proposed.**

**Disposition: PASS.**

## 7. Dependency askability status

Confirmed directly against `08_Platform/app/lib/crc-engine/dependency-askability.ts`'s registry (`DEPENDENCY_TREATMENTS`, a plain keyed object; `getAskabilityEntry()` returns `undefined` for any unregistered key) — no entry exists for the superseded composite string, and this candidate proposes zero dependencies, so there is nothing to register. **ASKABILITY = NONE**, independently re-confirmed: none of "Do you have permission?"/"Do you own the copyright?"/"Is the source work copyrighted?"/"Is your output substantially similar?"/"Did you infringe?"/"Is this a derivative work?"/"Is this fair use?" is askable under current stock/evidence governance, matching every sibling legal-characterization dependency in this corpus.

**Disposition: PASS.**

## 8. Evidence limitations

Re-tested §12's prohibited-conclusions list against the candidate statement (package §5) word-by-word — no clause in §5 crosses into any of §12's named prohibitions. Confirmed the manifest's own disclosed non-captured material (§§107-122 substantive content, substantial-similarity case law, AI-training-data litigation, §106A/VARA) is each independently justified as out of this candidate's bounded scope, not a silent gap.

**Disposition: PASS.**

## 9. Prohibited project-specific conclusions

Re-tested against the candidate statement and against `directlyRelevantSummary`'s actual fixed template (§6 above) — no combination of governed text and fixed wrapper can produce: infringement, protected-status-established, ownership, validity, authorization-established-or-denied, copying-established, substantial similarity, derivative-work-status-as-legal-matter, fair-use-or-exception-outcome, territorial/legal attachment beyond user selection, or commercial clearance. Confirmed structurally (§6), not by trusting the package's wording alone.

**Disposition: PASS.**

## 10. Output-vs-training-data boundary

Independently re-confirmed: the candidate proposition (§1) states a general rights/infringement structure applicable to any reproduction or derivative work without reference to how an allegedly-infringing copy was produced — it does not, and under this review's own reading cannot, extend to a model's own training-data-reproduction theory (Getty v. Stability AI/Andersen-style). Cross-checked against `SI8-Reviewer-Manual-v0.3.md` Domain I, which independently brackets training-data liability as a separate, un-auditable residual risk that never blocks a positive I01 outcome — reinforcing, not merely asserting, this boundary. No training-data source was captured or relied upon for this candidate's evidence.

**Disposition: PASS.**

## 11. Commercial Assurance handoff

Re-read `08_Platform/app/app/admin/submissions/[id]/review/guidance.ts` directly (not accepted from the package): confirmed the current, live text — "Watch the content directly for I01 and I03. Declarations are not sufficient — the reviewer must form an independent opinion," and "I01 — Recognizable copyrighted content: Architecture, visual art, distinctive product designs, characters, and iconic set pieces can all carry copyright. Incidental capture... is different from deliberate depiction. Note both but assess differently." This is strictly observational human-review guidance — no repository artifact anywhere states Domain I01, or Commercial Assurance generally, adjudicates legal copyright infringement. The package's three-tier boundary (CRC educational guidance ≠ Commercial Assurance evidence review ≠ legal infringement determination) is accurate and does not overstate Commercial Assurance's role. Domain I01 is not converted into an LK dependency by this candidate (consistent with the D0 decision, §5 above).

**Disposition: PASS.**

## 12. Explicit-vs-discovered distinction

Confirmed: no `TopicRelationship`, no discovered-relevance trigger, no `ContentPresenceCategory` extension appears anywhere in the package or is introduced by this review. Explicit-goal-only, as required. Future discovered relevance is correctly recorded as FUTURE / NOT REQUIRED FOR FIRST SLICE, not designed here.

**Disposition: EXPLICIT ONLY APPROVED.**

## 13. No fabricated UserGoal

The new `GoalCategory` value would reach the existing, unmodified `lookupTopicClaims` exact-topic path exactly as `likeness`/`copyright_ownership`/`trademark` already do — no synthetic goal-construction logic is proposed or required.

**Disposition: PASS.**

## 14. No candidate-specific orchestration

Confirmed: no Retrieval, Bounded Interpretation, Composition, or questioning code is authored, modified, or proposed by the package or by this review. Every mechanism reused is the existing, generic, already-proven one, per §15 below.

**Disposition: PASS.**

## 15. No brand/content-recognition `ContentPresenceCategory`

Confirmed absent — not created, not referenced as a dependency or applicability mechanism.

**Disposition: PASS.**

## 16. No ownership/authorization/fair-use dependency

Confirmed absent from the final D0 decision, with an explicit, reasoned exclusion recorded in the package's §8 (preserved as historical record) and independently re-confirmed correct here: ownership/validity would duplicate the existing `copyrightability` topic's own subject matter applied to a third party's work; authorization and fair use are each their own multi-element legal characterizations, not elements this general proposition needs resolved to remain true and useful.

**Disposition: PASS.**

## 17. Fail-closed behavior

Confirmed throughout: unresolved/non-United-States jurisdiction → excluded (existing mechanism, unmodified); zero dependencies means no hedge-worthy unresolved fact is fabricated where none exists; no self-attestation path exists for any prohibited conclusion.

**Disposition: PASS.**

## 18. Static-dependency architecture observation (per this milestone's §8/§11 instruction — recorded, not remediated)

Independently confirmed via direct source inspection (§5 above): `unresolved_project_dependencies` functions in current production architecture as a **static, governance-authored, claim-level classification** — set once at claim authoring/supersession time and copied unmodified through Retrieval into Bounded Interpretation — rather than as a dynamically resolvable, per-session project-state mechanism. This holds for every evidence-only dependency in this corpus (verified for this candidate's superseded composite and independently cross-checked against `CPR_027`'s own text describing Trademark's dependency identically). **Classification: CONFIRMED / SEPARATE ARCHITECTURE FOLLOW-UP.** This observation does not block this candidate, whose own dependency decision (D0, §5) is independently correct regardless of whether the broader mechanism is ever redesigned. Per this milestone's explicit instruction, this review does not redesign dependencies, modify Bounded Interpretation, reopen Trademark's own governance record, or open a generic architecture remediation project — it records the observation for a future, separately-authorized architecture milestone to consider, if any.

## 19. Consultative Composition boundary

Verified only, not modified: the governed proposition (§1/§5), the fixed `directly_relevant` template (§6), the Domain I01 handoff (§11), and the explicit prohibited-conclusions list (§9) together give a future Consultative Composition layer sufficient governed structure to eventually explain relevant context, why project-specific characterization remains open, and the Commercial Assurance escalation path — without this review adding a dependency, weakening BI, or strengthening the ceiling for prose quality. No Composition change is proposed or required.

**Disposition: PASS.**

## 20. Adversarial review

| Attack | Finding |
|---|---|
| Source fidelity | Confirmed clean — no strengthening found, independently re-extracted from raw PDF text (§1) |
| Proposition overreach | Not found — §5's wording states the legal standard only, never a project application |
| Output/training-data conflation | Not found — §4/§10 explicitly, correctly exclude training-data theories |
| Forced taxonomy | Not found — GoalCategory/KnowledgeTopic identity independently re-derived against three fresh test intents, not copied from the package's own three (§2) |
| D1 restored merely for Trademark symmetry | Not found — this review independently re-confirmed D0 by direct source inspection, not by deferring to the package's or a prior session's conclusion (§5) |
| Dependency justified by "richer disclosure"/"aggregate-signal honesty" alone | Specifically checked, per this milestone's own critical-gate instruction — not found in the final D0 decision; the superseded D1 rationale is preserved only as historical record, correctly marked superseded |
| `directly_relevant` misread as a project-specific infringement/reproduction/derivative-work/authorization determination | Specifically checked, per this milestone's own critical gate (§6) — not found; no code path permits it |
| Composition patched to compensate for a boundedness gap | Not found — none was needed (§5/§6); none proposed |
| Domain I01 converted into an LK dependency | Not found — explicitly avoided (§5, §11) |
| Commercial Assurance overstatement (implying legal infringement adjudication) | Not found — §11 independently re-verified against `guidance.ts` directly |
| Self-attestation risk | Not found — ASKABILITY = NONE, fail-closed by construction (§7) |
| Arbitrary dependency fragmentation | Not applicable — zero dependencies (§5) |
| Legal-advice implication | Not found anywhere in §5/§9/§11 |
| Static-dependency-architecture finding used to justify redesigning BI within this review | Specifically checked — not found; recorded as a separate follow-up only (§18), no remediation attempted |

**No unresolved substantive defect found.**

## 21. Final disposition

**ADOPT.** Every review point (1–17, 19) passes on this review's own independent re-derivation — each re-tested directly against the primary-source evidence (raw `pdftotext` extraction, independently computed checksums), the actual current runtime source files (`build-bounded-interpretation.ts`, `rules.ts`, `assemble-result.ts`, `dependency-askability.ts`, `guidance.ts`, `types/interview-engine.ts`), or the statute's own text — not accepted from the candidate package, the preceding diagnostics, or any prior session's summary on their own say-so. The dependency question (§5), the critical `directly_relevant`-overstatement gate (§6), and the static-dependency architecture observation (§18) — the three items this milestone specifically flagged as requiring independent, non-inherited adjudication — were each independently re-derived and each resolved cleanly. `Lifecycle: Adopted` is recommended for `CAND-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001` as `CLAIM-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001-v1` (version suffix and exact `third_party_copyright` GoalCategory identifier subject to confirmation at the actual Adoption/production-representation step, per §2's own note).

**This FGR's ADOPT recommendation does NOT itself constitute PM Adoption.** Per the established corpus sequence (see `FGR_021`'s own identical discipline, and the README's own pattern of recording PM/Architecture approval as a separate, later, explicitly-dated act distinct from the FGR file itself), entry into `GOVERNED-CLAIMS.md`, `Lifecycle: Adopted` becoming actual (not merely recommended), `CRC Eligible` status, CRC Publication Review, and production representation each remain separate, later, explicitly-authorized steps. This review changes no field in `GOVERNED-CLAIMS.md` and creates no production representation.

--- END VERBATIM FORMAL GOVERNANCE REVIEW ---
