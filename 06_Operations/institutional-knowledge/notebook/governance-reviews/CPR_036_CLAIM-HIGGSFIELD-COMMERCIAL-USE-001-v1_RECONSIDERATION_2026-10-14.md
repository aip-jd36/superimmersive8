Title: CRC Publication Review #36 — Higgsfield Commercial-Use Grant (post-BI-fix reconsideration)

Reviewed object:
- `CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1`

Review date: 2026-10-14

Artifact type: CRC Publication Review / Decision Analysis — reconsideration. Distinct from `CPR_035` (the initial publication review, disposition WITHHOLD, sole blocker = empirically-demonstrated Higgsfield+Kling composed-output coexistence defect). `CPR_035` is preserved unmodified as the historical record of that pre-fix finding; this artifact records an independent, later reconsideration against the now-actually-fixed Bounded Interpretation code, mirroring the Runway `CPR_016`→`CPR_017` precedent exactly (a removed blocker does not automatically convert a prior WITHHOLD into APPROVE — this review independently rechecks every publication condition, not merely the fixed blocker).

PM decision: **[PENDING — this artifact records a reviewing-agent recommendation; PM/JD concurrence, if any, is a separate, later step, not performed by this task, mirroring the CPR_016/CPR_017/CPR_034/CPR_035 precedent of recording the reviewing-agent's own recommendation directly].**

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as the review was conducted this session. The empirical canaries in §5-§6 were executed live, via raw `buildBoundedInterpretations()`/`retrieve()` calls against the real, current (post-fix) code, through a throwaway, never-committed test file (`__tests__/bounded-interpretation/_cpr035_reconsideration_throwaway_canary.test.ts`, deleted immediately after this review captured its output), mirroring the ephemeral-probe discipline used for every prior CPR in this line (`CPR_009`/`013`/`016`/`017`/`035`).

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Higgsfield Commercial-Use Grant — CRC Publication Review (Post-BI-Fix Reconsideration)

## 0. Repository / governance state verified before review

Root checkout, branch `main`, HEAD `91a57f07` at review start (one commit ahead of the fix commit `9dd9b9c4` — `91a57f07` is an unrelated sales-log entry, zero file overlap, confirmed by direct inspection of its own single-line commit message and `git show --stat`). `origin/main` confirmed identical (0 ahead / 0 behind) via fresh fetch. Working tree clean before and after this review (the throwaway canary file was deleted before this artifact was written). Confirmed directly, not assumed: `FGR_029` exists; Adoption commit `ae788505` exists; `CPR_035` exists and its disposition is WITHHOLD (read in full, §§0-10, not reconstructed from any pasted summary); commit `9dd9b9c4` exists and touches exactly the 3 files its own commit message describes (`build-bounded-interpretation.ts`, `build-bounded-interpretation.test.ts`, new `crc-bi-multi-d0-preservation.test.ts`); `CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1` remains `Lifecycle: Adopted`, `CRC Publication Scope: PENDING` (pre-this-review); no `TOPIC_CLAIMS_FIXTURE` entry exists for it; nothing has been pushed or deployed.

## 1. CPR_035 basis reconstructed and separated

Read `CPR_035` directly in full. Separating what remains valid from what the fix addresses:

**Remains valid, independent of the BI fix (re-confirmed, not re-litigated):**
- Evidence sufficiency (re-verified at Adoption via live re-fetch, unchanged in material effect).
- Legacy Matrix Coexistence Check (§4): trivially PASS — zero `higgsfield` occurrences anywhere in `PLATFORM-RIGHTS-MATRIX.md`; no legacy row exists to retire or reconcile. Re-confirmed by this review via the same grep CPR_035 performed — unchanged.
- Publication Policy Principles 1, 2, 4, 6, 7 (§2 of CPR_035): all independently re-derived PASS at that review, unaffected by anything touching BI's multi-D0 join logic.
- Conversational utility in isolation (§5): PASS, unaffected.
- D0/`directly_relevant` ceiling in isolation (§7, first paragraph): PASS, unaffected — a single-claim rendering was never the problem.
- Principle 3 (§6): independently re-derived NOT APPLICABLE. Re-derived fresh by this review in §7 below, not merely inherited.

**The one specific finding that caused WITHHOLD (§7, second half, and §8-10 of CPR_035):** the Higgsfield+Kling coexistence canary showed `build-bounded-interpretation.ts`'s unconditional `combinedStatement = matches.map(m => m.candidate_statement).join(' ')` fusing both claims' statements into one `directly_relevant` rendering with no framing distinguishing which platform's statement governs which part — producing, in immediate sequence, "permitted, unconditionally" followed by "may not use... without written permission." CPR_035 itself attributed this to "Composition's unconditional `combinedStatement` join" — the subsequent architecture investigation (`CRC-CC-MULTI-RESULT-POSTURE-COMPOSITION-1`) corrected this attribution: the join lives in Bounded Interpretation (`build-bounded-interpretation.ts`), not Composition, which is a passive downstream consumer of the already-fused string. This is a labeling correction only; CPR_035's substantive finding (the composed output is unsafe) is unaffected by which layer name it used.

## 2. Fix verified directly against commit `9dd9b9c4`

Inspected the commit directly (not assumed from any report). Confirmed:
- Changes the exact code path identified: `build-bounded-interpretation.ts`'s plain `directly_relevant` branch, extending the existing "CC-1" dependency-bearing/dependency-free grouping pattern one level deeper.
- When `matches.length > 1` within the dependency-free group, each matched claim's statement now renders as its own block via `directlyRelevantSummary`'s existing per-claim template, reused verbatim — not a new template, not model-mediated.
- No contradiction detection: confirmed — no semantic comparison between any two statements exists anywhere in the diff.
- No precedence/hierarchy inference: confirmed — no ranking, ordering-as-priority, or "most restrictive" logic exists anywhere in the diff.
- No RetrievalResult suppression: confirmed — `retrieve()` itself is untouched; both claims still retrieve independently.
- No governed claim semantics changed: confirmed — `GOVERNED-CLAIMS.md` untouched by this commit.
- No `tool_scope`/`provider_scope` alteration: confirmed — neither field's evaluation logic touched.
- No fabricated UserGoals, no Track A/Track C change: confirmed — `retrieve()`/goal-handling code untouched.
- No production fixture addition for Higgsfield: confirmed — `topic-claims-fixture.ts` untouched by this commit (Higgsfield still absent).
- Single-D0 behavior: confirmed byte-identical both mathematically (same function, same per-claim arguments a single match already received) and empirically — re-ran `build-bounded-interpretation.test.ts` and `crc-bi-multi-d0-preservation.test.ts` together at current HEAD: 9 failed / 103 passed, combined with the dedicated file's own 12/12 passing — the 9 failures independently re-confirmed pre-existing (see §8).

## 3. Independent reproduction of the original Higgsfield + Kling canary, post-fix

Not inherited from the implementation milestone's own report. This review constructed its own throwaway test (`_cpr035_reconsideration_throwaway_canary.test.ts`, deleted immediately after use), mechanically transcribing both claims' exact current verbatim text — Higgsfield's `Claim proposition` field read directly from `GOVERNED-CLAIMS.md` (§ above), Kling's `crc_candidate_statement` read directly from the live `topic-claims-fixture.ts` (line 1124) — through the real, unmodified `buildBoundedInterpretations()`.

**Result, captured directly from the executed script:**

> Status: `directly_relevant`
> Block count: **2** (was 1 fused block pre-fix, per `CPR_035` §7)
>
> Block [0]: *"Under Higgsfield's current Terms of Use, commercial use of generated Output is permitted, unconditionally, across Higgsfield's standard (non-Enterprise) terms, and these rights survive account or subscription cancellation/termination; exported Outputs may be transferred or sublicensed to clients. This proposition does not extend to Higgsfield's Enterprise tier, which is governed by a separate, non-public Enterprise Agreement not evidenced by this claim. This is relevant to whether this can be used commercially, though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness."*
>
> Block [1]: *"Under Kling's current Terms of Service, you may not use, reproduce, distribute, modify, or create derivative works from generated Output for commercial purposes without Kling's written permission. This is relevant to whether this can be used commercially, though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness."*

Confirmed programmatically, not by eye alone: Block [0] does not contain Kling's restrictive text ("you may not use, reproduce, distribute"); Block [1] does not contain Higgsfield's permissive text ("permitted, unconditionally"); the two blocks are distinct strings (`!==`); `supporting_claim_ids` contains both claim IDs. **The exact defect CPR_035 §7 demonstrated no longer occurs under this construction.**

## 4. Independent reproduction of the Runway + Kling production canary, post-fix

Also independently re-run, not cited from the implementation milestone alone — this is the strongest generalizability evidence, since both claims are already live and CRC-published today. Built a real `RetrievalHandoff` with `tools: [runway-gen3, kling]`, ran the actual production `retrieve()` against the live `TOPIC_CLAIMS_FIXTURE` and `MATRIX_FIXTURE`, fed the result through `buildBoundedInterpretations()`.

**Result:** `status: directly_relevant`, **3 blocks** — one naming Runway ("Under Runway's current Terms of Use, you may use generated Output commercially across Runway's Free, Standard, Pro, and Max tiers, subject to a restriction... This does not apply to Runway's Enterprise tier."), one naming Kling (identical text to §3's Block [1]), and one generic related-topic guidance block ("There's additional governed guidance relevant to this topic that hasn't been confirmed as applicable..." — unrelated to this specific defect, a separate, already-existing, already-safe mechanism for unresolved related-topic content). Runway's block does not contain Kling's text; Kling's block does not contain Runway's text. **The already-live production defect is confirmed fixed by the same generic mechanism, independently re-verified, not merely asserted.**

## 5. Compatible (non-oppositional) multi-D0 case

Re-ran the existing committed test "C" (`crc-bi-multi-d0-preservation.test.ts`) as part of §2's regression pass: two non-oppositional synthetic D0 claims both render as separate blocks, neither dropped, neither fused — confirming the architecture's behavior is driven by "multiple independent bounded conclusions exist," not by any contradiction-detection trigger. No semantic conflict detector exists anywhere in the fix; the mechanism applies uniformly regardless of whether the two statements happen to agree or oppose.

## 6. Principle 3 — independently re-derived for this reconsideration, not inherited from CPR_035

The actual proposition CRC would expose is unchanged since CPR_035: a bounded statement about Higgsfield's standard contractual treatment of commercial use of generated Output. Re-read `CRC-PUBLICATION-POLICY.md` fresh at this review (not paraphrased from CPR_035's own restatement). Principle 3 names exactly four No-List-adjacent subjects: likeness, voice cloning, deepfakes, political persuasion. This claim's subject — platform contractual commercial-use/ownership-disclaimer language — touches none of them, independent of whatever other claim happens to co-retrieve alongside it (the Kling claim's own subject is likewise platform contractual language, not likeness/voice/deepfake/political-persuasion — co-retrieving two non-Principle-3 claims does not manufacture a Principle-3 concern). **Principle 3: NOT APPLICABLE**, re-derived, not inherited.

## 7. Claim-level safety — confirmed unchanged since CPR_035

Re-read the full `GOVERNED-CLAIMS.md` entry directly. Governed proposition, Source fact, Prohibited Conclusions, `Lifecycle: Adopted`, `tool_scope: ['higgsfield']`, `provider_scope: null`, `applicability_requirements: []`, `unresolved_project_dependencies: []` — all byte-identical to the state CPR_035 reviewed. The claim still does not establish, and the Prohibited Conclusions list still explicitly forecloses: overall commercial clearance, copyright ownership, originality, exclusivity, non-infringement, input/reference-material clearance, likeness/voice clearance, Enterprise status, indemnification, or no-training protection. Nothing about the claim itself was reopened or altered by this reconsideration, consistent with this task's own explicit scope boundary.

## 8. Business-account test

Representative statement: *"I use Higgsfield business accounts, so I'm covered commercially."* Unchanged from CPR_035's own §5 finding: the claim's Prohibited Conclusions already foreclose reading "business account" as "Enterprise Agreement," and the SI8 Interpretation field explicitly states Higgsfield's own named tiers (Team, Scale, Enterprise) are distinct from that ambiguous marketing phrase. The fix does not touch this boundary at all — it operates purely on BI's multi-claim join logic, never on any claim's own text or the claim-level reasoning that already protects this distinction.

## 9. Multi-tool fail-closed behavior — confirmed by §3-§4's own canaries

§3 and §4 both demonstrate the fail-closed contract directly: when two independently applicable, differently-postured tool claims co-retrieve, both are preserved, neither is chosen, ranked, merged, or given inferred precedence. CRC can now state what Higgsfield's applicable terms establish and, separately, what Kling's applicable terms establish, without manufacturing a resolution between them — exactly the "preserve both, do not resolve the relationship" contract this reconsideration's own task required.

## 10. Consultative utility — safe-but-imperfect UX, not an unsafe conclusion

The corrected two-block (or three-block, in the Runway+Kling case) rendering is safe: each block is self-contained, correctly attributes its own platform by name, and ends with the same neutral bridging sentence ("relevant to whether this can be used commercially, though it reflects the platform's own terms, not a full determination of your specific project's commercial readiness"). It is not an ideal consultative narrative — it does not explain *why* two tools both matter or that one might be "hosted via" the other — but that gap was already identified by the architecture investigation as a separate, deliberately-deferred future improvement (new governed relationship metadata, explicitly out of scope for both the BI fix and this reconsideration). **This is the SAFE BUT IMPERFECT UX category, not an unsafe conclusion** — publication is not gated on achieving the ideal synthesis, only on avoiding an unsafe one.

## 11. Case 3B deferred item — NOT BLOCKING, confirmed directly

`CRC-BI-MULTI-D0-PRESERVATION-1`'s own commit message records a deliberately-deferred follow-up: the Case 3B / CC-1 `noDependencyStatement` subgroup (a dependency-free subgroup coexisting with a dependency-bearing claim) has the same join-granularity shape in principle but was not reproduced as an actual defect and was not fixed. Checked directly against `CLAIM-HIGGSFIELD-COMMERCIAL-USE-001-v1`'s own governed state: `unresolved_project_dependencies: []` (D0) and `applicability_requirements: []` (none) — this claim is `directly_relevant`-shaped, not Case-3B-shaped, and never enters the deferred subgroup's code path at all. **NOT BLOCKING** for this specific claim's publication scenario, confirmed by direct inspection of the claim's own governed fields, not assumed from the general similarity of the two code paths.

## 12. True regression check at current HEAD

Re-ran `build-bounded-interpretation.test.ts` + `crc-bi-multi-d0-preservation.test.ts` together at `91a57f07` (current HEAD, one unrelated sales commit ahead of the fix): **9 failed / 103 passed**, identical to the count the implementation milestone itself reported at `9dd9b9c4`. The 9 failures are the same pre-existing `build-bounded-interpretation.test.ts` failures (`runway-gen3`/`outside_current_coverage` guidance-block assertions) already independently confirmed, by this session's own prior isolated-worktree comparison against the pre-fix commit `22226058`, to exist identically before and after the fix — not a regression, not newly introduced by the intervening sales commit. `tsc --noEmit`: clean, modulo the same two pre-existing, unrelated `.next/types` stale-build-artifact errors already confirmed identical across this entire session's prior baseline checks.

## 13. What this review does NOT establish

Not a Commercial Assurance Assessment. Not legal advice. Not project clearance or certification. Not a finding that either claim's own individual content is unsafe or over-broad. Not a Composition redesign — Composition remains entirely unmodified; it was never the actual owning layer (§1). Not a re-adjudication of `FGR_029`'s ADOPT decision, unaffected and unchanged. Not an alteration of `CPR_035`'s own historical record, which remains the accurate account of the pre-fix WITHHOLD finding and the architecture state that produced it. Not a finding that the Case 3B/`noDependencyStatement` deferred item is resolved or safe in general — only that it does not apply to this specific claim's own D0/`directly_relevant` shape (§11). Not Production Representation — no `TOPIC_CLAIMS_FIXTURE` entry is created by this review.

## 14. CLI recommendation

**APPROVE.**

`CPR_035`'s sole, sufficient blocker — the empirically-demonstrated Higgsfield+Kling composed-output coexistence defect — has been removed by the PM/Architecture-authorized `CRC-BI-MULTI-D0-PRESERVATION-1` fix (commit `9dd9b9c4`), and this removal has been independently re-verified against the real, current code by this review's own fresh canaries (§3-§4), not assumed from the implementation milestone's own report. Every other publication requirement independently re-passes on this reconsideration's own checks: Principle 3 remains NOT APPLICABLE on independent re-derivation (§6), claim-level safety is unchanged (§7), the business-account distinction remains protected (§8), multi-tool fail-closed behavior is confirmed directly (§9), consultative utility is safe-though-imperfect rather than unsafe (§10), the Case 3B deferred item does not apply to this claim's own shape (§11), and the true regression baseline still holds at current HEAD (§12). This is a genuine, independently-earned APPROVE, not an automatic conversion of `CPR_035`'s WITHHOLD.

**Proposed CRC Publication Scope / Candidate Statement:** the claim's own already-adopted `Claim proposition` text (`GOVERNED-CLAIMS.md`) remains accurate and is recommended for use without further drafting: *"Under Higgsfield's current Terms of Use, commercial use of generated Output is permitted, unconditionally, across Higgsfield's standard (non-Enterprise) terms, and these rights survive account or subscription cancellation/termination; exported Outputs may be transferred or sublicensed to clients. This proposition does not extend to Higgsfield's Enterprise tier, which is governed by a separate, non-public Enterprise Agreement not evidenced by this claim."*

This recommendation updates `GOVERNED-CLAIMS.md`'s minimum publication metadata (CRC Publication Scope, CRC Approver, CRC Decision Date, CRC Candidate Statement) per this session's established CPR convention (`CPR_032`/`033`/`034`/`035`'s own field-update pattern) but does **not** itself publish any `topic-claims-fixture.ts` entry or perform any runtime activation — Production Representation remains a separate, later, explicitly-authorized milestone, per every prior precedent in this line.

--- END VERBATIM CRC PUBLICATION REVIEW ---
