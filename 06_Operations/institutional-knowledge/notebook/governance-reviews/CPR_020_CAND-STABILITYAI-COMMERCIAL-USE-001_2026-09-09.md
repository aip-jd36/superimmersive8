Title: CRC Publication Review #20 — Stability AI / Stable Diffusion Commercial-Use Candidate (LK-TRIAL-10)

Reviewed object:
- CAND-STABILITYAI-COMMERCIAL-USE-001 (candidate representation; not yet an Adopted `CLAIM-...-v1`)

Review date: 2026-09-09

Artifact type: CRC Publication Review / Decision Analysis (publication stage). First CPR of the Stability AI domain. Continues LK-TRIAL-10. Conducted **out of the normal sequence**: this repository's CPR convention (`governance-reviews/README.md`) defines a CPR as "a separate, later question about an **already-Adopted claim** — whether it should additionally become `CRC Eligible: Yes`." `CAND-STABILITYAI-COMMERCIAL-USE-001` is `Lifecycle: Candidate` and is not recorded in `GOVERNED-CLAIMS.md`; `FGR_017` is an FGR **ADOPT decision** but the separate Adoption **recording** it itself requires ("a separate, later Adoption recording in `GOVERNED-CLAIMS.md` (with a named Adoption Approver and Decision Date)") has not occurred. This review was requested to perform the independent publication analysis now, while the primary evidence is fresh, so that the eventual in-sequence CPR reconsideration is fast.

PM decision: **APPROVE (2026-09-09), following the Adoption recording (`GOVERNED-CLAIMS.md`, commit `7fb461f`) and a bounded in-sequence CPR reconsideration -- see this file's own later addendum below, which records the mandatory real synthetic-eligibility-canary run and the final decision. This wrapper line updated per this folder's own "wrapper metadata may be updated as later events occur" allowance; the verbatim body below remains exactly as originally written and is not the record of the final decision.**

Reviewing-agent recommendation: **CPR WITHHOLD** — publication blocked on a sequencing / missing-prerequisite basis, not on any substantive publication-safety defect. Every substantive dimension that can be assessed at this stage passed. Exact blocker in §20.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once PM's decision is recorded. Future amendments belong in a new review artifact or in this wrapper's own metadata, never inserted into the verbatim body below.

Source: written directly to this file as the review was conducted this session (LK-TRIAL-10, CPR milestone), not reconstructed from a prior conversational report.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# Stability AI / Stable Diffusion Commercial-Use — CRC Publication Review

## 0. Repository / governance state verified before review

`origin/main` = `c4fb3a5008a31dff1e94c22fae12c4903b037ab9` (fetched and confirmed). The Stability AI FGR/candidate payload is one clean linear commit ahead: `da75574bdc67385badf71ee54cfae4acda4b8618` ("FGR_017: Stability AI commercial-use FGR ADOPT + candidate artifact (LK-TRIAL-10)"), whose parent is exactly `c4fb3a5`. `da75574` changes exactly two files: `FGR_017_CAND-STABILITYAI-COMMERCIAL-USE-001_2026-09-09.md` and `08_Platform/app/lib/candidates/CAND-STABILITYAI-COMMERCIAL-USE-001.ts` (blob `b99b89940d78e1f8f4a9f8c0a5d5b7f9e6a08288`). No intervening mainline commit affects Stability AI evidence/governance, FGR/CPR rules, the candidate schema, TopicClaim publication, canonicalization/reachability, or benchmark semantics (verified: `git log c4fb3a5..da75574` = the one commit).

Current candidate state, confirmed directly:
- `FGR_017` exists exactly once. `CAND-STABILITYAI-COMMERCIAL-USE-001.ts` exists exactly once.
- `Lifecycle: Candidate`, `crc_eligible: 'Pending'`, `crc_publication_scope: null`, `crc_candidate_statement: null`, `superseded_by: null`.
- Not in `GOVERNED-CLAIMS.md` (zero matches). Not in `PLATFORM-RIGHTS-MATRIX.md` or `matrix-fixture.ts` (zero matches for `stability` / `stable diffusion` / `sdxl` / `sd3` / `stable audio`). Not in `topic-claims-fixture.ts` (zero matches). `stability-ai` is not a `CanonicalToolId` (`CANONICAL_TOOL_IDS`, `lib/tool-identity/registry.ts` — 13 entries, none Stability).
- `LK-TRIAL-10.jsonl`: 11 events, exactly one `TRIAL_START` (seq 1), zero `TRIAL_END`, structurally valid (bracketed `MACHINE_STAGE` pairs 2/4, 5/8, 9/11; monotonic seq). Trial open.

Authoritative material read directly this review: `FGR_017` (verbatim body + PM decision), the immutable candidate artifact, `CRC-PUBLICATION-POLICY.md` (all seven Principles + the tool-scoped legacy-coexistence practice + the Publication Test), `governance-reviews/README.md` (CPR definition + naming convention), `CPR_009` (closest precedent — first CPR of a new non-Matrix domain), `synthetic-eligibility-canary.ts` (full), `topic-claim-readiness.ts` (full), `build-bounded-interpretation.ts` (`hasGovernedProjectDependencies`), `lookup-topic-claims.ts` (`toolScopeMatches`), `dependency-askability.ts` (`DEPENDENCY_TREATMENTS`), `tool-identity/registry.ts`.

## 1. Governed proposition, restated (not reinterpreted)

Stability AI's Community License Agreement (the operative contractual document for Stability's Core Models — the Stable Diffusion family) contains a commercial-purpose license grant, conditioned on registration with Stability AI for any commercial use. If the licensee, together with its Affiliates, generates more than USD $1,000,000 in aggregate annual revenue — from any source, direct or indirect — every license granted under the Agreement terminates as of that date, and continued use requires a separate license that Stability AI may grant "in its sole discretion." Output ownership ("You own any outputs generated from the Models or Derivative Works to the extent permitted by applicable law") is a textually separate clause, not itself gated by the revenue threshold, and is not proof of commercial permission on its own. Scope: Stability's Core Models under the Community License Agreement — explicitly excludes Stability's separately-governed products (Stable Assistant, Stable Chat, Stable App). `claim_character: 'established'` (terms directly quoted from current primary source). `jurisdiction: 'Global'` — a platform contractual restriction, not a legal-jurisdiction-scoped rule (existing codebase precedent value for a jurisdiction-independent platform contract; mirrors Synthesia/Kling/Runway/Pika).

## 2. Evidence-tier re-verification — INDEPENDENT, this review

Not inherited from `FGR_017`'s prose. Four sources fetched independently this session (2026-09-09):

- **`stability.ai/community-license-agreement`** — serves "Stability AI Community License Agreement", Last Updated: **July 5, 2024**. Re-derived verbatim: the Section III commercial-purpose grant ("non-exclusive, worldwide, non-transferable, non-sublicensable, revocable and royalty-free limited license" for a "Commercial Purpose", defined as purposes "primarily intended for commercial advantage or monetary compensation"); the registration condition ("If You are using or distributing the Stability AI Materials for a Commercial Purpose, You must register with Stability AI"); the revenue-threshold clause ("If at any time You or Your Affiliate(s), either individually or in aggregate, generate more than USD $1,000,000 in annual revenue … any licenses granted to You under this Agreement shall terminate as of such date"); the post-termination clause ("You must request a license from Stability AI … which Stability AI may grant to You in its sole discretion"); the output-ownership clause ("As between You and Stability AI, You own any outputs generated from the Models or Derivative Works to the extent permitted by applicable law"); Core Models defined by reference to `stability.ai/core-models` "as may be updated from time to time"; "Affiliate" = >50% common ownership/control; **no clause distinguishing hosted/API access from downloaded/self-hosted model use** (the Agreement mentions distribution "via a hosted service or application programming interface" but states no different grant on that basis).
- **`huggingface.co/stabilityai/stable-diffusion-3.5-large/blob/main/LICENSE.md`** — the license file bundled with Stability's current flagship model. "STABILITY AI COMMUNITY LICENSE AGREEMENT, Last Updated: July 5, 2024". All six load-bearing clauses byte-consistent with the marketing-page copy. **Commit metadata: last modified "almost 2 years ago" (`4c4df3f`) — no change after July 5, 2024.** SD 3.5 (released Nov 2024) shipped under the same license.
- **`stability.ai/license`** (overview page) — describes the Community License as currently in effect; Community tier "less than $1M in annual revenue", Enterprise "annual revenue exceeding $1M"; links to the July 2024 Agreement; "© Stability AI Ltd, 2026"; no license version history or recent-update notice; distinguishes Core Models (Stable Diffusion 3.5, SDXL Turbo, Stable Fast 3D, Stable Audio 3.0) from the Platform API and separate applications.
- **`stability.ai/news-updates/license-update`** (announcement) — "Our new Community License is now free for research, non-commercial, and commercial use"; USD $1M threshold; above it, "you'll need to contact Stability for a separate Enterprise license." Dated Jul 5.

**Cross-check FGR_017 flagged as not-done, now performed:** FGR_017 §3 disclosed that it "did not independently confirm the absence of a newer superseding version (no equivalent of Synthesia's 'Terms & Policy Archives' cross-check was performed)." This review performed that cross-check: four independent Stability-controlled surfaces (the Agreement page, the HF `LICENSE.md` with its commit history, the `/license` overview, the `/news-updates` announcement) all present the **July 5, 2024** Community License Agreement as the single current, operative document, and the HF `LICENSE.md` git history shows **no modification since**. A search-tool synthesis mentioning a "May 2026 license update" and a "$20/mo Professional membership" is **not corroborated by any primary Stability AI source** in this review's fetches (the `/license` page and the announcement describe only Community + Enterprise) — recorded as uncorroborated third-party commentary, immaterial to the candidate's own proposition (which turns on the Community License Agreement's own mechanics and already carries the Enterprise/separate-license discretionary path). **Classification: CURRENT — the July 5, 2024 Community License Agreement is the operative document, unsuperseded. FGR_017's disclosed §3 freshness caveat is RESOLVED, not merely carried forward.**

## 3. Freshness finding — Principle 6

`CRC-PUBLICATION-POLICY.md` Principle 6 ("Stability over novelty") disfavors publishing *newly changed* platform terms until SI8 has seen how the change holds up, and explicitly states: "a long-settled fact doesn't need a waiting period just because it was verified recently." The Community License Agreement has been **unchanged for over two years** (July 5, 2024 → 2026-09-09) — the opposite of a newly-changed term. Once confirmed unsuperseded (§2), the July 2024 date is a **stability asset** under Principle 6, not a freshness liability. The separately-governed Acceptable Use Policy (`stability.ai/use-policy`, effective September 30, 2026) is genuinely fresh but is a **separate document** (confirmed: distinct legal doc, not incorporated by reference into the Agreement's own text; governs content restrictions + AI-disclosure obligations across all license tiers) and is correctly excluded from this candidate's proposition (FGR_017 §10).

## 4. CRC Candidate Statement — CANNOT be assessed (undrafted)

`crc_candidate_statement` is `null` on the candidate. `FGR_017` deliberately did not draft one ("both undrafted pending CPR", §12). There is therefore **no specific CRC-facing sentence for this review to run the fidelity checks against** (unsupported strengthening / narrowing, accidental legal framing, currentness overstatement, provider-policy-vs-law confusion, project-specific inference, dependency leakage, converse/carve-out fidelity) and **no sentence to apply the Publication Test to** ("Would I be comfortable having a prospect's legal team quote this exact sentence back to SI8?" — there is no sentence). This is the first half of the §20 blocker.

**Proposed draft (recommendation only — not entered anywhere, mirrors CPR_009 §19's "proposed scope text" discipline; final wording is the PM's at Adoption-recording time):**

> "Stability AI's Community License lets you use its Core Models (the Stable Diffusion family) for commercial purposes for free, but it requires you to register with Stability AI for commercial use, and it says that if you or your affiliates make more than USD $1,000,000 in total annual revenue — from any source — the license ends and any continued use needs a separate license that Stability AI can grant at its own discretion. This concerns the model license only; it is separate from who owns the images you generate, and it does not by itself mean a project is cleared for commercial use. These are Stability AI's Community License terms and do not cover its separately-governed products such as Stable Assistant or Stable Chat."

## 5. Evidence limitations (disclosed, for any future publication scope)

Single-provider; primary contractual source (Class A) corroborated across four Stability-controlled surfaces including the model-bundled `LICENSE.md` with its own commit history. The July 5, 2024 date is >2 years old but confirmed unsuperseded this review (§2) — disclosed, not a defect. The hosted/API-vs-self-hosted point is an **absence-of-stated-distinction** finding, not an affirmative equivalence claim (FGR_017 §6): a hosted surface could carry an additional API terms-of-service / SLA / enforcement layer the Agreement itself would not need to mention.

## 6. Prohibited conclusions — confirmed applicable and structurally unreachable

CRC must not conclude, and (per §§7–9, 13–18) structurally cannot conclude: that the user's revenue is ≤ or > $1M; that required registration has occurred; that the Community License definitely governs the user's exact Stability AI product; that a separate license is required for this specific user; that Stability AI would grant such a license; that output ownership means commercial clearance; that unresolved revenue/registration status means commercial use is prohibited; that the presence of a commercial-purpose grant means the project is commercially cleared; anything about Stable Assistant / Stable Chat / Stable App. FGR_017's tool-scope and product-scope exclusions carry these.

## 7–9. Dependencies — `applicability_requirements: []` is correct; all three are evidence-only

The candidate carries `applicability_requirements: []` and three `unresolved_project_dependencies`:

| Dependency | Classification | Reasoning |
|---|---|---|
| `stabilityai_organization_revenue_threshold_status` | **GENERAL GOVERNED QUALIFICATION** (a real condition in the provider's own terms) that is also an **EVIDENCE LIMITATION** for CRC (no reliable structured signal). Not a PROJECT APPLICABILITY REQUIREMENT. | Consistent with PM's 2026-08-16 decision rejecting organization-revenue-shaped structured facts, and the Gemini API precedent. CRC can state the general rule without knowing the user's revenue. |
| `stabilityai_commercial_registration_completed` | **GENERAL GOVERNED QUALIFICATION** + **EVIDENCE LIMITATION.** | A step the user either has or hasn't taken; CRC has no signal and must not ask (see below). |
| `stabilityai_product_is_core_model_under_community_license` | **PROVIDER_SCOPE BOUNDARY** expressed as a dependency (is the thing the user is using actually a Core Model under this Agreement, vs. Stable Assistant / Stable Chat / a hosted API layer with its own terms). | Not material to *whether the claim is safe* — it is the reason the tool-scope + product-scope exclusions exist; surfaced so a reviewer/user knows the claim's own edge. |

**Askability:** `DEPENDENCY_TREATMENTS` (`dependency-askability.ts`) has exactly one live entry (`human_contribution_description`). `isDependencyAskableInCrc()` returns `false` for all three Stability strings — **non-askable by construction.** No organization-revenue fact, registration fact, product-specific bespoke fact, or Stability-specific question flow is created, proposed, or needed by this review. If the candidate could not remain safe with `applicability_requirements: []`, this review would WITHHOLD rather than invent a fact model — it does not need to: `[]` is correct and precedented (Gemini API / Getty / Music A-3 all publish with `applicability_requirements: []` + evidence-only dependencies).

## 10. Representation readiness (LK-13)

`checkTopicClaimRepresentationReadiness(CAND_STABILITYAI_COMMERCIAL_USE_001)` run against the real candidate this review:

```
{ "ready": false, "issues": [ { "code": "invalid_tool_scope_entry", "path": "tool_scope[0]", "value": "stability-ai" } ] }
```

`stability-ai` is not a `CanonicalToolId`, so `isCanonicalToolIdentity('stability-ai')` is `false` and the readiness check flags it. This is a **mechanical registry gap, not a substantive claim defect** — every other readiness dimension (topic, lifecycle, crc_eligible, provider_scope, applicability structure) is clean. Per `CRC-PUBLICATION-POLICY.md` Principle 7, CanonicalToolId registration / Canonicalization Readiness are **independent** of `CRC-Eligible` and do **not**, on their own, block a publication decision — Canonicalization Readiness (LK-94, for identities registered 2026-09-01+) gates *production UAT*, not CPR APPROVE. (It compounds the §20 blocker only insofar as it also prevents the canary from running, §11.)

## 11. Synthetic eligibility canary — CANNOT RUN against the real candidate

`runSyntheticEligibilityCanary` was invoked against the real candidate this review. Empirical results:

- **Real candidate (`lifecycle: 'Candidate'`):** THROWS — *"claim … has lifecycle 'Candidate', not 'Adopted'. This harness verifies runtime readiness for an already-governed claim — it never decides Adoption, and canarying a non-Adopted claim would misrepresent what the result means."*
- **Real candidate with `lifecycle` synthetically forced to `'Adopted'` (statement still `null`):** THROWS — *"claim … has no real crc_publication_scope AND no crc_candidate_statement to derive a synthetic runtime scope from. Real, unmodified production code (assemble-result.ts) correctly refuses to assemble a result for an eligible claim with no scope text."* (The canary's fixed scope derivation is `crc_publication_scope ?? crc_candidate_statement ?? FAIL` — Case C.)

**The mandatory CPR empirical Retrieval → BI → Composition verification (Principle 7's closing line: "Governed-knowledge reachability … remains separately required under existing CPR review and the synthetic-eligibility-canary practice") therefore cannot be performed for this candidate in its current governed state.** This is the second half of the §20 blocker, and it is the same class of blocker that drove `CPR_007`'s WITHHOLD for the 10 Music Scenario A claims (empirical pipeline verification unavailable).

## 12. Architectural containment probe (predictive only — NOT the mandatory canary)

To de-risk the eventual in-sequence reconsideration, an **ephemeral, never-persisted** `TopicClaim` was constructed with three explicitly-labelled synthetic overrides and run through the real, unmodified `retrieve()` → `buildBoundedInterpretations()` → `assembleProjectionOutput()` pipeline:

- `lifecycle: 'Adopted'` — SYNTHETIC (real state: `Candidate`).
- `crc_candidate_statement:` the §4 proposed draft — SYNTHETIC (real state: `null`).
- `tool_scope: ['synthesia']` — SYNTHETIC STAND-IN (real: `['stability-ai']`, unregistered), so the real tool-scoped retrieval path could be exercised at all.
- (`crc_eligible: 'Yes'` forced by the harness itself, as always.)

This object was never written to any file and does not exist after this review. It is **not** the mandatory canary — three synthetic overrides is far beyond `CPR_009`'s single (`crc_eligible`) — it is a predictive check on the *architecture*, not on the *candidate*.

Observed:

- **Scenario A** (explicit `commercial_use` goal + matching tool present): retrieved exactly the synthetic claim; `matched_goal_categories: ['commercial_use']`; all **three** `unresolved_project_dependencies` passed through **unmodified**; **Bounded Interpretation status: `relevant_applicability_unresolved` (Case 3B)** — never `directly_relevant`; rendered `goal_interpretations[0].summary` = the proposed statement verbatim, then the fixed category-boundary clause ("This is relevant to whether this can be used commercially, but … there isn't enough project-specific information to determine how it applies to your specific project"), then the unconditional Commercial Assurance bridge sentence; `knowledge_items: 1`. Zero Stability-specific text beyond the quoted governed statement.
- **Scenario B** (tool present, no `commercial_use` goal): zero retrieved, zero Bounded Interpretations. Tool presence alone creates no topic relevance.
- **Scenario C** (`commercial_use` goal, tool absent): zero retrieved. `toolScopeMatches` is exact-match, fails closed.

`hasGovernedProjectDependencies` (`build-bounded-interpretation.ts`) is `match.unresolved_project_dependencies.length > 0` — a static check, domain-blind; with three dependencies it is unconditionally `true`, so this claim, once published, would render via Case 3B **every time it matches**, with no mechanism to mark any dependency "resolved." **Predictive finding: the architecture would contain a Stability-shaped claim correctly.** This does not substitute for the real canary (§11), which must be run against the real drafted text once it exists.

## 13. Matrix coexistence — vacuously clean

`CRC-PUBLICATION-POLICY.md`'s tool-scoped legacy-Matrix-coexistence practice, step 1 (inspect existing coverage): searched `PLATFORM-RIGHTS-MATRIX.md`, `matrix-fixture.ts`, `topic-claims-fixture.ts`, and `GOVERNED-CLAIMS.md` for `stability` / `stable diffusion` / `sdxl` / `sd3` / `stable audio` / `stable video` / `dreamstudio` — **zero real matches** (two hits are false positives: the word "stability" in a `matrix-fixture.ts` comment, and "stability over novelty" quoting Principle 6 in a Music claim's note). No `MatrixRow.identifier`, no `MatrixClaim.claim_id`, no TopicClaim, no GOVERNED-CLAIMS claim.

**Recorded exactly: NO MATRIX COVERAGE FOUND.** Steps 2–4 (material-overlap determination, combined canary, WITHHOLD-for-incompatibility) are **structurally vacuous** — there is no Matrix proposition to compare against. This is the same finding as `CPR_009` §13 (Synthesia) and is **not** the blocker here (unlike `CPR_016`/`CPR_018`, where a live `Yes`-eligible Matrix row drove WITHHOLD — no such row exists for Stability AI). Relevant `MatrixRow.identifier`: none. Relevant `MatrixClaim.claim_id`: none. Coexistence conclusion: no coexistence question exists.

## 14. Representation uniqueness

Publishing this claim would **not** create a duplicate authority: zero Matrix-origin Stability AI authority, zero competing TopicClaim authority, no generic provider-specific claim that would collide (the four `lib/candidates/*` files are Adobe Stock / Pond5 / Storyblocks / Synthesia — none Stability, none cross-provider). The claim would participate as a single authority. (Empirical confirmation via the real published pipeline is deferred to the §11 mandatory canary once the candidate is Adopted with drafted text.)

## 15. Principle 3 — sensitivity gate

Not triggered. The proposition concerns commercial-use license mechanics (grant, registration, revenue threshold, discretionary relicense, output ownership). It does not touch SI8's No List-adjacent subjects — likeness, voice cloning, deepfakes, political persuasion. Principle 3 (a gate, not a scope to narrow around) does not apply.

## 16–18. Bounded Interpretation / Composition / layer-strengthening

Architecturally (and, predictively, per §12): the strongest status this claim can ever reach is `relevant_applicability_unresolved` (Case 3B) — it carries three static `unresolved_project_dependencies` and nothing in this codebase removes a string from that list at runtime for any claim in any domain. Retrieval passes the dependency list through unmodified; Bounded Interpretation gates on it unconditionally; Composition renders the same fixed, domain-blind hedge + Commercial Assurance bridge every other dependency-bearing claim uses. No layer independently or cumulatively strengthens the conclusion. **Empirical confirmation against the real drafted statement is the §11 mandatory-canary item, deferred with this WITHHOLD.**

## 19. Proposed CRC Publication Scope (recommendation only — not entered into `GOVERNED-CLAIMS.md`)

If, after the Adoption recording, an in-sequence CPR reconsideration APPROVEs, this review recommends the following scope text (Getty/CPR_003 boundary-paragraph shape):

> APPROVED FOR CRC PUBLICATION (pending PM decision — see CRC Approver / CRC Decision Date below). CRC may state that Stability AI's Community License Agreement (Last Updated July 5, 2024; confirmed current and unsuperseded as of 2026-09-09) grants a royalty-free license to use Stability's Core Models — the Stable Diffusion family — for commercial purposes, conditioned on registering with Stability AI for commercial use, and that it provides that if the licensee together with its affiliates generates more than USD $1,000,000 in aggregate annual revenue from any source, the licenses granted under the Agreement terminate and continued use requires a separate license Stability AI may grant at its sole discretion. CRC may state that output ownership is a separate clause and does not by itself establish commercial clearance. CRC must not state whether a specific user or organization is above or below the revenue threshold, whether commercial-use registration has occurred, whether a separate license would be granted, or whether the user's own use is therefore permitted or restricted; and must not extend the statement to Stability AI's separately-governed products (Stable Assistant, Stable Chat, Stable App).

## 20. CLI recommendation

**CPR WITHHOLD.**

**Exact blocker (compound, sequencing / missing-prerequisite — not a substantive defect):**

1. **The claim is not recorded as `Lifecycle: Adopted` in `GOVERNED-CLAIMS.md`** (no named Adoption Approver / Decision Date; no `CLAIM-STABILITYAI-COMMERCIAL-USE-001-v1` exists). `governance-reviews/README.md` defines a CPR as a question about an *already-Adopted claim*. `FGR_017` §12 itself sequences the Adoption recording as a required, not-yet-done step.
2. **`crc_candidate_statement` and `crc_publication_scope` are both `null`** — so the Publication Test has no sentence to apply (§4), and
3. **the mandatory synthetic-eligibility-canary Retrieval → BI → Composition verification cannot run** — its fixed scope derivation (`crc_publication_scope ?? crc_candidate_statement ?? FAIL`) hits Case C and refuses (§11); it also refuses on `lifecycle !== 'Adopted'`.
4. (Compounding, not independently blocking per Principle 7:) `stability-ai` is not a registered `CanonicalToolId`, so representation readiness returns `invalid_tool_scope_entry` and the real tool-scoped `retrieve()` path cannot match the claim.

**Not a defect WITHHOLD.** Every substantive publication-safety dimension assessable at this stage came back **clean**: evidence independently re-verified and FGR_017's disclosed freshness caveat **resolved** (§2); Principle 6 actually favors this long-settled term (§3); `applicability_requirements: []` correct, all three dependencies evidence-only and non-askable by construction (§§7–9); zero Matrix coexistence question (§13); representation uniqueness sound (§14); Principle 3 gate not triggered (§15); architectural containment predictively confirmed — Case 3B, no layer strengthening (§12, §16–18).

**Path to APPROVE (narrow, identified — same shape as `CPR_009`'s DEFER → refresh → APPROVE):**
1. An FGR addendum or an explicitly-authorized governance-recording task drafts `crc_candidate_statement` + `crc_publication_scope` (the §4 and §19 drafts here are available for direct reuse or revision).
2. PM records `Lifecycle: Adopted` for the claim in `GOVERNED-CLAIMS.md` with a named Adoption Approver + Decision Date and the drafted wording (per FGR_017 §12), producing `CLAIM-STABILITYAI-COMMERCIAL-USE-001-v1`.
3. `stability-ai` is registered as a `CanonicalToolId` (generic registry extension; LK-94 Canonicalization Readiness exercised against it — gates production UAT, not CPR).
4. A bounded in-sequence CPR reconsideration re-runs the real synthetic-eligibility-canary against the drafted text and, if clean (this review's substantive findings predict it will be), records APPROVE.

**Not ESCALATE** — no human policy or architecture issue exists that current rules cannot resolve; the rules prescribe exactly the ordering above.

## 21. What this review does NOT establish

Not a Commercial Assurance Assessment. Not legal advice. Not project clearance or certification. Not proof any particular project or organization is above/below the revenue threshold, has registered, or would be granted a discretionary relicense. Not CRC eligibility (unchanged: `Pending`). Not Adoption (unchanged: `Lifecycle: Candidate` — this review does not, and is not authorized to, record Adoption). Not conversational reachability (unchanged: `stability-ai` is not a `CanonicalToolId`, no extraction alias exists). Not a Matrix conflict resolution — no Matrix content exists to conflict with. Not a modification to the candidate's semantics (the FGR-adopted proposition is unchanged; the §4/§19 texts are proposed drafts recorded in this artifact only).

--- END VERBATIM CRC PUBLICATION REVIEW ---

---

**Reviewing-agent recommendation summary (outside the verbatim body):** CPR WITHHOLD — publication blocked pending (a) an Adoption recording in `GOVERNED-CLAIMS.md` with drafted `CRC Candidate Statement` + `CRC Publication Scope`, and (b) a `stability-ai` `CanonicalToolId` registration, after which a bounded in-sequence CPR reconsideration runs the mandatory synthetic-eligibility-canary against the real drafted text. Every substantive publication-safety dimension assessable pre-Adoption passed, including an independent primary-evidence re-verification that resolved `FGR_017`'s disclosed July-2024 freshness caveat. PM/JD concurrence: **PENDING** — not fabricated.

---

**Addendum, 2026-09-09, later session — CPR reconsideration / CRC APPROVE decision (this note, not `CPR_020`'s own verbatim body, per this folder's own "nothing inside that boundary is ever edited after the fact" discipline; mirrors `CPR_009`'s own addendum precedent exactly).**

Following the Adoption recording (`GOVERNED-CLAIMS.md`, commit `7fb461f`, PM/JD "ADOPTION APPROVED — STABILITY AI" with a revised final `CRC Candidate Statement` superseding this review's own §4 draft wording), a bounded in-sequence CPR reconsideration was performed, closing exactly the two blockers `CPR_020` §20 identified as items (1) and (2) (item (4), `stability-ai` CanonicalToolId registration, remains separately outstanding under Principle 7 and is explicitly not a CPR blocker).

**The mandatory synthetic-eligibility-canary was run for the first time against the real, now-Adopted claim** (not the ephemeral 3-override probe of `CPR_020` §12) — the real `RetrievalHandoffTool.identifier: 'stability-ai'` supplied directly as a resolved canonical string (retrieval-time `toolScopeMatches` performs a plain string check against already-resolved identifiers; it does not re-validate against the live `CanonicalToolId` registry, so this is the real identifier, not a stand-in). Four scenarios, mirroring the established 4-5-scenario pattern (`CPR_009`–`CPR_012`, `CPR_016`–`CPR_019`):

- **Tool present + matching `commercial_use` goal:** retrieved exactly the one claim; Bounded Interpretation status `relevant_applicability_unresolved` (Case 3B, never `directly_relevant`); all three `unresolved_project_dependencies` passed through unmodified; rendered exactly one `knowledge_item` containing the PM-approved statement verbatim, the fixed category-boundary hedge, and the standard Commercial Assurance CTA — zero fabricated project facts, zero scope bleed into Stable Chat/Stable Assistant, zero stronger conclusion than BI permits.
- **Tool present, no matching goal:** zero retrieved — tool presence alone does not fabricate topic relevance.
- **Matching goal, tool absent:** zero retrieved — fails closed via the standard "outside current coverage" fallback.
- **A different canonical tool present (`kling`):** zero retrieved — confirmed cross-provider isolation, no bleed.

**This empirically confirms, on the real claim rather than a predictive probe, exactly what `CPR_020` §12 anticipated:** the architecture correctly contains this claim at Case 3B with no layer strengthening. Independently re-ran `checkTopicClaimRepresentationReadiness()` (unchanged: `{"ready":false,"issues":[{"code":"invalid_tool_scope_entry","value":"stability-ai"}]}`) and `isDependencyAskableInCrc()` for all three dependencies (unchanged: `false` for all three) — both confirmed identical to `CPR_020`'s own findings, independently, not merely inherited.

**Publication Test** (`CRC-PUBLICATION-POLICY.md`: "Would I be comfortable having a prospect's legal team quote this exact sentence back to SI8?") applied to the PM-approved statement as actually recorded, not a friendlier paraphrase: **PASS** — every clause is directly source-traceable, the statement explicitly disclaims project-specific clearance, and the scope boundary against Stable Chat/Stable Assistant is stated plainly. No substantive rewrite required; the PM's own revision (replacing "for commercial purposes for free" with "royalty-free license ... subject to the Agreement's conditions") was itself the correction this Test would otherwise have called for.

**CRC Publication Scope finalized** (below, `GOVERNED-CLAIMS.md`) reuses `CPR_020` §19's own bounded shape, updated only to reflect the PM-approved statement wording and today's decision date — not broadened.

**Decision: CPR APPROVE.** Recorded inline in `GOVERNED-CLAIMS.md`'s own claim entry (`CRC Approver: JD (PM)`, `CRC Decision Date: 2026-09-09`, finalized `CRC Publication Scope`). `Lifecycle: Adopted` (unchanged), `crc_eligible: 'Yes'` (governance-layer only). **Resulting state: GOVERNED + CRC AUTHORIZED + NOT YET RUNTIME READY** — `stability-ai` remains unregistered as a `CanonicalToolId`, so this claim cannot yet actually be retrieved in a live conversation; that is a separate, later, purely mechanical remediation under Principle 7, not performed by this decision. No `TopicClaim` fixture entry was added — governance approval and runtime/conversational reachability remain independent, per this project's own established architecture finding.
