Title: CRC Publication Review #19 — Pika Commercial-Use Grant (post-retirement reconsideration)

Reviewed objects:
- `CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1`
- `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1`
- `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1`
- `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-FANCY-001-v1`

(`CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-001-v1` remains `Lifecycle: Deprecated`, superseded, and is not a subject of this review — it cannot advance regardless of this CPR's outcome.)

Review date: 2026-09-06

Artifact type: CRC Publication Review / Decision Analysis — post-retirement reconsideration. Distinct from `CPR_018` (the initial publication review, disposition WITHHOLD for all four subject claims, sole blocker = live Matrix coexistence). `CPR_018` is preserved unmodified as the historical record of that pre-retirement finding; this artifact records an independent, later reconsideration against the now-actually-retired Matrix state, mirroring the Kling `CPR_014`→`CPR_015` and Runway `CPR_016`→`CPR_017` precedent exactly — retirement does not automatically convert a prior WITHHOLD into APPROVE. This review independently rechecks every publication condition, not merely the coexistence blocker.

PM decision: **[PENDING — this artifact records a reviewing-agent recommendation; PM/JD concurrence, if any, is a separate, later step, not performed by this task, mirroring the CPR_015/CPR_017/CPR_018 precedent of leaving PM decision PENDING at initial artifact-writing time].**

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as the review was conducted this session. The evidence-freshness check in §2 was performed via four independent, live `WebFetch` calls against `pika.art/pricing` today (after `FGR_016`'s and `CPR_018`'s own separate fetches). The empirical canary in §5 was executed live, via a raw `retrieve()` call against the real, now-retired Matrix state, run through a throwaway, never-committed script (`08_Platform/app/pika-cpr019-canary-throwaway.ts`, deleted immediately after this review captured its output), mirroring the ephemeral-probe discipline used for every prior CPR in this line.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Pika Commercial-Use Grant — CRC Publication Review (Post-Retirement Reconsideration)

## 0. Repository / governance state verified before review

LK worktree (`work/lk-eu-ai-act-art50-research`) confirmed clean, HEAD `6828366fc2bbb3b7f26f4c736a42928c7a16a5ef` (the Pika Matrix retirement commit) at review start. `origin/main` confirmed at `d511e90fe4a7b982ca3343e2239558185902f706`, 7 ahead / 12 behind (not reconciled, per this task's scope). The 12 mainline-only commits are the identical set `CPR_018` already inspected and cleared by direct diff (8 `crc-assurance-handoff`/discovery-takeaway commits confirmed scoped outside Living Knowledge/Matrix/TopicClaim/applicability; 2 M2B/M2B.1 commits confirmed to activate a display label for `tool_account_status` only, not `tool_plan_tier`; 1 the already-reviewed Runway integration merge) — no new commit has landed since `CPR_018`, re-confirmed by direct `git log` against the same merge-base. No material change invalidates any assumption required by this review.

Authoritative material read directly this review: `FGR_016` and its three addenda, `CPR_018` in full, the `GOVERNED-CLAIMS.md` Pika entries (confirmed: baseline `Lifecycle: Adopted`/`CRC Approver: PENDING`; deprecated v1 `Lifecycle: Deprecated`, `superseded_by` the three successors, original text preserved verbatim; Standard/Pro/Fancy each `Lifecycle: Adopted`/`CRC Approver: PENDING`, each with exactly one `equals` requirement), `matrix-fixture.ts`'s `pika` entry (confirmed `crc_eligible: 'No'`, retirement annotation present, historical proposition/evidence/provenance text unmodified), and `topic-claims-fixture.ts` (confirmed zero Pika entries — no second CRC-active Pika representation exists anywhere). Starting state confirmed exactly: **Matrix OFF / successors WITHHELD / TopicClaims OFF**, matching the intended post-retirement intermediate state exactly, and matching the retirement task's own reported end-state.

## 1. Governance history reconstructed

Fifteen distinct, non-substitutable stages confirmed present in order, read directly, none rewritten: Pika evidence re-verification → `FGR_016` candidate formation (ADOPT both original claims) → PM/JD adoption → the original unsafe `tool_plan_tier not_equals 'Free'` paid-plan representation → the applicability-safety finding → `FGR_016_ADDENDUM_APPLICABILITY_SAFETY` (blocks CPR) → the generic categorical-canonicalization architecture review → canonicalization implementation (built on a separate branch, confirmed below to remain unintegrated) → `FGR_016_ADDENDUM_CLOSED_WORLD_RECONSIDERATION` (recommends superseding the open-world predicate with three closed-world `equals` claims) → PM/JD concurrence (`FGR_016_ADDENDUM_CLOSED_WORLD_PM_CONCURRENCE`) → supersession into the Standard/Pro/Fancy successors → canonicalization-coverage review (found only Free aliases exist on the unintegrated branch; classified reach-limitation, not blocker) → `CPR_018` initial publication review (WITHHOLD, all four subject claims, sole blocker Matrix coexistence, empirically proven 8/8) → Matrix retirement authorization review (read-only, no artifact — recommended authorize, mirroring the observed Kling/Runway precedent of no standalone pre-authorization file) → explicit JD/PM retirement authorization (2026-09-06) → Matrix retirement execution (`6828366f`). No earlier decision substitutes for this one; `FGR_016`'s ADOPT and `CPR_018`'s WITHHOLD both remain the accurate, unaltered historical record of their respective decisions.

## 2. Current representation state (§C of the review task)

Verified directly, not assumed: Pika Matrix row `crc_eligible: 'No'` (retirement annotation intact, cites `CPR_018`/`FGR_016`, states retirement does not itself grant CRC eligibility to any successor). Zero Pika TopicClaims in `topic-claims-fixture.ts`. All five governed ledger entries confirmed unchanged since the retirement commit (which touched only the two Matrix files). `CPR_018` file itself untouched. **No second CRC-active Pika commercial-use representation exists anywhere in the repository.**

## 3. Current governed claim estate (§D)

Four publication candidates confirmed: `CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1` (`established`, `applicability_requirements: []`, `Lifecycle: Adopted`); `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1` / `-PRO-001-v1` / `-FANCY-001-v1` (each `conditional`, each exactly one `{fact: 'tool_plan_tier', tool: 'pika', operator: 'equals', value: '<tier>'}` requirement, each `Lifecycle: Adopted`). The deprecated v1 (`Lifecycle: Deprecated`, `superseded_by` the three successors) confirmed unable to advance regardless of this CPR's outcome.

## 4. Evidence freshness — independently re-checked a further time, not inherited

Per established practice (already applied by `FGR_016` and `CPR_018`, each performing its own independent fetch), this review performed four separate live `WebFetch` calls against `pika.art/pricing` today. First fetch reproduced the exact same spurious "Basic tier" artifact `FGR_016`/`CPR_018` already diagnosed and discarded — an independent third reproduction of a known, recurring AI-fetch/rendering error (conflating the Free tier's own "80 monthly video credits" feature bullet with a nonexistent distinct tier name), corroborating rather than undermining the original diagnosis. A second, stricter fetch again surfaced the same artifact alongside a genuine tier. A third, narrowly-targeted fetch ("is there a tier literally named Standard priced at $8/month?") returned an unambiguous, literal confirmation: *"$8/month = Standard... 'Standard' followed by '$8 / month billed yearly'"* — matching the governed record's own tier/price structure exactly. A fourth, narrowly-targeted fetch of the Free tier's feature list alone confirmed, verbatim: *"80 monthly video credits / Access to Pika 2.5 (480p only), Pikascenes, Pikadditions, Pikaswaps, Pikatwists, Pikaffects Image-to-Video only / Download videos with no watermark... Commercial use is only listed as a feature in the paid tiers (Standard, Pro, and Fancy)."* Findings converge exactly on the governed picture: Free = $0, no commercial use; Standard = $8/mo, Pro = $28/mo, Fancy = $76/mo, each listing "Commercial use" undifferentiated among the three. The full primary Terms of Service page remains a JS-rendered shell, unfetchable directly — the same disclosed limitation as `FGR_016`/`CPR_018`, not silently upgraded to "directly fetched" here. **Classification: CURRENT.** Evidence freshness does not warrant WITHHOLD or ESCALATE at this reconsideration.

## 5. Claim semantics — independently re-verified, nothing strengthened

Re-read directly from `GOVERNED-CLAIMS.md` (not from `CPR_018`'s own restatement): the ledger's own text for each successor states explicitly that "Claim proposition..., Source references, Source authority/type, Source fact, SI8 interpretation..., and Prohibited conclusions are otherwise unchanged in substance from the superseded v1 claim... none were reinterpreted, only re-scoped to a single tier per claim" — confirmed by direct comparison against the preserved v1 text, no drift, no strengthening, no fabricated tier distinction, no lost evidence limitation. `provider_scope: null`, `tool_scope: ['pika']` unchanged across all four candidates. `Lifecycle: Adopted` unchanged by the retirement sequence.

## 6. Applicability safety — checked against the actual current code, not assumed integrated

Re-verified fresh via `git merge-base --is-ancestor aba157bc... origin/main` and `...HEAD`: the generic categorical-canonicalization commit remains an ancestor of **neither** — still unintegrated on this branch and on mainline. The evaluator's real, currently-in-effect comparison for `tool_plan_tier` is therefore raw case-sensitive equality (`actual === req.value`), confirmed by direct read of `lookup-topic-claims.ts` lines 180–207, whose own comment states plainly that this fact is "deliberately NOT canonicalized here." Empirically confirmed via the live canary in §8 below: missing/unknown → `unresolved` on all three tier successors, never guessed; `'Free'` and `'free'` → `not_met` on all three (raw equality against the literal strings `'Standard'`/`'Pro'`/`'Fancy'` simply never matches either capitalization of "Free" — this is inherently safe, not exploitable, precisely because the *positive* closed-world `equals` predicate has no open-world failure mode the way the superseded `not_equals` claim did); exact `'Standard'`/`'Pro'`/`'Fancy'` → `met` only on the matching successor; an unrecognized future tier (`'Ultra'`) → `not_met` on all three; ambiguous `'paid'` → `not_met` on all three. **No open-world predicate remains anywhere in the candidate publication representation.** Raw-equality behavior produces low recall (a real Standard/Pro/Fancy user whose wording isn't the exact capitalized string won't resolve today) — not a false positive.

## 7. Canonicalization and askability status — reach-limitations, not blockers, re-argued fresh for this CPR

Canonicalization remains unintegrated (§6) — classified for this CPR specifically as **reach-only, separable from CPR**: the safety of the *closed-world* claims (§6) does not depend on canonicalization the way the superseded open-world claim's safety would have; canonicalization would only improve how often a genuine Standard/Pro/Fancy user's own wording resolves, never change whether an unsupported tier could be granted. `tool_plan_tier` askability remains unauthorized, reconfirmed fresh from `selector-askability.ts`'s own comment ("still unauthorized"). Its absence limits reach/recall — a user's plan tier may simply never be confirmed — but does not by itself permit any false-positive applicability outcome; the claim remains safely `unresolved` rather than guessed either way. Neither item blocks publication.

## 8. Post-retirement empirical canary — the load-bearing finding of this reconsideration

Executed live, against the real current (retired) Matrix state, via a throwaway script (`pika-cpr019-canary-throwaway.ts`, deleted immediately after use, never committed): the real `MATRIX_FIXTURE` (Pika `crc_eligible: 'No'`) supplied unmodified, alongside four ephemeral synthetic `TopicClaim` objects (mechanically transcribed from the real `GOVERNED-CLAIMS.md` fields — baseline unconditional, Standard/Pro/Fancy each with their one `equals` requirement — forced only inside this throwaway script, never written to any repository file), a real `commercial_use` `UserGoal`, and a real `pika` tool mention, run through the actual `retrieve()` code path unmodified, across all 8 required scenarios:

| Scenario | Matrix-origin | Successor-origin | Result claim IDs |
|---|---|---|---|
| Missing/unknown tier | 0 | 1 | baseline only |
| `'Free'` | 0 | 1 | baseline only |
| `'free'` (lowercase) | 0 | 1 | baseline only |
| `'Standard'` | 0 | 2 | baseline + Standard |
| `'Pro'` | 0 | 2 | baseline + Pro |
| `'Fancy'` | 0 | 2 | baseline + Fancy |
| Unknown future tier (`'Ultra'`) | 0 | 1 | baseline only |
| Ambiguous `'paid'` | 0 | 1 | baseline only |

Every scenario's diagnostics array included `{"identifier":"pika","reason":"no_eligible_claims"}` — confirming the retired Matrix row is excluded at the eligibility-filter stage itself (`enumerateEligibleClaims`'s pre-existing `crc_eligible === 'Yes'` check), before any downstream dedup ever runs. **Matrix-origin count is 0 in all 8/8 scenarios**, and this is structural, not incidental: there is nothing downstream for any dedup mechanism to reconcile, because the Matrix side contributes zero results at Retrieval itself — the identical structural finding already established for Kling (`CPR_015` §G) and Runway (`CPR_017` §5). No duplication, no contradiction, no adjacent/competing proposition text anywhere. Baseline appears in every scenario, exactly one tier successor appears only when its own condition is genuinely met, never more than one simultaneously (confirming the earlier FGR-time finding that `tool_plan_tier` being single-valued per tool mention makes cross-sibling duplication structurally impossible).

## 9. `CPR_018` blocker reconsideration

`CPR_018`'s own text states its blocker precisely: *"live Matrix `pika` row coexistence, empirically proven to co-fire with these claims in 100% of tested scenarios (8/8)... not a finding that any claim's content is inaccurate, unsafe, or should be distrusted."* Per §8's fresh empirical result — Matrix-origin count is now 0 in all 8/8 scenarios, confirmed structurally via the diagnostics trace, not inferred from the retirement commit's mere existence — **the blocker is confirmed removed.** Classification: **1 — BLOCKER REMOVED.**

## 10. Representation authority

Single-authority behavior is restored: one governed representation (the four-claim baseline+tier-exception estate) would be the sole contributor to Pika commercial-use knowledge; provenance is unambiguous (§8's canary shows exactly one claim ID per scenario, or two when a tier genuinely resolves, never a duplicate pairing of the same underlying fact from two origins); no legacy Matrix coexistence remains; no downstream dedup is relied upon to establish this — it is a direct consequence of the retired row producing zero results at the eligibility-filter stage.

## 11. Baseline + tier-exception composition (analytical, not implemented)

The generic Retrieval → Bounded Interpretation → Composition path can safely carry this structure without an unsafe stronger conclusion: Free/unresolved states surface the baseline alone (a conservative, hedged statement — not unsafe); Standard/Pro/Fancy states surface baseline + the one matching exception (both genuinely applicable, no conflict between them since they describe compatible, non-overlapping facts about the same provider). No structural inability to safely present this result was found.

## 12. Fail-closed / false-positive vs. low-recall

No false positive found anywhere in §8 — every scenario in which no tier successor appeared is a scenario where none of the three tier-specific conditions is genuinely established, confirmed empirically, not merely by design intent. Low recall (an unrecognized wording variant of a genuinely-qualifying tier) is expected and acceptable, not a publication-safety defect, per the distinction this review preserved throughout §6–§8.

## 13. Provenance / explicit-vs-discovered

The canary's `commercial_use` `UserGoal` was explicit, matched by `matched_goal_category`, not fabricated or substituted; no Composition-layer inference was exercised in this review (analytical only, §11); no Pika-specific orchestration exists anywhere in the retrieval/applicability code paths inspected.

## 14. Known test debt — reconfirmed, not re-investigated from scratch, none blocking

The retirement task's new-failure diagnostic identified exactly one new stale test from the Matrix retirement: `luma-runtime-retrieval.test.ts`'s "boundary clause is source-aware" assertion, which uses Pika purely as a second comparison fixture alongside Luma — the invariant under test remains valid, only the fixture choice is stale (retirement-related, non-substantive). Separately, `CPR_018`'s own finding — `topic-claims-fixture-consistency.test.ts` regex-parses `GOVERNED-CLAIMS.md` directly and is missing all 5 Pika claim IDs from its allowlist — remains present and unrelated to Matrix state; classified as separable ledger-consistency debt, required only before actual TopicClaim publication (when fixture and ledger must agree), not before this CPR's disposition. Neither item exposes a real invariant failure; neither is fixed here, per this task's explicit scope.

## 15. Test / typecheck evidence

Ran `npx tsc --noEmit` (clean, zero errors) and the full `__tests__/retrieval-engine/` suite (not a partial subset): **28 failed, 447 passed, 475 total, 6 suites failed.** Cross-checked against the retirement task's own reported post-retirement count (27→28, exactly one new failure) — the 28 seen here is the identical set, confirmed by direct listing: the majority are pre-existing Kling/Suno/Luma-Matrix-retirement-attributable and pre-existing Copyright/jurisdiction-normalization debt (unrelated to Pika), one is the `topic-claims-fixture-consistency` allowlist gap (§14), and one is the already-identified `luma-runtime-retrieval.test.ts` Pika-fixture staleness (§14). **Zero failures newly introduced by this review** — this review changed no tracked file prior to this artifact's own commit.

## 16. Per-claim publication readiness

All four candidates independently assessed: evidence current (§4); proposition bounded, unstrengthened (§5); `provider_scope`/`tool_scope` sound and unchanged; applicability safe for all four (baseline has none; the three tier claims use closed-world `equals`, confirmed non-exploitable in §6/§8); dependencies accurately represented (`unresolved_project_dependencies: []` throughout, unchanged); evidence limitations adequately disclosed (Prohibited Conclusions preserved verbatim); provenance adequate (citations to `FGR_016` and its addenda intact); fail-closed behavior sound (§8, §12); representation coexistence resolved for all four (§8–§10, since the single retired Matrix row was the sole common blocker for the whole estate). No remaining blocker identified for any of the four. Publishing all four together (rather than a subset) is the correct outcome — publishing only the baseline without its evidenced tier exceptions, or vice versa, would omit half of the adopted, evidence-supported picture; this concern (raised at supersession time regarding the baseline) is now resolved by approving the complete four-claim estate together, not by holding any one back.

## 17. What this review does NOT establish

Not a Commercial Assurance Assessment. Not legal advice. Not project clearance or certification. Not a re-adjudication of `FGR_016`'s Adoption decision, which is unaffected. Not an alteration of `CPR_018`'s own historical record, which remains the accurate account of the pre-retirement WITHHOLD finding. Not an authorization of `tool_plan_tier` askability, canonicalization integration, or any runtime/architecture change.

## 18. CLI recommendation

**APPROVE — all four subject claims:** `CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1`, `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1`, `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1`, `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-FANCY-001-v1`.

`CPR_018`'s sole, sufficient blocker — live, non-vacuous Matrix coexistence — has been removed by an explicitly PM/JD-authorized, correctly-executed Matrix retirement (§0, §8), and this removal has been empirically re-verified against the real post-retirement code state across all 8 required scenarios, not assumed from the retirement commit's existence alone. Every other publication requirement independently passes on this reconsideration's own fresh checks: evidence is CURRENT (§4, a fourth independent fetch round), claim semantics are unchanged and unstrengthened (§5), applicability is safe under the actual current (uncanonicalized) code (§6), canonicalization/askability are confirmed reach-limitations only, not blockers (§7), the post-retirement empirical canary confirms single-authority, non-duplicative, non-contradictory results in every scenario (§8–§10), known test debt is cosmetic and non-substantive (§14–§15), and no architectural or provider-specific concern exists (§11, §13). This is a genuine, independently-earned APPROVE for all four claims together, not an automatic conversion of `CPR_018`'s WITHHOLD.

**Proposed CRC Publication Scope / Candidate Statement:** the already-drafted text in each claim's `GOVERNED-CLAIMS.md` entry remains accurate and is recommended for use without further drafting work — see each claim's own `crc_candidate_statement` field (baseline: the Free-vs-paid summary; Standard/Pro/Fancy: each tier-specific sentence).

This recommendation does **not** itself modify `GOVERNED-CLAIMS.md`'s CRC publication fields, publish any `topic-claims-fixture.ts` entry, or perform any runtime activation. Because this APPROVE is a fresh reviewing-agent recommendation with no PM/JD concurrence yet recorded (§ PM decision, above), the correct next milestone is an explicit PM/JD concurrence gate — mirroring exactly the Kling `CPR_015`→`CPR_015_ADDENDUM_PM_CONCURRENCE` and Runway `CPR_017`→`CPR_017_ADDENDUM_PM_CONCURRENCE` sequence — before any publication-implementation milestone (ledger CRC-publication promotion, TopicClaim fixture entries, required consistency-test maintenance, post-publication empirical canary) may proceed.

--- END VERBATIM CRC PUBLICATION REVIEW ---
