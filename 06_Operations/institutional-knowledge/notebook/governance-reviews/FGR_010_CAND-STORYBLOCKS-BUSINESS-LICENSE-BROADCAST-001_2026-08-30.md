Title: Formal Governance Review #10 — Storyblocks Business License Broadcast/OTT Scope Restriction

Reviewed object:
- CAND-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001

Review date: 2026-08-30

Artifact type: Formal Governance Review (adoption stage) — first FGR of the Storyblocks domain, and the first FGR of Trial 2 of the Living Knowledge onboarding benchmark (LK-42 protocol). Combined multi-stage review conducted across LK-45 (source discovery), LK-46 (bounded evidence resolution), LK-47 (initial FGR analysis, recommended DEFER pending primary evidence), LK-48 (human-assisted primary-evidence capture and ingestion; DEFER re-confirmed, this time on tooling grounds — the CLI could not render/OCR the captured PDFs), and LK-49 (human governance review of the rendered primary-source captures; ADOPT).

PM decision: **ADOPT (PM: JD, Adoption Decision Date: 2026-08-30).** The proposition is suitable to enter governed Living Knowledge, subject to normal representation/provenance requirements. This is a Living Knowledge Adoption decision only — it is explicitly not CRC Publication approval, not Commercial Assurance, not commercial or legal clearance, and not certification of any kind.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as part of the same LK-49 task that recorded the human ADOPT decision — not reconstructed from a prior conversational report, though it synthesizes the multi-stage LK-45 through LK-49 record for durable, single-artifact preservation, per this folder's own governance-artifact-preservation requirement (`GOVERNED-CLAIMS.md`'s own governance-discipline bullet: "Every Formal Governance Review must be preserved as a durable, verbatim repository artifact... this document remains the canonical current-state ledger and may contain only a condensed review summary... it must never be the only place a review's full reasoning survives").

--- BEGIN VERBATIM FORMAL GOVERNANCE REVIEW ---

# Storyblocks Business License Broadcast/OTT Scope — Formal Governance Review

## 1. Proposition under review

Storyblocks' own License Agreements state that a license does not include the right to use Stock Files in Broadcast, Television, or OTT platforms unless that right is explicitly included in the selected subscription plan; Storyblocks' licensing materials identify its Business License specifically as covering broadcast, TV, streaming/OTT, and feature-film distribution.

## 2. Evidence chain

**Discovery (LK-44/LK-45):** Storyblocks was identified as a genuinely fresh, commercially relevant stock-media provider — explicitly named in `governance-reviews/FGR_007_STOCK_EDITORIAL_PROVIDER_SCOPE_CORRECTION_2026-08-27.md` as a real, out-of-scope, never-evidenced provider requiring its own future governance review. LK-45's own source discovery found `www.storyblocks.com`'s primary marketing/license pages return empty content to this environment's automated-fetch tooling; `help.storyblocks.com` (a separate subdomain) fetched successfully, yielding two corroborating Official platform authority (Tier 2) sources.

**Bounded resolution (LK-46):** A second, independent Tier 2 Help Center article (direct Individual-vs-Business comparison) was obtained, strengthening corroboration. Primary License Agreement text (Tier 1) remained unretrieved by automated means after four independent URL attempts.

**Initial FGR (LK-47):** Recommended DEFER — not because Tier 2 evidence was weak, but because Adoption on Tier-2-only evidence would be a genuine first for this corpus (every prior Adopted claim has had at least some Tier 1 basis). A bounded, concrete resolution path (human-assisted primary-source capture) was identified and recommended.

**Human-assisted capture (LK-48):** The human operator captured three Storyblocks documents via browser Print→PDF: the License Comparison page, the Individual License Agreement, and the Small Business License Agreement — preserved durably with SHA-256 integrity hashes at `evidence-captures/storyblocks/` (see that directory's own `MANIFEST.md`). The CLI's own PDF tooling could not extract or render any text from these files (confirmed: zero embedded font objects, pure raster-image captures; no OCR/page-render capability available in this environment) — a genuine, disclosed tooling limitation, not a defect in the capture itself. LK-48 accordingly re-confirmed DEFER, on narrower, tooling-specific grounds, and flagged that human governance review of the rendered captures (which the CLI cannot itself perform) remained the live path to resolution.

**Human governance review (LK-49):** The human reviewer directly read the preserved, hashed PDF captures and reported the following as HUMAN-VERIFIED PRIMARY EVIDENCE FINDINGS, tied to the exact preserved artifacts (SHA-256 hashes in `evidence-captures/storyblocks/MANIFEST.md`):
- Storyblocks Individual License Agreement (`individual-license_20260830T100514+0800_9c6ce786.pdf`) — visible document identity "STORYBLOCKS INDIVIDUAL LICENSE AGREEMENT"; visible "Last updated: June 18, 2026"; §1.2 states, in substance, that the license does not include the right to use Stock Files in Broadcast, Television, or OTT platforms unless explicitly set forth in the selected subscription plan.
- Storyblocks Small Business License Agreement (`small-business-license_20260830T100534+0800_aff19658.pdf`) — visible document identity "STORYBLOCKS SMALL BUSINESS LICENSE AGREEMENT"; visible "Last updated: October 20, 2025"; §1.2 states materially the same broadcast/TV/OTT scope condition.
- Storyblocks License Comparison capture (`license-comparison_20260830T100501+0800_17e0d6f2.pdf`) — corroborating; distinguishes Individual/Small Business/Business scope, with Business materials identifying broadcast/TV/streaming-OTT/feature-film distribution.

**Metadata note, disclosed and preserved, not resolved by inference:** the Individual License PDF's own file-level `/Title` metadata reads "Individual License - 2023" — distinct from, and not superseding, the document's own visibly stated "Last updated: June 18, 2026." Both facts are preserved in the governed record; the "2023" figure is not assumed to denote the operative document's true vintage.

## 3. Fidelity check against the human-verified findings

The recommended proposition wording (LK-49 §7) was checked against the human-verified findings above and found faithful: it states (a) that the Individual and Small Business Agreements exclude broadcast/TV/OTT use absent an explicit subscription-plan grant, and (b) that Storyblocks' own licensing materials identify the Business License as covering that scope. It does **not** state that every non-Business subscription categorically prohibits broadcast/OTT (the evidence states a plan-contingent exception, "unless explicitly set forth in the selected subscription plan," which is preserved rather than collapsed into an absolute prohibition), and it does **not** state that holding a Business License establishes that any specific project is cleared for broadcast use.

## 4. Proposition decomposition

Confirmed as one coherent, independently commercially useful proposition — concerning Storyblocks' license-tier scope for Broadcast/Television/OTT distribution only. Explicitly not merged with, and this review does not adopt, any other provision the captured Agreements may separately contain (Editorial content, AI/ML training, releases, indemnity, termination, audio, standalone use, or sensitive-use restrictions) — those remain unreviewed, unadopted, and outside Trial 2's own scope.

## 5. Provider scope

`provider_scope: ['storyblocks']` is correct — Storyblocks is a stock asset provider (footage/audio/images incorporated into a production), the same structural category as Getty/iStock/Shutterstock/Adobe Stock/Artlist. `tool_scope: null` is correct; Storyblocks is not a generation tool.

## 6. Applicability and dependency

`applicability_requirements: []` — correct, and not merely a default: no implemented `ApplicabilityFact` type exists for an asset provider's own license tier (only `jurisdiction`, `tool_plan_tier`, `tool_account_status` are implemented), so this fact cannot be formally gated; it is correctly represented only as a dependency. `unresolved_project_dependencies: ['storyblocks_license_tier_confirmed']` — necessary (CRC cannot structurally determine which Storyblocks tier, or which plan-specific grants, a given user holds) and correctly evidence-only/non-askable (absent from `dependency-askability.ts`'s registry; no DAR performed or proposed).

## 7. Jurisdiction

Platform-contractual license scope, not a legal-jurisdiction-scoped rule. The existing bounded transitional compatibility convention (`jurisdiction: 'Global'`) applies, identically to its use for the Stock domain and for Synthesia. Not reinterpreted; not read as worldwide legal validation. Any governing-law clause the Agreements may contain was not reviewed by the CLI and is not represented here.

## 8. Evidence tier and limitations

Primary evidence tier: **Primary legal/official authority (Tier 1) by document type** (the License Agreements themselves), reviewed by direct human reading of the preserved captures — satisfying `EVIDENCE-CAPTURE-SOP.md`'s own Class B standard ("a human reading the actual authoritative page satisfies 'a primary source was checked' exactly as well as an automated fetch does"), corroborated by two independent Tier 2 Help Center sources (LK-45/LK-46) and the License Comparison capture. Limitations, recorded explicitly: the two License Agreements carry different visible update dates (June 18, 2026 for Individual; October 20, 2025 for Small Business); the PDF-title-vs-visible-date discrepancy noted in §2 remains unresolved by inference; the proposition describes Storyblocks' own stated license scope and does not itself establish project-specific rights clearance for any real project.

## 9. Representation readiness

`checkTopicClaimRepresentationReadiness()` returns `{ready: true, issues: []}` against the committed Candidate representation (`08_Platform/app/lib/candidates/CAND-STORYBLOCKS-BUSINESS-LICENSE-BROADCAST-001.ts @ efee49ded250488b9819ae31ae4c4b8234ad9ae2`). Mechanically representable under existing, unmodified architecture; the only remaining representation step (canonical provider identity registration) was ordinary onboarding, not an architecture gap, and was completed in this same milestone (`08_Platform/app/types/interview-engine.ts @ aa91992`).

## 10. Architecture discovery

None. This review, and the LK-45 through LK-49 chain preceding it, exposed no missing generic Living Knowledge capability — every mechanism used (provider_scope, dependency evidence-only default, representation readiness, candidate provenance, the Adoption-recording convention) already existed and required no modification.

## 11. Decision

**ADOPT.** `Lifecycle: Adopted`, `Adoption Approver: JD (PM)`, `Adoption Decision Date: 2026-08-30`. `Publication scope: Reviewer/Commercial Assurance`. `CRC Approver`/`CRC Decision Date` remain `PENDING` — CRC Publication Review is a separate, later, not-yet-performed stage. No `TOPIC_CLAIMS_FIXTURE` entry is added by this Adoption; the claim remains registered as intentionally fixture-absent, mirroring the Synthesia precedent's own governance-then-runtime sequencing.

--- END VERBATIM FORMAL GOVERNANCE REVIEW ---
