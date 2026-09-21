Title: Formal Governance Review #23 — Taiwan Copyright Act, TIPO Letter 電子郵件1140522c, AI-Assisted Output Copyrightability

Reviewed object:
- `CAND-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001` — first Taiwan-jurisdiction Living Knowledge candidate, arising from a jurisdiction-first discovery pass, a primary-source governance deep dive, and a primary evidence capture gate (all this same week). This review treats those prior milestones' conclusions as engineering evidence and hypothesis only, per each of their own explicit instructions, and independently re-derives every governance decision from the captured primary evidence and current production source.

Review date: 2026-09-21

Artifact type: Formal Governance Review (adoption stage) — the first Taiwan-jurisdiction FGR in this corpus. Reviews the candidate on its own primary evidence and on independent re-derivation of taxonomy, applicability, and dependency questions; does not accept the preceding deep-dive's or evidence-capture-gate's own conclusions on their say-so, including their proposed proposition wording and their (incorrectly characterized) description of the existing U.S. `copyrightability` claims' dependency shape — corrected in §5 below.

--- BEGIN VERBATIM FORMAL GOVERNANCE REVIEW ---

# Taiwan Copyright Act — TIPO Letter 電子郵件1140522c, AI-Assisted Output Copyrightability — Formal Governance Review

## 1. Authoritative source fidelity

Independently re-verified, not accepted on the evidence-capture gate's own manifest alone: independently recomputed SHA-256 of both captured files and confirmed exact match against `MANIFEST.md`:
- `tipo-1140522c_20260921T031630Z.html` → `c69ece034aa6da5856598d3729c4c45fc7f2e8feebc8bfa6996fbb1f0d7317c6`
- `moj-copyright-act-J0070017_20260921T031630Z.html` → `1b7e5f5891aa069035e27055b4fa16077235e431f3da59a6de4464edea50be85`

Independently spot-verified the raw HTML files contain the manifest's quoted Traditional Chinese substantive text as genuine page content (not manifest fabrication): confirmed the phrase "著作人於著作完成時享有著作權" (from paragraph 1) and "司法機關就個案具體事實調查證據認定" (from paragraph 4, the judicial-reservation clause) are both present verbatim in `tipo-1140522c_...html`, and confirmed Article 11 is present in `moj-copyright-act-J0070017_...html`.

Read the full four-paragraph substantive text (令函要旨) directly. Confirmed it establishes, in the letter's own words:
- Para 1: per Copyright Act Art. 3(1)(2) and Art. 10, "author" (著作人) means the person who creates a work, and a work must be a natural person's creation to be protected; whether AI-generated content is protected depends on whether there was actual human creative input (人類實際的創意投入) in the creative process.
- Para 2(1): where AI is used merely as an assisting tool (輔助工具) and actual human creative input exists, the resulting work may still be protected; ownership of that work's copyright belongs, in principle, to the person who actually created it (實際創作之人) — **except** where Copyright Act Art. 11 (employment relationship) or Art. 12 (commissioned relationship) applies.
- Para 2(2): where the creative process is completed entirely and independently by AI's own computational function (AI的演算功能獨立進行完成), with no human intellectual/creative input, the AI-generated content cannot be protected.
- Para 3: a separate, independently-numbered item on commercial use of AI-generated content potentially infringing a training-data work through substantial similarity (實質近似), recommending the user confirm authorization with the AI model's developer/operator — a training-data/third-party-rights concern, structurally distinct from paras 1–2's copyrightability analysis.
- Para 4: because copyright is a private right, whether a specific AI-generated image is protected, or infringes another's copyright, if disputed, must still be determined by the judicial authorities (司法機關) based on the specific facts of that individual case — an express reservation of concrete determinations to courts.

Independently cross-checked Copyright Act Arts. 3, 10, 11, 12 against the canonical `law.moj.gov.tw` capture directly (not solely against TIPO's own embedded quotation of them) — text confirmed identical between the two independently-fetched sources. No instance of the letter's own text being paraphrased more strongly than its actual wording was found in the evidence-capture gate's manifest quotation.

**Disposition: PASS.**

## 2. GoalCategory / KnowledgeTopic reuse — independently tested, not assumed

Confirmed directly against `08_Platform/app/lib/retrieval-engine/topic-claims-fixture.ts` (lines 238–301): the existing U.S. claims `CLAIM-COPY-001-v1`/`CLAIM-COPY-002-v1`/`CLAIM-COPY-003-v1` all use `topic: 'copyrightability'`; `CLAIM-COPY-004-v1` uses the separate `topic: 'copyright_ownership'`. Tested this candidate's user question ("does my AI-assisted output qualify for copyright protection under Taiwan law") against both: it is the same underlying question as COPY-001/002/003 (whether a category of AI-assisted output can be protected at all, keyed to human creative contribution), not COPY-004's distinct question (ToS permission vs. ownership, a question this candidate's evidence does not raise). **Decision: reuse `copyrightability` — no new GoalCategory, no new KnowledgeTopic.** The existing `GoalCategory` value already generalizes across jurisdictions (its own governed claims already carry a `jurisdiction` field distinguishing U.S.-federal claims from a `Global` one); nothing in Taiwan's evidence requires or justifies a jurisdiction-specific taxonomy fork. No `TopicRelationship` is proposed or required — this is an explicit-goal-reachable exact-topic match, identical in shape to the existing U.S. claims.

**Disposition: PASS.**

## 3. Copyrightability / ownership separation (independent test of the letter's own structure)

The letter's own para 2(1) contains, in one sentence, both the copyrightability rule (human creative input → may be protected) and an ownership-allocation exception clause (Arts. 11/12 override the default). Tested whether these should be folded into one composite claim ("human contribution → the user owns it") or kept structurally separate. **Rejected the composite form**: the letter's own "除有著作權法第11條...及第12條...之情形外" (except where Art. 11/employment or Art. 12/commission applies) is an explicit textual disclosure that ownership is NOT automatically resolved by the copyrightability determination — collapsing this into "you own it" would state something stronger than the source. **Decision: the proposition states copyrightability as its primary rule, and discloses the Art. 11/12 exception as an evidence limitation/boundary, not as an affirmative ownership conclusion.** A separate, dedicated Taiwan `copyright_ownership`-topic claim (mirroring `CLAIM-COPY-004-v1`'s own distinct ToS-vs-ownership question) is **not required now** — nothing in this letter raises COPY-004's specific question (platform-permission vs. legal ownership); if a distinct Taiwan ownership question is identified later, it would be a separate future candidate, not a reason to broaden this one.

**Disposition: PASS — no separate ownership proposition required; Art. 11/12 recorded as a limitation, not folded into an ownership conclusion.**

## 4. Jurisdiction / applicability semantics

Re-read `AssessmentJurisdictionMention`'s own doc comment directly — confirmed, as for every prior jurisdiction-gated claim this corpus has adopted, that it represents only "the jurisdiction the user asked CRC to consider," never a legal-attachment finding. `applicability_requirements: [{fact: 'jurisdiction', operator: 'equals', value: 'Taiwan'}]` is structurally identical in shape to `CLAIM-COPY-001-v1`'s own `United States` gate — no new `ApplicabilityFact`, no new evaluator branch, no `applicability_any_of`, and nothing in the letter's own text imposes any additional statutory applicability condition (no domicile, distribution, or server-location requirement is stated or implied by TIPO). This candidate is explicit-goal-reachable only (§7 below), so it carries no Article-50/NY-style relationship-routed unrestricted-reach exposure to solve.

**Disposition: APPLICABILITY APPROVED — `jurisdiction equals Taiwan`, request-scope gate only.**

## 5. Dependency semantic — independent re-derivation, correcting a material error in this milestone's own originating instructions

This milestone's own briefing asserted that the existing U.S. `copyrightability` claims (COPY-001/002/003) use a **zero-dependency** shape, and instructed this review not to default to zero merely by copying that (asserted) pattern. **That premise is factually incorrect, independently confirmed by direct source inspection**, and is corrected here rather than silently carried forward: `topic-claims-fixture.ts` lines 238–288 show all three existing U.S. copyrightability claims carry **exactly one dependency each**: `unresolved_project_dependencies: ['human_contribution_description']`. The actual precedent to test against is therefore "one dependency, `human_contribution_description`," not "zero."

Independently traced this dependency's actual runtime function rather than assuming its presence implies a resolvable legal-sufficiency determination. `08_Platform/app/lib/crc-engine/dependency-askability.ts` line 109-110 confirms `human_contribution_description` is the **one real, live registry entry** in the entire corpus with `treatment: 'askable_in_crc'` — handled by a dedicated, pre-existing module (`human-contribution-clarification.ts`), not the generic readiness path. `08_Platform/app/lib/bounded-interpretation/build-bounded-interpretation.ts`'s `shouldIncludeHumanContributionSentence()` confirms its actual effect: when (a) the matched goal's category is `copyright_ownership` or `copyrightability`, (b) a matched claim's `unresolved_project_dependencies` includes this exact string, and (c) `ProjectFacts.human_contribution_description` is confirmed, the function appends **one additional, fixed, non-interpretive sentence** (`humanContributionRelevanceSentence()`) echoing the user's own self-reported description back to them, immediately followed by the same never-omitted "CRC can't determine... legal threshold" boundary every other template carries. Critically: this mechanism does **not** remove the dependency from the array, does **not** change `BoundedInterpretation.status` away from `relevant_applicability_unresolved` (Case 3B), and does **not** ever mark the dependency "resolved" in the sense of unlocking `directly_relevant` — confirmed via `hasGovernedProjectDependencies(match) = match.unresolved_project_dependencies.length > 0`, a pure, static array-length check with no code path anywhere that clears an entry based on `ProjectFacts` state. This is the identical structural finding this corpus has already independently confirmed twice this month for other domains (Trademark, per `CPR_027`: "unresolved always, under the current governed evidence model"; the superseded Third-Party Copyright composite, per `FGR_022` §5) — non-empty `unresolved_project_dependencies` is a **permanent, claim-level classification**, never a per-session resolvable state, for any dependency in this corpus including this one.

Given this corrected understanding, independently re-applied the first-principles test this milestone itself demanded (not deferring to precedent merely because it matches): does resolving `human_contribution_description` let BI reach a stronger **permitted** conclusion under Taiwan's standard? **No** — the letter's own para 4 expressly reserves concrete sufficiency/protection determinations to judicial review; H5's own mechanism is deliberately, explicitly scoped to never mark anything resolved or state a legal conclusion. The dependency's actual, sole function is the bounded echo-only augmentation described above — a genuine, narrow, already-reviewed, already-safe UX feature, not a resolution mechanism. Independently tested whether reusing it for Taiwan is justified on its own merits (not merely to match the U.S. shape reflexively): the underlying project fact (`ProjectFacts.human_contribution_description`) is jurisdiction-agnostic — it is the same generic "describe your own creative contribution" fact TIPO's own para 1/2(1)/2(2) analysis turns on exactly as USCO's does — and `shouldIncludeHumanContributionSentence()`'s own gating is keyed to **`category` (`copyrightability`/`copyright_ownership`), never to a specific claim ID or jurisdiction**, so listing this dependency on the Taiwan claim activates the existing, unmodified, already-safe mechanism automatically, with zero code change. Declining to include it would create an unexplained asymmetry between two claims under the identical `copyrightability` category answering structurally the same underlying question, for no principled reason grounded in the evidence.

**Decision: D1 — ONE dependency, `human_contribution_description`, reusing (not creating) the existing registered dependency and its existing, already-reviewed H5 echo mechanism.** This is independently derived from Taiwan's own evidence (the letter's own human-creative-contribution test and its own express reservation of sufficiency to courts), not inherited from the U.S. shape by default, and it corrects the zero-dependency premise this milestone's own briefing incorrectly asserted.

**Disposition: D1 — ONE DEPENDENCY (`human_contribution_description`) APPROVED; corrects a factual error in the originating brief.**

## 6. Bounded Interpretation ceiling — Case 3B, not `directly_relevant`

Because §5 establishes a non-empty `unresolved_project_dependencies`, `hasGovernedProjectDependencies` evaluates true for this claim **unconditionally, forever** (not merely "until resolved" — see §5's own finding that resolution is not a reachable runtime state). This claim will therefore always render via `relevant_applicability_unresolved` (Case 3B) once the Taiwan jurisdiction gate is satisfied — the governed statement quoted verbatim, the fixed Case-3B hedge ("there isn't enough project-specific information to determine how it applies to your specific project"), the Commercial Assurance bridge sentence, and — only when `human_contribution_description` happens to already be confirmed from earlier conversation — the additional H5 echo sentence. It will **never** reach `directly_relevant`. This is the identical rendering shape already in production today for `CLAIM-COPY-001/002/003-v1`, independently re-confirmed by this review's own reading of the same code (§5), not merely asserted by analogy.

Explicitly tested for overstatement risk: no code path in `build-bounded-interpretation.ts` or `rules.ts` permits Case 3B's rendering, with or without the H5 echo sentence, to be read or strengthened into: this output is/is not protected by copyright; the user's contribution is legally sufficient; the user is the author; the user owns the economic rights; the client owns the economic rights; a specific commission/employment arrangement resolves ownership in this case; infringement occurred or did not occur; third-party rights are cleared; commercial use is cleared. The H5 sentence itself is templated, fixed-form, and explicitly caps with "but CRC can't determine from this conversation whether your described contribution meets that legal threshold" — it echoes, it never adjudicates.

**Disposition: PASS — no HOLD-triggering condition found; the universal project-specific boundary remains authoritative; no Composition change needed or proposed.**

## 7. Dependency askability status

Confirmed directly against `dependency-askability.ts`'s registry: `human_contribution_description` → `{ treatment: 'askable_in_crc' }`, handled entirely by the pre-existing `human-contribution-clarification.ts` module (unchanged, not migrated to any generic path, per that file's own header). This is a **reuse of an existing, already-governed, already-safe askable dependency** — no new registry entry, no new askability decision, no new question wording is created by this review. Confirmed none of the following is, or is proposed to be, askable: "Is your contribution sufficiently creative?"; "Are you the author?"; "Do you own the copyright?"; "Would a Taiwan court recognize protection?" — the one existing askable question (a bounded, open-ended self-report of the user's own described contribution) is unchanged and pre-approved.

**Disposition: PASS.**

## 8. Third-party rights / training-data boundary (Task J)

The letter's para 3 (commercial-use/training-data substantial-similarity infringement) is **not** incorporated into this candidate's proposition. Consistent with this corpus's existing, already-adopted separation between `copyrightability`/`copyright_ownership` (can copyright subsist in the user's own output) and the standalone `CLAIM-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001-v1` (does the user's output implicate someone else's copyright), para 3's material is recorded here only as:

**FUTURE GOVERNANCE CANDIDATE (not developed by this review):** a possible future Taiwan third-party-copyright claim, paralleling the existing U.S. claim's shape, grounded in this same letter's para 3 plus (if pursued) the Copyright Act's own infringement provisions — out of scope for this FGR, not to be folded into TW-COPY-1's proposition or evidence set.

**Disposition: PASS — third-party/training-data material correctly excluded from this candidate; recorded as a future candidate note only.**

## 9. Draft-guidance watchlist boundary

The deep-dive milestone identified a draft "生成式人工智慧著作權指引(初稿)" (Generative AI Copyright Guidelines, draft) confirmed still in public-hearing status (hearing 2026-07-20, minutes posted 2026-08-03) — not operative law or operative official interpretation. This review does not rely on it for any part of the proposition, applicability, dependency, or BI-ceiling decision above, and records it only as:

**WATCHLIST / REFRESH CONTEXT** — relevant to a future revalidation of this claim if and when it is finalized, not current authority.

**Disposition: PASS — draft material correctly excluded from the governed proposition.**

## 10. Refresh/provenance basis

The evidence-capture gate's `MANIFEST.md` already records: canonical source URLs, issuing authority (TIPO; Ministry of Justice for the statute), document/reference number (電子郵件1140522c), publish date (2025-05-22) distinct from a disclosed later page-update date (2025-07-02), capture method (raw `curl`, no AI summarization), Class A evidence tier, and SHA-256 checksums for both files. This satisfies the existing Evidence Capture SOP's refresh-readiness baseline exactly as already proven for every other domain in this corpus (checksum-comparison on a future re-fetch is the complete mechanism) — no new field, schedule, or stale-state concept is introduced or required.

**Disposition: PASS.**

## 11. Commercial Assurance handoff

Re-read `guidance.ts`'s current Domain I text directly (unchanged since `FGR_022`'s own independent verification this same week) — confirmed strictly observational: "Declarations are not sufficient — the reviewer must form an independent opinion." No repository artifact states Domain I, or Commercial Assurance generally, adjudicates legal copyrightability or ownership under Taiwan law any more than under U.S. law. This candidate does not convert any CAA control into an LK dependency.

**Disposition: PASS.**

## 12. Explicit-vs-discovered distinction (Task K)

No Track A trigger, no `ContentPresenceCategory`, no `TopicRelationship`, and no new structured project fact are proposed or created by this review. This candidate is explicit-goal-only, reached via the existing, unmodified exact-topic `lookupTopicClaims` path under the reused `copyrightability` category — identical in shape to the existing U.S. claims. Nothing in the letter's own text, and nothing in existing generic architecture, was found to justify discovered relevance for this candidate; future discovered relevance, if ever justified, would require independent governance review and is explicitly not designed here.

**Disposition: EXPLICIT ONLY APPROVED.**

## 13. Provider scope (Task L)

The proposition concerns Taiwan copyrightability generally — it does not depend on, name, or presuppose any specific AI tool or provider. `provider_scope: null`, `tool_scope: null` — matching the existing U.S. copyrightability claims' own generic (non-provider-scoped) shape.

**Disposition: PASS.**

## 14. No fabricated UserGoal / no candidate-specific orchestration

The reused `copyrightability` `GoalCategory` reaches the existing, unmodified exact-topic path exactly as it already does for the U.S. claims — no synthetic goal-construction logic, no Taiwan-specific Retrieval branch, no Taiwan-specific Composition, and no Taiwan-specific BI code are proposed, authored, or required.

**Disposition: PASS.**

## 15. Fail-closed behavior

Confirmed: unresolved or non-Taiwan jurisdiction → excluded via the existing, unmodified applicability mechanism; the one dependency (`human_contribution_description`) is either confirmed (adds the H5 echo, still Case 3B) or unconfirmed (plain Case 3B) — no state exists in which this claim's rendering could silently strengthen; no self-attestation path exists for any prohibited conclusion (§6).

**Disposition: PASS.**

## 16. Consultative Composition boundary

Verified only, not modified: the governed proposition (§1/§3), the fixed Case-3B template with its optional H5 echo (§6), the Domain I handoff (§11), and the explicit prohibited-conclusions list (§6) together give a future Consultative Composition layer sufficient governed structure to explain relevant context and the Commercial Assurance escalation path, without this review adding, removing, or reshaping any dependency, weakening BI, or strengthening the ceiling for prose quality.

**Disposition: PASS.**

## 17. Adversarial review

| Attack | Finding |
|---|---|
| Source fidelity / manifest fabrication | Not found — checksums independently recomputed and matched; quoted Chinese text independently spot-verified present in the raw HTML (§1) |
| Proposition overreach ("human contribution → protected and owned") | Not found and specifically rejected — Art. 11/12 exception preserved as a limitation, not folded into an ownership conclusion (§3) |
| Zero-dependency default accepted merely because it matches (an asserted) U.S. shape | Not found — the asserted U.S. shape was itself independently found to be factually wrong (U.S. claims carry one dependency, not zero) and corrected; D1 was independently re-derived from Taiwan's own evidence, not inherited (§5) |
| Dependency justified merely to mirror precedent, without independent reasoning | Specifically checked — rejected as insufficient on its own; the actual justification is the dependency's identical, jurisdiction-agnostic underlying fact and the pre-existing, already-safe, category-keyed H5 mechanism (§5) |
| `human_contribution_description` treated as a sufficiency-resolving mechanism | Specifically checked — not found; H5 never marks the dependency resolved and never states a legal conclusion (§5/§6) |
| `directly_relevant` reachable or misread as a project-specific determination | Specifically checked — not reachable at all given D1 (§6); Case 3B's own fixed template cannot be strengthened by any downstream layer |
| Third-party/training-data material folded into TW-COPY-1 | Not found — para 3 explicitly excluded, recorded only as a future candidate note (§8) |
| Draft 2026 Guidelines used as current authority | Not found — explicitly excluded, recorded as watchlist only (§9) |
| New GoalCategory/KnowledgeTopic invented for Taiwan | Not found — existing `copyrightability` reused; rejected as unnecessary (§2) |
| Self-attestation risk / new askable question invented | Not found — reuses the one existing, already-approved askable dependency verbatim (§7) |
| Commercial Assurance overstatement | Not found — re-verified directly against current `guidance.ts` text (§11) |
| Legal-advice implication | Not found anywhere in the proposition, evidence limitations, or BI ceiling |

**No unresolved substantive defect found.**

## 18. Final disposition

**ADOPT.** Every review point (1–4, 6–16) passes on this review's own independent re-derivation. §5 (dependency semantic) — the point this milestone's own briefing most specifically flagged as requiring independent, non-inherited adjudication — surfaced and corrected a factual error in that briefing's own premise (the existing U.S. copyrightability claims carry one dependency, `human_contribution_description`, not zero) and independently re-derived D1 as correct for Taiwan on its own evidentiary merits, not by copying the corrected precedent reflexively.

**Proposed candidate contract for PM Adoption review:**

- **Proposed claim ID:** `CLAIM-COPYRIGHT-TW-AI-ASSISTED-OUTPUT-001-v1` (subject to confirmation at Adoption).
- **Proposition (draft, not yet PM-approved wording):** "Under Taiwan Copyright Act Article 3 (definitions of 'work'/'author') and Article 10 (copyright vests in the author upon completion of a work), and per the Taiwan Intellectual Property Office's official interpretation (TIPO letter 電子郵件1140522c, 2025-05-22), where a human exercises genuine creative input in producing AI-assisted output — using AI merely as an assisting tool — the resulting work may be eligible for copyright protection; where the output is generated entirely and independently by the AI's own computational function with no human intellectual/creative input, it is not eligible for copyright protection. Ownership of a protected work's economic rights is further governed separately by Copyright Act Articles 11 (employment relationships) and 12 (commissioned relationships), and does not automatically follow from the copyrightability determination alone. Whether copyright protection or infringement exists in a specific, disputed case is reserved to judicial determination on the facts of that case."
- **GoalCategory / KnowledgeTopic:** reuse existing `copyrightability` (no new category).
- **Jurisdiction:** Taiwan.
- **Applicability:** `[{fact: 'jurisdiction', operator: 'equals', value: 'Taiwan'}]` — request-scope gate only.
- **provider_scope / tool_scope:** `null` / `null`.
- **Dependencies:** `['human_contribution_description']` — reuse of the existing registered, askable dependency; no new dependency created.
- **Askability:** the existing `askable_in_crc` entry for `human_contribution_description`, unchanged; no new question authored.
- **Reachability:** explicit-goal-only; no Track A, no `ContentPresenceCategory`, no `TopicRelationship`.
- **BI ceiling:** Case 3B (`relevant_applicability_unresolved`) always, with the existing H5 echo sentence when `human_contribution_description` is confirmed; never `directly_relevant`.
- **Evidence basis:** `evidence-captures/taiwan-copyrightability/tipo-1140522c_20260921T031630Z.html` (primary interpretive anchor) and `.../moj-copyright-act-J0070017_20260921T031630Z.html` (statutory basis, Arts. 3/10/11/12), per `MANIFEST.md`.
- **Explicitly excluded from this candidate:** third-party/training-data infringement material (para 3) — recorded as a future governance candidate note only; the draft 2026 Generative AI Copyright Guidelines — watchlist only.

**This FGR's ADOPT recommendation does NOT itself constitute PM Adoption.** Entry into `GOVERNED-CLAIMS.md`, `Lifecycle: Adopted` becoming actual, `CRC Eligible` status, CRC Publication Review, and production representation each remain separate, later, explicitly-authorized steps. This review changes no field in `GOVERNED-CLAIMS.md` and creates no production representation.

--- END VERBATIM FORMAL GOVERNANCE REVIEW ---
