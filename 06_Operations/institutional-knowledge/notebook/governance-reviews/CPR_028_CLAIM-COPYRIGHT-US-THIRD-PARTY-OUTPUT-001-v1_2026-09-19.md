Title: CRC Publication Review #28 — U.S. Copyright, 17 U.S.C. §§ 106 & 501 Third-Party Material in Output Rule

Reviewed object:
- `CLAIM-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001-v1` (`GOVERNED-CLAIMS.md`; `Lifecycle: Adopted`, `FGR_022`)

Review date: 2026-09-19

Artifact type: CRC Publication Review / Decision Analysis — the first Copyright-third-party-output-domain CPR. Distinct from, and does not reopen, `FGR_022` (claim Adoption, 2026-09-18), which this review re-reads fresh rather than accepting on precedent alone, per this milestone's own explicit instruction not to merely inherit the FGR verdict.

PM decision: **APPROVE (2026-09-19, PM: JD).** `CRC Eligible` recorded as `Yes` at the governance-ledger level (`GOVERNED-CLAIMS.md`'s own `CRC Publication Scope`/`CRC Approver`/`CRC Decision Date` fields) in this same governance-recording task. No production `TopicClaim` fixture entry, `GoalCategory` enum value, or any runtime path is created or activated by this review — that remains a separate, later, explicitly-authorized production-representation milestone, mirroring the Trademark/Article 50 precedent of decoupling Publication approval from runtime activation.

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY once a PM decision is recorded. Future amendments should be appended outside the body below, or captured in a new review artifact.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# U.S. Copyright — 17 U.S.C. §§ 106 & 501, Third-Party Material in Output — CRC Publication Review

## A. Repository gate

Worktree `C:\Users\User\Desktop\si8-lk-third-party-copyright-discovery`, branch `work/lk-third-party-copyright-discovery`. HEAD/`origin/main` both `b4abd255207f319b4dcb5f0a2e607b6dd4337699`, 0/0 ahead-behind — zero drift confirmed via fresh `git fetch` immediately before this review. `GOVERNED-CLAIMS.md`'s local (uncommitted) modification confirmed to contain ONLY the authorized PM Adoption entry for `CLAIM-COPYRIGHT-US-THIRD-PARTY-OUTPUT-001-v1` (112-line pure append, `git diff` inspected directly) — no other tracked file touched. Production state confirmed directly, not from memory: a repository-wide search for `third_party_copyright` / `CLAIM-COPYRIGHT-US-THIRD-PARTY` inside `08_Platform/` returns zero matches — no `TopicClaim` fixture entry, no `GoalCategory`/`GOAL_CATEGORIES` change, and no `KNOWLEDGE_ONLY_TOPICS` change exist anywhere for this claim.

## B. Publication contract re-derived

Re-read fresh: `CRC-PUBLICATION-POLICY.md` (all seven principles), `governance-reviews/README.md`'s naming/verbatim discipline, and the closest structural precedent — `CPR_027` (Trademark, Lanham Act §1125(a)(1), APPROVE, no wording edit; the closest sibling domain: a third party's protected material appearing in the user's own commercial output, reached explicit-goal-only, `provider_scope: null`, `jurisdiction = United States` request-scope gate). Confirmed the actual next valid CPR number by listing the governance-reviews directory directly (not trusting the stale `README.md` index, which stops at `#12` and omits `CPR_013`–`CPR_027` entirely — a pre-existing staleness independently re-confirmed here, not repaired, per this task's own explicit instruction not to broaden into index housekeeping): highest existing file is `CPR_027`, so `CPR_028` is correct. Neither `Lifecycle: Adopted` alone, nor Bounded Interpretation runtime safety, is itself sufficient for `Yes` — this review does not infer Publication eligibility from either, consistent with `CPR_025`'s/`CPR_027`'s own stated discipline (Principle 1).

## C. FGR_022 / Adoption-entry cross-check — not accepted on say-so

Read `FGR_022` in full and the exact Adopted `GOVERNED-CLAIMS.md` entry (lines 4571–4682 of the pre-review file) in full, then independently re-verified rather than trusted:
- **Evidence integrity**: re-ran a fresh SHA-256 checksum on both captured PDFs myself this review — `56f13a529cda7e76ea0b1ee77fda3d0ce4bf428a11c9deb2f5dd39949419a79e` (§106) and `06c69f9ef721a8ed17c4373fcb407e8ec4385b8a6484e463ca677eabb2664fb3` (§501(a)) — both match the manifest and the Adopted entry's own `Source references` exactly.
- **Adopted-entry ↔ FGR_022 consistency**: the proposition text, applicability contract, zero-dependency decision, `provider_scope: null`, and prohibited-conclusions list in the Adopted entry match FGR_022's own findings word-for-sense (not a verbatim copy, but no substantive divergence found). **No material unsupported conclusion or FGR/Adoption divergence found — proceeding, not HOLDing on this ground.**
- **Taxonomy re-confirmed independently a fourth time** (candidate package §7 → FGR_022 §I/§J → PM Adoption review → this CPR): `third_party_copyright` remains absent from `GOAL_CATEGORIES` (§A above); the claim's own `Domain`/`Context`/`Claim proposition` fields are semantically distinct from both `copyright_ownership`/`copyrightability` (the user's own authorship) and `third_party_source_rights` (named-provider licensing) — no taxonomy defect found at this stage either.

## D. Claim wording safety

1. **Bounded enough for CRC?** Yes — states the general rule (rightsholder, the two named exclusive rights, the "subject to limitations" disclosure, the infringement/liability consequence) without characterizing any specific output.
2. **Safe to present as educational guidance?** Yes — no clause asserts a project-specific finding; the Candidate Statement's own closing sentence ("This is a separate legal question from whether your own AI-assisted output is itself copyrightable") affirmatively distinguishes this claim from the adjacent `copyright_ownership`/`copyrightability` claims rather than blurring into them.
3. **No project-specific infringement/copying/derivative-work/authorization/ownership/validity conclusion?** Re-tested clause-by-clause against the Candidate Statement — clean; every clause uses general framing ("holds exclusive rights," "can create... liability," never "this output," "your video," or "was/is").
4. **No implied registration requirement where none exists?** Confirmed — §106/§501 impose no registration precondition on the exclusive rights or the infringement cause of action (registration is a §411 precondition to filing suit, not to the underlying right or violation, and is correctly never mentioned in the claim); neither the Adopted proposition nor the draft Candidate Statement asserts or implies one.
5. **No implied territorial-applicability conclusion from the jurisdiction gate?** The Candidate Statement itself does not mention jurisdiction at all — the applicability gate operates entirely upstream of rendering (Retrieval inclusion only), and the fixed Composition template's own closing clause ("though it doesn't by itself determine the answer for your specific project") independently prevents this regardless of wording (re-verified against `rules.ts` directly, §F below). The published `CRC Publication Scope` text (§M) additionally states this explicitly, mirroring the Trademark/NY/Article-50 "even merely mentioning" precedent.
6. **Evidence limitations clear?** Yes — the Adopted record and evidence manifest both plainly disclose that §§107-122 (fair use and the other limitations) were not independently captured or characterized, that no substantial-similarity case law was sought, and that AI-training-data material is out of scope.
7. **Unresolved dependency sufficient to fail closed?** N/A by design — this claim has `unresolved_project_dependencies: []` (D0), not a Case-3B-triggering dependency; this is the load-bearing publication-safety question for this specific claim and is tested on its own terms in §E/§G below, not assumed safe merely because a hedge exists.

**Claim wording classification (Publication Test — would SI8 be comfortable having a prospect's legal team quote this exact sentence back): PASSES.**

## E. Applicability representation

Independently re-derived from `types.ts` (`AssessmentJurisdictionMention`'s own doc comment, lines 341–360: "the jurisdiction the user asked CRC to consider," explicitly and categorically distinguished from any "legal establishment determination," "deployer... status determination," or "regulatory/statutory applicability conclusion of any kind") and `lookup-topic-claims.ts`, not accepted from `FGR_022` alone: `applicability_requirements: [{fact:'jurisdiction', operator:'equals', value:'United States'}]`, structurally identical to `CLAIM-COPY-001-v1`'s and `CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1`'s own already-published gates. This claim has **no relationship-routed reach exposure at all** — it is explicit-goal-only reachable from the outset (no `TopicRelationship` exists or is proposed), so the Article-50-style unrestricted-global-reach problem `CPR_026` needed a remedy for does not arise here. Checked directly, not assumed absent.

## F. Bounded Interpretation — empirical re-confirmation (CRITICAL GATE — zero-dependency publication safety)

Re-derived directly against current production source (`build-bounded-interpretation.ts`), not accepted from `FGR_022`, the Dependency Semantics Challenge, or any prior session's own conclusion:

```
function hasGovernedProjectDependencies(match: BiResult): boolean {
  return match.unresolved_project_dependencies.length > 0
}
function needsApplicabilityHedge(match: BiResult): boolean {
  return hasGovernedProjectDependencies(match) || hasUnresolvedApplicability(match)
}
```

With `unresolved_project_dependencies = []` (empty array, D0), `hasGovernedProjectDependencies` is `false`. Once the jurisdiction gate resolves (`United States`, matched), `needsApplicabilityHedge` is `false`, and the claim reaches **`directly_relevant`**, rendered via `directlyRelevantSummary` (`rules.ts`): the Candidate Statement, quoted verbatim, followed by the fixed, universal, domain-blind boundary clause — re-read directly at `rules.ts:141`: *"though it doesn't by itself determine the answer for your specific project."*

Traced the full path per this milestone's own §7 instruction: explicit `third_party_copyright` goal → `lookupTopicClaims` exact-topic match (once represented) → `jurisdiction = United States` applicability gate → zero dependencies → `directly_relevant` → `directlyRelevantSummary`. At no point does any code path insert language implying the user's specific project satisfies the factual/legal predicates of infringement, reproduction, or a derivative work — the boundary clause is fixed, non-domain-interpolated text, structurally identical for every `directly_relevant` claim regardless of topic. This is empirically consistent with the already-adopted, already-CRC-Eligible, zero-dependency `CLAIM-ADOBESTOCK-AI-STUDIO-AI-STUDIO-COMMERCIALLY-SAFE-LABEL-001-v1` precedent (`CPR_012`), which canary-confirmed exactly this mechanism for a more complex, branching proposition. **No boundedness hole found. The generic architecture does not permit a stronger conclusion than the governed claim intends — no HOLD triggered on this gate.**

## G. Composition compatibility

Re-derived directly against `rules.ts`: the fixed, domain-blind template mechanism (`directlyRelevantSummary`) never produces "therefore"/"answers"/"cleared" framing for any domain — confirmed by that file's own module header comment, which names "copyright, likeness, trademark, disclosure" explicitly as domains this rule already anticipated (re-read at `rules.ts:12-15`). No Copyright-third-party-specific Composition change is needed or proposed.

## H. Dependency askability — re-confirmed against current source

`getAskabilityEntry` lookups against `dependency-askability.ts`'s own current registry return `undefined` for any key related to this claim (there is none to look up — D0, zero dependencies) — confirmed by direct grep of the registry file for `copyright`/`unauthorized_reproduction`, zero matches. Fail-closed by construction and moot by design: publishing this claim makes no question askable, and none is proposed. Independently re-confirmed the historical D1 composite dependency (`unauthorized_reproduction_or_derivative_use_of_third_party_work`) — considered and rejected across three prior stages of this candidate's history (candidate package §8-REVISED, FGR_022, PM Adoption) — remains correctly absent from the Adopted entry; this review does not restore it, per this milestone's own explicit instruction, having independently re-confirmed no BI-permitted conclusion delta exists for it (§F above; the fixed template already forecloses the stronger conclusions regardless of dependency presence).

## I. Explicit-vs-discovered treatment

Confirmed: no `TopicRelationship`, no Track A trigger, no `ContentPresenceCategory`, no fabricated `UserGoal` exists anywhere for this claim. Publication activates nothing beyond the (not-yet-implemented) explicit-goal path this claim's own `topic` value is designed for.

## J. Governed taxonomy vs. production taxonomy — publication-eligibility-before-runtime-reachability

`CRC-PUBLICATION-POLICY.md` Principle 7 (re-read directly, not paraphrased from memory): *"`CRC-Eligible` concerns whether a specific governed proposition is approved for the unsupervised CRC channel... entirely independent of whether ordinary language currently resolves to the canonical tool/provider identity the proposition references. A claim may legitimately be `CRC Eligible: Yes` before its associated identity is conversationally runtime-ready."* This is squarely on point and is the actual, established, repeatedly-applied precedent (`CPR_007` §3's own quoted finding; `CPR_009`/`CPR_010`/`CPR_011`; and, most directly on point, `CPR_027` itself for Trademark's own not-yet-implemented `trademark` `GoalCategory`, approved the same way one day before this claim's own Adoption). **This CPR may, and does, approve `CRC Eligible: Yes` while the claim remains explicitly recorded as NOT YET LIVE / NOT YET RUNTIME REACHABLE** — production representation (`GOAL_CATEGORIES` addition, `TopicClaim` fixture entry) is a separate, later, explicitly-authorized milestone. Nothing in this review adds `third_party_copyright` to any production type.

## K. Output-vs-training boundary

Re-confirmed: the Adopted proposition and draft Candidate Statement are production-method-agnostic — they describe the copyright owner's exclusive rights and the infringement consequence in the abstract, never conditioned on how the allegedly-infringing copy was produced (AI-generated, hand-drawn, or otherwise). Cross-checked against `SI8-Reviewer-Manual-v0.3.md` Domain I's own explicit bracketing of AI-training-data liability as a separate, un-auditable residual risk, never a control-passable fact — the same boundary this claim's own evidence manifest discloses (`MANIFEST.md`: "AI-training-data litigation material... deliberately excluded"). No generic retrieval/projection mechanism conflates output-side and training-side propositions (they would require entirely separate claims to exist in `GOVERNED-CLAIMS.md` in the first place — none does for training-data theories). **Boundary preserved; no HOLD triggered.**

## L. Commercial Assurance boundary

Re-checked directly against `guidance.ts`'s own Domain I text (not accepted from `FGR_022` alone) — line 99: *"Watch the content directly for I01 and I03. Declarations are not sufficient — the reviewer must form an independent opinion."* Line 101 (I01 specifically): *"Architecture, visual art, distinctive product designs, characters, and iconic set pieces can all carry copyright. Incidental capture... is different from deliberate depiction. Note both but assess differently."* Confirmed strictly observational, never adjudicative — no sentence in `guidance.ts` states or implies that Domain I01 review constitutes a legal infringement determination. The approved `CRC Publication Scope` text (§M) states the boundary correctly: CRC explains the general rule; Commercial Assurance (Domain I01) performs human observation and evidentiary note-taking; neither performs legal infringement adjudication. Domain I01 is not converted into a dependency or a CRC self-attestation question by this claim or this review.

## M. Consultative Composition boundary

Consultative Composition is a separate, active workstream. This review inspected current Composition behavior (§F/§G) only to answer whether the governed publication boundary can be preserved under existing code — it can, without modification. No Composition redesign, no domain-specific composer, no dependency added for rhetorical effect, and no BI weakening for readability is proposed or performed by this review.

## N. Static-dependency architecture observation — disposition

`FGR_022`'s recorded observation (`unresolved_project_dependencies` functions as a static, governance-authored, claim-level classification rather than a dynamically resolvable project-state mechanism — independently re-confirmed true of `CLAIM-TRADEMARK-US-LANHAM-CONFUSION-001-v1`'s own dependency per `CPR_027`'s own text, "unresolved (always, under the current governed evidence model)") is **CONFIRMED / SEPARATE ARCHITECTURE FOLLOW-UP**. It does not block this publication: this claim's own D0 (zero-dependency) design means the observation is not even load-bearing for this specific claim's publication safety (§F already shows `directly_relevant` is safe on its own terms via the fixed boundary clause, independent of whether dependencies are statically or dynamically resolved). Not redesigned, not remediated, Trademark not reopened.

## O. Fail-closed scenario review

| Scenario | Expected behavior |
|---|---|
| A. Explicit `third_party_copyright` goal, jurisdiction = United States | Claim retrieved (once represented in production); BI = `directly_relevant`; fixed boundary clause + Commercial Assurance CTA shown |
| B. Explicit `third_party_copyright` goal, jurisdiction unresolved | Applicability gate unresolved → excluded from `matches[]` (existing fail-closed mechanism, unmodified) |
| C. Explicit `third_party_copyright` goal, jurisdiction ≠ United States (e.g. stated non-US) | Gate `not_met` → excluded |
| D. No explicit `third_party_copyright` goal | Claim never a candidate — no exact-topic match, no relationship exists to reach it any other way |
| E. Claim later superseded (hypothetical) | Existing `superseded_by`/version-lineage mechanism applies unmodified — no copyright-specific bypass exists or is proposed |
| F. Evidence later found stale (hypothetical) | §106/§501 are long-settled federal statutes with no pending amendment identified; existing `Effective date`/`Last reviewed` fields and Principle 6 (stability over novelty) govern re-review timing, unmodified by this claim |

All six states derive from existing, unmodified generic Retrieval/BI/Lifecycle behavior — no new architecture required to support any of them.

## P. Adversarial review

| Attack | Finding |
|---|---|
| Source fidelity slipping between Adoption and Publication | Not found — proposition and source references unchanged since `FGR_022`; checksums independently re-verified this review (§C) |
| Registration-requirement implication | Not found — neither §106 nor §501(a) conditions the right or the infringement cause of action on registration; claim text does not imply one |
| Territorial-applicability overclaim from the jurisdiction gate | Not found — no mention in the Candidate Statement; independently, structurally foreclosed by the fixed Composition template regardless (§F/§G) |
| Zero-dependency overclaim risk (does `directly_relevant` imply infringement/copying/derivative-work established?) | Not found — the fixed universal boundary clause discharges the same epistemic-honesty function a dependency-triggered hedge would, empirically consistent with the Adobe Stock zero-dependency precedent (`CPR_012`); re-traced end-to-end against current source, not assumed safe by analogy alone |
| Commercial Assurance overclaim | Not found — re-verified against `guidance.ts` directly (§L) |
| **Principle 3 (subject-sensitivity gate) applicability** — the CLAUDE.md project-level "No List" separately names "explicit IP imitation (copyrighted characters, brands)," adjacent in spirit to this claim's own subject matter | **Tested explicitly, not silently assumed inapplicable.** `CRC-PUBLICATION-POLICY.md` Principle 3's own text names its No-List boundaries exhaustively as *"likeness, voice cloning, deepfakes, political persuasion"* — four specific subjects, not a general reference to the broader CLAUDE.md No List. `FGR_008`'s own established interpretive rule (re-read directly, not paraphrased from memory) is that Principle 3's gate is "keyed to subject matter... the claim's own topic... named explicitly in Principle 3's own text" — i.e., the test is whether the reviewed claim's own governed topic is one of the four literally-named subjects. `third_party_copyright` (like `trademark`, its structurally closest sibling, silently and correctly not gated by `CPR_027`) is not among them. Applying `FGR_008`'s own rule consistently: **Principle 3 does not gate this claim.** This is independently reasoned here, not inherited from `CPR_027`'s silence on the point — `CPR_027` did not visibly test this question at all, so its own non-gating outcome is confirmatory precedent, not binding authority, for this independent conclusion. |
| Approving publication merely because Adoption/FGR_022 was thorough | Explicitly guarded against — every finding above (§C, §E, §F, §H, §K, §L) was independently re-derived against current production source and current governance-policy text, not inherited from `FGR_022` or any prior session's conclusion on say-so |

**No unresolved substantive defect found.**

## Q. Disposition

**APPROVE.** No wording edit required — the Candidate Statement and publication-scope boundary text pass the Publication Test as drafted. `CRC Eligible: Yes` recorded at the governance-ledger level only; production representation (`GoalCategory`/type implementation, `TopicClaim` fixture entry) remains a separate, later, explicitly-authorized milestone — this claim is publication-approved but not yet runtime-reachable by any CRC user until that separate milestone occurs. This approval does not constitute project clearance, legal advice, evidence verification, or a Commercial Assurance Assessment.

--- END VERBATIM CRC PUBLICATION REVIEW ---
