Title: CRC Publication Review #3

Reviewed object: CLAIM-STOCK-GETTY-EDITORIAL-001-v1

Review date: 2026-08-18

Artifact type: CRC Publication Review / Decision Analysis (distinct from a Formal Governance Review — this reviews an already-Adopted claim for CRC-eligibility, not for adoption; see FGR_003 for the adoption-stage review of this same claim). First PROVIDER-SPECIFIC CRC Publication Review in this domain (CPR_001/CPR_002 both reviewed generic, cross-provider claims) — this review additionally tested whether the `provider_scope` routing mechanism itself (implemented in M3) behaves correctly under real pipeline execution, not merely whether the claim text is safe.

Review recommendation: A — PASS / GO AS-IS

PM decision: APPROVED — publish CLAIM-STOCK-GETTY-EDITORIAL-001-v1 to CRC as reviewed, with no CRC-copy adjustment

Final CRC publication state: Yes

PM decision date: 2026-08-18

Historical sequence (recorded here, outside the verbatim body, so it is never mistaken for what the review itself concluded): (1) the Getty candidate was researched (`STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md`, 5 independent Tier-1 fetches of Getty's own EULA + Rights and Clearance page across the research program); (2) Formal Governance Review #3 was completed and the claim adopted (2026-08-17, `Lifecycle: Adopted`, `Publication scope: Reviewer/Commercial Assurance`, `CRC Eligible: Pending`, with a then-unresolved provider-narrowing-capability dependency noted); (3) the claim was given a real runtime representation and the provider-narrowing capability (`provider_scope`) was implemented (M3, 2026-08-18), closing that dependency; (4) this bounded CRC Publication Review was completed, reaching Recommendation A — PASS/GO AS-IS, independently verifying the governed proposition, the CRC-facing copy, the provider-scoped routing mechanism itself (first live test of `provider_scope` for a provider-specific claim), and project-specific uncertainty handling; (5) PM approved Recommendation A as-is, authorizing no CRC-copy adjustment; (6) publication is recorded in this task — `CRC Eligible: Yes`, `CRC Approver: JD (PM)`, `CRC Decision Date: 2026-08-18`. This artifact's verbatim body below reflects step (4) only, as originally written — it does not retroactively describe steps (5)-(6).

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source used to reconstruct this artifact: the assistant's own Getty CRC Publication Review Final Report, present verbatim in this session's own conversation transcript, immediately preceding this recording task — not recreated from memory, not from the condensed summary already in `GOVERNED-CLAIMS.md`, not from FGR_003.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

## CRC Publication Review — CLAIM-STOCK-GETTY-EDITORIAL-001-v1

**Review type:** Bounded, review-only. Zero files changed. Repository ends byte-identical to start: working tree clean, `HEAD == origin/main == 9aa9260`.

### Pre-task verification
1. Git safety check: clean tree, local HEAD `9aa9260` = `origin/main` `9aa9260`. No divergence.
2. `GOVERNED-CLAIMS.md` (lines 784–921) matches every "Expected" value stated in the task with zero drift: Claim proposition text, `Lifecycle: Adopted`, `Publication scope: Reviewer/Commercial Assurance`, `Topic: third_party_source_rights`, `Applicability requirements: []`, `Unresolved project dependencies: [asset_confirmed_getty, editorial_designation_confirmed, separate_authorization_obtained]`, `CRC Approver: PENDING`, `CRC Decision Date: PENDING`. No `Full CRC Publication Review artifact:` line exists yet — correct, since no CPR has run for Getty.
3. `topic-claims-fixture.ts` runtime entry (lines 245–262) matches the canonical markdown exactly — `crc_eligible: 'Pending'`, `provider_scope: ['getty']`, same `crc_candidate_statement`/`crc_publication_scope` text. No drift between canonical and runtime state.
4. `FGR_003_CAND-STOCK-GETTY-EDITORIAL-001_2026-08-17.md` read in full (42 items) — 5-layer analysis (A affirmatively-authorized / B excluded-under-ordinary-license / C separate-authorization / D releases-belong-to-002 / E project-specific-unresolved), DIRECTLY SOURCE-BACKED provenance, recommendation A at adoption time, CRC eligibility left Pending as a product-completeness deferral (provider-scoped retrieval didn't exist yet), not a safety finding.
5. `STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` Getty sections re-confirmed: 5 independent Tier-1 fetches of Getty's own EULA + Rights and Clearance page across the research program; enumerated prohibited-use list (commercial/promotional/advertorial/endorsement/advertising/gambling-betting-gaming/merchandising) confirmed stable in clause text even though section numbering drifted across fetches (§2, §511 of the research doc — citation strategy already accounts for this); Rights and Clearance function confirmed to explicitly cover "advertising" and "promotional use" by name, not by inference. **No new research was needed or performed** — existing sources are sufficient.
6. Runtime code re-read fresh (not from memory): `lookup-topic-claims.ts`'s `providerScopeMatches()` and `lookupTopicClaims()` confirmed to run the provider pre-filter before Lifecycle/CRC-eligible/applicability evaluation, exactly as documented and as empirically observed. `build-bounded-interpretation.ts`'s Case 3B gate (`matches.some(m => m.unresolved_project_dependencies.length > 0)`) confirmed to fire unconditionally for any claim carrying non-empty `unresolved_project_dependencies` — Getty's 3 entries guarantee this path every time, regardless of what the user says.

### Part 1 — Knowledge/governance review (6 propositions)
7. **P1 (Editorial license excludes commercial/promotional/advertising/endorsement/gambling-betting-gaming/marketing use absent written authorization):** Supported, Tier 1, direct fetch of Getty's own EULA, ×5 across the research program.
8. **P2 (Getty separately offers a "Rights and Clearance" mechanism scoped to include advertising/promotional clearance):** Supported, Tier 1, direct fetch of the Rights and Clearance page, named explicitly not inferred.
9. **P3 (the mechanism's existence does not itself confirm authorization was obtained for any specific asset):** Supported by the claim's own wording ("may seek," never "will obtain") and structurally enforced by `unresolved_project_dependencies` including `separate_authorization_obtained`.
10. **P4 (this is a license-scope claim, distinct from the release-type claim in -002):** Confirmed — Getty's claim text never mentions model/property releases; FGR_003's Layer D explicitly assigns releases to -002, not Getty. Composition test (item 15 below) confirms no overlap in practice.
11. **P5 (DIRECTLY SOURCE-BACKED provenance, not Governed Synthesis):** Confirmed — both load-bearing facts trace to Getty's own two pages; the one inferential link is same-provider, disclosed, not a cross-source synthesis.
12. **P6 (claim proposition text is unchanged since FGR_003 adoption):** Confirmed via direct comparison of the current `GOVERNED-CLAIMS.md` proposition against the runtime fixture and against FGR_003's own quoted text — byte-identical.
13. All 6 propositions remain sound. No new evidence contradicts or weakens any of them.

### Part 2 — CRC copy pressure-test
14. **Classification: A (PASS/GO AS-IS).** The current `crc_candidate_statement` — "Getty's standard Editorial Content license doesn't cover commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, or marketing use unless Getty has expressly authorized it in writing -- Getty offers a separate 'Rights and Clearance' process for seeking that authorization, including for advertising and promotional use specifically" — names Getty explicitly (correct, since `provider_scope: ['getty']` guarantees this text only ever appears when Getty is the resolved provider — unlike -002's original defect, there is no cross-provider leak risk here to correct for), states the restriction using "doesn't cover... unless expressly authorized," never claims the mechanism guarantees success ("may seek" semantics preserved via "for seeking that authorization," not "for obtaining"), and does not state or imply anything about the user's specific asset. No bounded correction needed — unlike CLAIM-STOCK-EDITORIAL-002-v1's Recommendation B, this claim's provider-scoping mechanism (routing, not text) is what does the safety work here, and it already exists and works (Part 3).

### Part 3 — Provider-scoped routing test (Scenarios A–H, synthetic-eligible clone, real pipeline)
15. **A — Getty explicit question, Getty synthetic-eligible:** surfaces `CLAIM-STOCK-EDITORIAL-001-v1`, `-002-v1`, and `CLAIM-STOCK-GETTY-EDITORIAL-001-v1`. Does not surface iStock or Shutterstock claims. Correct.
16. **B — iStock explicit question, Getty synthetic-eligible:** Getty does **not** surface. Correct exclusion.
17. **C — Shutterstock explicit question, Getty synthetic-eligible:** Getty does **not** surface. Correct exclusion.
18. **D — Adobe Stock explicit question, Getty synthetic-eligible:** Getty does **not** surface. Correct exclusion.
19. **E — No-provider question, Getty synthetic-eligible:** Getty does **not** surface; generic `CLAIM-STOCK-EDITORIAL-001-v1` does. Correct — matches `provider_scope: null` semantics for generics vs. non-null for Getty.
20. **F — Unresolved-alias provider ("PhotoMega"), Getty synthetic-eligible:** Getty does **not** surface. Confirms `providerScopeMatches` correctly ignores unresolved aliases (only canonical, resolved identifiers count), matching the documented contract.
21. **G — Multi-provider (Getty + iStock, both synthetic-eligible):** both surface; Shutterstock does not; no duplicate generic entries (dedupe-by-`claim_id` holds across multiple goal categories/claims). Correct.
22. **H — Path B (incidental provider mention only, no explicit goal):** `goal_interpretations` is empty; Getty does not surface. Confirms provider mentions alone, without a matching confirmed goal, never trigger retrieval — no leakage via the understood_summary side channel.
23. All 8 scenarios behaved exactly as the provider-scoping mechanism is documented to behave. No routing defects found.

### Part 4 — Project-fact uncertainty / Case 3B
24. With Getty synthetic-eligible and an explicit Getty question, the rendered output is governed entirely by Case 3B (confirmed via the `unresolved_project_dependencies` non-empty check firing).
25. Verified **absent** from output: "Your Getty image is Editorial," "you don't have authorization," "You need Rights and Clearance," "You cannot use this commercially," "You are cleared if you use Rights and Clearance" — none of these appear, in any casing.
26. Verified **present**: the fixed closing hedge, "...but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project."
27. This confirms Getty's provider-specific text inherits the same conservative, non-overclaiming behavior already proven for -001/-002 — no new code path, no new risk surface, purely a function of `unresolved_project_dependencies` being non-empty (which it correctly is, per item 9 above).

### Part 5 — Three-claim composition (-001 + -002 + Getty)
28. Exact rendered `understood_summary`: *"You mentioned using runway-gen3 (API, Team). You also mentioned using Getty Images as a source provider. Your role on this: Producer. You mentioned this is for Paid social ad campaign, 30s cutdown. On the current project: Generation done entirely in Runway, no other tools involved."*
29. Exact rendered combined goal-interpretation text (all 3 stock claims + closing hedge + CTA):

> A stock-media provider's standard license for content marked "Editorial" generally covers descriptive, newsworthy, or public-interest use -- not advertising, promotional, endorsement, or merchandising use. Some providers offer a separate process to authorize commercial use of Editorial content for a specific asset, though this doesn't confirm whether that was obtained for yours. Content that Getty, iStock, or Shutterstock mark "Editorial" is typically supplied without the model or property releases that would otherwise support broader commercial use -- a separate question from whether the applicable license itself permits your intended use. This hasn't been independently confirmed for every stock-media provider, including Adobe Stock. Getty's standard Editorial Content license doesn't cover commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, or marketing use unless Getty has expressly authorized it in writing -- Getty offers a separate "Rights and Clearance" process for seeking that authorization, including for advertising and promotional use specifically. This is relevant to whether you have the rights to use third-party source material, but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project. A human-reviewed Commercial Assurance Assessment can address this directly.

30. **Composition quality assessment: B (moderate, justified repetition — no contradiction, no redundant restatement of identical fact).** -001 states the general license-scope rule; -002 states the separate, non-overlapping release-type concern; Getty confirms and specifies -001's general rule with Getty's exact enumerated list (notably adding "gambling/betting/gaming," not present in -001) and names the real mechanism -001 could only gesture at abstractly ("a separate process"). This is progressive specification, not duplication of identical content.
31. **Minor, non-blocking observation:** rendering order is -001 → -002 → Getty (fixture array order), which places Getty's elaboration of -001's point after the unrelated -002 release-type digression rather than immediately following -001. This is a narrative-flow nit, not a substantive or safety issue — no claim text is wrong or contradictory as a result, and reordering would be a cross-cutting composition-layer change out of scope for a single-claim publication review.

### Part 6 — False-positive / false-negative test
32. **False-negative check:** Getty explicitly eligible + explicit Getty question + resolved provider mention → Getty **does** surface. No false negative.
33. **False-positive check:** covered by Scenarios B/C/D/F/H above — Getty never surfaces for a non-Getty or absent/unresolved provider context. No false positive found in any tested condition.

### Part 7 — Regression boundary
34. `commercial_use`-category goal output is byte-identical whether Getty's `crc_eligible` is `Pending` or synthetic-`Yes` (direct object-equality assertion passed). Confirms the provider pre-filter and Getty's eligibility state have zero effect outside the `third_party_source_rights` category.
35. No other claim's `crc_eligible`, `lifecycle`, or text was touched or referenced in a way that could leak state — all comparisons used spread-copy clones, never mutating `TOPIC_CLAIMS_FIXTURE`.

### Part 8 — Evidence-tier / temporal review
36. Getty's evidentiary basis: 5 independent Tier-1 fetches across the full research program (2 direct EULA fetches this session alone per FGR_003, plus prior sessions), Rights and Clearance page fetched directly and confirmed to name advertising/promotional clearance explicitly.
37. Temporal durability: previously rated LOW-MEDIUM / HIGH monitoring priority in FGR_003 due to section-numbering instability — re-confirmed still true in the research doc (§511: "monitoring should track clause *text*, not section numbers, or it will silently break"). No evidence found this review that anything has changed since Aug 17, 2026 (one day). No new substantive research was necessary or performed.
38. `last_verified: '2026-08-17'` remains accurate — no re-verification trigger found.

### Part 9 — Recommendation (four dimensions kept distinct)
39. **Governed proposition validity:** Sound. No change needed.
40. **CRC-facing wording (`crc_candidate_statement`/`crc_publication_scope`):** Safe as currently drafted. No bounded correction needed (unlike -002's prior finding) — Getty-naming is exactly correct here because `provider_scope` guarantees the text only renders in a Getty-confirmed context.
41. **Provider-scoped routing mechanism:** Verified correct across all 8 tested scenarios (A–H). This is the first live proof that `provider_scope` behaves as designed under real pipeline execution for a provider-specific claim, not just architecturally.
42. **Project-specific uncertainty handling:** Verified correct — Case 3B fires unconditionally, no overclaiming output producible under any tested phrasing.
43. **Overall recommendation: A — PASS/GO AS-IS.** All four dimensions clear independently. No text change, no routing change, no eligibility-adjacent product work required before publication.

### Part 10 — Proposed publication record (drafted, NOT applied)
44. If PM approves Recommendation A, the following would be recorded (not yet done):
   - `CRC Eligible: Yes`
   - `CRC Approver: JD (PM)`
   - `CRC Decision Date:` (date of PM approval)
   - `crc_eligible: 'Yes'` in the runtime fixture (topic-claims-fixture.ts)
45. **Fields that must remain unchanged** if approved: Claim proposition, Source references, Source authority-type, Source fact, SI8 interpretation, Applicability requirements, Unresolved project dependencies, Prohibited conclusions, `provider_scope: ['getty']`, `crc_publication_scope` text, `crc_candidate_statement` text, Lifecycle, Adoption Approver/Date, Publication scope, Topic, Formal Governance Review traceability line.
46. No bounded text correction is proposed (contrast with CPR_002, which required one) — Recommendation A carries the existing text forward unmodified.

### Part 11 — Note (not executed)
47. `CPR_003_CLAIM-STOCK-GETTY-EDITORIAL-001-v1_2026-08-18.md` would be the correct filename for the eventual archived review, following the established CPR numbering sequence (CPR_001, CPR_002, now CPR_003) — **not created in this task**, per explicit instruction.

### Procedural / governance confirmations
48. Zero files changed, zero commits, zero pushes, zero deploys performed.
49. Temporary scratch test file (`__SCRATCH_cpr003_getty_review.test.ts`) created, executed (14/14 passing), and deleted before this report.
50. `git status --porcelain` confirmed empty after cleanup — repository byte-identical to task start.
51. `HEAD` remains `9aa9260`, unchanged, still equal to `origin/main`.
52. No CRC eligibility was changed for Getty or any other claim.
53. No governed claim text was edited.
54. No runtime fixture was edited.
55. No product logic was implemented or modified.
56. iStock and Shutterstock CRC Publication Reviews were **not** begun.

**Recommendation returned to PM/JD: A — PASS/GO AS-IS.** Getty is ready to become `CRC Eligible: Yes` with no text change, contingent only on PM's explicit approval to proceed with a recording task (which would produce CPR_003 and update GOVERNED-CLAIMS.md + the runtime fixture, following the same pattern as CPR_001).

Control returned to PM/JD. Awaiting decision on whether to proceed to a CRC Publication Recording task for Getty.

--- END VERBATIM CRC PUBLICATION REVIEW ---
