Title: CRC Publication Review #2

Reviewed object: CLAIM-STOCK-EDITORIAL-002-v1

Review date: 2026-08-18

Artifact type: CRC Publication Review / Decision Analysis (distinct from a Formal Governance Review — this reviews an already-Adopted claim for CRC-eligibility, not for adoption; see FGR_002 for the adoption-stage review of this same claim)

Review recommendation: B — PASS / GO WITH BOUNDED CRC COPY ADJUSTMENT

PM decision: APPROVED bounded CRC copy adjustment and CRC publication

Final CRC publication state: Yes

PM decision date: 2026-08-18

Historical sequence (recorded here, outside the verbatim body, so it is never mistaken for what the review itself concluded): (1) this review found Recommendation B, not A — the underlying knowledge and routing were sound, but the stored CRC-facing text (`CRC Candidate Statement`/`CRC Publication Scope`) omitted a provider-evidence caveat already present in the adopted Claim proposition; (2) PM approved the bounded text correction described in the review's own §45; (3) the bounded CRC-facing text was corrected accordingly (Claim proposition itself left byte-identical); (4) the claim was then recorded `CRC Eligible: Yes`. This artifact's verbatim body below reflects step (1) only, as originally written — it does not retroactively describe steps (2)-(4).

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source used to reconstruct this artifact: the assistant's own Formal CRC-Publication Review #2 Final Report, present verbatim in this session's own conversation transcript, immediately preceding this recording task — not recreated from memory, not from the condensed summary already in `GOVERNED-CLAIMS.md`, not from the FGR.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

**1. Pre-task local HEAD**: `8e392b7e6d0c6a53e13a6b52ba8cc25a4b2b8c1f`
**2. Pre-task origin/main HEAD**: `8e392b7e6d0c6a53e13a6b52ba8cc25a4b2b8c1f` (matched exactly, no concurrent changes)
**3. Git cleanliness / concurrent remote state**: clean, no divergence

**4. Exact canonical -002 statement** (verbatim, unchanged): *"Stock-media content that a provider designates 'Editorial' is typically supplied without the model or property releases that would otherwise support broader commercial use -- a separate consideration from, though often associated with, that provider's own license-scope restriction on such use. This has been independently confirmed for Getty, iStock, and Shutterstock; it has not been independently confirmed for every stock-media provider, including Adobe Stock."*
**5. Runtime topic**: `third_party_source_rights`
**6. provider_scope**: `null`
**7. applicability_requirements**: `[]`
**8. unresolved_project_dependencies**: `['which_provider', 'editorial_designation_confirmed', 'release_status_confirmed']` — confirmed matches governed metadata exactly.

**9. Causation-vs-association assessment**: **PASS**. Rendered text never says "Editorial assets don't have releases," "this asset has no release," or "the asset is Editorial because no release exists." "Typically" and "a separate question from" render verbatim in every scenario. Matches FGR_002's own already-verified causation analysis.

**10. Provider-independence assessment**: **CORRECT as routing, but see item 25**. `provider_scope: null` is architecturally sound — this is a genuine cross-provider synthesis claim (FGR_002 item 12: "valid structural synthesis"), not one requiring provider-narrowing. The gap found is in the *text*, not the *routing* — see below.

**11–14. Getty/iStock/Shutterstock/Adobe evidence-caveat behavior**: **Getty/iStock/Shutterstock: N/A** — the rendered text makes no distinction between confirmed and unconfirmed providers at all; it renders identically regardless of which provider (if any) was named. **Adobe: FAILS.** Captured directly from the real pipeline (`C_ADOBE` scenario, synthetic-eligible `-002` only): an explicit Adobe Stock Editorial question renders the exact same universal-sounding text as the Getty/generic scenarios, with **zero indication** that this tendency was never independently confirmed for Adobe. The governed **Claim proposition** (Reviewer-facing) correctly includes this caveat ("This has been independently confirmed for Getty, iStock, and Shutterstock; it has not been independently confirmed for every stock-media provider, including Adobe Stock") — but the separate **CRC Candidate Statement** field (the literal text that would render to CRC users) omits this sentence entirely. This is exactly the gap FGR_002 itself flagged at adoption time (item 3: "the wording's silence on *which* providers support it risks reading as universal when it isn't"; item 25's own PM-reviewed recommended wording included the caveat) — the caveat made it into the Claim proposition during adoption but was not carried into the shorter CRC Candidate Statement.

**15. Model/property-release precision**: **PASS**. Text stays scoped to "model or property releases" only — never broadened to "all rights," "copyright," "trademark," "publicity rights generally," or "all permissions," in any captured scenario.

**16. License-scope separation**: **PASS**, confirmed via the combined `-001`+`-002` output — two clearly distinct sentences, `-001` entirely about license-scope categories (advertising/promotional/endorsement/merchandising), `-002` entirely about releases, no cross-claim causal language.

**17. Interaction with live -001**: `-001` (real, live) and synthetic `-002` both surfaced under the same goal, in fixture-array order (`-001` then `-002`), concatenated into one combined statement with **one** shared Case-3B hedge appended once (not duplicated per claim).

**18. Combined -001/-002 coherence**: **PASS** — clean composition, no confusing duplication, no repeated boilerplate, no cross-contamination. The combined answer reads as two complementary facts, not one merged/conflated rule.

**19. Project-specific release-status boundary**: **PASS, conservatively**. Every scenario (unknown, release stated present, release stated absent) renders the identical Case 3B hedge — CRC never asserts "your asset lacks releases."

**20. User-stated release-present scenario**: rendered text byte-identical to the unknown-status scenario.
**21. User-stated release-absent scenario**: rendered text byte-identical to the unknown-status scenario.
**22. Unknown-release scenario**: same hedge as above. **Observation (non-blocking, matches `-001`'s own precedent)**: `unresolved_project_dependencies` are never dynamically resolved from conversation content in the current architecture — the hedge is unconditional regardless of what the user actually says about release status. Safety-positive (never overclaims in either direction), but means CRC currently can't yet leverage a user's own stated release status even when given.

**23. Inverse-inference test**: **PASS** — neither "because a release exists, the Editorial restriction no longer applies" nor "because Editorial, therefore no releases" appears anywhere in any captured output.

**24. Commercial-use wording interaction**: **PASS** — combined output does not regress into "Editorial content can't be used commercially." `-001`'s specific excluded-use categories remain intact and unmerged with `-002`'s separate "broader commercial use" (release-context) phrasing.

**25. Cross-provider evidence-caveat preservation**: **FAILS as currently drafted** — see items 11–14. This is the single blocking finding of this review.

**26. CRC value rating**: **HIGH** (concur with FGR_002 items 16–17) — once the Adobe caveat gap is closed, this is a genuinely useful, non-obvious, complementary distinction to `-001`.

**27. Reviewer boundary**: **PASS** — none of the six reviewer-only checks (provider, asset classification, release status, provider notes, license, authorization) are ever claimed as performed; the Prohibited Conclusions are preserved by the unconditional Case-3B hedge.

**28. Provider-specific leak result**: **CLEAN** — with only `-002` synthetically eligible and `-001` live, `knowledge_items` contained exactly `runway-gen3`, `CLAIM-STOCK-EDITORIAL-001-v1`, `CLAIM-STOCK-EDITORIAL-002-v1` — zero Getty/iStock/Shutterstock-specific claim content, even with a real Getty `AssetProviderMention` present.

**29. Path B result**: **PASS** — incidental Getty disclosure alone (no goal), with `-002` synthetically eligible, produced `goal_interpretations: []`.

**30. No-provider result**: `-002` surfaces (provider_scope: null, correct), but renders the same universal (uncaveated) text — same gap as item 25.

**31. Adobe-specific pressure-test result**: **the load-bearing finding** — see item 14.

**32. Exact generic user-visible output**:
> "Content a stock-media provider marks "Editorial" is typically supplied without the model or property releases that would otherwise support broader commercial use -- a separate question from whether the applicable license itself permits your intended use. This is relevant to whether you have the rights to use third-party source material, but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project. A human-reviewed Commercial Assurance Assessment can address this directly."

**33. Exact Getty user-visible output**: byte-identical to item 32.

**34. Exact Adobe user-visible output**: byte-identical to item 32 — **this identity is the problem**: nothing distinguishes the Adobe case from the Getty/generic case despite materially different evidence backing.

**35. Exact release-present output**: byte-identical to item 32.
**36. Exact release-absent output**: byte-identical to item 32.
**37. Exact unknown-release output**: byte-identical to item 32.

**38. Exact combined live -001 + synthetic -002 output** (Getty question):
> "A stock-media provider's standard license for content marked "Editorial" generally covers descriptive, newsworthy, or public-interest use -- not advertising, promotional, endorsement, or merchandising use. Some providers offer a separate process to authorize commercial use of Editorial content for a specific asset, though this doesn't confirm whether that was obtained for yours. Content a stock-media provider marks "Editorial" is typically supplied without the model or property releases that would otherwise support broader commercial use -- a separate question from whether the applicable license itself permits your intended use. This is relevant to whether you have the rights to use third-party source material, but based on what's been described here, there isn't enough project-specific information to determine how it applies to your specific project. A human-reviewed Commercial Assurance Assessment can address this directly."

**39. Interactive/email consistency**: **CONFIRMED** — two independent `runCRCConversation()` calls with identical input produced byte-identical output.

**40. Privacy/internal-metadata result**: **CLEAN** — serialized output contains no `release_status_confirmed`, `which_provider`, `editorial_designation_confirmed`, or `provider_scope`.

**41. Confirmation real -002 remains Pending**: confirmed fresh, directly from the unmutated fixture object during the test run: `crc_eligible: 'Pending'`, `lifecycle: 'Adopted'`.

**42. Publication recommendation**: **B — PASS / GO WITH BOUNDED CRC COPY ADJUSTMENT**

**43. Exact reason**: The underlying governed knowledge is sound, routing is correct (generic, cross-provider, `provider_scope: null` is the right architecture), causation/inverse-inference/release-type-precision/reviewer-boundary/Path-B/leak/consistency all pass cleanly. The one real defect is textual, not architectural: the stored `CRC Candidate Statement` (and its companion `CRC Publication Scope` "CRC may state..." sentence) omit the provider-evidence-scope caveat that the adopted **Claim proposition** itself already carries. An Adobe-specific question currently receives text with the same apparent universality as a Getty question, which overstates SI8's own evidence base for Adobe specifically. This is a narrow, precisely-locatable drafting gap in governed CRC-facing text — not a Projection/template bug (Projection passes the stored text through verbatim, correctly) and not a knowledge/dependency gap (the underlying claim, its dependencies, and FGR_002's own analysis are all sound).

**44. Proposed CRC state if PASS**: not applicable as-is — Option A is not recommended.

**45. Exact bounded copy requirement (Option B)**:
- **Problematic current output**: `crc_candidate_statement` / `crc_publication_scope` render as "a stock-media provider... typically supplied without..." for *any* provider or no provider, including Adobe.
- **Semantic risk**: implies confirmed-parity coverage for Adobe that SI8's own research explicitly does not have (5 failed fetch attempts, Tier 3 corroboration only).
- **Smallest bounded change**: revise the `crc_candidate_statement` (and the corresponding "CRC may state..." sentence in `crc_publication_scope`) to name the three confirmed providers and explicitly flag Adobe as unconfirmed, mirroring FGR_002's own already-PM-reviewed item 25 wording. Proposed text (recommendation only, not applied):
  > *"Content that Getty, iStock, or Shutterstock mark 'Editorial' is typically supplied without the model or property releases that would otherwise support broader commercial use -- a separate question from whether the applicable license itself permits your intended use. This hasn't been independently confirmed for every stock-media provider, including Adobe Stock."*
- **Governed claim (Claim proposition) remains unchanged** — only the derived CRC-facing statement fields need the addition; this is the same field COPY-004/`-001` already use for CRC-scoped text, edited at the eligibility-recording step, not the substantive governed proposition.
- **`provider_scope` should remain `null`** — no routing change needed or recommended; the fix is textual only.
- **Files/surfaces likely involved** (if PM approves this bounded change): `GOVERNED-CLAIMS.md`'s `-002` entry (`CRC Publication Scope`/`CRC Candidate Statement` fields only) and `topic-claims-fixture.ts`'s matching `crc_publication_scope`/`crc_candidate_statement` strings — the same two files/fields any CRC-publication-recording task already touches, no new surface.

**46. Anomalies**: none in production behavior. The Case-3B-hedge-is-unconditional-regardless-of-user-statement observation (items 19–22) is a repeat, expected finding consistent with `-001`'s own precedent, not new.

**47. Files changed**: **ZERO** — confirmed final `git status --porcelain`, empty.
**48. Git status**: clean.
**49. Confirmation nothing committed**: confirmed.
**50. Confirmation nothing pushed/deployed**: confirmed.

**51. GO/NO-GO for PM publication decision on -002**: **GO to decide** — but the recommendation on the table is **B (bounded copy adjustment)**, not straight approval. PM may choose to: (a) approve the bounded text addition and then authorize eligibility, (b) approve eligibility as-is if the Adobe-parity risk is judged acceptable, or (c) hold pending further consideration.

**52. GO/NO-GO for beginning provider-specific (Getty/iStock/Shutterstock) CRC publication reviews**: **NO-GO** — not begun, out of scope for this task.

**53. Recommended next PM step**: decide on the Option B bounded text proposal for `-002` (item 45). If approved, a separate governance-recording task would apply the exact text change to both `GOVERNED-CLAIMS.md` and the runtime fixture, archive this review verbatim as `CPR_002`, and record `CRC Eligible: Yes` — mirroring the `-001` recording sequence. The provider-specific claims (Getty/iStock/Shutterstock) remain a distinct, later milestone.

--- END VERBATIM CRC PUBLICATION REVIEW ---
