Title: CRC Publication Review #5

Reviewed object: CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1

Review date: 2026-08-18

Artifact type: CRC Publication Review / Decision Analysis (distinct from a Formal Governance Review — this reviews an already-Adopted claim for CRC-eligibility, not for adoption; see FGR_004 for the adoption-stage review of this same claim). Third and final provider-specific CRC Publication Review researched to date in this domain (after CPR_003/Getty and CPR_004/iStock) — this review's central load-bearing question was whether the claim's intentionally mixed evidence tier (Tier 1 for the Commercial/Editorial functional distinction, Official Secondary for Rights and Clearance, with the customer-facing license text confirmed structurally inaccessible) survives real pipeline execution without being flattened into either Getty's fully-Tier-1 certainty or iStock's pure negative-finding framing.

Review recommendation: A — PASS / GO AS-IS

PM decision: APPROVED — publish as reviewed, no CRC-copy adjustment

CRC publication state: APPROVED / RECORDED

PM decision date: 2026-08-18

Historical sequence (recorded here, outside the verbatim body, so it is never mistaken for what the review itself concluded): (1) Shutterstock research occurred (`STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` §7/§8 — the Commercial/Editorial functional distinction directly verified at Tier 1 against `submit.shutterstock.com`; Rights and Clearance and Asset Assurance both characterized via Official Secondary sourcing from Shutterstock's own investor-relations and blog material; the customer-facing License Agreement confirmed structurally inaccessible across 8 distinct URL attempts, 0 successes, all HTTP 403, across three research sessions); (2) Formal Governance Review #4 reviewed the candidate and recommended C — MATERIAL REWRITE, removing the original wording's Asset Assurance assertion entirely (Asset Assurance is an indemnity layer, not a permission-granting mechanism, and does not answer what Shutterstock's Editorial license permits) and adding an explicit, governed-proposition-level caveat that Rights and Clearance's exact contractual mechanics were not independently verified; (3) PM adopted the materially rewritten governed claim (2026-08-17, `Lifecycle: Adopted`, `Publication scope: Reviewer/Commercial Assurance`, `CRC Eligible: Pending`); (4) M1/M2/M3 later implemented the required GoalCategory/AssetProviderMention/provider-scoped-retrieval architecture, giving the claim a real runtime representation (`provider_scope: ['shutterstock']`) with no Shutterstock-specific engineering required beyond what Getty's own adoption had already necessitated; (5) a bounded CRC Publication Review was performed, independently re-verifying the governed proposition, the core positive rule, the Rights and Clearance framing, the evidence-tier caveat's survival under real pipeline execution (including two targeted adversarial pressure-tests), the Asset Assurance exclusion, provider-scoped routing across 8 scenarios, project-specific uncertainty handling, three-claim composition quality, and — critically — empirical confirmation that Shutterstock's evidence posture is not flattened into Getty-level certainty when both claims render together; (6) the review reached Recommendation A — PASS/GO AS-IS; (7) PM/JD approved publication exactly as reviewed, authorizing no CRC-copy adjustment; (8) this task records that decision — `CRC Eligible: Yes`, `CRC Approver: JD (PM)`, `CRC Decision Date: 2026-08-18`. This artifact's verbatim body below reflects step (5)/(6) only, as originally written — it does not retroactively describe steps (7)-(8).

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source used to reconstruct this artifact: the assistant's own Shutterstock CRC Publication Review Final Report, present verbatim in this session's own conversation transcript, immediately preceding this recording task — not recreated from memory, not from the condensed summary already in `GOVERNED-CLAIMS.md`, not from FGR_004.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

## CRC Publication Review — CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1

**Review type:** Bounded, review-only. Zero files changed. Repository ends byte-identical to start: working tree clean, `HEAD == origin/main == f11ca2d`.

1. **Pre-task local HEAD:** `f11ca2db9469111f44832b523573ceac864819c9`
2. **Pre-task origin/main HEAD:** `f11ca2db9469111f44832b523573ceac864819c9` — matched exactly
3. **Git cleanliness/divergence:** clean, no divergence
4. **Exact Shutterstock Claim ID:** `CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1`
5. **Exact canonical Claim proposition:** matches the task's "Expected" text byte-for-byte — the material-rewrite wording from FGR_004 item 37, quoting the Commercial/Editorial distinction, the Rights and Clearance description, and the explicit contractual-mechanics-not-verified caveat
6. **Lifecycle:** `Adopted`
7. **Publication scope:** `Reviewer/Commercial Assurance`
8. **Current CRC Eligibility:** `Pending`
9. **CRC Approver:** `PENDING — not yet approved`
10. **CRC Decision Date:** `PENDING`
11. **Topic:** `third_party_source_rights` — matches runtime fixture exactly
12. **provider_scope:** `['shutterstock']` — matches runtime fixture exactly
13. **applicability_requirements:** `[]`
14. **unresolved_project_dependencies:** `['asset_confirmed_shutterstock', 'editorial_designation_confirmed', 'rights_and_clearance_status']` — matches exactly, deliberately excludes an Asset-Assurance-shaped dependency per FGR_004 item 29's own scope narrowing
15. **Provenance classification:** DIRECTLY SOURCE-BACKED, with an explicitly disclosed **mixed evidence tier** — Tier 1 for the functional Commercial/Editorial definition, Official Secondary (not Verified Primary) for Rights and Clearance. FGR_004 item 30 flags, rather than papers over, that this is a genuinely weaker evidentiary bar than Getty's fully-Tier-1 claim, and a genuinely stronger one than iStock's pure negative finding — a distinct third category, not forced into false symmetry with either.
16. **Evidence/source posture:** Commercial/Editorial functional definition — Tier 1, direct fetch of `submit.shutterstock.com` (contributor-help domain). Rights and Clearance — Official Secondary, Shutterstock's own investor-relations press release + blog, not the customer-facing License Agreement. Customer-facing license text — confirmed structurally inaccessible: **8 distinct URLs, 0 successes, all HTTP 403**, across three research sessions (Phase 1A, Phase 1B, and FGR_004's own bounded fresh-verification attempt on a new URL, which also failed identically — strengthening, not weakening, the "structural access limitation" conclusion). **No new research was needed or performed** — existing sources fully sufficient; the access gap is confirmed structural, not a research-effort gap a fresh attempt would close.
17. **Existing CRC Candidate Statement:** "Shutterstock treats content as Commercial if it can be used to commercialize, monetize, sell, promote, or advertise a product, business, or service, and as Editorial if it can't be used for those purposes. Shutterstock has publicly described a 'Rights and Clearance' service for seeking permission to use Editorial content this way, though the exact details of that process haven't been independently confirmed."
18. **Existing CRC Publication Scope:** "CRC may state that Shutterstock distinguishes Commercial content (usable to commercialize, monetize, sell, promote, or advertise) from Editorial content (which cannot be used for those purposes), and that Shutterstock has publicly described a Rights and Clearance service for seeking third-party permissions for promotional use of Editorial assets, whose exact mechanics CRC has not independently verified. CRC must not state whether the user's own specific Shutterstock asset is Editorial-designated, whether Rights and Clearance was engaged for it, or whether their use is therefore permitted."

### Part 5 — Core positive-rule assessment
19. **Sound.** The Commercial/Editorial functional distinction renders exactly as governed — "commercialize, monetize, sell, promote, or advertise" preserved verbatim in every tested scenario. No broadening to an absolute "Shutterstock Editorial content can never be used commercially in any circumstance" — the text stays scoped to Shutterstock's own functional test, matching the governed proposition.

### Part 6 — Rights and Clearance boundary
20. **Sound.** "For seeking permission to use Editorial content this way" — never "for obtaining," never implying the service guarantees permission, changes the license, applies to every asset, or that clearance was obtained for the user's asset. Checked against all seven named forbidden implications — none appear, in any of the three tested question types (general question, direct clearance question, stated-clearance claim).

### Part 4/16 — Evidence-tier boundary, load-bearing test
21. **The caveat survives intact.** "Though the exact details of that process haven't been independently confirmed" renders unchanged across the general question, the direct "can I get permission from Shutterstock" pressure-test, and the "client says Shutterstock cleared this" pressure-test. This is a semantic (not byte-identical) preservation of the governed proposition's "exact contractual mechanics... have not been independently verified" — matching the same pattern already established safe for Getty's and iStock's own CRC text.
22. **Classification: not flattened to Getty-level certainty.** Direct empirical confirmation via the Getty+Shutterstock joint-provider scenario (item 41 below): Getty's sentence states its mechanism with full confidence, no hedge on existence; Shutterstock's sentence carries its own explicit, self-contained hedge immediately adjacent to the claim. The two are genuinely differentiated in the rendered text, not merged into one undifferentiated "both providers offer clearance" statement.

### Part 7 — Asset Assurance non-goal
23. **Confirmed clean, structurally guaranteed.** "Asset Assurance" does not appear anywhere in the runtime `crc_candidate_statement`/`crc_publication_scope` text, and therefore cannot leak into any rendered CRC output — verified via full serialized-output string search across the general question, the clearance question, and the stated-clearance scenario. No blocker found; this is a non-issue by construction, not merely by testing luck (the term was excluded from the governed proposition itself at adoption time, per FGR_004 items 18–20).

### Part 8/9 — Provider-scoped routing + false-positive/negative
24. **Shutterstock routing result (Scenario A):** explicit Shutterstock question, synthetic-eligible → generic -001, generic -002, and Shutterstock-specific claim all surface; Getty and iStock excluded. Correct.
25. **Getty mismatch (B):** Shutterstock does not surface for a Getty question. Correct.
26. **iStock mismatch (C):** Shutterstock does not surface for an iStock question. Correct.
27. **Adobe mismatch (D):** Shutterstock does not surface for an Adobe question; generics may. Correct.
28. **No-provider result (E):** Shutterstock does not surface; generic -001 does. Correct.
29. **Unresolved-provider result (F):** Shutterstock does not surface for an unresolved alias ("PhotoMega"). Correct.
30. **Multi-provider result (G):** Getty (real, live) + Shutterstock (synthetic-eligible), both named → both surface; iStock excluded; no duplicate generic entries. Correct.
31. **Path B result (H):** incidental Shutterstock mention, no explicit goal → `goal_interpretations: []`; no stock content surfaces at all. Correct.
32. **False-positive result:** Shutterstock never surfaced for Getty-only, iStock-only, Adobe-only, no-provider, unresolved-provider, or incidental-disclosure-only contexts. None found.
33. **False-negative result:** Shutterstock reliably surfaced whenever an explicit `third_party_source_rights` goal existed, Shutterstock was canonically resolved, and the claim was synthetically eligible. None found.

### Parts 10–12 — Project-specific uncertainty and pressure tests
34. **Case 3B result:** fires correctly (Shutterstock's `unresolved_project_dependencies` is non-empty, 3 items). All 6 named overclaiming assertions absent, in any casing: "Your Shutterstock image is Editorial," "You need Rights and Clearance," "You have not obtained clearance," "You cannot use this asset," "Rights and Clearance makes it permissible," "Your project is cleared."
35. **Clearance-question result:** "Can I get permission from Shutterstock..." → the output preserves both the existence claim ("rights and clearance") and the unverified-mechanics caveat together; "yes, Shutterstock lets you clear it" (or equivalent) does not appear.
36. **Stated-clearance result:** "The client says Shutterstock cleared this..." → no contradiction of the user's stated fact (none of "clearance cannot exist," "the service does not work," "you definitely lack permission" appear), no Asset Assurance leak, and the claim does not verify the stated clearance — Case 3B hedge remains present and conservative, exactly as anticipated as acceptable.

### Part 13 — Three-claim composition
37. **Exact combined text (Shutterstock explicit question, synthetic-eligible):**

> A stock-media provider's standard license for content marked "Editorial" generally covers descriptive, newsworthy, or public-interest use -- not advertising, promotional, endorsement, or merchandising use. Some providers offer a separate process to authorize commercial use of Editorial content for a specific asset, though this doesn't confirm whether that was obtained for yours. Content that Getty, iStock, or Shutterstock mark "Editorial" is typically supplied without the model or property releases that would otherwise support broader commercial use -- a separate question from whether the applicable license itself permits your intended use. This hasn't been independently confirmed for every stock-media provider, including Adobe Stock. Shutterstock treats content as Commercial if it can be used to commercialize, monetize, sell, promote, or advertise a product, business, or service, and as Editorial if it can't be used for those purposes. Shutterstock has publicly described a "Rights and Clearance" service for seeking permission to use Editorial content this way, though the exact details of that process haven't been independently confirmed. This is relevant to whether you have the rights to use third-party source material, but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project. A human-reviewed Commercial Assurance Assessment can address this directly.

38. **Composition classification: B — moderate, justified repetition.** Mild overlap between `-001`'s abstract "some providers offer a separate process" and Shutterstock's specific naming of Rights and Clearance — the same pattern already accepted safe for Getty and iStock. No contradiction, no confusing duplication, no causal conflation with `-002`'s release-status territory (Shutterstock's CRC text never mentions model/property releases). The evidence caveat sits directly adjacent to the claim it qualifies, within the same sentence — self-contained hedging, not buried elsewhere. Genuine incremental value beyond `-001`: Shutterstock's functional-definition drafting structure (Commercial/Editorial, defined-term-and-negation) is categorically different from Getty/iStock's enumerated-list approach that `-001`'s cross-provider synthesis had to abstract away entirely (per FGR_004 item 14).

### Part 14 — Getty/iStock comparison
39. **Getty comparison:** confirmed distinct — Getty's own sentence states its mechanism with full confidence (Tier 1 throughout); Shutterstock's sentence carries an explicit, self-qualifying hedge. Not flattened into Getty-level certainty (item 22 above, empirically confirmed via item 41).
40. **iStock comparison:** confirmed distinct — Shutterstock's Rights and Clearance is a real, named, positively-described (if incompletely verified) mechanism; iStock's claim is a negative finding ("no evidence found"). The two read as genuinely different epistemic postures, not forced into one shared template.
41. **Exact Getty+Shutterstock combined text (empirical confirmation of evidence-tier differentiation):**

> "...Getty's standard Editorial Content license doesn't cover commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming, or marketing use unless Getty has expressly authorized it in writing -- Getty offers a separate 'Rights and Clearance' process for seeking that authorization, including for advertising and promotional use specifically. Shutterstock treats content as Commercial if it can be used to commercialize, monetize, sell, promote, or advertise a product, business, or service, and as Editorial if it can't be used for those purposes. Shutterstock has publicly described a 'Rights and Clearance' service for seeking permission to use Editorial content this way, though the exact details of that process haven't been independently confirmed..."

### Remaining items
42. **Privacy/internal-metadata result:** serialized `ProjectionOutput` checked for `provider_scope`, `asset_confirmed_shutterstock`, `editorial_designation_confirmed`, `rights_and_clearance_status`, `official secondary`, `source-tier`, `crc_eligible` — none found. Clean.
43. **Regression-boundary result:** `commercial_use`-category goal output is byte-identical whether Shutterstock's `crc_eligible` is `Pending` or synthetic-`Yes` (direct object-equality assertion passed). No changes to Getty/`-001`/`-002`/iStock/COPY claims/REL-COPY were made or exercised in a way that could leak state — all comparisons used spread-copy clones only.
44. **Whether fresh research was required:** No. FGR_004's own 52-item analysis plus the research artifact's §7/§8 fully cover every question this review needed to answer; the license-agreement access gap is confirmed structural (8/8 attempts failed across three sessions, including one genuinely new URL), and nothing in this review found that conclusion insufficient.
45. **Focused harness/test result:** 18 tests in the primary scratch harness (fixture sanity, Scenarios A–H, evidence-tier load-bearing test, clearance-question test, stated-clearance test, Asset Assurance non-leak test, three-claim composition capture, Case 3B, privacy, regression) — all 18 passed. One additional scratch test captured the exact Getty+Shutterstock combined text (item 41) — passed.
46. **Full suite/typecheck/build decision:** Not run. This is a zero-permanent-file-change review; the focused harness directly exercised the real `runCRCConversation`/`retrieve`/`lookupTopicClaims` pipeline against the real, unmodified `TOPIC_CLAIMS_FIXTURE` (plus one synthetic-eligible clone), which is sufficient to resolve every uncertainty this review raised. No code was touched, so a full suite/typecheck/build run would only reconfirm the pre-existing baseline already established across the Getty and iStock tasks this session.
47. **Temporary-file status:** two scratch files created (`__SCRATCH_cpr005_shutterstock_review.test.ts`, `__SCRATCH_cpr005_g_text.test.ts`), both deleted before this report.
48. **Files changed — expected ZERO:** confirmed, ZERO
49. **Final git status:** clean, `git status --porcelain` empty
50. **Nothing committed:** confirmed
51. **Nothing pushed/deployed:** confirmed
52. **Any anomalies:** none new. One pre-existing, disclosed-not-solved anomaly carried forward from FGR_004 item 30/44 (unrelated to CRC publication): the "Directly Source-Backed" provenance label doesn't itself distinguish an all-Tier-1 claim (Getty) from a Tier-1-plus-Official-Secondary claim (Shutterstock) — a taxonomy-precision gap for a future governance-format refinement, not a publication blocker.

### Recommendation
53. **Overall recommendation: A — PASS / GO AS-IS.**
54. **Reasoning by dimension:**
   - **Governed proposition:** sound, unchanged, honestly calibrated to its own mixed evidence tier (the material rewrite already did this work at adoption time)
   - **Core positive rule:** accurately preserved, functional Commercial/Editorial test intact, no absolute-claim broadening
   - **Rights and Clearance claim:** correctly hedged as "seeking permission" via a publicly-described service, never overstated as a guarantee
   - **Evidence-tier caveat:** preserved in the CRC-facing text in every tested scenario, including two targeted adversarial pressure-tests (direct clearance question, stated-clearance claim), and empirically confirmed not flattened to Getty-level certainty when both appear together
   - **CRC copy:** classification **A — safe as-is**; the existing `crc_candidate_statement`'s own self-qualifying clause already does the needed epistemic work in place — no bounded correction needed
   - **Routing:** all 8 scenarios (A–H) plus false-positive/false-negative checks passed cleanly; `provider_scope: ['shutterstock']` behaves identically to the now-twice-proven Getty/iStock mechanism
   - **Uncertainty handling:** Case 3B fires unconditionally and correctly; no overclaiming producible under any tested phrasing
   - **Composition:** **B — moderate, justified repetition**; genuine incremental value from Shutterstock's structurally distinct functional-definition drafting, no contradiction, no causal conflation, no Asset Assurance leak
55. **Proposed publication state (drafted, NOT applied):**
   - `CRC Eligible: Yes`
   - `CRC Approver: JD (PM)`
   - `CRC Decision Date: 2026-08-18` — **PROPOSED ONLY**
   - Exact existing `CRC Candidate Statement` that would remain (byte-identical, no change): *"Shutterstock treats content as Commercial if it can be used to commercialize, monetize, sell, promote, or advertise a product, business, or service, and as Editorial if it can't be used for those purposes. Shutterstock has publicly described a 'Rights and Clearance' service for seeking permission to use Editorial content this way, though the exact details of that process haven't been independently confirmed."*
56. **Fields that must remain unchanged if later recorded:** Claim proposition, Source references, Source authority-type, Source fact, SI8 interpretation, Applicability requirements, Unresolved project dependencies, Prohibited conclusions, `provider_scope: ['shutterstock']`, `crc_publication_scope` text, `crc_candidate_statement` text, Lifecycle, Adoption Approver/Date, Publication scope, Topic, Formal Governance Review traceability line.
57. **Expected CPR_005 path:** `06_Operations/institutional-knowledge/notebook/governance-reviews/CPR_005_CLAIM-STOCK-SHUTTERSTOCK-EDITORIAL-001-v1_2026-08-18.md` — **not created in this task**
58. **GO/NO-GO for PM Shutterstock publication decision: GO** — ready for PM decision, no blockers found
59. **Recommended next PM step:** decide on Recommendation A for Shutterstock (no text adjustment needed, matching Getty's and iStock's own recording pattern, not `-002`'s bounded-copy-adjustment pattern). If approved, a bounded recording task would follow the CPR_001/CPR_003/CPR_004 pattern exactly. With this decision, all three provider-specific claims researched to date (Getty, iStock, Shutterstock) would be fully reviewed for CRC publication — Adobe remains R3/blocked with no dedicated candidate to review, and the domain's remaining natural next step would be scoping whether further provider-specific research (Adobe) or a different milestone area is the right next PM focus.

Control returned to PM/JD. Shutterstock not published, CPR_005 not archived, Path B not implemented, Adobe research not performed.

--- END VERBATIM CRC PUBLICATION REVIEW ---
