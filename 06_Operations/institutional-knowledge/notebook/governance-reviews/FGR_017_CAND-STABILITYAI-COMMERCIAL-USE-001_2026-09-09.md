Title: Formal Governance Review #17 — Stability AI / Stable Diffusion Commercial-Use Candidate (LK-TRIAL-10)

Reviewed object:
- CAND-STABILITYAI-COMMERCIAL-USE-001

Review date: 2026-09-09

Artifact type: Formal Governance Review (adoption stage) — first FGR of the Stability AI domain, first new non-Matrix candidate onboarded since Synthesia (FGR_009). Continues LK-TRIAL-10.

PM decision: **ADOPT.** Decided 2026-09-09 (PM: JD).

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments belong in a new review artifact or in this wrapper's own metadata, never inserted into the verbatim body below.

Source: written during LK-TRIAL-10's live execution (candidate discovery -> readiness review -> FGR governance review milestones), not reconstructed afterward.

--- BEGIN VERBATIM FORMAL GOVERNANCE REVIEW ---

# Stability AI / Stable Diffusion Commercial-Use — Formal Governance Review Final Report

## 1. Candidate reviewed
One candidate, `CAND-STABILITYAI-COMMERCIAL-USE-001`, concerning Stability AI's Core Models (the Stable Diffusion family and sibling Core Models) as governed by the Stability AI Community License Agreement (`stability.ai/community-license-agreement`).

## 2. Evidence-tier re-verification
Independently re-fetched the operative Community License Agreement text twice across two separate milestones in this LK-TRIAL-10 cycle (readiness review, then this FGR review), both fetches byte-consistent. Confirmed verbatim, directly from the primary source (Class A — operative contractual terms, not marketing summary or secondary commentary):

- Commercial-purpose license grant (Section III): "non-exclusive, worldwide, non-transferable, non-sublicensable, revocable and royalty-free... license... to use, reproduce, distribute, and create Derivative Works" for commercial purposes, conditioned on registration: "If You are using or distributing the Stability AI Materials for a Commercial Purpose, You must register with Stability AI."
- Revenue-threshold termination clause: "If at any time You or Your Affiliate(s), either individually or in aggregate, generate more than USD $1,000,000 in annual revenue (or the equivalent thereof in Your local currency), regardless of whether that revenue is generated directly or indirectly from the Stability AI Materials or Derivative Works, any licenses granted to You under this Agreement shall terminate as of such date."
- Post-termination requirement: "You must request a license from Stability AI, which Stability AI may grant to You in its sole discretion."
- Output-ownership clause: "As between You and Stability AI, You own any outputs generated from the Models or Derivative Works to the extent permitted by applicable law."
- "Affiliate(s)" definition: entities under >50% common ownership/control with the subject entity.
- No language anywhere in the Agreement distinguishes hosted/API access from downloaded/self-hosted model-weight use — the same grant applies to both as far as the document states.

## 3. Freshness finding
The Community License Agreement's own stated "Last Updated" date is **July 5, 2024** — over two years stale relative to this review's date (2026-09-09). It remains the document currently linked from Stability AI's live `/license` marketing page (checked this cycle), which is some evidence of currency, but this reviewer did not independently confirm the absence of a newer superseding version (no equivalent of Synthesia's "Terms & Policy Archives" cross-check was performed for Stability AI in this cycle). Disclosed, not treated as resolved. Separately, the Acceptable Use Policy (`stability.ai/use-policy`) carries a current effective date of **September 30, 2026** — genuinely fresh.

## 4. Hard semantic separation maintained
Four concepts were kept structurally distinct throughout this review, per this project's standing discipline (established across Midjourney/Gemini API and reaffirmed for this candidate):
1. **Model-license permission** — what the Community License actually grants (use/reproduce/distribute/create-derivative-works, for commercial and non-commercial purposes, commercial conditioned on registration).
2. **Revenue-threshold license condition** — what happens to that grant when the stated aggregate-revenue threshold is exceeded (the *entire* license terminates — not a narrower "commercial output rights" carve-out).
3. **Output ownership** — a separate clause, not itself textually gated by the revenue threshold, and not treated as proof of commercial permission on its own.
4. **Project-specific commercial readiness** — explicitly NOT established by any of the above; whether a given user's organization is above or below the threshold, has registered, or would be granted a discretionary relicense are all preserved as unresolved dependencies, never inferred.

## 5. Product/provider scope finding
A genuine scope-boundary risk was found and resolved with evidence already in hand, not left open: Stability AI operates **separate product-specific Terms of Service** outside the Community License Agreement entirely — "Stable Chat ToS" and "Stable Assistant Terms of Service" were both found to exist as distinct documents during this cycle's research. This candidate is explicitly scoped to Stability's Core Models under the Community License Agreement only, and explicitly excludes Stable Chat and Stable Assistant/Stable App as a stated scope boundary and prohibited conclusion, mirroring the discipline already applied to Gemini API vs. Gemini Consumer App.

## 6. Hosted/API vs self-hosted wording correction
An earlier draft of this candidate (produced during the readiness-review milestone, before this FGR review) stated the license "applies identically whether accessed via hosted/API or self-hosted deployment." That wording is stronger than the evidence supports — the Agreement's silence on deployment method is an *absence of a stated distinction*, not an affirmative statement of complete contractual equivalence (a hosted service could carry additional terms — e.g. an API terms-of-service layer, uptime/SLA terms, or a separate acceptable-use enforcement mechanism — that this Agreement itself would not need to mention). This review corrects the wording to: "The Community License Agreement does not state a different license grant based on hosted/API versus self-hosted access" — recorded as an explicit prohibited conclusion (see below), not as a stronger equivalence claim.

## 7. Architecture-fit check (LK-4/FGR_009's own lesson applied prospectively)
Synthesia's own FGR_009 (2026-08-29) discovered, only at the runtime-representation stage, that `TopicClaim.provider_scope` is a closed `AssetProviderId[] | null` union usable only for third-party source-material providers (Getty, iStock, Shutterstock, Adobe Stock, Artlist) — not usable for an AI-generation tool. That gap was closed the same day by LK-7, which added the generic `tool_scope: string[] | null` primitive specifically for this class of tool-specific claim. This review applied that lesson prospectively rather than repeating FGR_009's own disclosed process gap: `CAND-STABILITYAI-COMMERCIAL-USE-001` is drafted with `provider_scope: null` and `tool_scope: ['stability-ai']` from the outset, matching the schema and the precedent of the currently-published `CLAIM-SYNTHESIA-STOCK-PAID-PROMOTION-001-v1`, `CLAIM-KLING-COMMERCIAL-USE-BASELINE-001-v1`, and other tool-scoped TopicClaims. No architecture blocker exists for this candidate.

## 8. Fact-model / applicability review
Three governed dependencies were identified: (1) whether the licensee and its Affiliates' aggregate annual revenue exceeds $1,000,000; (2) whether required commercial-use registration with Stability AI has been completed; (3) whether the specific Stability AI product/model in use is actually a Core Model under the Community License, as opposed to a separately-governed product (Stable Chat, Stable Assistant). None of these were converted into `applicability_requirements` or a new structured fact. This is consistent with PM's 2026-08-16 decision rejecting organization-revenue-shaped facts for lacking reliable structured signal, and with Gemini API's own precedent (evidence-limitation shape, `applicability_requirements: []`). All three are recorded as `unresolved_project_dependencies` — evidence-only, not self-attestation-appropriate, mirroring the Stock/Music domain's own established dependency-modeling precedent.

## 9. Topic / claim-character classification
`topic: 'commercial_use'` — direct governance representation, matches the claim's actual subject matter and the existing `GoalCategory` vocabulary; no translation needed, unlike Synthesia Candidate D's genuine topic-classification ambiguity (this candidate concerns commercial-use license mechanics directly, not likeness/privacy, so no comparable judgment call exists here). `claim_character: 'established'` — the license terms themselves are directly quoted, current-enough primary source, not an inference.

## 10. AUP disposition
The Stability AI Acceptable Use Policy's content-restriction and AI-disclosure obligations are recorded as evidence context only (see dependencies), not folded into this claim's proposition. No separate AUP candidate is drafted in this review — consistent with keeping this candidate narrowly scoped to the commercial-use license question it was formed to answer.

## 11. Recommendation
**ADOPT AS DRAFTED**, subject to the two disclosed, non-blocking caveats already recorded in the proposition's own evidence limitations: (a) the July 2024 Community License date was not independently confirmed as unsuperseded via an archive/version-history cross-check; (b) the hosted/API-vs-self-hosted equivalence is recorded as an absence-of-distinction finding, not an affirmative-identity finding.

## 12. Required governance action if this recommendation is accepted
Persist `CAND-STABILITYAI-COMMERCIAL-USE-001` as a machine-checkable `Lifecycle: Candidate`, `crc_eligible: Pending` representation in `08_Platform/app/lib/candidates/`, mirroring `CAND-SYNTHESIA-STOCK-PAID-PROMOTION-001.ts`'s exact structure and field-by-field source-mapping discipline. This is not publication authority — CPR review and a separate, later Adoption recording in `GOVERNED-CLAIMS.md` (with a named Adoption Approver and Decision Date) remain required before this claim could ever become CRC-eligible.

--- END VERBATIM FORMAL GOVERNANCE REVIEW ---

---

**PM/JD decision — 2026-09-09:**

FGR ADOPT — STABILITY AI.

I adopt the Stability AI commercial-use candidate as reviewed above: a governed proposition describing the Stability AI Community License Agreement's commercial-purpose grant, its registration requirement, its aggregate-revenue termination condition, the discretionary nature of any post-termination relicense, and the separately-stated output-ownership clause — scoped explicitly to Stability's Core Models under that Agreement, and explicitly excluding Stable Chat, Stable Assistant, and any other separately-governed Stability AI product or service.

This decision does not establish this or any user's organization's revenue status, does not establish whether commercial-use registration has occurred, does not establish that a separate Enterprise license would be granted if requested, does not establish that hosted/API and self-hosted access carry a fully identical complete contractual regime beyond what the Agreement itself states, and does not constitute a project-specific commercial-use clearance.

This decision authorizes persisting the candidate as a machine-checkable `Lifecycle: Candidate` representation only. It does not authorize CPR, Adoption into `GOVERNED-CLAIMS.md`, `crc_eligible: Yes`, TopicClaim publication, extraction/reachability implementation, or any Retrieval/Bounded Interpretation/Composition change.

Preserve evidence limitations, prohibited conclusions, and the tool-scope architecture-fit reasoning above exactly as recorded.
