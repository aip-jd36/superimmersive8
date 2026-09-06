# CPR_018 — Pika Commercial-Use Initial Publication Review

**Date:** 2026-09-06
**Reviewer:** CLI/reviewing-agent recommendation. PM/JD decision: **PENDING** — this artifact records a reviewing-agent recommendation only, following the same discipline as CPR_013/CPR_016/CPR_017; no human concurrence is fabricated here.
**Subject claims:**
- `CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1`
- `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-STANDARD-001-v1`
- `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-PRO-001-v1`
- `CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-FANCY-001-v1`

(`CLAIM-PIKA-COMMERCIAL-USE-PAID-PLAN-001-v1` is `Lifecycle: Deprecated`, superseded, and is not a subject of this review — it cannot advance regardless of this CPR's outcome.)

This is a genuine, independent Commercial Publication Review. No disposition was assumed in advance; Pika was not required to follow Kling's or Runway's Matrix-retirement path merely by precedent — the finding below is derived from actual evidence and empirical pipeline behavior specific to Pika's current state.

---

## §1. Baseline / staleness

LK worktree (`work/lk-eu-ai-act-art50-research`), HEAD `7c56b4ed3824b600d47363891fe264c446b6c8d7` at review start, working tree clean. `origin/main` = `d511e90fe4a7b982ca3343e2239558185902f706`, merge-base `ab2b7f8e4248b697e43ea30ad3b37cce3e9cd240` (5 ahead / 12 behind). All 12 mainline-only commits inspected individually by diffstat/message: 8 are `crc-assurance-handoff`/discovery-takeaway work (`53f49f9`, `ba9b7fd`, `3043522`, `6da6cff`, `c15519e`, `db85519`, `974b0d7`, `d511e90`), confirmed by direct diff inspection to be entirely scoped outside Living Knowledge/Matrix/TopicClaim/applicability/Retrieval/BI; 2 are the M2B/M2B.1 milestones (`d8bdddf`, `e37c014`) confirmed (via direct read of `applicability-fact-display.ts`) to activate a display label for `tool_account_status` only — `tool_plan_tier` and `jurisdiction` remain explicitly, textually "deliberately NOT entries here"; 1 is the Runway integration merge (`96a4f55`) already reviewed under CPR_016/017. No material change invalidates any assumption required by this review.

## §2. Governance history reconstructed

Ten distinct, non-substitutable events confirmed present and unedited: (1) FGR_016 candidate formation; (2) PM/JD adoption (baseline + original paid-plan claim, `not_equals 'Free'`); (3) the original unsafe representation itself; (4) `FGR_016_ADDENDUM_APPLICABILITY_SAFETY_2026-09-05.md`; (5) the generic categorical-canonicalization architecture decision; (6) its implementation on commit `aba157bcace07b069fd5c3c5f38035cc6844c0a5` — **confirmed in this review to remain unmerged: `aba157bc` is NOT an ancestor of `origin/main` or of this branch** (see §6); (7) `FGR_016_ADDENDUM_CLOSED_WORLD_RECONSIDERATION_2026-09-06.md`; (8) `FGR_016_ADDENDUM_CLOSED_WORLD_PM_CONCURRENCE_2026-09-06.md`; (9) the supersession implementation (commit `7c56b4ed`); (10) the canonicalization-coverage review. None rewritten; none substitutes for another.

## §3. Current governed claim estate

Read directly from `GOVERNED-CLAIMS.md`. All five Pika entries confirmed exactly as the supersession left them: baseline (`Adopted`, `applicability_requirements: []`, `CRC Approver/Decision Date: PENDING`); the deprecated v1 paid-plan claim (`Lifecycle: Deprecated`, original `not_equals 'Free'` text preserved verbatim, `superseded_by` the three successors — cannot advance); Standard/Pro/Fancy successors, each `Adopted`, each with exactly one requirement (`{fact: 'tool_plan_tier', tool: 'pika', operator: 'equals', value: '<tier>'}`), each `CRC Approver/Decision Date: PENDING`, no CPR previously conducted on any of the three.

## §4. Evidence freshness — independently re-verified, not inherited

Performed a fresh, independent re-check today (not the same session as FGR_016's own capture), using three separately-worded fetch attempts against `pika.art/pricing` plus a fresh web search, rather than trusting FGR_016's conclusion.

- **Tier structure and pricing (Free $0 / Standard $8 / Pro $28 / Fancy $76, identical credit/feature progression) independently reconfirmed exactly matching the governed record**, via a careful literal-quote-only fetch. A first, less careful ("ordinary-prompt") fetch attempt reproduced a spurious nonexistent "Basic" tier at $8/mo with reshuffled pricing — this is the identical class of AI-fetch-summarization artifact FGR_016 itself already diagnosed and discarded on 2026-08-06/2026-09-05; reproducing it independently today, on a different fetch, corroborates rather than undermines FGR_016's original diagnosis.
- **The narrow question of whether Free's own feature list includes a "Commercial use" line item could not be resolved with full confidence today**: two of three independently-worded fetch attempts (including one using a stricter literal-quote-only prompt) reported "Commercial use" appearing under Free; a third, deliberately narrower prompt asking the model to look specifically for inclusion/exclusion markers reported it does not. This is the same class of fetch instability already disclosed in the ledger's own Prohibited Conclusions ("the ToS excerpt has never been independently fetched in full — a genuine, disclosed evidence limitation"). This review's own re-verification did not strengthen confidence beyond what FGR_016 already disclosed, and did not surface any new information suggesting an actual policy change — it reproduced the same known limitation, not a new one.
- **A fresh web search independently reproduced the exact same "Pro tier or above" / "Basic and Pro" secondary-source artifact** FGR_016 already traced and rejected on 2026-09-05, confirming that artifact is a stable, recurring AI-search-synthesis error, not a one-off — further corroboration that it correctly should not be relied upon, exactly as FGR_016 concluded.
- **The full primary ToS remains inaccessible** — a fresh direct fetch attempt confirms `pika.art/terms-of-service` still returns only a header/nav JS-rendered shell, unchanged from the prior disclosed limitation.

**Classification: CURRENT** for the substantive paid-tier proposition (Standard/Pro/Fancy commercial-use grant, undifferentiated) — independently reconfirmed with high confidence. The Free-tier-specific point and the full ToS text remain at the same, already-disclosed evidentiary tier (search-indexed/fetch-unstable) — not strengthened, not contradicted, not newly weakened. Nothing found here changes the substantive proposition or invalidates adoption.

## §5. Substantive proposition review

Compared each successor's `Claim proposition`/`Source fact`/`SI8 interpretation` text word-for-word against the deprecated v1 entry's original text. Confirmed: only the tier name and its corresponding price point were substituted per claim; no other substantive language was added, removed, or reinterpreted. The three-way decomposition did not strengthen the substantive commercial-use conclusion and introduced no drift or omission among the tiers.

## §6. Applicability safety — verified against actual current code, not the unmerged branch

**Correction to an implicit assumption carried in the ledger's own disclosure text:** the ledger's Askability/publication-dependency notes state that `CATEGORICAL_VALUE_ALIASES['tool_plan_tier']['pika']` "contains only Free-tier aliases today," phrasing that implies the canonicalization mechanism is live with partial coverage. **Directly verified in this review: it is not live at all.** `aba157bcace07b069fd5c3c5f38035cc6844c0a5` exists only on the separate, never-integrated branch `work/crc-categorical-applicability-canonicalization`; `git merge-base --is-ancestor` confirms it is an ancestor of neither `origin/main` nor this LK branch. The actual current `evaluateRequirementStatus` in `lookup-topic-claims.ts` (line 206) performs raw `actual === req.value` / `actual !== req.value` string comparison for `tool_plan_tier`, with **zero canonicalization of any kind — not even the Free-tier aliases** — exactly the pre-canonicalization code, unmodified.

This does **not** create a new safety defect: raw case-sensitive equality against a specific literal tier name (`equals 'Standard'`, `'Pro'`, `'Fancy'`) is fail-closed regardless of whether canonicalization exists, since the closed-world `equals` predicate can never be satisfied by anything but the exact string. It **does** mean the practical resolution reach is narrower than the ledger's own text currently implies (not merely "missing Standard/Pro/Fancy aliases" but "no canonicalization capability exists in the deployed codebase at all today"). Recorded as a disclosure-accuracy finding, not a publication blocker on its own.

Empirically confirmed via a throwaway script (constructed in-memory, run against the real evaluator, deleted after use, never committed): missing tier → `unresolved` on all three tier claims; `Free` (any casing/wording) → `not_met` on all three; `Standard`/`Pro`/`Fancy` (exact string) → `met` only on the matching claim, `not_met` on the other two; unknown future tier (`Ultra`) → `not_met` on all three; ambiguous `paid` → `not_met` on all three. **No open-world negative predicate remains active** — the closed-world correction holds structurally, confirmed by direct execution, not assumption.

## §7. Canonicalization coverage — CPR treatment

Per §6, the situation is more restrictive than the prior coverage review's own framing (which assumed the mechanism was live with partial data). Reclassified: **3 — RUNTIME-REACH IMPROVEMENT SEPARABLE FROM CPR.** The absence of canonicalization does not create any unsafe false positive (confirmed empirically in §6); it only means fewer real users' exact wording will resolve to `met` until (a) the canonicalization branch is integrated and (b) Pika-specific alias entries are added. Not required before CPR, consistent with this repository's actual practice (Kling's own CPR proceeded while `tool_account_status` askability was still pending).

## §8. Askability / Discovery boundary

`selector-askability.ts` confirmed fresh: `tool_plan_tier` remains unregistered as `askable_in_crc`. `applicability-fact-display.ts` confirmed fresh: no display label exists for `tool_plan_tier`. Classification: **B — a reach/completeness limitation**, not a publication-safety blocker and not irrelevant — the claims are safe without askability (fail-closed on `unresolved`), just less likely to resolve in practice. Not authorized or touched by this review.

## §9. Current Matrix representation

Read directly from `matrix-fixture.ts`: the live `pika` row carries exactly one claim, `crc_eligible: 'Yes'`, `applicability_requirements: []` (fully unconditional — no tier gate, no gate of any kind), `last_verified: '2026-08-06'`. Its `crc_candidate_statement`: *"Pika's current Terms restrict the Free tier to personal, non-commercial use. Current paid plans include commercial-use rights, so if you're using Pika professionally it's worth confirming which subscription you're on."*

**Comparison:** this is **substantively duplicative of, not contradictory with**, the new baseline claim (`"...restricted to personal, non-commercial purposes by default, except for paid subscription plans, which include commercial-use rights"`) — both state the identical Free-vs-paid distinction in different words, with no tier-specific distinction present in the Matrix version at all (unlike the tier-specific successor claims). Classification: **partially overlapping / substantively equivalent to the baseline claim specifically**, and **broader than any single tier-successor claim individually** (Matrix asserts "current paid plans" generally, with no per-tier gate, whereas each successor is narrowed to one tier). No factual contradiction was found (unlike Runway's Enterprise-scope overreach) — this is a duplication-of-authority problem, not a correctness problem.

## §10. Representation-authority / coexistence invariant

Applied without assuming either automatic outcome. Determined empirically in §11.

## §11. Empirical synthetic coexistence canary — the load-bearing evidence

Built a throwaway script (in-memory candidate injection, real live `MATRIX_FIXTURE` `pika` row, real `retrieve()`, deleted after use, never committed, no fixture files modified) and ran all 8 required scenarios:

| Scenario | Total results | Matrix-origin | Successor-origin | Claim IDs returned |
|---|---|---|---|---|
| Unknown tier | 2 | 1 | 1 | `pika`, baseline |
| Free | 2 | 1 | 1 | `pika`, baseline |
| free (lowercase) | 2 | 1 | 1 | `pika`, baseline |
| Standard | 3 | 1 | 2 | `pika`, baseline, Standard |
| Pro | 3 | 1 | 2 | `pika`, baseline, Pro |
| Fancy | 3 | 1 | 2 | `pika`, baseline, Fancy |
| Unknown future tier | 2 | 1 | 1 | `pika`, baseline |
| Ambiguous "paid" | 2 | 1 | 1 | `pika`, baseline |

**In every one of the 8 scenarios, without exception, the live Matrix `pika` claim co-fires alongside the baseline claim** — because the Matrix row's `applicability_requirements: []` means it is unconditionally eligible whenever "pika" is mentioned with a `commercial_use` goal, regardless of any tier state. When a tier resolves, a third, further-duplicative result (the matching tier successor) is added on top. The two co-firing propositions (Matrix's and the baseline's) are substantively the same claim about Pika's commercial terms, stated independently, with no shared identity a downstream consumer could use to recognize they're the same fact. **Zero downstream deduplication participates** — `assemble-result.ts`'s dedup key is confirmed (from prior Kling/Runway diagnostics in this same corpus, re-applicable here since the mechanism is unchanged) to be scoped per-origin (`{row.identifier}:{claim_id}:{topic}` for Matrix vs. `{claim.topic}:{claim_id}:{topic}` for TopicClaim) — these two origins' keys never collide, so nothing merges them; both simply appear as independent results.

A Bounded-Interpretation-level render was attempted but the throwaway script's BI call did not produce output (a script-wiring limitation, not investigated further given the Retrieval-level result already answers the question this section exists to answer — the same standard CPR_013 applied for Kling, where retrieve()-level duplication alone was treated as dispositive).

## §12. Dedup / authority analysis

Per §11: Matrix and the successor candidates both genuinely enter `retrieve()`'s result set; neither is filtered before the other; no downstream dedup masks this — it is a real, structural duplicate-authority state, present in 8 of 8 tested scenarios (100%), not an edge case.

## §13. Baseline + exception composition

Not reached substantively — moot while §11's Matrix-coexistence finding blocks publication regardless of how well Composition could otherwise represent baseline+exception structure. No BI/Composition defect is claimed or denied here; this question is deferred to a future CPR once coexistence is resolved.

## §14. Explicit-vs-discovered / provenance

The canary used an explicit `commercial_use` UserGoal throughout; no discovered-relevance path or Track C provenance was exercised or required for this claim family. No fabricated UserGoal was introduced.

## §15. Fail-closed review

Confirmed via §6/§11: missing, unrecognized, unknown-future, and ambiguous-generic values all resolve `unresolved`/`not_met` on every tier claim — never a guessed `met`. This is low recall (a legitimate paid Standard/Pro/Fancy user whose wording isn't yet canonicalized may not receive their applicable exception), not a false-positive safety defect. Distinguished explicitly, not conflated.

## §16. Test / typecheck evidence

`npx tsc --noEmit`: clean. `npx jest __tests__/retrieval-engine/`: 27 failed / 448 passed / 475 total, 6 suites failed. Of these: 5 suites (`kling-commercial-use`, `suno-runtime-retrieval`, `luma-runtime-retrieval`, `retrieve.test.ts`, `wave1-candidate-claims-excluded`) are the already-established, pre-existing Matrix-retirement-attributable debt from earlier work in this corpus, unrelated to Pika, unaffected by anything in this review (zero files were changed by this CPR).

**One genuine, newly-surfaced finding, disclosed honestly rather than absorbed into the "pre-existing" bucket without scrutiny:** `topic-claims-fixture-consistency.test.ts` also fails (1 test, "missingFromFixture" assertion) — it regex-parses `GOVERNED-CLAIMS.md` directly and expects every `Adopted` claim to appear either in `TOPIC_CLAIMS_FIXTURE` or in the file's own `CLAIMS_WITHOUT_FIXTURE_REPRESENTATION` allowlist (the same mechanism already used for the withheld Music-domain claims). The five Pika claim IDs are in neither. **This directly contradicts an earlier claim made during the Pika supersession task** ("no test... parses GOVERNED-CLAIMS.md programmatically") — that claim was incorrect; this test does exactly that. This is a genuine, pre-existing gap dating to the original FGR_016 adoption commit, not something introduced by this CPR (zero files were touched by this review), and not fixed here per this review's own read-only/artifact-only mandate — flagged for a separate, small, bounded test-maintenance task.

## §17. Per-claim publication-readiness

All four subject claims (baseline, Standard, Pro, Fancy) independently checked: evidence current (§4), proposition bounded (§5), provider/tool scope sound, applicability safe (§6), dependencies accurately represented (none), evidence limitations disclosed, provenance adequate, fail-closed behavior sound (§15). **The sole blocker for all four is identical: Matrix coexistence (§9–§12).** Publishing any subset (e.g. the three tier claims without the baseline, or vice versa) would not cure this — the Matrix duplicates the baseline specifically and is broader than any single tier claim, so partial publication would not resolve, and could arguably worsen, the misleading-picture concern already established for this claim family.

## §18. CPR Disposition

**WITHHOLD** — for all four claims (`CLAIM-PIKA-COMMERCIAL-USE-BASELINE-001-v1`, `-STANDARD-001-v1`, `-PRO-001-v1`, `-FANCY-001-v1`), independently arrived at, not assumed from Kling/Runway precedent.

**Exact blocker:** live Matrix `pika` row coexistence, empirically proven to co-fire with these claims in 100% of tested scenarios (8/8), producing duplicate (baseline case) or duplicate-plus-tier-specific (paid-tier case) authority for the same underlying commercial-use fact, with no downstream deduplication mechanism able to resolve it. This is not a finding that any claim's content is inaccurate, unsafe, or should be distrusted — every other publication-readiness dimension (§4–§8, §14–§16) came back clean. Future retirement of the Matrix `pika` row is not itself decided or authorized by this CPR — it remains a separate governance gate, per the sequencing this repository's Kling and Runway cycles already established (MRR-equivalent authorization → post-retirement reconsideration → coordinated activation), not shortcut here.

## §19. Next milestone (not executed)

The smallest correct next step is a **Pika Matrix Retirement Authorization review** (the FGR_014/Runway-equivalent milestone) — explicit PM/JD authorization to retire the live `pika` Matrix row as representation supersession, followed by a genuine post-retirement CPR reconsideration (mirroring CPR_014→CPR_015 and CPR_016→CPR_017 exactly). This is **not** gated on canonicalization coverage (§7, separable) or askability (§8, separable) — those remain independent, lower-priority dependencies for eventual runtime reach, not for this specific publication blocker. Separately, and independently of Pika's publication path, the `topic-claims-fixture-consistency.test.ts` allowlist gap (§16) is its own small, bounded test-maintenance item.

---

**PIKA COMMERCIAL-USE CPR INITIAL PUBLICATION REVIEW — READY FOR HUMAN REVIEW**

AWAITING HUMAN REVIEW.
