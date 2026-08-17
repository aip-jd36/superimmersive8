Title: Formal Governance Review #2

Reviewed object: CAND-STOCK-EDITORIAL-002

Review date: 2026-08-17

Artifact type: Governance Review / Decision Analysis

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

PM adoption status: Adopted. Later recorded as `CLAIM-STOCK-EDITORIAL-002-v1` in `GOVERNED-CLAIMS.md` (Adoption Approver: JD (PM), Adoption Decision Date: 2026-08-17), via a separate governance-recording task following this review. PM's adoption decision removed a parenthetical internal claim-ID cross-reference ("(see CLAIM-STOCK-EDITORIAL-001-v1)") from the governed statement text this review had proposed — that change was made in the adoption-recording step, not in this review, and is not reflected in the verbatim body below. This wrapper note is added retroactively as part of the 2026-08-17 governance-artifact-preservation milestone.

Research artifact this review draws on: `01_Business/research/STOCK-MEDIA-EDITORIAL-USE-CANDIDATE-RESEARCH-2026.md` (Part 1 §20, Part 2 §12).

Source used to reconstruct this artifact: the assistant's own Formal Governance Review #2 response, present verbatim in this session's own conversation transcript (not recreated from memory, condensed summary, or the adopted claim's own entry).

--- BEGIN VERBATIM GOVERNANCE REVIEW ---

Working tree confirmed clean — zero file changes, as required for this review. Here is the governance recommendation.

## Formal Governance Review #2 — `CAND-STOCK-EDITORIAL-002`

**1. Exact candidate wording reviewed** (verbatim, Part 2 §12, unchanged from Part 1 §20):
> "Stock-media content marked 'Editorial' is typically licensed without the model or property releases that would otherwise support broader commercial use — a separate consideration from, though often related to, the provider's own license-scope restriction."

**2. Exact proposition being tested:** That Editorial-designated content is *typically* supplied without model/property releases, and that this fact is analytically separate from (though correlated with) the license-scope restriction already governed in `CLAIM-STOCK-EDITORIAL-001-v1`.

**3. Accuracy assessment:** The proposition holds for three of four providers on direct, Tier 1 evidence; the fourth (Adobe) remains genuinely unconfirmed after two dedicated hardening attempts. The wording's own hedges ("typically," "often related to") are doing real, correct epistemic work — but the wording's silence on *which* providers support it risks reading as universal when it isn't.

**4. Clause-by-clause support:**
- "typically supplied without the model or property releases" — SUPPORTED (Getty, iStock, Shutterstock, all Tier 1); UNSUPPORTED for Adobe (not contradicted — genuinely unevidenced).
- "that would otherwise support broader commercial use" — SUPPORTED for the same three; ties release-absence to the commercial-use question via each provider's own adjacent language.
- "a separate consideration from, though often related to, the provider's own license-scope restriction" — SUPPORTED as a *hedge*, and correctly calibrated (see item 10, causation).

**5. Getty evidence:** STRONG for the release-absence fact itself (two independent official pages: `gettyimages.com/rights-and-clearance` and the EULA). The *relationship* between that fact and the license-scope restriction is where Getty's own materials are internally inconsistent (one page frames release-absence as substantively explaining the restriction; the EULA frames Editorial designation as an independent content-type restriction that merely correlates with release-absence). This inconsistency is exactly why the claim's own "separate... though often related to" hedge is necessary, not decorative.

**6. iStock evidence:** STRONG. Structurally the cleanest of the four — the release-disclaimer and the prohibited-use clause are two textually separate provisions in iStock's own agreement, directly supporting "separate consideration" as the correct characterization rather than a single derived rule.

**7. Adobe evidence:** INSUFFICIENT. Zero successful direct fetches of any official Adobe page across two full research sessions and five attempts; the only support is two independently-timed but still Tier 3 `WebSearch` passes. This is a materially weaker position than Adobe's own evidence for `CLAIM-STOCK-EDITORIAL-001-v1` (there, correctly classified QUALIFIED, not INSUFFICIENT, in Formal Governance Review #1) — the two claims' Adobe evidence must not be treated as equivalent, and are not.

**8. Shutterstock evidence:** STRONG — a genuinely different (stronger) classification than Shutterstock received under `-001`. This candidate's specific proposition (release-absence) is fully supported by a single Tier 1, directly-fetched, official page (`submit.shutterstock.com`); it doesn't depend on the exact-restriction-wording or clearance-mechanism propositions that kept `-001`'s Shutterstock evidence at QUALIFIED. Provider-evidence-tier is per-claim, not per-provider — confirmed concretely here.

**9. Release-category analysis:** The wording says "model or property releases" — a defensible, conservatively narrow label. Getty names exactly these two categories. Shutterstock names exactly these two. iStock's own disclaimer is actually *broader* (also covers "names, people, trademarks, trade dress, logos"), meaning the current wording slightly *under*-uses iStock's evidence rather than overclaiming it — the safer direction. Recommend keeping the narrower "model or property releases" framing rather than broadening to match iStock's fuller language, since Getty/Shutterstock weren't independently confirmed at that broader scope. Trademark/trade-dress/logo permissions, privacy/publicity rights, and location/property permissions are correctly NOT bundled into this claim.

**10. Causation-vs-association assessment: COMMON ASSOCIATION, explicitly not CAUSE.** Neither iStock's nor Shutterstock's drafting frames release-absence as *causing* the Editorial designation (both present them as two adjacent, independently-stated facts); Getty's own materials are split between a near-causal framing and an independence framing, which itself argues against asserting causation confidently. The existing wording already avoids causal language ("because," "due to," "the reason") — this passes as currently drafted and should stay that way.

**11. Inverse-inference assessment:** Direction 1 ("this asset is Editorial, therefore no release exists") — the "typically" hedge appropriately blocks a strict-entailment reading; passes. Direction 2 ("this asset has releases, therefore Editorial restrictions no longer apply") — the wording doesn't address this direction at all, correctly leaves it to `-001`'s own governed territory, and doesn't invite the inference by omission. Both directions checked explicitly, both pass.

**12. Cross-provider scope classification: B — valid structural synthesis, support strength differs materially by provider (three STRONG, one INSUFFICIENT).** Not A (would silently imply Adobe parity); not fully C either — given three of four providers are individually STRONG and specifically named, precision favors naming them directly over a vague "some providers" (see wording recommendation).

**13. Relationship to `CLAIM-STOCK-EDITORIAL-001-v1`: COMPLEMENTARY, clean boundary.** `-001` governs *what uses are permitted* under a standard Editorial license; `-002` governs *release status as a typically-correlated-but-distinct fact*. A reviewer applying both gets: "this use may exceed the standard license (`-001`), and, separately, this content likely lacks the releases that would otherwise support broader use even where license scope is satisfied (`-002`)." No overlapping assertions. `-001` was not modified or re-examined in substance during this review.

**14. Atomicity: ATOMIC** — cleaner than `-001`'s own "acceptably compound" classification. The only content is the release-status tendency plus the necessary comparative clause distinguishing it from `-001`; license scope, independent rights clearance, and project-specific determination are all correctly excluded, not merely implied-but-absent.

**15. General-rule/project-specific boundary:** Passes cleanly. Does not determine whether a *particular* asset has releases, whether releases are legally required, whether a specific person/property is protected, whether a use violates rights, whether separate permission cures anything, or whether an asset may be used commercially — all explicitly out of scope, several by direct cross-reference to `-001`.

**16. Reviewer value: real and concrete.** Gives a Commercial Assurance reviewer a genuine reasoning step — Editorial classification as a signal that release/rights evidence warrants closer inspection — pointing to specific, checkable evidence: the provider's own asset classification record, model-release status, property-release status, any provider release notes, intended use, subject identity, and trademark/property visibility in the depicted content. This directly operationalizes the same "don't accept uncorroborated self-attestation, look for the actual artifact" discipline the Reviewer Manual v0.2 Domain H corroboration requirement already establishes elsewhere — a thematically consistent extension, not a new pattern.

**17. CRC educational value:** Real in principle ("Editorial classification and underlying release/rights questions can be related but are not interchangeable" is a useful distinction, structurally similar to `-001`'s and `CLAIM-COPY-004`'s own already-approved "two separate questions" framing pattern) — but this is conceptual value only, not a reachability claim. Path A remains unimplemented; CRC Eligibility should remain Pending regardless of content safety, exactly as instructed.

**18. Source-quality assessment:** Three independent Tier 1 official sources (Getty ×2 pages, iStock, Shutterstock) sufficient for GOVERNED SYNTHESIS across those three providers specifically. Adobe's Tier 3 corroboration is not treated as equivalent to a Tier 1 source and does not get folded into the synthesis as a fourth confirmed leg.

**19. Bounded new research performed: NONE.** Considered performing one more narrow Adobe-specific fetch per the task's own allowance, and declined: five prior attempts across two sessions (Phase 1A + Phase 1B) already failed on structural grounds (HTTP 403, timeout, and unreadable binary PDF encoding) rather than on a findable-but-unfound basis — a sixth attempt on the same domains would not likely be decisive, and the task explicitly instructs against expanding into a retry program disguised as a "bounded check."

**20. Temporal durability: MEDIUM** — same classification and reasoning as `-001` (contractual/practice-based domain, moderate volatility; the wording's own "typically supplied without" framing is conceptually durable rather than dependent on exact current phrasing). Monitoring sources are the same three pages already flagged for `-001` — no new sources required.

**21. Jurisdiction/governing-source recommendation:** Not `Global`. Recommend, explicitly narrower than `-001`'s own text to reflect this claim's narrower confirmed scope: *"Not a legal jurisdiction — governed collectively by each cited provider's current Terms of Service/License Agreement (Getty Images, iStock, Shutterstock — the three providers this claim's evidence confirms; not independently confirmed for Adobe Stock), not a single contract or legal jurisdiction."*

**22. applicability_requirements recommendation:** `[]` — same reasoning as `-001` (no `ApplicabilityFact` fits a contractual claim; retrieval would only ever occur via Path A's own goal-category gate, so an empty gate carries no diagnostic-leak risk).

**23. unresolved_project_dependencies recommendation — independently re-derived, not copied from `-001`:** `[which_provider, editorial_designation_confirmed, release_status_confirmed]`. Differs from `-001`'s list in its third element: `-001`'s `separate_authorization_obtained` (whether Rights & Clearance-style authorization was obtained) is not what *this* proposition's application depends on — a Rights & Clearance-cleared asset could still lack a traditional release entirely, since clearance and release status are independently-obtainable facts. This claim instead needs to know whether the *specific asset's actual release status* has been checked — a materially different dependency.

**24. Provenance classification: GOVERNED SYNTHESIS**, combining Getty's two official pages, iStock's license agreement, and Shutterstock's official contributor-help page — three independently-verified provider sources synthesized into one cross-provider structural tendency statement, explicitly scoped to exclude Adobe from the synthesis itself (Adobe's weaker evidence is disclosed in Source references, not incorporated as a fourth supporting leg).

**25. Exact wording recommendation:**
> "Stock-media content that a provider designates 'Editorial' is typically supplied without the model or property releases that would otherwise support broader commercial use — a separate consideration from, though often associated with, that provider's own license-scope restriction on such use (see CLAIM-STOCK-EDITORIAL-001-v1). This has been independently confirmed for Getty, iStock, and Shutterstock; it has not been independently confirmed for every stock-media provider, including Adobe Stock."

**26. Governance recommendation: B — PASS / GO WITH MINOR WORDING REVISION.**

**27. Reason for recommendation:** The underlying proposition is accurate, well-sourced (three of four providers STRONG), correctly avoids overclaiming causation, correctly preserves the general-rule/project-specific and CRC/Reviewer boundaries, and is genuinely complementary to (not redundant with) the already-adopted `-001`. The one real deficiency is that the original wording's silence about provider scope risks implying Adobe parity it doesn't have — a wording fix, not a evidentiary or structural defect, hence B rather than C/D/E/F.

**28. Proposed eventual Claim ID (if PASS):** `CLAIM-STOCK-EDITORIAL-002-v1`
**29. Proposed Publication scope:** Reviewer/Commercial Assurance
**30. Proposed CRC Eligibility:** Pending (CRC Approver/Decision Date PENDING) — no extraordinarily strong reason to deviate, per standing instruction.

**31. Monitoring recommendation:** Same three sources already flagged for `-001` (Getty EULA + Rights & Clearance page, iStock license agreement, Shutterstock's official contributor-help page) — no new monitoring surface required; if Adobe evidence is later obtained through a different channel (e.g., a working PDF-text-extraction capability), that would be a separate future research pass, not a monitoring task.

**32. Future product dependencies (reported only):** Identical architecture gap to `-001` — this claim, if adopted, would need the same documented-exception treatment (`GOVERNANCE TREATMENT` note in `GOVERNED-CLAIMS.md`, matching comment in `topic-claims-fixture.ts`, an added entry in `topic-claims-fixture-consistency.test.ts`'s `CLAIMS_WITHOUT_FIXTURE_REPRESENTATION`) since `third_party_source_rights` remains unimplemented. This is a repeat instance of an already-solved mechanical pattern, not a new problem — flagged so PM knows the adoption-recording task for `-002` would look structurally identical to `-001`'s.

**33. Anomalies:** None new. The Getty internal-inconsistency finding (release-absence as cause vs. correlation) was already disclosed in Part 2 and is resolved here via the Causation Test (item 10), not newly discovered.

**34. Files changed: ZERO**, confirmed via `git status --porcelain` (clean before and after).
**35. Git status:** Clean; local chain `5a7afb7 → 40a6fd5 → 7a07e2f → bb30716 → d3d5276 → 0418036` intact, unmodified.
**36. Confirmation nothing committed:** Confirmed — no `git add`/`git commit` run.
**37. Confirmation nothing pushed/deployed:** Confirmed.

**38. GO/NO-GO for PM adoption decision: GO** — recommend PM adopt with the revised wording (item 25) and the metadata in items 28–30/21–23.
**39. GO/NO-GO for Path A engineering: NO-GO** — unchanged, as expected.
**40. GO/NO-GO for CRC publication: NO-GO** — unchanged, as expected.

**41. Recommended next governance candidate after PM resolves `-002`:** `CAND-STOCK-EDITORIAL-003` — but note its Phase 1B disposition was already **REJECTED** as a standalone cross-provider claim (substance redistributed into the provider-specific candidates), so the natural next *formal* governance review is one of the provider-specific candidates — `CAND-STOCK-GETTY-EDITORIAL-001` is the strongest-evidenced of the three (all four proposition-map entries Tier 1).

Returning control to PM/JD.

--- END VERBATIM GOVERNANCE REVIEW ---
