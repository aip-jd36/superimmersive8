Title: Formal Governance Review #11 — Pond5 Editorial Content Commercial-Use Restriction / Written-Consent Exception

Reviewed object:
- CAND-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001

Review date: 2026-08-30

Artifact type: Formal Governance Review (adoption stage) — first FGR of the Pond5 domain, and the third Trial of the Living Knowledge onboarding benchmark (LK-42 protocol). Combined multi-stage review conducted across LK-56 (scenario selection + existing-governance check), LK-57 (bounded source-discovery/capture preparation), LK-58 (primary-evidence ingestion, CLI-side content-verification failure disclosed), LK-59 (human-verified source facts + Candidate formation), LK-60 (human FGR: REVISE — Tier 2 contact-process sentence removed from the Candidate Statement), and LK-61 (human FGR: ADOPT).

PM decision: **ADOPT WITH LK-60 REVISED WORDING (PM: JD, Adoption Decision Date: 2026-08-30).** Full decision sequence, preserved rather than collapsed: (1) LK-59 formed the Candidate with a three-sentence Statement (Editorial scope, written-consent exception, and a third sentence describing Pond5's current Editorial-page contact route for commercial clearance); (2) LK-60 recorded PM's REVISE decision — the third sentence removed, on the reasoning that the durable Tier 1 contractual proposition should not be coupled to a lower-authority, potentially more changeable support/contact-process description, since the governing Agreement already establishes the material written-consent exception on its own; (3) LK-61 recorded PM's subsequent ADOPT decision on the LK-60-revised two-sentence Statement. This is a Living Knowledge Adoption decision only — it is explicitly not CRC Publication approval, not Commercial Assurance, not commercial or legal clearance, and not certification of any kind.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact — never inserted into the verbatim body.

Source: written directly to this file as part of the same LK-61 task that recorded the human ADOPT decision — synthesizes the multi-stage LK-56 through LK-61 record for durable, single-artifact preservation, per this folder's own governance-artifact-preservation requirement.

--- BEGIN VERBATIM FORMAL GOVERNANCE REVIEW ---

# Pond5 Editorial Content Commercial-Use Restriction — Formal Governance Review

## 1. Proposition under review (as revised, LK-60)

Pond5 Content identified on its Item Page as Editorial, or for editorial use only, is intended for use only in connection with events or topics that are newsworthy or of general public interest. Absent Pond5's express and specific written consent, Pond5's Content License Agreement restricts this Editorial Content from use in merchandise, advertisement (other than in-context advertising of a Production in which the Editorial Content has been incorporated), endorsement, promotion, advertorial, or other commercial Production.

## 2. Evidence chain

**Discovery (LK-56):** Pond5 selected as a genuinely fresh, commercially relevant stock-media provider following an exhaustive existing-governance check that ruled out Runway/Kling/Pika/Midjourney/ElevenLabs (already Matrix-covered), Google Veo/Adobe Firefly (Matrix, Needs Reverification — a different task shape), OpenAI Sora (discontinued), Gemini API/Consumer App (Matrix-Verified, Pending CRC — a different task shape), and Envato Elements/Epidemic Sound (already Adopted, Music Scenario A) — Pond5 was confirmed to have zero prior presence anywhere in this repository's governance surfaces, named only once, hypothetically, in `FGR_007`.

**Bounded source discovery (LK-57):** automated fetch of Pond5's own primary legal domain (`www.pond5.com`, all paths, including its consolidated Help Center and redirected `support`/`explore` subdomains) failed comprehensively (HTTP 403 throughout); a specific, named, minimum first-party document set (the governing Content License Agreement, a Help Center licensing-comparison article, the Editorial page, the Pricing page) was identified for human-assisted capture, distinguishing historical dated License Agreement snapshots (2015/2017/2018) from the current (2026) product environment.

**Primary-evidence ingestion (LK-58):** four human-captured PDFs preserved (`evidence-captures/pond5/`, untracked, per established convention). CLI-side content extraction failed identically to the Storyblocks precedent (zero text layer; `pdftoppm`/OCR/`pdfinfo` unavailable) — worse, in fact, since even file-level metadata could not be recovered. No Candidate was formed at this stage; the task's own instruction to "verify" observations against the PDFs could not be satisfied by CLI tooling, and this was disclosed rather than smoothed over.

**Human-verified source facts + Candidate formation (LK-59):** PM/Architecture confirmed direct human review of the rendered pages of the same four preserved PDFs (SHA-256 hashes unchanged) and supplied detailed, structured HUMAN-VERIFIED SOURCE FACTS, including: the governing Agreement's Section 7 "Editorial Content" restriction (the core proposition); the separate, materially narrower "Digital License"; Individual/Business/Premium tiers; and the Section 7 clearance/PII/privacy-publicity-rights disclaimer (disclosed as evidence-limitation context, deliberately not folded into the proposition). `pond5` was registered as a canonical `AssetProviderId` (mechanically required by the type-checked Candidate schema, not a governance judgment) and the Candidate `CAND-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001` was formed with a three-sentence Statement.

**Human FGR — REVISE (LK-60):** PM decided REVISE — removing the third sentence (the Editorial-page contact-route description) from the Candidate Statement, for the reasoning stated in this review's own PM-decision line above. The Editorial-page evidence itself was preserved as corroborating source context, not discarded.

**Human FGR — ADOPT (LK-61):** PM approved Adoption of the LK-60-revised, two-sentence proposition.

## 3. Fidelity check against the human-verified findings

The adopted proposition (§1) was checked against the LK-59 human-verified findings and found faithful: it states (a) that Pond5 Editorial Content is intended for newsworthy/public-interest use, and (b) that absent Pond5's own express and specific written consent, the governing Agreement restricts that content from the five named commercial-use categories (merchandise; advertisement, other than in-context; endorsement; promotion; advertorial; other commercial Production). It does **not** state that Editorial Content can never receive commercial authorization (the written-consent exception is preserved verbatim, not dropped); does **not** state that any specific asset is Editorial-designated; does **not** state that any user has obtained Pond5's consent; and does **not** reference the Editorial-page contact route, the Digital License, license tiers, indemnification, or the Section 7 clearance/PII disclaimer — all correctly excluded per the LK-59/LK-60 scope discipline.

## 4. Proposition decomposition

Confirmed as one coherent, independently commercially useful proposition — Pond5's own Editorial Content commercial-use restriction and its written-consent exception, only. Explicitly not merged with, and this review does not adopt, any other provision the governing Agreement may separately contain (the All Media License generally, the Digital License's distribution restrictions, Individual/Business/Premium tier differences, indemnification, merchandise rights generally, or the Section 7 clearance/PII disclaimer) — each remains a distinct, unreviewed, possible future Candidate.

## 5. Provider scope

`provider_scope: ['pond5']` is correct — Pond5 is a stock asset provider (footage/audio/images incorporated into a production), the same structural category as Getty/iStock/Shutterstock/Adobe Stock/Artlist/Storyblocks. `tool_scope: null` is correct; Pond5 is not a generation tool.

## 6. Applicability and dependency

`applicability_requirements: []` — correct: no implemented `ApplicabilityFact` type exists for either Editorial designation or provider written consent (only `jurisdiction`, `tool_plan_tier`, `tool_account_status` are implemented) — neither fact can be formally gated; both are correctly represented only as dependencies. `unresolved_project_dependencies: ['editorial_designation_confirmed', 'separate_authorization_obtained']` — both **reused**, not newly minted, from the identical existing Getty/iStock/Shutterstock Editorial claims — necessary (CRC cannot structurally verify either fact) and correctly evidence-only/non-askable (both confirmed absent from `dependency-askability.ts`'s registry — appearing only in that file's own documentary header — no DAR performed or proposed). No `pond5_license_tier_confirmed`-style dependency was created: this proposition, on the evidence, does not turn on which Pond5 license tier was purchased.

## 7. Jurisdiction

Platform-contractual license scope, not a legal-jurisdiction-scoped rule. The existing bounded transitional compatibility convention (`jurisdiction: 'Global'`) applies, identically to its use for the Stock domain, Artlist, and Storyblocks. Not reinterpreted; not read as worldwide legal validation.

## 8. Evidence tier and limitations

Primary evidence tier: **Primary legal/official authority (Tier 1) by document type** (the Content License Agreement's own Section 7), reviewed by direct human reading of the preserved rendered captures — satisfying `EVIDENCE-CAPTURE-SOP.md`'s own Class B standard, corroborated by two Tier 2/3 first-party sources (the Help Center licensing article, the current Editorial page). Limitations, recorded explicitly: the governing Agreement's own visible revision date (2024-01-03) is roughly 14 months older than the corroborating 2026 material — this gap is disclosed, not reconciled beyond what the evidence supports (per LK-59 §3's own explicit instruction not to manufacture a stronger reconciliation); the CLI itself could not independently extract or verify any of the four PDFs' content or metadata at any stage (LK-58's own disclosed tooling limitation, unresolved, unchanged); the Section 7 clearance/PII/privacy-publicity-rights disclaimer is preserved as limitation context, not part of the adopted proposition.

## 9. Representation readiness

`checkTopicClaimRepresentationReadiness()` returns `{ready: true, issues: []}` against the committed Candidate representation (`08_Platform/app/lib/candidates/CAND-POND5-EDITORIAL-COMMERCIAL-USE-CONSENT-001.ts`, revised at commit `8b8eef8c6401f8f84b4951db73927b59489a0ae7`), re-confirmed fresh at LK-59, LK-60, and this review. Mechanically representable under existing, unmodified architecture; the only remaining representation step (canonical provider identity registration) was ordinary onboarding, not an architecture gap, and was completed in the same milestone (`08_Platform/app/types/interview-engine.ts @ 91732a778e38f6d6278b1b2a733e26cb9aee4f14`).

## 10. Architecture discovery

None. This review, and the LK-56 through LK-61 chain preceding it, exposed no missing generic Living Knowledge capability — every mechanism used (provider_scope, dependency evidence-only default, representation readiness, candidate provenance, the Candidate→Adoption recording convention, the FGR-stage REVISE→ADOPT decision sequence) already existed and required no modification. The one genuinely new observation — that the CLI's PDF tooling cannot extract content OR metadata from certain human-captured PDFs (worse than the Storyblocks precedent, which at least yielded metadata) — is a disclosed environment/tooling limitation, not a Living Knowledge architecture gap, and is recorded as such (matching this session's own established PROCESS_FRICTION classification, not ARCHITECTURE_DISCOVERY).

## 11. Decision

**ADOPT.** `Lifecycle: Adopted`, `Adoption Approver: JD (PM)`, `Adoption Decision Date: 2026-08-30`. `Publication scope: Reviewer/Commercial Assurance`. `CRC Approver`/`CRC Decision Date` remain `PENDING` — CRC Publication Review is a separate, later, not-yet-performed stage. No `TOPIC_CLAIMS_FIXTURE` entry is added by this Adoption; the claim is registered as intentionally fixture-absent, mirroring the Synthesia/Storyblocks precedent's own governance-then-runtime sequencing.

--- END VERBATIM FORMAL GOVERNANCE REVIEW ---
