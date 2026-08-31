Title: Formal Governance Review #12 — Adobe Stock AI Studio "Commercially Safe" Label / Partner-Model Caveat

Reviewed object:
- CAND-ADOBESTOCK-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001

Review date: 2026-08-31

Artifact type: Formal Governance Review (adoption stage) — first FGR of the Adobe Stock domain, and Trial 4 of the Living Knowledge onboarding benchmark (prospective, LK-68/LK-68A-instrumented). Combined multi-stage review conducted across LK-70 (scenario selection + existing-governance check + shallow source discovery, source-access friction disclosed), LK-71 (human-assisted primary evidence capture request), LK-72 (direct source reading, Candidate formation, LK-70 hypothesis materially misframed and corrected), LK-73 (human FGR: REVISE — indemnification clause removed, dependency reassessed from zero), and LK-74 (human FGR: ADOPT).

PM decision: **ADOPT WITH LK-73 REVISED WORDING (PM: JD, Adoption Decision Date: 2026-08-31).** Full decision sequence, preserved rather than collapsed: (1) LK-72 formed the Candidate with a statement that included a clause asserting Adobe provides "intellectual-property indemnification protection" for Firefly-generated "Commercially safe" content; (2) LK-73 recorded PM's REVISE decision — that clause removed in full, on the reasoning that no directly-read source establishes "Commercially safe" (Tier 2 product term) as equivalent to "Indemnified Firefly Output" (Tier 1 defined contractual term with its own conditions and cap), so carrying the Tier 2 indemnification phrase risked implying the Tier 1 regime without evidentiary support; (3) LK-73 also reassessed the proposed project dependency (`adobe_ai_studio_commercially_safe_label_confirmed`) from zero and concluded none was required, since the revised statement presents both the Adobe-model and partner-model branches conditionally without selecting either for the user's project; (4) LK-74 recorded PM's subsequent ADOPT decision on the LK-73-revised statement, with one durable-rationale correction (§6 below) to the dependency-necessity reasoning. This is a Living Knowledge Adoption decision only — it is explicitly not CRC Publication approval, not Commercial Assurance, not commercial or legal clearance, and not certification of any kind.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as part of the same LK-74 task that recorded the human ADOPT decision — synthesizes the multi-stage LK-70 through LK-74 record for durable, single-artifact preservation, per this folder's own governance-artifact-preservation requirement.

--- BEGIN VERBATIM FORMAL GOVERNANCE REVIEW ---

# Adobe Stock AI Studio "Commercially Safe" Label — Formal Governance Review

## 1. Proposition under review (as revised, LK-73)

Adobe's official AI Studio help material ("AI Studio: Learn about credits and commercial use," helpx.adobe.com, last updated July 21, 2026) states that content labeled "Commercially safe" in AI Studio is created using Adobe's generative AI Firefly model, trained on content Adobe has permission or rights to use, and that this content may be used in commercial projects. For content generated using a partner (third-party, non-Adobe) AI model in AI Studio, Adobe directs users to review that specific model's own terms of service before commercial use, and states that Adobe cannot verify the training data used to build a partner model or whether that model's output may contain third-party intellectual property.

## 2. Evidence chain

**Discovery (LK-70):** after a non-substantive precheck and a durable prospective `TRIAL_START`, an existing-governance scan of `GOVERNED-CLAIMS.md`'s full claim index found Adobe Stock canonically registered as an `AssetProviderId` with zero governed claims — a genuine coverage gap distinct from the four already-governed Editorial-restriction claims (Getty/iStock/Shutterstock/Pond5). Shallow WebSearch found four candidate official Adobe URLs; four WebFetch attempts against two Adobe domains all timed out (control fetch of `example.com` succeeded instantly, isolating the friction to Adobe specifically) — recorded as `PROCESS_FRICTION`, not architecture. No Candidate was formed; the smallest next step (human-assisted capture) was identified and requested.

**Evidence capture request (LK-71):** two fresh WebFetch attempts against the same URLs also failed (6/6 total across two tasks), confirming durable rather than transient access friction. A minimum two-source capture package (Tier 1 Product Specific Terms PDF; Tier 2 official "Commercially safe" explanation page) was requested from PM, with exact titles, URLs, and preservation instructions — no interpretation asked of PM.

**Direct evidence reading + Candidate formation (LK-72):** PM supplied both sources — Source A as the original PDF (directly read in full, 11 pages, identity/date confirmed: "Adobe Stock Product Specific Terms," "Last updated January 16, 2026," footer `Stock-Additional-Terms_en_US_20260116`), Source B as a verbatim Traditional Chinese copy/paste capture (identity/date confirmed: "AI Studio：了解點數和商業用途," helpx.adobe.com, "上次更新時間 2026年7月21日"). Direct reading found LK-70's original hypothesis **materially misframed**: it had implicitly modeled Adobe Stock on the Getty/Pond5 "license an existing catalog asset" pattern, but Source A §1.10 explicitly excludes pre-existing "Generated with AI"-labeled catalog Stock Assets from its indemnified-output definition — "Commercially safe" instead describes which AI model was used in an active AI Studio generation/editing session. All 9 tested components of Source B's content were directly supported. A Candidate was formed, including an indemnification clause not yet properly bounded against Source A's own conditions/cap.

**Human FGR — REVISE (LK-73):** PM decided REVISE — the indemnification clause removed entirely; the contractual claim family preserved as separate and unresolved; the proposed dependency reassessed from zero (not preserved merely because it appeared in the draft) and dropped, on the reasoning that the statement's own conditional (both-branches) framing makes a project-specific gating fact unnecessary for safe use.

**Human FGR — ADOPT (LK-74):** PM approved Adoption of the LK-73-revised statement, with one correction to the durable dependency-necessity rationale (§6 below) — persistence/re-checkability of the label must not be presented as the architectural reason no dependency exists; the correct, sole architectural reason is that Bounded Interpretation does not require resolving project state to safely communicate a self-hedged, conditionally-framed proposition.

## 3. Fidelity check against the directly-read findings

The adopted proposition (§1) was checked clause-by-clause against Source B's directly-read text (LK-72 §8, 9 components, all SUPPORTED) and found faithful, with the indemnification clause correctly absent per the LK-73 REVISE decision. It does **not** state that Adobe provides IP indemnification protection; does **not** state or imply that "Commercially safe" is equivalent to "Indemnified Firefly Output"; does **not** assert which AI model was used for any specific project; does **not** assert commercial clearance, non-infringement, or legal safety; and does **not** reference the Tier 1 contractual indemnification regime's conditions or cap — all correctly excluded per the LK-72/LK-73 scope discipline.

## 4. Proposition decomposition

Confirmed as one coherent, independently useful proposition — Adobe's own AI Studio product representation distinguishing Adobe/Firefly-generated "Commercially safe" content from partner-model content, only. Explicitly not merged with, and this review does not adopt, the separate contractual "Indemnified Firefly Output" concept (Source A §1.10/§10), which remains a distinct, unresearched, possible future Candidate — see GOVERNED-CLAIMS.md's "Related" field for this claim.

## 5. Provider / topic / tool scope

`provider_scope: ['adobe-stock']` is correct — Adobe Stock is a stock asset provider, already canonically registered, requiring zero registry work (unlike Pond5/Storyblocks, which each required new canonical IDs). `topic: 'commercial_use'` — reverified at LK-72 against the actual `GoalCategory` enum (6 values: `commercial_use`, `copyright_ownership`, `copyrightability`, `likeness`, `third_party_source_rights`, `unknown`) rather than reflexively copied from the Getty/Pond5 `third_party_source_rights` precedent; correct because this proposition concerns AI-*generated* Output, not licensing a pre-existing third-party asset. `tool_scope: null` is correct and deliberate — the statement's own text covers both the Firefly branch and the partner-model branch; narrowing tool_scope to Firefly alone would incorrectly exclude half of what the claim describes.

## 6. Applicability and dependency

`applicability_requirements: []` — reassessed, not merely inherited; no governed applicability requirement beyond provider_scope itself is needed. `unresolved_project_dependencies: []` — reassessed from zero at LK-73, **rationale corrected at this Adoption**: the durable comment in the Candidate file initially listed label persistence/re-checkability as one of several co-equal reasons for the empty dependency list; PM required this reordered so persistence is explicitly demoted to an evidence observation only, with the sole architectural reason stated as: the proposition presents the Adobe/Firefly and partner-model branches conditionally and does not select either branch for the user's project, so Bounded Interpretation does not require a project-specific dependency merely to retrieve and attributively communicate it. Generic principle recorded verbatim in the Candidate file per PM's own wording: "dependency necessity follows Bounded Interpretation requirements, not merely evidence availability." Even if the label's persistence/re-checkability were later resolved either way, that fact alone would not change this dependency conclusion.

## 7. Jurisdiction

Platform/product representation, not a legal-jurisdiction-scoped rule. The existing bounded transitional compatibility convention (`jurisdiction: 'Global'`) applies, identically to its use for the Stock domain, Artlist, Storyblocks, and Pond5. Not reinterpreted; not read as worldwide legal validation.

## 8. Evidence tier and limitations

Primary evidence tier for the adopted proposition: **Official platform help material (Tier 2)**, Source B, directly read in full (Class B human copy/paste capture, embedded verbatim in the PM's own task prompt rather than filed as a separate `evidence-captures/` artifact — a process variance from the Pond5/Storyblocks precedent, flagged not smoothed over). Source A (Tier 1, Class A original PDF, directly read in full) is **boundary/evidence-limitation material only** — it supports zero clauses of the adopted proposition directly; its role is exclusively to explain why the proposition is framed as an attributed report rather than a legal conclusion (it establishes a differently-defined contractual concept exists, that no source shows it equivalent to "Commercially safe," and that Adobe's own Terms §12(C) disclaim help material — including Source B — as "courtesy only... not legal advice"). Three documents incorporated by reference at Source A §9.6/§1.8 (Firefly Product Description, Adobe Generative AI Product Specific Terms, Adobe Generative AI User Guidelines) have not been read and may bear on the unresolved "Commercially safe"/"Indemnified Firefly Output" equivalence question — this is disclosed, not resolved, and is not required for this narrower claim's own Adoption.

## 9. Representation readiness

`checkTopicClaimRepresentationReadiness()` invoked directly (LK-74, ephemeral probe, run once and deleted per this project's established discipline) against the real Candidate object — returned `{ready: true, issues: []}`. Mechanically representable under existing, unmodified architecture. Process note: unlike the Pond5/Storyblocks precedent, the Candidate file remains **uncommitted** as of this Adoption — Trial 4 has deliberately kept all governance artifacts as prospective, uncommitted local work throughout (a different operating mode than Trial 2/3's per-step commit-and-push discipline), so this readiness check was run against the real working-tree file directly rather than a cited commit hash. Flagged explicitly, not smoothed over.

## 10. Architecture discovery

None. The LK-70 through LK-74 chain exposed no missing generic Living Knowledge capability. The one apparent ambiguity investigated (whether this hybrid provider/AI-generation-tool proposition needed `tool_scope`/Matrix-style representation instead of `provider_scope`/`TopicClaim`) resolved to "existing architecture sufficient once the correct existing `topic` enum value is used" (§5) — a correction of initial instinct via direct verification, not a genuine gap. The Adobe source-access friction (6 failed fetch attempts across two tasks) is a disclosed tooling/access limitation, matching this project's established PROCESS_FRICTION classification, not ARCHITECTURE_DISCOVERY.

## 11. Decision

**ADOPT.** `Lifecycle: Adopted`, `Adoption Approver: JD (PM)`, `Adoption Decision Date: 2026-08-31`. `Publication scope: Reviewer/Commercial Assurance`. `CRC Approver`/`CRC Decision Date` remain `PENDING` — CRC Publication Review is a separate, later, not-yet-performed stage. No `TOPIC_CLAIMS_FIXTURE` entry is added by this Adoption; the claim is registered as intentionally fixture-absent, mirroring the Synthesia/Storyblocks/Pond5 precedent's own governance-then-runtime sequencing.

--- END VERBATIM FORMAL GOVERNANCE REVIEW ---
