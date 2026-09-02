Title: CRC Publication Review #13 — Kling Commercial-Use Baseline + Member-Account Exception (combined review)

Reviewed object:
- `CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1`
- `CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1`

Review date: 2026-09-02

Artifact type: CRC Publication Review / Decision Analysis (publication stage — asks whether each already-Adopted claim may additionally become `CRC Eligible: Yes`; distinct from `FGR_013`, which reviewed both objects for Adoption only). First CRC Publication Review of the Kling proposition, and the second CPR of any real `tool_scope`-narrowed claim (after Synthesia, `CPR_009`) — but the first CPR to actually find live, non-vacuous Matrix coverage for its scoped tool, exercising the LK-22 Matrix Coexistence Check's steps 2-4 for the first time (`CPR_009`/`CPR_010`/`CPR_011` all found zero Matrix coverage — steps 2-4 were structurally vacuous in every prior case). Combined review, two objects, per the established `CPR_006`/`CPR_007` combined-review convention — justified here because both claims share one Matrix row and one coexistence question that can only be meaningfully assessed together.

PM decision: **[PENDING — recorded per this task's own authorization to conduct and persist CPR; PM concurrence is a separate, later step, not performed by this task].** This review's own recommendation is below (§21).

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as the review was conducted this session (not reconstructed from a prior conversational report) — the synthetic canary evidence in §14 was executed live, via the real, unmodified `runSyntheticEligibilityCanary` harness plus a raw `retrieve()`/`buildBoundedInterpretations()`/`assembleProjectionOutput()` call, both run through a throwaway, never-committed script (`08_Platform/app/lib/crc-engine/eval/kling-cpr-canary-throwaway.ts`, deleted immediately after this review captured its output), mirroring the ephemeral-probe discipline already used for `CPR_009`/`010`/`011`/`012`.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Kling Commercial-Use Baseline + Member-Account Exception — CRC Publication Review

## 0. Repository / governance state verified before review

LK worktree confirmed `HEAD == origin/main == 1ab0bcd` immediately before this review; `FGR_013` (this review's own prerequisite) confirmed persisted and unmodified. Authoritative material read directly this review: both Adopted claims as recorded in `FGR_013`, `CRC-PUBLICATION-POLICY.md` (all seven Principles + the tool-scoped coexistence practice, read fresh, not inherited from a prior task's paraphrase), `PLATFORM-RIGHTS-MATRIX.md`'s Kling section, `matrix-fixture.ts`'s Kling row, `retrieve.ts`, `lookup-topic-claims.ts`, `enumerate-eligible-claims.ts`, `assemble-result.ts`, `selector-askability.ts`, `synthetic-eligibility-canary.ts`, and — as CPR precedent — `CPR_007`, `CPR_009`, `CPR_010`, `CPR_011` in full.

## 1. Governed propositions, restated (not reinterpreted)

Unchanged from `FGR_013` §1 — see that review for full text. `Claim character`: `established` (baseline), `conditional` (member). `Jurisdiction`: `Global`, transitional platform-contractual placeholder, not a legal-jurisdiction assertion.

## 2. Evidence-tier re-verification

Not independently re-fetched by this review — out of scope, per the same discipline `CPR_009` §2 applied to `FGR_009`. `FGR_013` §2-§3 already independently verified K1/K2 primary-source text and corroborated 2026-04-21 currency via a bounded live check. This review accepts that evidence tier as sound.

## 3. Freshness finding — independently re-applied at the publication layer, not inherited from Adoption

Per `CRC-PUBLICATION-POLICY.md` Principle 1 ("never inferred from Status") and the `CPR_009` precedent of not silently extending an Adoption-stage freshness lean to the separate, higher-stakes Publication decision: this review independently re-assesses. K1/K2 are 9 days old at review time (captured 2026-08-24, reviewed here 2026-09-02), double-cross-checked at capture, and corroborated by an independent live search finding the same 2026-04-21 effective date with no indication of a later change. This is materially fresher than `CPR_010`'s own Classification A finding (Storyblocks, 73 days / ~10.3 months, still Classification A) and incomparably fresher than the 2.5-year-stale evidence that drove `CPR_009`'s intervening DEFER. **Classification: A — evidence freshness alone does not warrant DEFER or WITHHOLD for either candidate.** (This finding is independent of, and does not resolve, the separate Matrix-coexistence question in §13/§19 below.)

## 4. Proposed CRC Candidate Statement — fidelity assessment

Both candidates reuse the Matrix's own already-drafted `crc_candidate_statement` text verbatim (present in `matrix-fixture.ts` since 2026-08-24, predating this CPR):

> Baseline: "Under Kling's current Terms of Service, you may not use, reproduce, distribute, modify, or create derivative works from generated Output for commercial purposes without Kling's written permission."
>
> Member: "If you currently hold a Kling Member Account (i.e. you're subscribed to Kling's Membership Service), Kling's current Terms of Paid Service permit commercial use of generated Output without additional written permission, except for developing or offering products or services that compete with Kling AI."

Checked against every item this review was asked to check for, on both statements: no unsupported strengthening or narrowing found; no accidental legal framing (both name "Kling's current Terms of Service/Terms of Paid Service" as the source explicitly); no project-specific inference (no "your project," "this video," or similar language); no dependency leakage (neither statement references an unresolved dependency, correctly, since both have `unresolved_project_dependencies: []`); the member statement's "except for developing or offering products or services that compete with Kling AI" carve-out is preserved faithfully, matching K2's own text, and is NOT softened or generalized into a vaguer restriction. **Finding: both statements are faithful to their respective Adopted propositions.** This review independently re-performed every check above rather than accepting the Matrix's own prior drafting on its say-so.

## 5. Evidence limitations (disclosed, would carry into any future publication scope)

Single-provider, primary-source evidence (K1/K2), both Class A capture (human Print-to-PDF); the temporal-semantics gap disclosed in `FGR_013` §10 (whether Member Account status must hold continuously, at generation time, or at commercial-use time — not stated by K1/K2); the "competing products or services" carve-out's own boundary is undefined by the source beyond its own wording (no illustrative examples given by Kling).

## 6. Prohibited conclusions — re-confirmed applicable, not reinterpreted

Re-read directly from `FGR_013` §10: neither candidate establishes branding requirements, training-data provisions, downstream IP clearance, ownership analysis, or broader commercial-readiness conclusions; the member candidate additionally does not establish membership status at any time other than currently, or whether a specific use falls within the competing-products carve-out. Both structurally unreachable by the candidate statements (§4) and by the mechanical architecture (§14-§18 below).

## 7. Dependency — baseline

`unresolved_project_dependencies: []`. No dependency to evaluate for askability.

## 8. Dependency — member

`unresolved_project_dependencies: []`, confirmed correct per `FGR_013` §8 (the temporal-semantics gap is a source-document limitation recorded in Prohibited Conclusions, not a project-fact dependency). This claim's only gating mechanism is its `applicability_requirements` entry on `tool_account_status` — already a governed, already-askable applicability fact (§FGR_013 §7), not a dependency-askability question, and not re-decided by this review.

## 9. Permanence of the Case 3B boundary — member candidate only

Not applicable in the same sense as a dependency-bearing claim: this claim has no `unresolved_project_dependencies`, so it does not permanently render via Case 3B — confirmed empirically in §14 State 3 below, where the fully-satisfied member claim renders `directly_relevant`, not `relevant_applicability_unresolved`. The applicability gate (not a dependency) is what withholds the claim entirely from retrieval when unresolved or unmet (§14 States 1-2) — a different, earlier-stage mechanism than Case 3B, correctly distinguished, not conflated.

## 10. Tool scope

`tool_scope: ['kling']` on both. Confirmed: `'kling'` is a registered `CANONICAL_TOOL_ID`. `provider_scope: null` on both — independent field, unaffected. `toolScopeMatches()` confirmed (by direct code inspection and empirically, §14) to narrow an already topic-matched claim only, never to create topic relevance on its own — matches the `CPR_009` §10 finding exactly, now confirmed for a second tool.

## 11. Explicit-goal vs. discovered relevance

Confirmed via direct inspection of `discovered-relevance.ts`: the sole existing Track A trigger discovers `third_party_source_rights` from an active `commercial_use` goal — it never discovers `commercial_use` itself from a tool mention, Kling or otherwise. **Both claims are reachable only under an explicit, confirmed `commercial_use` UserGoal today**, identically to Synthesia (`CPR_009` §11). This review does not propose, and Hard Boundaries forbid, any Track A change.

## 12. Conversational reachability

Confirmed via direct inspection of `extraction.ts`: `KNOWN_TOOLS` already carries two Kling aliases — `'kling'` and `'kling ai'` (the latter added 2026-08-19, Copyright UAT Correction Milestone). **Unlike Synthesia at its own CPR time (zero aliases), Kling is already conversationally reachable today.** This is a positive, disclosed finding, not a gap — consistent with `CRC-PUBLICATION-POLICY.md` Principle 7's own framing that publication eligibility and conversational reachability are independent, separately-timed concerns (here, reachability already happens to be in place).

## 13. Matrix coexistence inspection (LK-22 / CRC-PUBLICATION-POLICY.md tool-scoped coexistence practice) — the load-bearing finding of this review

Performed fresh. Searched `PLATFORM-RIGHTS-MATRIX.md` and `matrix-fixture.ts` for "kling": **found live coverage** — `MatrixRow.identifier: 'kling'`, carrying `MatrixClaim.claim_id: 'kling-commercial-use-baseline'` and `MatrixClaim.claim_id: 'kling-commercial-use-member'`, both `crc_eligible: 'Yes'` today, both substantively equivalent to the two candidates under review here (confirmed by direct text comparison — the candidate statements in §4 are, in fact, the Matrix's own text, reused verbatim).

Per the coexistence practice's own four numbered steps:
1. **Inspect existing coverage** — done above. Coverage found, non-vacuous, unlike every prior tool-scoped CPR in this corpus.
2. **Determine material overlap** — confirmed: both TopicClaim candidates and both Matrix claims state the identical real-world proposition (same K1/K2 clauses, same conditions, same carve-outs). This is not a shared-tool coincidence; it is the same governed content represented twice.
3. **Run a combined synthetic eligibility canary including the specific Matrix rows** — performed, §14 below.
4. **If compatibility cannot be established, WITHHOLD `CRC Eligible: Yes` until it can** — see §19 for this review's disposition on that question, informed directly by §14's empirical finding.

## 14. Synthetic representation and synthetic eligibility canary

Two ephemeral `TopicClaim` objects were constructed for this review only (never persisted, never added to any fixture), mechanically transcribing `FGR_013`'s own governed fields plus the Matrix's own already-drafted candidate statements (reused as both `crc_candidate_statement` and, for the coexistence run, `crc_publication_scope` — a SYNTHETIC ASSUMPTION FOR CPR TESTING ONLY, not governance state, per the harness's own documented contract). `crc_eligible: 'Yes'` is likewise a synthetic override applied only inside the throwaway script, never written to any repository file.

**Three-state conditional canary (member candidate), run via the real, unmodified `runSyntheticEligibilityCanary` harness:**

- **State 1 — `tool_account_status` unknown:** `retrieved_claim_ids: []`. Diagnostic: `applicability_unmet`, requirement status `unresolved`. Bounded Interpretation: `relevant_applicability_unresolved` (Case 3A-shaped withholding at the applicability layer — the claim never reaches retrieval, so BI never asserts anything about it either way). **Confirmed: fails closed exactly as governed, never guessed.**
- **State 2 — `tool_account_status` confirmed = "Regular Account" (a known, non-matching value):** `retrieved_claim_ids: []`. Diagnostic: `applicability_unmet`, requirement status `not_met`. Identical downstream behavior to State 1 — the architecture does not distinguish "confirmed not eligible" from "unknown" in its retrieval-level output, both simply omit the claim. **Confirmed: does not affirmatively assert ineligibility to the user; correctly conservative, not broadened.**
- **State 3 — `tool_account_status` confirmed = "Member Account":** `retrieved_claim_ids: ["CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1"]`. Bounded Interpretation: `directly_relevant`. Rendered summary is the candidate statement verbatim (§4), including the competing-products carve-out, followed by the fixed "doesn't by itself determine the answer for your specific project" hedge. **Confirmed: becomes applicable exactly per governed semantics, no overstatement.**

**Baseline candidate**, tested independently across States 1-3 (tool_account_status varied): retrieved identically in every state (`["CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1"]`) — confirmed unconditional, unaffected by account status, exactly as governed.

**Matrix coexistence canary — the deciding evidence.** A raw `retrieve()` call was constructed with BOTH the two synthetic (forced-eligible) TopicClaims AND the real, live `matrix-fixture.ts` Kling `MatrixRow` (its own two real, already-`Yes` claims) supplied together, with an explicit `commercial_use` goal, a canonical `kling` tool mention, and `tool_account_status` confirmed = "Member Account" (the maximal-overlap state, where every one of the four claims is independently applicable). Result:

- **4 separate `RetrievalResult` entries** — `kling-commercial-use-baseline` (Matrix), `kling-commercial-use-member` (Matrix), `CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1` (TopicClaim), `CLAIM-KLING-COMMERCIAL-USE-MEMBER-001-v1` (TopicClaim) — **zero cross-origin deduplication**, confirmed empirically (not merely inferred from separate dedup-key code paths, as the prior read-only diagnostic could only do).
- Fed through the real, unmodified `buildBoundedInterpretations` + `assembleProjectionOutput` pipeline, this produces exactly **one** `BoundedInterpretation` (both origins share `category: 'commercial_use'`, so they collapse into a single goal interpretation) — but its `summary` field **contains the baseline sentence twice and the member-exception sentence twice, back to back, verbatim**: *"Under Kling's current Terms of Service, you may not use... without Kling's written permission. If you currently hold a Kling Member Account... except for developing or offering products or services that compete with Kling AI. Under Kling's current Terms of Service, you may not use... without Kling's written permission. If you currently hold a Kling Member Account... except for developing or offering products or services that compete with Kling AI. This is relevant to..."* — and `projection.output.knowledge_items` contains **4 entries, 2 exact-duplicate pairs**.

This is not a theoretical duplication risk — it is the literal, rendered, user-facing CRC output that coexistence would produce today, empirically confirmed by running the real composition pipeline, not inferred from code reading alone.

## 15. Representation readiness

Both synthetic claims passed structural construction against the real `TopicClaim` type with no runtime type error — mechanical readiness confirmed necessary-but-not-sufficient, consistent with `CPR_009`/`CPR_012`'s own framing; the substantive findings above (§3, §13-§14) are what this review's recommendation actually rests on.

## 16. Bounded Interpretation — strongest permitted conclusion

Confirmed empirically (§14): in isolation (no Matrix claims supplied), the strongest status either claim reaches is `directly_relevant` once its own applicability is met — never a stronger conclusion than the claim's own governed text (no assertion of "this project is cleared," no assertion about which account type the user actually holds beyond what was confirmed). No `WITHHOLD` trigger was found on this basis alone for either candidate in isolation.

## 17. Consultative Composition

Inspected via the same canary's `ProjectionOutput` (§14). In isolation, Composition renders each claim's own candidate statement verbatim plus the fixed universal hedge and the fixed Commercial Assurance CTA — zero Kling-specific text beyond the governed statement itself, matching the `CPR_009`/`CPR_012` pattern. **Under coexistence, Composition renders the duplicated text described in §14** — this is a real Composition-layer consequence of retrieval-layer duplication, not a new Composition defect; Composition itself applies no domain-specific logic and simply renders what Retrieval handed it, faithfully but redundantly.

## 18. Layer-strengthening check

Confirmed: no layer, in isolation, strengthens either claim's own conclusion beyond what is governed. In coexistence, no layer *strengthens* the conclusion either (the duplicated text says the same thing twice, not something new or stronger) — but Retrieval's lack of cross-origin dedup, and Composition's faithful-but-mechanical rendering of whatever Retrieval hands it, together produce a **quality defect** (confusing, redundant, unprofessional-reading output) distinct from a strengthening defect. This distinction matters for §19/§21: this is not a case of CRC saying something false or overstated — it is a case of CRC saying something true, twice, unnecessarily, in a way that would read poorly to the "prospect's legal team" the Publication Test (`CRC-PUBLICATION-POLICY.md`) asks about.

## 19. Matrix retirement classification

Per this task's own four-option framework:

**Classification: 2 — REQUIRED BEFORE TOPICCLAIM PUBLICATION.**

Rationale: §14's empirical finding is not a hypothetical risk requiring judgment about whether "the same tool" merely triggers a discovery check (as the coexistence practice's own preamble frames the general case) — it is a confirmed, material, same-content overlap (§13 step 2) whose combined canary (§13 step 3) demonstrably fails to produce acceptable output (§14, §17-§18). The LK-22 practice's own step 4 is explicit: "If compatibility cannot be established, WITHHOLD `CRC Eligible: Yes` until it can." Compatibility was tested, not assumed, and was **not** established — coexistence produces literal duplicate rendered text. No governed mechanism exists today to retire, supersede, or suppress a Matrix row from this task's authority (this task is explicitly NOT AUTHORIZED to modify or retire Matrix claims) — Matrix retirement is a separate, later, deliberate governance/publication decision, not something this CPR can perform or substitute for.

## 20. Proposed CRC Publication Scope

Not drafted — moot given this review's WITHHOLD disposition (§21). If Matrix retirement is later performed as its own governed decision and this CPR (or a successor) is revisited, the Matrix's own already-drafted `crc_publication_scope` text (verbatim, both claims — see `matrix-fixture.ts`) is available for direct reuse without further drafting work, per §4's fidelity finding.

## 21. CLI recommendation

**WITHHOLD, for both candidates.** Not because either candidate's own evidence, applicability logic, dependency handling, or Bounded Interpretation/Composition behavior is unsafe in isolation — §3-§12 and §15-§18 (isolated case) all came back clean, several confirmed empirically rather than only architecturally, and freshness (§3) is materially stronger than precedent that has previously cleared CPR. The sole, sufficient reason for WITHHOLD is §13-§14's empirical Matrix-coexistence finding: publishing either TopicClaim today, while the live, `Yes`-eligible Matrix row remains unretired, would cause CRC to render the same governed content twice, verbatim, in a single response — a real, demonstrated compatibility failure under the LK-22 practice's own explicit WITHHOLD trigger, not a narrow-before-withhold candidate (Principle 5's narrowing hierarchy does not resolve a duplication defect the way it resolves a scope-doubt defect; there is no narrower phrasing of either claim that stops it from being the same content as the Matrix row). This WITHHOLD is a publication-layer, not adoption-layer, finding — `FGR_013`'s ADOPT decision for both claims is unaffected and unchanged.

**Path to reconsideration, stated but not executed:** a separate, later, explicitly authorized governance decision to retire (or otherwise suppress from retrieval) the corresponding Matrix row(s) — `kling-commercial-use-baseline` and/or `kling-commercial-use-member` — would resolve this review's sole blocker; §20's already-drafted scope text would then be available for immediate reuse. Alternatively, a future generic cross-origin deduplication mechanism in Retrieval (out of this review's authority to design or request) could resolve it without Matrix retirement — noted as a possibility, not recommended or scoped here.

## 22. What this review does NOT establish

Not a Commercial Assurance Assessment. Not legal advice. Not project clearance or certification. Not proof any particular project satisfies or violates either provider restriction. Not CRC eligibility for either claim (remains `Pending`, per this review's own WITHHOLD recommendation). Not a Matrix retirement decision — none is made, authorized, or implied by this review. Not a finding that the Matrix row itself is wrong, unsafe, or should be distrusted — the duplication defect is a coexistence/representation problem, not a content-accuracy problem with either representation individually.

--- END VERBATIM CRC PUBLICATION REVIEW ---
