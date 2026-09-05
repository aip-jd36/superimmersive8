Title: CRC Publication Review #16 — Runway Commercial-Use Grant (initial review)

Reviewed object:
- `CLAIM-RUNWAY-COMMERCIAL-USE-001-v1`

Review date: 2026-09-03

Artifact type: CRC Publication Review / Decision Analysis (publication stage — asks whether the already-Adopted claim may additionally become `CRC Eligible: Yes`; distinct from `FGR_015`, which reviewed the object for Adoption only). First CRC Publication Review of the Runway proposition, and the third CPR of any real `tool_scope`-narrowed claim (after Synthesia, `CPR_009`, and Kling, `CPR_013`/`CPR_015`) — and, like Kling's `CPR_013`, finds live, non-vacuous Matrix coverage for its scoped tool, exercising the LK-22 Matrix Coexistence Check's steps 2-4.

PM decision: **[PENDING — recorded per this task's own authorization to conduct and persist CPR; PM concurrence is a separate, later step, not performed by this task].** This review's own recommendation is below (§14).

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as the review was conducted this session (not reconstructed from a prior conversational report) — the freshness re-check in §2 was performed via a live, direct fetch of `runway.com/terms-of-use`, and the synthetic coexistence canary evidence in §7 was executed live, via a raw `retrieve()`/`buildBoundedInterpretations()` call, run through a throwaway, never-committed script (`08_Platform/app/lib/crc-engine/eval/runway-cpr016-canary-throwaway.ts`, deleted immediately after this review captured its output), mirroring the ephemeral-probe discipline used for `CPR_009`/`010`/`011`/`012`/`013`.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Runway Commercial-Use Grant — CRC Publication Review (Initial)

## 0. Repository / governance state verified before review

LK worktree (`work/lk-eu-ai-act-art50-research`) confirmed clean, HEAD `b31db632ee3198a81f0a676211c4e6c8a1d84ae6`, before this review began. `origin/main` confirmed at `ba9b7fdc7beabb065fc87056ec8418274f75c186`, 2 commits ahead (`53f49f9`, `ba9b7fd` — "CAH-3B" CRC-Sales-leads feature) — re-diffed independently by this review, not inherited from any prior task's finding: confirmed purely additive under `crc-sales`/`crc-leads`/admin surfaces, plus one additive-only field exposure in `run-crc-conversation.ts` (`bounded_interpretations`, referentially identical to an already-computed value; the diff's own comment states "No Retrieval / BI / Projection / Composition / CRC conversation semantics change"). Zero overlap with Living Knowledge, Matrix, or governance-review files. Authoritative material read directly this review: `FGR_015` in full, the `GOVERNED-CLAIMS.md` Runway entry, `PLATFORM-RIGHTS-MATRIX.md`'s Runway section, `matrix-fixture.ts`'s `runway-gen3` row, `CRC-PUBLICATION-POLICY.md` (read fresh, not paraphrased from a prior task), and — as CPR precedent — `CPR_013` in full.

## 1. Governed proposition, restated (not reinterpreted)

Unchanged from `FGR_015` §1/§14 — see that review for full text. `Claim character`: `established`. `Jurisdiction`: `Global`, transitional platform-contractual placeholder, not a legal-jurisdiction assertion. `applicability_requirements: []`, `unresolved_project_dependencies: []`, `tool_scope: ['runway-gen3']`, `provider_scope: null`.

## 2. Evidence freshness — independently re-checked at the publication layer, not inherited from Adoption

Per `CRC-PUBLICATION-POLICY.md` Principle 1 ("never inferred from Status") and the `CPR_009`/`CPR_013` precedent of not silently extending an Adoption-stage freshness finding to the separate, higher-stakes Publication decision: this review performed its own direct fetch of `runway.com/terms-of-use` (2026-09-03, same day as `FGR_015` but independently executed, not re-run of the same call). Findings, confirmed fresh: stated last-updated date **May 11, 2026** (unchanged); §4.4 non-ownership and non-restriction-of-commercial-use language confirmed verbatim; §5 competitive-products restriction confirmed verbatim; the Enterprise-carve-out language independently reconfirmed — *"If your organization would like to use, or has signed up for, Runway Enterprise Services, check out the Runway Enterprise Services Terms, which govern the use of Runway Enterprise Services"* — confirming `FGR_015`'s own finding, not merely trusting it. No tier-based differentiation of commercial-use rights found anywhere in the document, confirmed independently. **Classification: CURRENT.** Evidence freshness alone does not warrant WITHHOLD or ESCALATE.

## 3. Publication-boundedness assessment

`provider_scope: null`, `tool_scope: ['runway-gen3']` (existing `CANONICAL_TOOL_ID`, no registry work) — correctly scoped, not broadened. `applicability_requirements: []` reconfirmed correct on its own evidentiary merits by this review, independently of `FGR_015`'s own finding: the primary ToS text was checked again for any per-tier or per-account gate on commercial-use rights, and none was found — this is not an applicability gate absent by oversight, it is genuinely absent from the evidence. No dependency exists to evaluate for askability. Evidence limitations (Enterprise out of scope; the "similar or competitive products or services" restriction requires case-specific judgment this claim does not perform; the third-party Enterprise-training-opt-out claim remains unconfirmed) are preserved in Prohibited Conclusions, not silently dropped. No fabricated project-specific legal conclusion appears in the candidate statement — checked directly against the `CRC Candidate Statement` field in `GOVERNED-CLAIMS.md`, which names "Runway's current Terms of Use" as the source explicitly and contains no "your project"/"this video" language.

## 4. Proposed CRC Candidate Statement — fidelity assessment

> "Under Runway's current Terms of Use, you may use generated Output commercially across Runway's Free, Standard, Pro, and Max tiers, subject to a restriction against using the Services or Outputs to create, train, develop, or improve similar or competitive products or services. This does not apply to Runway's Enterprise tier."

Checked against every item this review was asked to check for: no unsupported strengthening or narrowing found relative to the governed proposition; no accidental legal framing; no project-specific inference; no dependency leakage (correctly, since `unresolved_project_dependencies: []`); the Enterprise exclusion is preserved explicitly, not softened into an ambiguous qualifier. **Finding: faithful to the Adopted proposition.**

## 5. Tool scope / conversational reachability

`tool_scope: ['runway-gen3']` confirmed a registered `CANONICAL_TOOL_ID`. Conversational reachability not independently re-verified by this review (out of CPR scope, mirroring `CPR_013` §12's own treatment of this as a separately-timed, independent concern per `CRC-PUBLICATION-POLICY.md` Principle 7) — noted, not resolved here.

## 6. Matrix coexistence inspection (LK-22 / `CRC-PUBLICATION-POLICY.md` tool-scoped coexistence practice) — the load-bearing finding of this review

Performed fresh, independently re-verified rather than inherited from `FGR_015`. Read directly: `PLATFORM-RIGHTS-MATRIX.md`'s Runway "Plan Tier" field states *"Commercial-use rights do not differ by tier — same language applies to Free, Standard, Pro, Unlimited, and Enterprise per ToS §4.4."* `matrix-fixture.ts`'s `runway-gen3` `MatrixClaim`: `crc_eligible: 'Yes'`, `crc_publication_scope`: *"CRC may state only that Runway's current Terms permit commercial use across subscription tiers when the Terms of Service are followed..."* — **no Enterprise exclusion appears anywhere in the live Matrix representation.**

This review's own §2 direct fetch independently confirms the primary source does **not** actually support "the same language applies to... Enterprise" — Enterprise is explicitly referred to separate, non-public, customer-specific terms. The Matrix's assertion is broader than its own cited source actually warrants, on the Enterprise dimension specifically — reconfirmed by this review, not merely repeated from `FGR_015`.

Per the coexistence practice's own four numbered steps:
1. **Inspect existing coverage** — done above. Live, non-vacuous coverage found.
2. **Determine material overlap** — confirmed: on the Free/Standard/Pro/Max grant, the Matrix claim and the governed successor state substantively the same real-world proposition (same primary source, same core grant, same competitive-products restriction). On Enterprise specifically, the two representations **diverge**: the Matrix implies inclusion (via its unqualified "across subscription tiers"/"same language... Enterprise" framing); the governed successor explicitly excludes it. This is not merely duplicative overlap (Kling's shape) — it is overlap on the core grant plus a **scope inconsistency** on Enterprise.
3. **Run a combined synthetic eligibility canary including the specific Matrix row** — performed, §7 below.
4. **If compatibility cannot be established, WITHHOLD `CRC Eligible: Yes` until it can** — see §9 for this review's disposition, informed directly by §7's empirical finding.

## 7. Synthetic representation and synthetic coexistence canary

One ephemeral `TopicClaim` object was constructed for this review only (never persisted, never added to any fixture), mechanically transcribing the governed record's fields plus its already-drafted `crc_candidate_statement`. `crc_eligible: 'Yes'` is a synthetic override applied only inside the throwaway script, never written to any repository file. The real, live `matrix-fixture.ts` `runway-gen3` `MatrixRow` was supplied unmodified alongside it.

A raw `retrieve()` call was constructed with an explicit `commercial_use` goal and a canonical `runway-gen3` tool mention (no applicability-gating variable exists for this claim, unlike Kling — both representations are unconditional, so no multi-state canary is meaningful here; a single run suffices). Result:

- **2 separate `RetrievalResult` entries** — `runway-gen3` (Matrix) and `CLAIM-RUNWAY-COMMERCIAL-USE-001-v1` (TopicClaim) — **zero cross-origin deduplication**, confirmed empirically, not merely inferred from dedup-key code reading.
- Fed through the real, unmodified `buildBoundedInterpretations` pipeline, this produces exactly **one** `BoundedInterpretation` (`status: 'directly_relevant'`, `supporting_claim_ids: ['runway-gen3', 'CLAIM-RUNWAY-COMMERCIAL-USE-001-v1']`) whose `summary` field contains **both candidate statements concatenated, back to back, verbatim**:

  *"Runway's current Terms allow commercial use across all subscription tiers, provided you comply with the Terms of Service. The Free plan mainly differs by watermarking rather than commercial-use permissions. Under Runway's current Terms of Use, you may use generated Output commercially across Runway's Free, Standard, Pro, and Max tiers, subject to a restriction against using the Services or Outputs to create, train, develop, or improve similar or competitive products or services. This does not apply to Runway's Enterprise tier. This is relevant to whether this can be used commercially, though it doesn't by itself determine the answer for your specific project."*

- **This is not merely duplicative (restating the same fact twice), unlike Kling's coexistence failure — it is scope-inconsistent.** The first (Matrix-origin) sentence states an unqualified "across all subscription tiers" grant with no Enterprise carve-out. The second (successor-origin) sentence explicitly states "This does not apply to Runway's Enterprise tier." A user reading the composed output would see two adjacent statements about the same tiers that do not agree on Enterprise scope — a materially worse defect than plain duplication, since it is not merely redundant but could read as internally contradictory.
- Because neither claim carries an `applicability_requirements` gate, **this coexistence failure occurs unconditionally, on every retrieval of this topic for this tool** — there is no state (unlike Kling's unknown/non-member/member split) in which only one representation surfaces. Coexistence is unsafe in 100% of reachable states, not merely a subset.

## 8. Layer-strengthening check

Confirmed: neither Retrieval nor Bounded Interpretation strengthens the conclusion beyond what either representation individually states — the composed text says two adjacent, differently-scoped things, not one overstated thing. This is, as with Kling, a coexistence/representation defect, not a content-accuracy defect with either representation individually — but it is a starker instance: the divergence on Enterprise scope means the "same content twice" framing understates the problem; the two representations do not fully agree with each other.

## 9. Matrix retirement classification

Per this task's own four-option framework:

**Classification: 2 — REQUIRED BEFORE TOPICCLAIM PUBLICATION.**

Rationale: §7's empirical finding is a confirmed, material overlap (§6 step 2) whose combined canary (§6 step 3) demonstrably fails to produce acceptable output (§7-§8) — and does so unconditionally, with no gated state in which it doesn't occur. The LK-22 practice's own step 4 is explicit: "If compatibility cannot be established, WITHHOLD `CRC Eligible: Yes` until it can." Compatibility was tested, not assumed, and was **not** established. No governed mechanism exists today to retire, supersede, or suppress a Matrix row from this task's authority (this task is explicitly NOT AUTHORIZED to modify or retire Matrix claims) — Matrix retirement is a separate, later, deliberate governance decision, following the exact sequencing this repository's Kling cycle established (explicit PM/JD retirement authorization → post-retirement CPR reconsideration, independently re-checking all publication conditions, not merely the coexistence blocker → coordinated activation), not assumed, shortcut, or pre-authorized here.

## 10. Proposed CRC Publication Scope

Not drafted — moot given this review's WITHHOLD disposition (§14). If Matrix retirement is later performed as its own governed decision and this claim's CPR is reconsidered, the already-drafted `CRC Candidate Statement`/`CRC Publication Scope` text in `GOVERNED-CLAIMS.md` is available for direct reuse without further drafting work, subject to independent re-verification at that time (evidence freshness, scope, and — specifically for this claim — whether the Enterprise exclusion still holds against then-current primary source text).

## 11. What retirement would require (diagnosis only, not authorized here)

Consistent with Kling's precedent (`FGR_014`, `CPR_014`+addendum, the executed retirement commit): retirement requires an explicit, dated PM/JD authorization naming the specific Matrix claim (`runway-gen3`) and classifying the action as representation supersession, not substantive reversal (nothing here suggests the Matrix row's content is inaccurate — the defect is coexistence, not correctness); mechanically, a `crc_eligible: 'Yes'` → `'No'` flip in both `PLATFORM-RIGHTS-MATRIX.md` and `matrix-fixture.ts`, with a dated provenance annotation preserving the original decision and citing the successor claim ID, never deletion of the historical text. **One consideration specific to Runway, not present for Kling:** because the Matrix's own Enterprise-inclusive wording is itself evidentially unsupported (§6), any retirement annotation should note this discrepancy explicitly (the Matrix row was broader than its own cited source warranted, independent of and prior to any coexistence concern) — a documentation-accuracy note, not a new retirement mechanism. Retirement is not performed, authorized, or pre-judged by this review.

## 12. Fail-closed behavior

Not applicable in the sense Kling's conditional claim required (no applicability gate exists to fail closed on) — but confirmed by absence: no code path in this claim's evaluation guesses, infers, or defaults an Enterprise determination either way; the claim is simply silent on Enterprise, correctly, per its own Prohibited Conclusions.

## 13. What this review does NOT establish

Not a Commercial Assurance Assessment. Not legal advice. Not project clearance or certification. Not proof any particular project satisfies or violates the competitive-products restriction. Not CRC eligibility for the claim (remains `Pending`, per this review's own WITHHOLD recommendation). Not a Matrix retirement decision — none is made, authorized, or implied by this review. Not a finding that the Matrix row's core commercial-use grant is wrong — only that its Enterprise-inclusive wording is evidentially unsupported, and that its coexistence with the new governed successor is unsafe regardless of that separate finding.

## 14. CLI recommendation

**WITHHOLD.** Not because the candidate's own evidence, scope, applicability, dependency handling, or Bounded Interpretation behavior is unsafe in isolation — §2-§5 and §8 (isolated case) all came back clean, with freshness independently reconfirmed via a fresh direct fetch, not inherited. The sole, sufficient reason for WITHHOLD is §6-§7's empirical Matrix-coexistence finding: publishing this TopicClaim today, while the live, `Yes`-eligible Matrix row remains unretired, would cause CRC to render two adjacent, scope-inconsistent statements about the same commercial-use grant in a single response — a real, demonstrated compatibility failure under the LK-22 practice's own explicit WITHHOLD trigger, occurring unconditionally in every reachable state (§7). This WITHHOLD is a publication-layer, not adoption-layer, finding — `FGR_015`'s ADOPT decision is unaffected and unchanged.

**Path to reconsideration, stated but not executed:** a separate, later, explicitly authorized governance decision to retire the corresponding Matrix row (`runway-gen3`) — following the exact MRR-authorization → post-retirement-CPR-reconsideration → coordinated-activation sequencing established by the Kling cycle, and independently re-checking all publication conditions at that time, not merely the coexistence blocker — would resolve this review's sole blocker. §10's note on the already-drafted candidate statement applies at that time, subject to fresh re-verification.

--- END VERBATIM CRC PUBLICATION REVIEW ---
