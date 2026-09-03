Title: Formal Governance Review #15 — Runway Commercial-Use Grant

Reviewed object:
- CAND-RUNWAY-COMMERCIAL-USE-001

Review date: 2026-09-03

Artifact type: Formal Governance Review (adoption stage) — first Formal Governance Review of the Runway proposition at the `GOVERNED-CLAIMS.md`/`TopicClaim` layer. Runway has carried a `Yes`-decided legacy `PLATFORM-RIGHTS-MATRIX.md` row since 2026-08-05, under that document's own, separate, lighter authoring process — this review independently re-determines Adoption for the `TopicClaim` representation, per `CRC-PUBLICATION-POLICY.md`'s own text: "Adoption is a Living Knowledge governance decision under ordinary FGR criteria, independent of Matrix coexistence." The Matrix's historical `CRC Eligible: Yes`/`CRC Approver: JD`/`CRC Decision Date: 2026-08-05` is treated throughout as historical governance evidence and reusable primary-source provenance — never as TopicClaim Adoption or Publication authority in its own right.

PM decision: **PENDING.** This artifact records a reviewing-agent (CLI/Claude) recommendation for PM/JD decision — consistent with the established distinction this repository's own governance record already draws between artifact authorship and PM concurrence (see `CPR_015`'s header and its dedicated `CPR_015_ADDENDUM_PM_CONCURRENCE_2026-09-03.md`). No verbatim PM decision statement preceded this artifact's writing; none is fabricated here. The recommendation below is ADOPT, with full reasoning; PM/JD concurrence remains a distinct, separate, later step.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as the bounded FGR candidate-formation milestone authorized following the Living Knowledge Next Target Domain Selection Inspection (2026-09-03), which ranked Runway as the top next-target candidate.

--- BEGIN VERBATIM FORMAL GOVERNANCE REVIEW ---

# Runway Commercial-Use Grant — Formal Governance Review

## 0. Repository / governance state verified before review

LK dedicated worktree (`work/lk-eu-ai-act-art50-research`) confirmed clean, HEAD `5e1b310da3988d8ec1a7651c5a32d4c424157a88`, before this review began. `origin/main` confirmed 2 commits ahead (`53f49f9`, `ba9b7fd` — a "CAH-3B" CRC-Sales-leads feature) — diffed in full and confirmed purely additive under `crc-sales`/`crc-leads`/admin surfaces plus one additive-only field exposure in `run-crc-conversation.ts` (`bounded_interpretations`, referentially identical to an already-computed value; no Retrieval/BI/Composition semantics changed). Zero overlap with Living Knowledge, Matrix, or governance-review files — confirmed via diffstat, not assumed. Main worktree and both architecture worktrees not touched by this review. Authoritative material read directly this review: `PLATFORM-RIGHTS-MATRIX.md`'s Runway section (Field/Value table + CRC Claims sub-table), `matrix-fixture.ts`'s `runway-gen3` row, `MATRIX-LEARNINGS.md`'s Runway-specific entries, `GOVERNED-CLAIMS.md` (confirmed zero existing Runway `TopicClaim` entries — only two unrelated incidental mentions, a citation and a comparative aside, neither a governed Runway proposition), `topic-claims-fixture.ts` (confirmed zero Runway entries), `retrieval-engine/types.ts` (`APPLICABILITY_FACTS`, `CANONICAL_TOOL_IDS`), and — as governance precedent, not FGR-shape imitation — `FGR_012`, `FGR_013` in full.

## 1. Proposition under review

Under Runway's current Terms of Use, commercial use of generated Output is permitted across Runway's individual/team subscription tiers (Free, Standard, Pro, and the tier currently named Max, formerly referenced in Matrix notes as "Unlimited" — see §3), subject to general compliance with the Agreement, including a restriction against using the Services or Outputs to create, train, develop, or improve similar or competitive products or services (ToS §5). This proposition does **not** extend to Runway's Enterprise tier, which is governed by separate, customer-specific Enterprise terms not publicly available (see §3) — Enterprise commercial-use status is explicitly out of scope for this candidate, not asserted either way.

## 2. Evidence chain — historical provenance vs. primary evidence, kept distinct

**Primary evidence (category 1), re-verified directly by this review, not inherited:** Runway Terms of Use, `https://runway.com/terms-of-use`, directly fetched 2026-09-03. §4.4: *"The Company does not claim ownership of any of your Inputs or Outputs"* and *"the Company does not restrict your commercial use of your Outputs."* §4.4 also grants Runway a broad training-use license over Inputs/Outputs. §5: restricts using the Services/Outputs *"to create, train, develop, or improve similar or competitive products or services."* Document states its own last-updated date as **May 11, 2026** — predating the Matrix's original 2026-08-05 verification, confirming the document has not changed since that capture and remains current as of this review. No tier-based differentiation of commercial-use rights appears anywhere in this document.

**Historical governance decision (category 2), not substituted for category 1:** the Matrix's own `Status: Verified`, `CRC-Eligible: Yes`, `CRC Approver: JD`, `CRC Decision Date: 2026-08-05` — the Matrix's own lighter, two-column authoring process, not the FGR/CPR discipline this document requires. No FGR or CPR artifact for Runway existed anywhere in this repository before this review.

**Legacy runtime representation (category 3):** `matrix-fixture.ts`'s single `runway-gen3` `MatrixClaim` entry and the `retrieve.ts` Matrix lookup path — confirmed reachable today, `crc_eligible: 'Yes'`, unaffected by this review.

## 3. Evidence freshness

Direct re-fetch of `runway.com/terms-of-use` succeeded (no access-friction repeat of the Matrix's own disclosed help-center-blocked/403 finding, which applied to `help.runwayml.com`, not the marketing-domain ToS page used here). Core commercial-use grant language, ownership language, and the competitive-products restriction all match the Matrix's own quoted text verbatim — no material change since 2026-08-05. **Two refinements found by this review's own direct check, not present in the Matrix's existing prose:**

1. **Tier-name drift (cosmetic, non-substantive):** current Runway pricing lists tiers as Free, Standard, Pro, **Max**, Enterprise — the Matrix's Plan Tier field names "Unlimited" instead of "Max." Confirmed via direct fetch of `runway.com/pricing`, 2026-09-03. Does not affect the governed proposition, which does not depend on a specific tier name; flagged as Matrix-text hygiene debt, not corrected in this review (out of scope; see §12).
2. **Enterprise scope correction (substantive):** the Matrix's Plan Tier field states "same language applies to Free, Standard, Pro, Unlimited, and Enterprise," but this review's direct fetch of the primary ToS shows Enterprise users are explicitly referred to a **separate** "Runway Enterprise Services Terms" document, not included in the standard ToS. A follow-up web search confirmed Enterprise terms are customer-specific/negotiated and not published as a single public document. **The primary evidence does not actually support the Matrix's implicit claim that "the same language" governs Enterprise** — this is a genuine, disclosed narrowing relative to the Matrix's own prose, not merely a freshness non-issue. This review's candidate proposition (§1) excludes Enterprise accordingly.

Evidence is current as of review time, directly fetched, and stronger in one respect than the Matrix's own text (Enterprise scope now correctly bounded rather than implicitly overstated). **Adequate for this Adoption review; DEFER not warranted on freshness grounds.**

## 4. Proposition decomposition

Tested directly, not assumed: does the evidence support one proposition or more than one? The core commercial-use grant is genuinely unconditional across the individual/team tiers evidenced (no per-tier gate found in the primary ToS text itself) — unlike Kling, no `ApplicabilityFact`-gated exception exists in evidence. The only material condition found is a **scope boundary**, not an applicability gate: Enterprise is excluded because its governing terms are not evidenced, not because Enterprise commercial use is known to differ. This is not a second governable proposition (there is no evidence to form one about Enterprise) — it is an evidence limitation on the single candidate's scope (§10). **The evidence supports exactly one governable proposition.** The prior inspection's hypothesis — "Runway commercial-use guidance is simple/unconditional" — is classified **PARTIALLY TRUE**: unconditional in the architecturally load-bearing sense (no `applicability_requirements` needed, matching the existing Matrix fixture shape), but not "simple" in the sense of zero caveats — real, disclosed scope and evidence-limitation nuance exists and must be preserved precisely, not flattened into an unqualified blanket statement.

## 5. Provider / topic / tool scope

`provider_scope: null` — no third-party asset provider involved. `topic: 'commercial_use'` — direct fit. `tool_scope: ['runway-gen3']` — `'runway-gen3'` is an existing `CANONICAL_TOOL_ID` (confirmed in `retrieval-engine/types.ts`), requiring zero registry work, and matches the Matrix's own `identifier: 'runway-gen3'` exactly.

## 6. Applicability requirements

`applicability_requirements: []`. No conditional gate exists in evidence — the commercial-use grant does not depend on a project-specific fact CRC would need to resolve. This is a genuine finding, not a default: the evidence was specifically checked for a tier- or account-status-gated exception (the Kling pattern) and none was found in Runway's primary ToS text.

## 7. Askability

Not applicable — no `ApplicabilityFact` is required for this candidate, so no askability determination is needed. Nothing about this claim touches `tool_account_status`, `tool_plan_tier`, or any other selector-askability registry entry.

## 8. Unresolved project dependencies

`unresolved_project_dependencies: []`. No project-specific fact (beyond tool identity, already captured via `ToolMention`) is needed to apply this claim.

## 9. `claim_character`

Unconditional stated rule, not conditioned on any fact captured in `applicability_requirements` — `established`, per the same `LK_PHASE1_TECHNICAL_DESIGN.md` §6 definitions applied to Kling's baseline claim in `FGR_013` §9.

## 10. Prohibited conclusions

Does not establish: ownership analysis beyond the quoted non-claim-of-ownership language; the Enterprise training opt-out claim referenced by a third-party source but not found in the standard ToS (remains unconfirmed, not asserted either way); **Enterprise-tier commercial-use status of any kind** (explicitly out of scope — see §3); whether a specific project's use falls within the "similar or competitive products or services" restriction (ToS §5) — that determination requires case-specific judgment this claim does not perform; downstream IP clearance; platform suitability for a particular commercial project; or any broader commercial-readiness conclusion.

## 11. Jurisdiction

Platform/product contractual representation, not a legal-jurisdiction-scoped rule. The existing bounded transitional compatibility convention (`jurisdiction: 'Global'`, PM/Architecture decision 2026-08-30) applies, identically to its existing use for the Stock, Music, Synthesia, Storyblocks, Pond5, Adobe Stock, and Kling claims. Does not assert worldwide legal validation of the proposition.

## 12. Architecture discovery

None required for Adoption. This review confirmed that no new `ApplicabilityFact`, no new `claim_character` value, and no schema change is needed — the candidate fits entirely within already-proven, unmodified `TopicClaim` machinery (in fact a simpler shape than Kling's, since no conditional gate exists here). One disclosed, non-blocking documentation-debt item was found and is explicitly NOT corrected by this review, per scope discipline: `PLATFORM-RIGHTS-MATRIX.md`'s Runway Plan Tier field's tier-naming ("Unlimited") is stale relative to current product naming ("Max"), and its Enterprise-coverage implication is not actually supported by the primary ToS text — both flagged for a future, separately-authorized Matrix-text hygiene pass, not fixed here.

## 13. Representation readiness

The candidate's fields (topic, claim_character, jurisdiction, applicability_requirements, unresolved_project_dependencies, provider_scope, tool_scope) are structurally complete and valid against the existing `TopicClaim` schema — confirmed by direct field-by-field inspection against `retrieval-engine/types.ts`. No `TOPIC_CLAIMS_FIXTURE` entry is added by this Adoption — governance and runtime activation remain separate, independently-timed acts, per the Synthesia/Storyblocks/Pond5/Adobe Stock/Kling precedent. No `GOVERNED-CLAIMS.md` entry is added by this review either — that ledger-recording step, per this repository's established practice, is its own separate, later action (mirroring how Kling's ledger recording followed its own FGR by a distinct task), performed only after PM/JD concurrence with this recommendation, not before.

## 14. Recommendation

**ADOPT.**

- `CLAIM-RUNWAY-COMMERCIAL-USE-001-v1` (candidate ID; final numbering to be confirmed at ledger-recording time): proposed `Lifecycle: Adopted`, `Claim character: established`, `tool_scope: ['runway-gen3']`, `provider_scope: null`, `jurisdiction: 'Global'`, `applicability_requirements: []`, `unresolved_project_dependencies: []`, `Publication scope: Reviewer/Commercial Assurance` pending PM/JD concurrence and formal Adoption recording. `CRC Approver`/`CRC Decision Date` would remain `PENDING` — CRC Publication Review is a separate, later stage (a future CPR, not conducted by this review).

Rationale: the proposition is sufficiently evidenced (primary-sourced, directly re-fetched and quoted by this review, current as of 2026-09-03), correctly and narrowly scoped (Enterprise explicitly excluded on evidence grounds, not inferred), bounded (Prohibited Conclusions in §10 preserve every real limitation found, including one the Matrix's own prose had understated), free of any dependency or applicability requirement, provenance-preserving (cites the exact primary source URL and fetch date), and fully compatible with existing generic architecture with zero novel requirements (§12).

This recommendation is a Living Knowledge Adoption recommendation only — it is explicitly not CRC Publication approval, not Commercial Assurance, not commercial or legal clearance, and does not itself constitute PM/JD concurrence. The historical Matrix `CRC Eligible: Yes` decision for the corresponding legacy row is unaffected, unmodified, and not retired by this review — Matrix retirement, if a future CPR eventually approves a successor TopicClaim for CRC publication, would be a separate, later governance decision, following the exact sequencing this repository's Kling cycle already established (MRR authorization → post-retirement CPR → coordinated activation), not assumed or shortcut here.

--- END VERBATIM FORMAL GOVERNANCE REVIEW ---
