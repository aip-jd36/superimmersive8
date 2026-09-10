Title: CRC Publication Review #25 — NY GBL § 396-b Synthetic Performer Disclosure

Reviewed object:
- CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1

Review date: 2026-09-10

Artifact type: CRC Publication Review / Decision Analysis (publication stage — asks whether this already-Adopted claim may additionally become `CRC Eligible: Yes`; distinct from Formal Governance Review #18, which reviewed this same object for Adoption only — see `FGR_018_CAND-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001_2026-09-10.md`). First CRC Publication Review of this claim; second CPR of the Likeness/New-York-statutory domain family after `CPR_008` (which withheld the sibling claim, `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1`, under Principle 3). Exercised a real, unmodified generic Synthetic Eligibility Canary run (`runSyntheticEligibilityCanary` + direct `retrieve()` calls) against a test-only, hand-transcribed representation of this claim's real governed fields, deleted immediately after the run — no persistent repository change.

Reviewing-agent recommendation: **APPROVE WITH BOUNDED WORDING** (§ U/§ AB below, using § S/§ T's exact proposed wording).

PM decision: **APPROVE WITH BOUNDED WORDING — CONCURRED (PM: JD, Decision Date: 2026-09-10).** CRC PM / Architecture explicitly reviewed and approved this review's own recommendation, using § S/§ T's exact proposed CRC Candidate Statement and CRC Publication Scope verbatim, in a separate, later, explicitly authorized governance-recording task. `CRC Eligible` is recorded as `Yes` in `GOVERNED-CLAIMS.md` (`CRC Approver: JD (PM)`, `CRC Decision Date: 2026-09-10`). **Explicit PM/JD Principle 3 concurrence, recorded verbatim as supplied:** "The existing Principle 3 withholding applied to the real-person likeness/identity risk represented by the sibling New York likeness claim and should not automatically extend to this distinct statutory synthetic-performer disclosure proposition merely because both currently use GoalCategory `likeness`." This concurrence is claim-specific — it does not hold that Principle 3 is inapplicable to synthetic performers generally, that statutory disclosure laws are categorically outside Principle 3, or that any claim tagged `likeness` is now presumptively CRC-eligible; `CLAIM-LIKENESS-NY-CONSENT-REQUIREMENT-001-v1` itself is unaffected and remains `CRC Publication Scope: WITHHELD FROM CRC`, unchanged. Runtime representation/reachability remains a separate, unauthorized-by-this-task, later milestone (§ W/§ X of this review's own body).

Historical status: VERBATIM ARCHIVE — DO NOT EDIT HISTORICAL BODY. Future amendments should be appended outside the body below, or captured in a new review artifact.

--- BEGIN VERBATIM CRC PUBLICATION REVIEW ---

# NY GBL § 396-b — CRC Publication Review Final Report

## A. Governed claim reviewed
`CLAIM-NY-SYNTHETIC-PERFORMER-DISCLOSURE-001-v1` and its `FGR_018` record, both re-read directly from `GOVERNED-CLAIMS.md` and the review artifact (not paraphrased from memory). Proposition: NY GBL § 396-b — a person who, for commercial purpose, produces or creates an advertisement and has actual knowledge it includes a statutory synthetic performer (a digitally created figure, AI/algorithm-made, not recognizable as any identifiable natural performer) must conspicuously disclose that fact, subject to expressive-work (conditional), audio-only, and translation-only exemptions and $1,000/$5,000 civil penalties; media/platforms that merely publish or disseminate are expressly exempted; AI tool providers are not named as duty-holders and are not the subject of any express exemption. Evidence tier: 100% Class A (direct statutory `curl` capture, re-verified twice — once at FGR, once independently again during this review by re-reading the raw captured HTML directly). Jurisdiction: New York only. `provider_scope: null`. Applicability: `jurisdiction equals New York` only. Dependencies: all four, unchanged. Prohibited conclusions already disclaim project-level violation/compliance, duty-holder status, synthetic-performer-definition satisfaction, actual knowledge, exemption applicability, jurisdiction attachment, and clearance-by-disclosure. CRC candidate statement in `GOVERNED-CLAIMS.md` is a DRAFT, unpublished. No strengthening applied by this review.

## B. Evidence authority
Adoption is not CRC Eligibility, and the synthetic runtime canary (below) is not publication authority either — both are engineering evidence *inputs* to this governance decision, never substitutes for it. Same discipline as `CPR_008`.

## C. Three questions kept separate
(1) Governance/FGR — already answered by Adoption; not reopened absent new evidence, and none was found (§ N below). (2) CRC Publication — the question this review actually answers (§ M). (3) Runtime reachability — a separate, non-gating observation (§ P/§ Q); the claim's own absence from `topic-claims-fixture.ts` is a mechanical representation gap, not evaluated as a publication-safety factor and not fixed here.

## D. Publication Test — the 14 named strengthening risks
| # | Risk | Classification |
|---|---|---|
| 1 | "This project violates NY law" | Structurally prohibited (Prohibited Conclusions; canary confirms BI summary never asserts violation) |
| 2 | "This project complies with NY law" | Structurally prohibited (same) |
| 3 | "§ 396-b applies to this project" | Structurally prohibited — jurisdiction fact ≠ legal-applicability conclusion (see § I) |
| 4 | "The user is a statutory duty-holder" | Structurally prohibited; `advertiser_or_duty_holder_status_confirmed` stays evidence-only (§ K/L) |
| 5 | "This content contains a statutory synthetic performer" | Structurally prohibited; `synthetic_performer_present_confirmed` stays evidence-only |
| 6 | "Actual knowledge exists" | Structurally prohibited; `actual_knowledge_confirmed` stays evidence-only |
| 7 | "Actual knowledge does not exist" | Structurally prohibited (same dependency, same discipline in both directions) |
| 8 | "An expressive-work exemption applies" | Structurally prohibited; `expressive_work_exemption_applies` stays evidence-only |
| 9 | "A platform/medium exemption applies" | Safely bounded — the exemption itself is stated as express statutory text (subdivision 8), never applied to a specific project |
| 10 | "AI providers are expressly exempt" (from absence-from-duty-holder-class) | Structurally prohibited — the draft wording states the correct, narrower framing (outside the described class, not an express carve-out) and Prohibited Conclusions explicitly bars the overstatement |
| 11 | "Any AI-generated performer is a statutory synthetic performer" | Safely bounded — the statutory definition (including "not recognizable as any identifiable natural performer") is stated verbatim, never collapsed to a looser gloss |
| 12 | Conflation with a real identifiable person's likeness | Safely bounded — Prohibited Conclusions explicitly names this and cross-references the sibling claim as the correct, separate authority |
| 13 | Jurisdiction-attachment strengthening from a user merely discussing New York | Safely bounded — the existing generic jurisdiction `ApplicabilityFact` gates retrieval on a structured project fact only, never asserts legal governance (§ I) |
| 14 | Disclosure compliance → broader legal/commercial/rights clearance | Structurally prohibited (Prohibited Conclusions explicitly bars this inference three ways: commercial clearance, copyright clearance, provider/platform permission) |

No risk received a PASS merely because the source statute is authoritative — each was checked against the claim's own Prohibited Conclusions text and, for the load-bearing ones, against actual Bounded Interpretation/Composition output from the canary (§ V).

## E. Principle 3 — independent analysis (not forced to match the sibling claim)
Read directly, verbatim, from `CRC-PUBLICATION-POLICY.md`: **"Subject sensitivity outweighs confidence in the fact. A well-verified fact touching SI8's No List boundaries — likeness, voice cloning, deepfakes, political persuasion — gets more scrutiny, not less, regardless of verification strength. This is a gate, not a scope to narrow around."** `CPR_008` correctly established this gate is subject-matter-keyed, not source-type-keyed, and withheld the sibling claim on exactly that basis.

This review does not reason "same GoalCategory (`likeness`) → same result." GoalCategory is routing taxonomy; Principle 3 is keyed to *substance*. Compared materially:

- The sibling claim (§§ 50–51) concerns a **real, identifiable, living person's** name/portrait/picture/likeness/voice used without consent — precisely the subject SI8's own No List names: *"No celebrity likeness (real people's faces without consent)."*
- This claim (§ 396-b) concerns a **statutorily-defined synthetic performer explicitly not recognizable as any identifiable natural performer** — a disclosure/labeling duty for wholly synthetic, admittedly non-real content, closer in kind to a consumer-protection transparency rule than to an identity/privacy right.
- SI8's No List's "deepfakes" item — *"No deepfakes or deceptive content"* — targets impersonation/deception of something purporting to be real. § 396-b's synthetic-performer disclosure duty exists to *prevent* exactly that deception (mandating disclosure so the audience knows the performer is synthetic); the proposition being adopted is educational content *about a disclosure mandate*, not content that itself impersonates or deceives.
- Voice cloning and political persuasion are plainly not implicated.
- The two claims are governed as legally distinct, non-overlapping authorities by the statute's own text (§ 396-b(5)'s cross-reference), independently confirmed at both FGR stages (`FGR_008` §4, `FGR_018` §4).

**Classification: B — Principle 3 does not apply on subject-matter grounds.** This is a substantive distinction grounded in SI8's own No List definitions, not an attempt to force asymmetry with the sibling claim's WITHHOLD outcome. This is the single most consequential and most novel judgment in this review — the first CPR to draw this real-person/synthetic-non-person line within the `likeness` topic bucket — and is flagged explicitly for deliberate PM attention at concurrence, not a silent inheritance of this review's own reasoning.

## F. Runtime-safety evidence (canary)
See § V. Accepted as engineering fact, used only to confirm "if authorized, can CRC stay bounded" — never as evidence that authorization itself is warranted.

## G. Comparison with the existing NY likeness claim
Distinctness reconfirmed independently (not merely inherited from FGR_018 §4): different statute, different regulated conduct (identity/consent vs. disclosure/labeling), different remedy shape (civil action + § 50 misdemeanor vs. civil penalty only), different duty-holder framing, statute's own cross-reference confirming complementary non-overlapping authority. The sibling's own WITHHOLD basis (Principle 3, subject-matter-keyed) does not transfer here because the underlying subject matter is materially different (§ E).

## H. Jurisdiction/applicability boundary
`jurisdiction equals New York` permits Retrieval to conclude only that the **project's own structured jurisdiction fact** (an existing, already-implemented, fail-closed `ApplicabilityFact`, never guessed from silence — the same mechanism `jurisdiction-clarification.ts` already uses generically) matches "New York." It does **not** permit, and the canary confirms it never produces, any conclusion that § 396-b *legally governs* the project. The distinction ("the project supplied New York as a structured fact" vs. "NY GBL § 396-b legally governs this project") is preserved by the existing generic mechanism — confirmed empirically (§ V, tests 3 and 6), not merely assumed. No architecture gap found; no territorial/legal-jurisdiction orchestration proposed or needed.

## I. Actor-boundary result
Preserved and confirmed safe for publication: the draft/proposed publication wording states AI tool providers are "not named among the statute's described duty-holders and are not the subject of any express exemption," never "explicitly exempt." No strengthening risk identified.

## J. Synthetic-performer-definition result
Preserved verbatim, including the "not recognizable as any identifiable natural performer" boundary — confirmed safe to state as CRC-facing text (it is the statute's own defining text, not an SI8 characterization).

## K. Actual-knowledge result
Confirmed evidence-only per FGR_018 §9; canary confirms Bounded Interpretation never asserts or denies actual knowledge for a specific project (§ V test 6).

## L. Expressive-work-exemption result
Confirmed preserved with its limiting condition ("consistent with its use in the expressive work") in the draft candidate statement; canary confirms no project-specific exemption-applicability assertion.

## M. Platform/medium-exemption result
Confirmed genuinely express and safe to state as general statutory text; canary confirms no project-specific extension of that exemption is ever asserted.

## N. AI-tool-provider wording result
Confirmed corrected framing carried through into both the draft candidate statement and the proposed Publication Scope's explicit prohibition (§ U item 7).

## O. Dependency/evidence-only result
All four dependencies (`advertiser_or_duty_holder_status_confirmed`, `synthetic_performer_present_confirmed`, `actual_knowledge_confirmed`, `expressive_work_exemption_applies`) confirmed to remain evidence-only, permanently unresolved through Bounded Interpretation's Case 3B boundary — proven empirically by the canary (§ V test 5), not merely asserted from FGR_018.

## P. Question-askability result
No new question authorized or proposed. Preserved distinction: an observable, potentially-askable factual question ("does the ad contain an AI-generated human-like performer?") remains structurally separate from a legal-characterization question that must never be posed as self-certification ("are you legally a duty-holder?", "does your content meet the statutory synthetic-performer definition?", "did you have actual knowledge within the meaning of § 396-b?", "does the exemption apply to you?", "does New York law govern this project?"). None of these five are asked by any existing mechanism; none are added here.

## Q. Material usefulness
**Positive, not manufactured to justify approval.** A user with an AI-generated ad spokesperson genuinely benefits from knowing: (1) New York has a specific, currently-operative disclosure statute for this exact scenario; (2) the narrow actor/content/knowledge conditions that trigger it; (3) the defined exemptions; (4) that project-specific applicability remains unresolved and requires evidence review. This is the same modest-but-genuinely-useful shape already approved for publication across this corpus (Envato Sync, Pond5 Editorial, Adobe Stock AI Studio, Artlist A-3) — a permanently-hedged, dependency-bearing claim is not disqualifying on its own (`CPR_008` §H/§J's own reasoning, reapplied independently here, not merely copied).

## R. CRC vs. Commercial Assurance boundary
CRC may state: the existence of the § 396-b disclosure duty; the statutory synthetic-performer definition; the actual-knowledge trigger; the stated exemptions (expressive-work with its condition, audio-only, translation-only, platform/medium) and the penalty range; that project-specific applicability is unresolved. Commercial Assurance would need to independently verify: legal duty-holder status of the project's actual producer/creator; whether the specific advertisement content meets the statutory synthetic-performer definition (direct content review); whether actual knowledge existed (documentary/testimonial evidence); whether an exemption applies to the specific advertisement; whether New York jurisdiction genuinely attaches to this specific project's distribution; an overall risk synthesis. CRC performs none of these.

## S. Proposed CRC Candidate Statement (proposal only — not written into governed authority by this review)
> New York General Business Law § 396-b requires a person who, for a commercial purpose, produces or creates an advertisement and has actual knowledge that it includes a synthetic performer — a digitally created figure, made using generative AI or a software algorithm, intended to create the impression of a human performance but not recognizable as any identifiable natural performer — to conspicuously disclose that fact within the advertisement. The duty does not apply to advertisements for expressive works (where the synthetic performer's use is consistent with its use in the work), audio-only advertisements, or advertisements limited to AI-based language translation of a human performer. A violation carries a civil penalty of $1,000 for a first violation and $5,000 for any subsequent violation; media and platforms that merely publish or disseminate a non-compliant advertisement are separately, expressly exempted.

## T. Proposed CRC Publication Scope (proposal only)
> CRC may state that NY GBL § 396-b requires a commercial advertisement producer/creator with actual knowledge of a synthetic performer's presence to conspicuously disclose that fact, subject to the statute's expressive-work (conditional), audio-only, and translation-only exemptions and $1,000/$5,000 civil penalties, and that media/platforms that merely publish or disseminate a non-compliant advertisement are separately, expressly exempted. This is New York statutory law, not SI8's own policy. CRC must not state or imply: that a specific project violates or complies with § 396-b; that the user is (or is not) the statutory duty-holder; that specific content does (or does not) meet the statutory synthetic-performer definition; that actual knowledge does (or does not) exist; that any exemption does (or does not) apply to a specific project; that New York jurisdiction attaches to a specific project for any reason, including the user merely mentioning New York; that a real, identifiable person's likeness or digital replica is governed by this statute (that subject is governed by a separate statute, NY Civil Rights Law §§ 50–51); that AI tool providers are expressly exempt (only media/platforms that merely publish or disseminate are); or that satisfying the disclosure duty establishes broader legal compliance, copyright clearance, provider/platform permission, or overall commercial readiness. A human-reviewed Commercial Assurance Assessment remains the higher-assurance path for resolving any of these project-specific facts.

## U. Publication disposition
**APPROVE WITH BOUNDED WORDING** — using § S/§ T above verbatim, not the shorter DRAFT text currently sitting in `GOVERNED-CLAIMS.md`'s `CRC Candidate Statement` field (which lacks the full exemption/definition detail and has no accompanying Publication Scope). Every ordinary Publication Policy signal (evidence quality, dependency handling, applicability safety, educational value) passes cleanly (§ D, § O, § H, § Q). The only substantive question was Principle 3, independently resolved as not applicable to this claim's specific subject matter (§ E) — flagged for explicit PM confirmation, not silently assumed.

## V. Synthetic runtime canary (real pipeline, non-persistent)
Ran a scratch Jest file (`__tests__/crc-engine/_scratch-cpr025-ny396b-canary.test.ts`, deleted immediately after this run — confirmed via `git status --short` showing no trace) against the real, unmodified `runSyntheticEligibilityCanary` harness and `retrieve()` function, using a test-only transcription of this claim's real governed fields. 7/7 tests passed:
1. Real (non-synthetic) claim, `crc_eligible: Pending`, produces zero retrieval results (`not_adopted_or_eligible`) — authority boundary intact.
2. Synthetic override retrieves correctly via explicit `likeness` goal + New York jurisdiction fact.
3. Jurisdiction semantics: included → retrieved; excluded → not retrieved; unresolved → not retrieved; "United States" (not "New York") → not retrieved — no US→NY hierarchy inferred, identical behavior to the sibling claim's own proven semantics.
4. Cross-claim isolation: the real, unmodified sibling Likeness claim (its own real `crc_eligible: Pending` left untouched) is never swept into retrieval results alongside the synthetic-eligible § 396-b clone.
5. All four dependencies preserved exactly, unresolved, never computed or resolved by the pipeline.
6. Bounded Interpretation resolves to `relevant_applicability_unresolved` (Case 3B); summary text contains none of: violates/complies, duty-holder assertion, synthetic-performer-definition assertion, actual-knowledge assertion (either direction), exemption-applicability assertion (either direction), jurisdiction-attachment assertion, commercial/legal-clearance assertion, express-exemption-for-providers assertion. Composition (`assembleProjectionOutput`) passes the same summary through unchanged — no strengthening.
7. Neither the target claim nor the sibling claim's in-memory representations were mutated by the canary run.

## W. Runtime/reachability observation
The claim has zero `TOPIC_CLAIMS_FIXTURE` representation (confirmed directly, `08_Platform/app/lib/retrieval-engine/topic-claims-fixture.ts` — zero `likeness`-topic entries of any kind currently exist there, matching the sibling claim's own unreached state). Even if this CPR is ratified and `crc_eligible` later set to `Yes`, the claim remains structurally unreachable by real CRC Retrieval until a separate, deliberately unperformed engineering task adds a fixture entry. This observation does not gate the CPR recommendation (§ C) and this review does not authorize that engineering task.

## X. Runtime-gap classification
**B — small generic, mechanical representation gap.** Adding a `topic-claims-fixture.ts` entry is the same generic, already-proven mechanism used for every other Adopted-but-unrepresented claim in this corpus (Envato/Epidemic/Artlist before their own remediation, the sibling Likeness claim today). No new generic architecture capability is missing — the fixture representation shape, applicability evaluation, dependency handling, and Case 3B hedging all already work correctly for a `provider_scope: null`, `likeness`-topic claim, as proven directly by § V's own canary run. The smallest generic architectural question for a later task, if runtime activation is ever pursued: none — this is pure mechanical fixture-entry addition, not an open design question.

## Y. Architecture-boundary result
No Retrieval, Bounded Interpretation, Projection/Composition, questioning, dependency-askability, GoalCategory, or jurisdiction-orchestration code was modified. The one test file created for § V was deleted before this review concluded; confirmed via `git status --short`.

## Z. Remaining risks
1. This APPROVE WITH BOUNDED WORDING recommendation still needs JD's explicit ratification/recording — not yet a completed governance act.
2. The Principle 3 reading in § E is a first-of-its-kind distinction within the `likeness` topic bucket (real-identifiable-person vs. statutorily-non-identifiable-synthetic-performer) — worth deliberate, explicit PM confirmation rather than routine sign-off, given the sibling claim's own WITHHOLD outcome under the same topic label.
3. If PM disagrees with the § E reading, the correct disposition reverts to WITHHOLD under Principle 3, not a wording renegotiation — Principle 5's own exception (narrow-before-withhold does not apply to Principle 3 concerns) would then govern, exactly as it did for the sibling claim.

## AA. Recommended next milestone
If ratified: record the CRC Publication decision in `GOVERNED-CLAIMS.md` (`CRC Eligible: Yes`, `CRC Approver`, `CRC Decision Date`, the § S/§ T wording verbatim) — a separate, later, explicitly authorized recording task, not performed here. Runtime fixture representation (§ W/§ X) remains a distinct, later, unauthorized-by-this-review engineering task.

## AB. APPROVE / APPROVE WITH BOUNDED WORDING / WITHHOLD / ESCALATE

**APPROVE WITH BOUNDED WORDING** (use § S/§ T verbatim, not the shorter GOVERNED-CLAIMS.md draft).

--- END VERBATIM CRC PUBLICATION REVIEW ---
